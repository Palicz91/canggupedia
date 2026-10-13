import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Cards crop their picture to a wide strip, so a tap has to show the whole thing. Checked on the
 * rendered page: the full picture must be the original (not the crop), and every way of closing it
 * (tap, Escape, the back button) must leave the visitor on the page. The promo page carries the
 * detailed checks; the other pages check that their pictures open the same viewer.
 */
const promos = JSON.parse(readFileSync('src/data/daily-promos.json', 'utf8')).daily_promos;
const first = promos.find((p: { imageUrl?: string }) => p.imageUrl);

test.describe('daily promos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/daily-promos');
  });

  test('tapping a promo picture shows the whole original picture', async ({ page }) => {
    const lightbox = page.locator('#image-lightbox');
    await expect(lightbox).toBeHidden();

    await page.getByRole('button', { name: `Show the full picture: ${first.title}` }).click();
    await expect(lightbox).toBeVisible();

    const img = page.locator('#image-lightbox-img');
    await expect(img).toHaveAttribute('src', first.imageUrl);
    await expect(img).toHaveAttribute('alt', first.title);
    // object-contain: the whole picture fits inside the screen, nothing cut off.
    await expect(img).toHaveCSS('object-fit', 'contain');
  });

  test('a tap on the open picture closes it', async ({ page }) => {
    await page.locator('.image-zoom').first().click();
    await page.locator('#image-lightbox').click();
    await expect(page.locator('#image-lightbox')).toBeHidden();
    await expect(page).toHaveURL(/\/daily-promos/);
  });

  test('Escape closes it', async ({ page }) => {
    await page.locator('.image-zoom').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#image-lightbox')).toBeHidden();
    await expect(page).toHaveURL(/\/daily-promos/);
  });

  test('the back button closes it instead of leaving the page', async ({ page }) => {
    await page.locator('.image-zoom').first().click();
    await expect(page.locator('#image-lightbox')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#image-lightbox')).toBeHidden();
    await expect(page).toHaveURL(/\/daily-promos/);
    await expect(page.locator('.promo-card').first()).toBeVisible();
  });

  test('a card has a Map button only when its promo has a Google Maps link', async ({ page }) => {
    const withMap = promos.filter((p: { googleMapsUrl?: string }) => p.googleMapsUrl?.trim());
    await expect(page.locator('.promo-card a', { hasText: /^\s*Map\s*$/ })).toHaveCount(withMap.length);
  });

  test('it opens again after being closed', async ({ page }) => {
    const zoom = page.locator('.image-zoom').first();
    await zoom.click();
    await page.locator('#image-lightbox').click();
    await expect(page.locator('#image-lightbox')).toBeHidden();
    await zoom.click();
    await expect(page.locator('#image-lightbox')).toBeVisible();
  });
});

// Ivan, 2026-10-13: "as i check Food&Dining if i click the picture its not zooming".
test('a Food & Dining venue picture opens whole, on the card and in the MORE popup', async ({ page }) => {
  await page.goto('/canggu/food');
  const lightbox = page.locator('#image-lightbox');
  const zoom = page.locator('.image-zoom').first();
  const name = (await zoom.locator('img').getAttribute('alt')) || '';
  // The venue grid is a React island: wait until it is live before tapping.
  await page.waitForTimeout(1500);

  await zoom.click();
  await expect(lightbox).toBeVisible();
  await expect(page.locator('#image-lightbox-img')).toHaveAttribute('alt', name);
  await page.goBack();
  await expect(lightbox).toBeHidden();
  await expect(page).toHaveURL(/\/canggu\/food/);

  // The popup stops clicks from leaving itself; the picture inside it must still open.
  await page.getByRole('button', { name: 'MORE' }).first().click();
  await page.locator('.fixed .image-zoom').click();
  await expect(lightbox).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
  // Closing the picture leaves the popup open underneath.
  await expect(page.locator('.fixed h2', { hasText: name })).toBeVisible();
});

for (const path of ['/happy-hour', '/events']) {
  test(`a picture on ${path} opens whole`, async ({ page }) => {
    await page.goto(path);
    // Events only lists upcoming ones; with none in the file there is no card to tap.
    test.skip((await page.locator('.event-card, .hh-card').count()) === 0, `no cards on ${path} right now`);
    const zoom = page.locator('.image-zoom').first();
    await expect(zoom).toHaveAttribute('data-zoom', /\S/);
    await zoom.click();
    await expect(page.locator('#image-lightbox')).toBeVisible();
    await page.locator('#image-lightbox').click();
    await expect(page.locator('#image-lightbox')).toBeHidden();
  });
}
