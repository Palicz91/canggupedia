import { test, expect, type Page } from '@playwright/test';
import { seedAdmin, loginAdmin } from './seed';

/**
 * The venue-order screen, driven through the real Decap admin against real repo data.
 *
 * Each section is one `venue_order` control (public/admin/venue-order-widget.js), not a Decap
 * list. Its markup is ours, so these tests hang off our own class names:
 *
 *   div.cp-order            <- .cp-open while the rows are showing
 *     div.cp-order-head
 *       button.cp-order-toggle   "29 venues"
 *       button.cp-order-add      "Add venue"
 *     div.cp-order-rows     <- display:none until open; the rows are never unmounted
 *       div.cp-order-row
 *         input.cp-order-pos     the position box
 *         div.cp-order-venue     Decap's own relation control, borrowed via props.editorControl
 *         button.cp-order-del
 *
 * The label Decap renders for the whole control still sits above it, so a section is found by its
 * label and the block is the first .cp-order after it.
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
  await page.waitForTimeout(2000);
  return block;
}

/** The order file as the test-repo backend currently holds it, i.e. what a save actually wrote. */
async function readOrderFile(page: Page, area: string) {
  const raw = await page.evaluate((a) => {
    const files = (window as unknown as { repoFiles: Record<string, never> }).repoFiles;
    const node = (files as never as Record<string, Record<string, Record<string, Record<string, { content: string }>>>>)
      .src.data['venue-order'][`${a}.json`];
    return node.content;
  }, area);
  return JSON.parse(raw) as Record<string, string[]>;
}

/** Decap's save is a dropdown; public/admin/one-click-save.js presses "Save now" inside it. */
async function saveEntry(page: Page) {
  await page.locator('[role="button"][class*="StyledDropdownButton"]').first().click();
  await page.waitForTimeout(3000);
}

/**
 * What this exists to catch: the relation pickers used to offer every venue in the section,
 * both areas included, so the Canggu lists offered Uluwatu venues. Picking one saved cleanly
 * and changed nothing, because the id never matches on that page — a silent no-op, which is
 * the worst possible failure for a non-technical editor.
 */
async function optionsFor(page: Page, area: string, labelText: string, query: string) {
  await page.goto(`/admin/#/collections/venue-order/entries/${area}`);
  await page.waitForTimeout(6000);

  const block = sectionBlock(page, labelText);
  await block.scrollIntoViewIfNeeded();
  // Add venue opens the section as well as appending, so the new picker is on screen and clickable.
  await block.getByRole('button', { name: /add venue/i }).click();
  await page.waitForTimeout(1200);

  const input = block.locator('input[role="combobox"]').last();
  await input.click();
  await input.fill(query);
  await page.waitForTimeout(2500);

  const opts = await page.locator('[id^="react-select"][id*="option"]').allInnerTexts();
  // Leave the menu closed, or its overlay swallows the clicks of whatever runs next.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return opts.map((o) => o.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

// One area per test on purpose. Decap does not reload the entry when the route hash changes from
// one file in a file collection to another: the address changes and the form keeps showing the
// previous area, so a single test that visits both silently "passes" against the wrong screen.
// Measured 2026-08-31 — loading uluwatu directly renders its 6 rows, but arriving there from
// canggu leaves all 111 canggu rows on screen.
for (const area of ['canggu', 'uluwatu']) {
  test(`the ${area} venue pickers only offer ${area} venues`, async ({ page }) => {
    await seedAdmin(page);
    await loginAdmin(page);

    // display_fields renders "<name> <location>", so location is readable straight off the row.
    const opts = await optionsFor(page, area, 'Food & Dining — whole section', 'a');
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.filter((o) => !o.endsWith(area))).toEqual([]);
  });
}

test('a venue that is not in the order list yet can still be found by name', async ({ page }) => {
  // Ivan's third complaint, verbatim: "And also i can't found Billy Ho here". Billy Ho was added
  // after the order lists were seeded, so he is not a row in any of them — the only way to reach
  // him is Add venue, then type the name. If that search ever stops matching, a new venue becomes
  // permanently stuck at the bottom of the site with no way to move it.
  await seedAdmin(page);
  await loginAdmin(page);

  const found = await optionsFor(page, 'canggu', 'Dinner tab only', 'Billy');
  expect(found.join(' | ')).toContain('Billy Ho');
});

test('a tab list offers the same venues as its section, not an empty picker', async ({ page }) => {
  await seedAdmin(page);
  await loginAdmin(page);

  // Guards the decision NOT to also filter by subcategory. `subcategory` is an array and Decap's
  // relation filter does not match inside arrays: with that filter on, this picker offered zero
  // venues, which is worse than offering too many. If a future Decap release fixes array filters
  // this test still passes with a narrower list -- it only asserts the picker is not empty.
  const dinner = await optionsFor(page, 'canggu', 'Dinner tab only', 'a');
  expect(dinner.length).toBeGreaterThan(0);
  expect(dinner.filter((o) => !o.endsWith('canggu'))).toEqual([]);
});

