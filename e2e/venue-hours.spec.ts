import { test, expect } from '@playwright/test';

/**
 * The user-visible half of the opening-hours fix.
 *
 * The parser is unit-tested in test/hours.test.ts, but the table only exists inside the venue
 * modal, which is rendered client-side after a click — so no unit test and no built HTML file
 * can prove a visitor actually sees it. This does.
 */
test.describe('venue opening hours', () => {
  const DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  async function openVenue(page: import('@playwright/test').Page, name: string) {
    await page.goto('/canggu/food');
    const card = page.locator('div.p-6').filter({ hasText: name }).first();
    await card.getByRole('button', { name: 'MORE' }).click();
  }

  test('a pasted Google week renders as a day-by-day list', async ({ page }) => {
    // Billy Ho's hours were pasted straight out of Google as one tab-separated line.
    await openVenue(page, 'Billy Ho');

    const hours = page.locator('dl').first();
    await expect(hours).toBeVisible();

    for (const day of DAYS) {
      await expect(hours.getByText(day, { exact: true })).toBeVisible();
    }
    await expect(hours.getByText('11.00 am–11.00 pm').first()).toBeVisible();

    // The run-on line this replaced had the day names and times jammed together.
    await expect(page.getByText(/Monday\s+11\.00 am–11\.00 pm\s+Tuesday/)).toHaveCount(0);
  });

  test('a simple all-week range is left exactly as it was', async ({ page }) => {
    // Avocado Factory stores "10:00 AM – 10:00 PM" — no day names, so it must not be turned
    // into a table. This is the guard for the other 50 venues with hand-typed hours.
    await openVenue(page, 'Avocado Factory');

    await expect(page.getByText('Opening Hours:')).toBeVisible();
    await expect(page.getByText('10:00 AM – 10:00 PM')).toBeVisible();
    await expect(page.locator('dl')).toHaveCount(0);
  });
});
