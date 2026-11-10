import { test, expect } from '@playwright/test';
import { promoDays } from '../src/lib/promo-days';
import { readFileSync } from 'node:fs';

/**
 * What's On day buttons (Ivan, 2026-11-10): a visitor who only wants Thursday taps Thursday instead
 * of scrolling past the whole week. Area filter (?location=) and day buttons work together.
 */
type P = { day?: string; days?: string[]; title: string; location: string };
const promos: P[] = JSON.parse(readFileSync('src/data/daily-promos.json', 'utf8')).daily_promos;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const inArea = (p: P, area: string) => p.location === area || p.location === 'both';

test('a day button shows only that day, All shows the week again', async ({ page }) => {
  const days = DAYS.filter((d) => promos.some((p) => promoDays(p).includes(d)));
  test.skip(days.length < 2, 'needs promos on two days');
  await page.goto('/daily-promos');

  const chips = page.locator('#day-chips');
  await expect(chips.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  for (const d of days) await expect(page.locator(`.day-section[data-day="${d}"]`)).toBeVisible();

  const [first, second] = days;
  await chips.getByRole('button', { name: second }).click();
  await expect(chips.getByRole('button', { name: second })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`.day-section[data-day="${second}"]`)).toBeVisible();
  await expect(page.locator(`.day-section[data-day="${first}"]`)).toBeHidden();

  await chips.getByRole('button', { name: 'All' }).click();
  await expect(page.locator(`.day-section[data-day="${first}"]`)).toBeVisible();
  await expect(page.locator(`.day-section[data-day="${second}"]`)).toBeVisible();
});

test('in an area, a day with nothing there gets no button', async ({ page }) => {
  await page.goto('/daily-promos?location=uluwatu');
  const chips = page.locator('#day-chips');
  for (const d of DAYS.filter((day) => promos.some((p) => promoDays(p).includes(day)))) {
    const button = chips.getByRole('button', { name: d });
    if (promos.some((p) => promoDays(p).includes(d) && inArea(p, 'uluwatu'))) await expect(button).toBeVisible();
    else await expect(button).toBeHidden();
  }
});

test('days without a promo get no button', async ({ page }) => {
  await page.goto('/daily-promos');
  const chips = page.locator('#day-chips');
  for (const d of DAYS.filter((day) => !promos.some((p) => promoDays(p).includes(day)))) {
    await expect(chips.getByRole('button', { name: d })).toHaveCount(0);
  }
});