test('an ordering row stays close to one line tall', async ({ page }) => {
  // Reported 2026-08-31 as "chaotic and super difficult to use". Each row spent 168px to show a
  // single venue name, so the 29-venue Food list alone was 5,527px and the Canggu screen ran to
  // 22,000px. The .cp-order rules in public/admin/index.html trim that to ~44px; two of them
  // reach into Decap's own emotion class names, so a Decap upgrade can silently make them inert
  // and put the screen straight back to where it was. Hence a measured assertion, not a visual one.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(6000);

  const block = await openSection(page, 'Food & Dining — whole section');
  const row = block.locator('.cp-order-row').first();
  const box = await row.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThan(100);

  // The name must still be readable — trimming that hid the value would be worse than the height.
  await expect(row).toContainText('canggu');
});

test('the ordering lists open closed and a heading opens one', async ({ page }) => {
  // "as default put everything closed" (2026-08-31). 21 lists open at once is a 12,000px screen.
  // The rows are hidden with CSS rather than unmounted, because a row that mounts again comes back
  // with its venue picker blank — so this also checks the venue name is there the moment a list
  // is opened, which is what caught that bug the first time.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(6000);

  const rows = page.locator('.cp-order-row');
  await expect(rows).toHaveCount(111); // all present in the DOM...
  expect(await rows.filter({ visible: true }).count()).toBe(0); // ...and none of them on screen

  const block = await openSection(page, 'Food & Dining — whole section');
  expect(await rows.filter({ visible: true }).count()).toBe(29);
  await expect(block.locator('.cp-order-row').first()).toContainText('Avocado Factory');

  // Closing again must not leave the entry dirty; a stray edit here would put an unsaved-changes
  // guard in front of a screen Ivan only opened to look at.
  await block.locator('.cp-order-toggle').click();
  await page.waitForTimeout(1200);
  expect(await rows.filter({ visible: true }).count()).toBe(0);
  await expect(page.locator('[class*="-ToolbarContainer"]')).toContainText(/saved/i);
});

test('Add venue opens the list it adds to', async ({ page }) => {
  // The Add button sits in the heading and stays clickable while the list is closed, so without
  // this the new row is added out of sight and the button reads as broken.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/uluwatu');
  await page.waitForTimeout(6000);

  const rows = page.locator('.cp-order-row');
  expect(await rows.filter({ visible: true }).count()).toBe(0);

  await sectionBlock(page, 'Food & Dining — whole section')
    .getByRole('button', { name: /add venue/i })
    .click();
  await page.waitForTimeout(2000);
  expect(await rows.filter({ visible: true }).count()).toBe(5); // uluwatu food has 4
});

test('typing a position moves that venue and pushes the rest down', async ({ page }) => {
  // Asked for on 2026-08-31, verbatim: "if i chnage 25 to 3 lets say then it moves to 3rd position
  // and pushes everything down with one". Dragging 25 rows was the only way before, and the drag
  // handle is unusable on a phone. Asserted against the file the save actually wrote, because the
  // rows can look right on screen while the wrong array reaches disk.
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/venue-order/entries/canggu');
  await page.waitForTimeout(6000);

  const before = await readOrderFile(page, 'canggu');
  const expected = [...before.food];
  expected.splice(0, 0, expected.splice(2, 1)[0]); // third venue to first place

  const block = await openSection(page, 'Food & Dining — whole section');
  const rows = block.locator('.cp-order-row');
  const thirdName = (await rows.nth(2).innerText()).trim();

  await rows.nth(2).locator('.cp-order-pos').fill('1');
  await rows.nth(2).locator('.cp-order-pos').press('Enter');
  await page.waitForTimeout(1500);

  // On screen: the venue that was third is now first, and its box reads 1.
  expect((await rows.nth(0).innerText()).trim()).toBe(thirdName);
  await expect(rows.nth(0).locator('.cp-order-pos')).toHaveValue('1');

  await saveEntry(page);
  const after = await readOrderFile(page, 'canggu');
  expect(after.food).toEqual(expected);
  expect(after.food.length).toBe(before.food.length); // a move, not a copy or a drop
  // Every other section must come through the save untouched. The widget owns one array, but it
  // writes through Decap's form state, so a mistake there would land in the same file.
  expect(after.hangout).toEqual(before.hangout);
  expect(after.wellness).toEqual(before.wellness);
});
