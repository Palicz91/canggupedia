import { test, expect } from '@playwright/test';
import { seedAdmin, loginAdmin } from './seed';

/**
 * The preview pane has to agree with the website about opening hours.
 *
 * Billy Ho's hours are a week pasted straight out of Google, which the site splits into a
 * day-by-day table. The preview used to print the raw string instead, so the same data looked
 * correct on the live page and broken in the editor — reported on 2026-08-31 as "this opening
 * hours rendering is still shit", about a page that was already rendering it fine.
 *
 * Decap renders the preview inside an iframe, so everything here goes through frameLocator.
 * Address it by id: Netlify Identity adds two more iframes to the page, and a bare `iframe`
 * selector is ambiguous between them.
 */
const PREVIEW = '#preview-pane';

test('a pasted week previews as a day-by-day table, like the website', async ({ page }) => {
  await seedAdmin(page);
  await loginAdmin(page);

  await page.goto('/admin/#/collections/food-venues/entries/canggu-billy-ho');
  await page.waitForTimeout(6000);

  const preview = page.frameLocator(PREVIEW);
  const rows = preview.locator('.cp-hours-r');
  await expect(rows).toHaveCount(7);

  // The day names in order, each against its own hours — not one run-on line.
  const days = await preview.locator('.cp-hours-r dt').allInnerTexts();
  expect(days.map((d) => d.trim())).toEqual([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  ]);

  const hours = await preview.locator('.cp-hours-r dd').allInnerTexts();
  expect(hours.every((h) => h.trim() === '11.00 am–11.00 pm')).toBe(true);

  // The old blob had the label and the whole week glued together in one paragraph.
  await expect(preview.locator('text=Opening Hours:')).toHaveCount(0);
});

test('hours the site cannot split are still previewed as the single line they are', async ({
  page,
}) => {
  // The fallback matters as much as the table. Most venues hold something like
  // "Daily: 10:00 - 23:00", which must not be forced into seven identical rows.
  // canggu-brunch-1 is Avocado Factory, whose hours are the single range "10:00 AM - 10:00 PM".
  await seedAdmin(page);
  await loginAdmin(page);

  await page.goto('/admin/#/collections/food-venues/entries/canggu-brunch-1');
  await page.waitForTimeout(6000);

  const preview = page.frameLocator(PREVIEW);
  await expect(preview.locator('.cp-hours-r')).toHaveCount(0);
  await expect(preview.locator('.cp-box')).toContainText('Opening Hours:');
});
