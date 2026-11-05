import { test, expect } from '@playwright/test';

const ORDER = [
  'FOOD & DINING', 'BYOB', 'COFFEE & MATCHA',
  'HANGOUT SPOTS', 'WELLNESS & FITNESS', 'CO WORKING',
  "WHAT'S ON", 'DEALS', 'EVENTS',
  'HAPPY HOUR', 'FUN & FAMILY', 'SERVICES',
];

for (const area of ['canggu', 'uluwatu']) {
  test(`${area} shows the 12 boxes in Ivan's order`, async ({ page }) => {
    await page.goto(`/${area}`);
    await expect(page.locator('h2.font-display')).toHaveText(ORDER);
  });
}

test('an empty new section opens a Coming Soon page, not a 404', async ({ page }) => {
  const response = await page.goto('/canggu/byob');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('BYOB');
});

test('the Deals page opens', async ({ page }) => {
  const response = await page.goto('/deals?location=canggu');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deals');
});
