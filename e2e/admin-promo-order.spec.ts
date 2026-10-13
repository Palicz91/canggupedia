import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { seedAdmin, loginAdmin } from './seed';

/**
 * The promo order lists on the Daily promos screen (public/admin/promo-order-widget.js), driven
 * through the real Decap admin against the real promo file. One `.cp-order[data-day]` block per
 * weekday, same markup as the venue order lists. A move is not stored as such: the save puts the
 * promos in that order in the file, which is the order the website uses.
 */
interface Promo { id: string; day: string; title: string; venue: string }
const promos: Promo[] = JSON.parse(readFileSync('src/data/daily-promos.json', 'utf8')).daily_promos;
const monday = promos.filter((p) => p.day === 'Monday');

async function savedPromos(page: Page) {
  const raw = await page.evaluate(() => {
    const files = (window as unknown as { repoFiles: { src: { data: Record<string, { content: string }> } } }).repoFiles;
    return files.src.data['daily-promos.json'].content;
  });
  return JSON.parse(raw) as Record<string, unknown> & { daily_promos: Promo[] };
}

async function openDay(page: Page, day: string) {
  const block = page.locator(`.cp-order[data-day="${day}"]`);
  await block.scrollIntoViewIfNeeded();
  await block.locator('.cp-order-toggle').click();
  return block;
}

test.beforeEach(async ({ page }) => {
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/deals/entries/daily-promos');
  await page.waitForTimeout(7000);
});

test('each day lists its promos in the order the website shows them', async ({ page }) => {
  expect(monday.length).toBeGreaterThan(1);
  const block = await openDay(page, 'Monday');
  await expect(block.locator('.cp-order-toggle')).toContainText(`Monday — ${monday.length} promos`);
  const shown = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());
  expect(shown).toEqual(monday.map((p) => `${p.title} — ${p.venue}`));
});

test('typing a new number moves the promo there, and Save puts the file in that order', async ({ page }) => {
  // Ivan's case: the last promo of a busy day has to move to the top.
  const last = monday[monday.length - 1];
  const block = await openDay(page, 'Monday');
  const box = block.locator('.cp-order-pos').nth(monday.length - 1);
  await box.fill('1');
  await box.press('Enter');

  const expected = [last, ...monday.slice(0, -1)];
  const shown = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());
  expect(shown).toEqual(expected.map((p) => `${p.title} — ${p.venue}`));

  await page.locator('[role="button"][class*="StyledDropdownButton"]').first().click();
  await page.waitForTimeout(3000);

  const saved = await savedPromos(page);
  expect(saved).not.toHaveProperty('promo_order');
  expect(saved.daily_promos.filter((p) => p.day === 'Monday').map((p) => p.id)).toEqual(expected.map((p) => p.id));
  // Every other day is untouched, and nothing was lost or duplicated.
  const others = (list: Promo[]) => list.filter((p) => p.day !== 'Monday').map((p) => p.id);
  expect(others(saved.daily_promos)).toEqual(others(promos));
  expect(saved.daily_promos).toHaveLength(promos.length);
});
