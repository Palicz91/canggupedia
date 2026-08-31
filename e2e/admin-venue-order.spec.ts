import { test, expect, type Page } from '@playwright/test';
import { seedAdmin, loginAdmin } from './seed';

/**
 * The venue-order screen, driven through the real Decap admin against real repo data.
 *
 * What this exists to catch: the relation pickers used to offer every venue in the section,
 * both areas included, so the Canggu lists offered Uluwatu venues. Picking one saved cleanly
 * and changed nothing, because the id never matches on that page — a silent no-op, which is
 * the worst possible failure for a non-technical editor.
 *
 * DOM shape (dumped from a real render, not guessed):
 *   div[aria-label="list field"]
 *     div.ControlTopbar > label      <- "Food & Dining — Dinner tab only (optional)"
 *     div#<id> > div > button "Add venue"
 * so the field container is the label's GRANDparent.
 */
async function optionsFor(page: Page, area: string, labelText: string, query: string) {
  await page.goto(`/admin/#/collections/venue-order/entries/${area}`);
  await page.waitForTimeout(6000);

  const label = page.locator('label').filter({ hasText: labelText }).first();
  await label.scrollIntoViewIfNeeded();
  const block = label.locator('xpath=../..');
  await block.getByRole('button', { name: /add venue/i }).first().click();
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

// One area per test on purpose. Opening a picker leaves the entry dirty, and Decap then blocks
// navigation to the other area with an unsaved-changes guard, so a single test that visits both
// silently stays on the first one and "passes" against the wrong screen.
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
