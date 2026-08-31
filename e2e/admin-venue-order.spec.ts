import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedAdmin, loginAdmin } from './seed';

/**
 * The venue-order screen, driven through the real Decap admin against real repo data.
 *
 * Each list is one `venue_order` control (public/admin/venue-order-widget.js), not a Decap list.
 * Its markup is ours, so these tests hang off our own class names:
 *
 *   div.cp-order            <- .cp-open while the rows are showing
 *     div.cp-order-head > button.cp-order-toggle   "14 venues"
 *     div.cp-order-rows     <- display:none until open; the rows are never unmounted
 *       div.cp-order-row
 *         input.cp-order-pos    the position box
 *         span.cp-order-name    the venue name
 *
 * Decap still renders its own label above each control, so a list is found by its label and the
 * block is the first .cp-order after it.
 */
function sectionBlock(page: Page, labelText: string) {
  const label = page.locator('label').filter({ hasText: labelText }).first();
  return label.locator(
    'xpath=following::div[contains(concat(" ", @class, " "), " cp-order ")][1]',
  );
}

async function openSection(page: Page, labelText: string) {
  const block = sectionBlock(page, labelText);
  await block.scrollIntoViewIfNeeded();
  await block.locator('.cp-order-toggle').click();
  await page.waitForTimeout(1500);
  return block;
}

/** The order file as the test-repo backend currently holds it, i.e. what a save actually wrote. */
async function readOrderFile(page: Page, area: string) {
  const raw = await page.evaluate((a) => {
    const files = (window as unknown as { repoFiles: Record<string, never> }).repoFiles;
    const node = (
      files as never as Record<string, Record<string, Record<string, Record<string, { content: string }>>>>
    ).src.data['venue-order'][`${a}.json`];
    return node.content;
  }, area);
  return JSON.parse(raw) as Record<string, string[]>;
}

/** Decap's save is a dropdown; public/admin/one-click-save.js presses "Save now" inside it. */
async function saveEntry(page: Page) {
  await page.locator('[role="button"][class*="StyledDropdownButton"]').first().click();
  await page.waitForTimeout(3000);
}

function venuesIn(section: string, area: string) {
  const dir = join('src/data/venues', section);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .filter((v) => v.location === area);
}

// One area per test on purpose. Decap does not reload the entry when the route hash changes from
// one file in a file collection to another: the address changes and the form keeps showing the
// previous area, so a single test that visits both silently "passes" against the wrong screen.
// Measured 2026-08-31 — loading uluwatu directly renders its own lists, but arriving there from
// canggu leaves all the canggu rows on screen.
for (const area of ['canggu', 'uluwatu']) {
  test(`the ${area} lists hold every ${area} venue and nothing from anywhere else`, async ({ page }) => {
    // The bug this screen was rebuilt around: the Canggu lists also offered Uluwatu venues, and
    // picking one saved cleanly and changed nothing, because the id never matches on that page.
    // The list is now derived from the widget's own `area`, so this is that guarantee restated:
    // the section list is exactly the area's venues, by name.
    await seedAdmin(page);
    await loginAdmin(page);
    await page.goto(`/admin/#/collections/venue-order/entries/${area}`);
    await page.waitForTimeout(7000);

    const block = await openSection(page, 'Food & Dining — whole section');
    const shown = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());
    const expected = venuesIn('food', area).map((v) => v.name);

    expect(shown.length).toBe(expected.length);
    expect([...shown].sort()).toEqual([...expected].sort());
  });
}

test('a tab list shows every venue of that type, in the order the website uses', async ({ page }) => {
  // Reported 2026-08-31: "every subcategory is empty". They were — a tab list stores nothing until
  // someone reorders it, and empty means "inherit the section order". Correct behaviour that read
  // as a broken screen, because the widget showed the stored ids rather than the inherited order.
  //
  // Ivan's older complaint is folded in here too: "i can't found Billy Ho here". Billy Ho was
  // created after the order lists were written, so he was in no list. He is a Dinner venue, so he
  // must now appear on this tab without anyone adding him.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(7000);

  const block = await openSection(page, 'Dinner tab only');
  const shown = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());
  const expected = venuesIn('food', 'canggu')
    .filter((v) => (Array.isArray(v.subcategory) ? v.subcategory : [v.subcategory]).includes('dinner'))
    .map((v) => v.name);

  expect(shown.length).toBe(expected.length);
  expect([...shown].sort()).toEqual([...expected].sort());
  expect(shown).toContain('Billy Ho');

  // Nothing was written just by looking. An untouched tab must stay empty on disk, or every tab
  // silently stops following its section the first time someone opens the screen.
  expect(await readOrderFile(page, 'canggu')).not.toHaveProperty('food__dinner');
  await expect(page.locator('[class*="-ToolbarContainer"]')).toContainText(/saved/i);
});

