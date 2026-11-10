import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { seedAdmin, loginAdmin } from './seed';
import { promoDays, promosForDay } from '../src/lib/promo-days';

/**
 * The promo order lists on the Daily promos screen (public/admin/promo-order-widget.js), driven
 * through the real Decap admin against the real promo file. One `.cp-order[data-day]` block per
 * weekday, same markup as the venue order lists. Since 2026-11-10 a promo can run on several days,
 * so each day's order is stored in the file as `promo_order` ({ Monday: [ids] }) and the website
 * sorts each day by it.
 */
interface Promo { id: string; day?: string; days?: string[]; title: string; venue: string }
const file = JSON.parse(readFileSync('src/data/daily-promos.json', 'utf8'));
const promos: Promo[] = file.daily_promos;
const onDay = (day: string, list: Promo[] = promos, order = file.promo_order) => promosForDay(list, order, day);
const multi = promos.find((p) => promoDays(p).length > 1);

async function savedPromos(page: Page) {
  const raw = await page.evaluate(() => {
    const files = (window as unknown as { repoFiles: { src: { data: Record<string, { content: string }> } } }).repoFiles;
    return files.src.data['daily-promos.json'].content;
  });
  return JSON.parse(raw) as { daily_promos: Promo[]; promo_order?: Record<string, string[]> };
}

async function openDay(page: Page, day: string) {
  const block = page.locator(`.cp-order[data-day="${day}"]`);
  await block.scrollIntoViewIfNeeded();
  await block.locator('.cp-order-toggle').click();
  return block;
}

async function moveToTop(page: Page, day: string, from: number, opened = false) {
  const block = opened ? page.locator(`.cp-order[data-day="${day}"]`) : await openDay(page, day);
  const box = block.locator('.cp-order-pos').nth(from);
  await box.fill('1');
  await box.press('Enter');
  return block;
}

async function save(page: Page) {
  await page.locator('[role="button"][class*="StyledDropdownButton"]').first().click();
  await page.waitForTimeout(3000);
  return savedPromos(page);
}

const names = (list: Promo[]) => list.map((p) => `${p.title} — ${p.venue}`);
const ids = (list: Promo[]) => list.map((p) => p.id);

test.beforeEach(async ({ page }) => {
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/deals/entries/daily-promos');
  await page.waitForTimeout(7000);
});

test('each day lists its promos in the order the website shows them', async ({ page }) => {
  const monday = onDay('Monday');
  expect(monday.length).toBeGreaterThan(1);
  const block = await openDay(page, 'Monday');
  await expect(block.locator('.cp-order-toggle')).toContainText(`Monday — ${monday.length} promos`);
  const shown = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());
  expect(shown).toEqual(names(monday));
});

test('typing a new number moves the promo there, and Save stores that order', async ({ page }) => {
  // Ivan's case: the last promo of a busy day has to move to the top.
  const monday = onDay('Monday');
  const block = await moveToTop(page, 'Monday', monday.length - 1);
  const expected = [monday[monday.length - 1], ...monday.slice(0, -1)];
  const shown = (await block.locator('.cp-order-name').allInnerTexts()).map((t) => t.trim());
  expect(shown).toEqual(names(expected));

  const saved = await save(page);
  expect(ids(onDay('Monday', saved.daily_promos, saved.promo_order))).toEqual(ids(expected));
  // Every other day is untouched, and nothing was lost or duplicated.
  for (const d of ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
    expect(ids(onDay(d, saved.daily_promos, saved.promo_order))).toEqual(ids(onDay(d)));
  }
  expect(saved.daily_promos).toHaveLength(promos.length);
});

test('a promo on two days is listed on both, and moving it on one day leaves the other alone', async ({ page }) => {
  expect(multi, 'the promo file has a promo on more than one day').toBeTruthy();
  const [first, second] = promoDays(multi!);
  for (const d of [first, second]) {
    const block = await openDay(page, d);
    await expect(block.locator('.cp-order-name').filter({ hasText: multi!.title })).toHaveCount(1);
  }
  const list = onDay(second);
  const at = list.findIndex((p) => p.id === multi!.id);
  // Move whichever promo is not already on top, so the move is a real change.
  await moveToTop(page, second, at === 0 ? list.length - 1 : at, true);
  const saved = await save(page);
  const moved = at === 0 ? list[list.length - 1] : multi!;
  expect(onDay(second, saved.daily_promos, saved.promo_order)[0].id).toBe(moved.id);
  expect(ids(onDay(first, saved.daily_promos, saved.promo_order))).toEqual(ids(onDay(first)));
  expect(saved.daily_promos.every((p) => Array.isArray(p.days) && !('day' in p))).toBe(true);
});
