import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Promo cards crop their picture to a wide strip, so a tap has to show the whole thing. Checked on
 * the rendered page: the full picture must be the original (not the crop), and every way of
 * closing it (tap, Escape, the back button) must leave the visitor on the promos page.
 */
const promos = JSON.parse(readFileSync('src/data/daily-promos.json', 'utf8')).daily_promos;
const first = promos.find((p: { imageUrl?: string }) => p.imageUrl);

test.beforeEach(async ({ page }) => {
  await page.goto('/daily-promos');
});

test('tapping a promo picture shows the whole original picture', async ({ page }) => {
  const lightbox = page.locator('#promo-lightbox');
  await expect(lightbox).toBeHidden();

  await page.getByRole('button', { name: `Show the full picture: ${first.title}` }).click();
  await expect(lightbox).toBeVisible();

  const img = page.locator('#promo-lightbox-img');
  await expect(img).toHaveAttribute('src', first.imageUrl);
  await expect(img).toHaveAttribute('alt', first.title);
  // object-contain: the whole picture fits inside the screen, nothing cut off.
  await expect(img).toHaveCSS('object-fit', 'contain');
});

test('a tap on the open picture closes it', async ({ page }) => {
  await page.locator('.promo-zoom').first().click();
  await page.locator('#promo-lightbox').click();
  await expect(page.locator('#promo-lightbox')).toBeHidden();
  await expect(page).toHaveURL(/\/daily-promos/);
});

test('Escape closes it', async ({ page }) => {
  await page.locator('.promo-zoom').first().click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#promo-lightbox')).toBeHidden();
  await expect(page).toHaveURL(/\/daily-promos/);
});

test('the back button closes it instead of leaving the page', async ({ page }) => {
  await page.locator('.promo-zoom').first().click();
  await expect(page.locator('#promo-lightbox')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#promo-lightbox')).toBeHidden();
  await expect(page).toHaveURL(/\/daily-promos/);
  await expect(page.locator('.promo-card').first()).toBeVisible();
});

test('a card has a Map button only when its promo has a Google Maps link', async ({ page }) => {
  const withMap = promos.filter((p: { googleMapsUrl?: string }) => p.googleMapsUrl?.trim());
  await expect(page.locator('.promo-card a', { hasText: /^\s*Map\s*$/ })).toHaveCount(withMap.length);
});

test('it opens again after being closed', async ({ page }) => {
  const zoom = page.locator('.promo-zoom').first();
  await zoom.click();
  await page.locator('#promo-lightbox').click();
  await expect(page.locator('#promo-lightbox')).toBeHidden();
  await zoom.click();
  await expect(page.locator('#promo-lightbox')).toBeVisible();
});