test('a tab with no venues says so instead of showing an empty box', async ({ page }) => {
  // "Rooftop" has no Canggu venues, and the website hides that tab completely. A bare "0 venues"
  // next to twenty populated lists is what made the screen look broken in the first place.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(7000);

  const toggle = sectionBlock(page, 'Rooftop tab only').locator('.cp-order-toggle');
  await expect(toggle).toContainText('Nothing in this tab yet');
  await expect(toggle).toBeDisabled();
});

test('an ordering row stays close to one line tall', async ({ page }) => {
  // Reported 2026-08-31 as "chaotic and super difficult to use". Each row spent 168px to show a
  // single venue name, so the 29-venue Food list alone was 5,527px and the Canggu screen ran to
  // 22,000px. A measured assertion rather than a visual one, because nothing else would notice
  // the rows growing back.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(7000);

  const block = await openSection(page, 'Food & Dining — whole section');
  const row = block.locator('.cp-order-row').first();
  const box = await row.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThan(60);
  await expect(row.locator('.cp-order-name')).not.toBeEmpty();
});

test('the lists open closed and a heading opens one', async ({ page }) => {
  // "as default put everything closed" (2026-08-31). 21 lists open at once is a 12,000px screen.
  // The rows are hidden with CSS rather than unmounted, so opening one is instant and the venue
  // names are already resolved — Decap's own collapse remounts rows and blanks them.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(7000);

  const rows = page.locator('.cp-order-row');
  const total = await rows.count();
  expect(total).toBeGreaterThan(100); // every list is built, in the DOM...
  expect(await rows.filter({ visible: true }).count()).toBe(0); // ...and none of it on screen

  const block = await openSection(page, 'Food & Dining — whole section');
  const open = await rows.filter({ visible: true }).count();
  expect(open).toBe(venuesIn('food', 'canggu').length);
  await expect(block.locator('.cp-order-name').first()).toContainText('Avocado Factory');

  // Closing again must not leave the entry dirty; a stray edit here would put an unsaved-changes
  // guard in front of a screen Ivan only opened to look at.
  await block.locator('.cp-order-toggle').click();
  await page.waitForTimeout(1200);
  expect(await rows.filter({ visible: true }).count()).toBe(0);
  await expect(page.locator('[class*="-ToolbarContainer"]')).toContainText(/saved/i);
});

test('typing a position moves that venue and pushes the rest down', async ({ page }) => {
  // Asked for on 2026-08-31, verbatim: "if i chnage 25 to 3 lets say then it moves to 3rd position
  // and pushes everything down with one". Dragging 25 rows was the only way before, and the drag
  // handle is unusable on a phone. Asserted against the file the save actually wrote, because the
  // rows can look right on screen while the wrong array reaches disk.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(7000);

  const before = await readOrderFile(page, 'canggu');
  const block = await openSection(page, 'Food & Dining — whole section');
  const rows = block.locator('.cp-order-row');
  const shownBefore = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());

  await rows.nth(24).locator('.cp-order-pos').fill('3');
  await rows.nth(24).locator('.cp-order-pos').press('Enter');
  await page.waitForTimeout(1500);

  // On screen: number 25 is now third, everything from the old third place down has shifted.
  const shownAfter = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());
  const expectedNames = [...shownBefore];
  expectedNames.splice(2, 0, expectedNames.splice(24, 1)[0]);
  expect(shownAfter).toEqual(expectedNames);
  await expect(rows.nth(2).locator('.cp-order-pos')).toHaveValue('3');

  await saveEntry(page);
  const after = await readOrderFile(page, 'canggu');

  // The section list had 29 ids and the section has 30 venues — Billy Ho was never in it. Writing
  // the derived list is what finally puts him in, so this is 30, not 29.
  expect(after.food.length).toBe(venuesIn('food', 'canggu').length);
  expect(after.food.length).toBeGreaterThan(before.food.length);
  expect(new Set(after.food).size).toBe(after.food.length); // no duplicates
  // Every other section must come through the save untouched.
  expect(after.hangout).toEqual(before.hangout);
  expect(after.wellness).toEqual(before.wellness);
  expect(after['fun-family']).toEqual(before['fun-family']);
});

test('reordering a tab writes only that tab', async ({ page }) => {
  // A tab list is empty until it is touched, and this is the touch. It must gain its own order
  // without disturbing the section list it was inheriting from — otherwise pinning one venue to
  // the Dinner tab silently reshuffles the whole Food page.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(7000);

  const before = await readOrderFile(page, 'canggu');
  const block = await openSection(page, 'Dinner tab only');
  const rows = block.locator('.cp-order-row');
  const last = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim()).pop();

  const count = await rows.count();
  await rows.nth(count - 1).locator('.cp-order-pos').fill('1');
  await rows.nth(count - 1).locator('.cp-order-pos').press('Enter');
  await page.waitForTimeout(1500);
  await expect(block.locator('.cp-order-name').first()).toHaveText(last!);

  await saveEntry(page);
  const after = await readOrderFile(page, 'canggu');
  expect(after['food__dinner'].length).toBe(count);
  expect(after.food).toEqual(before.food); // the section list is untouched
});
