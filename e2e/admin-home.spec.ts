import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { seedAdmin, loginAdmin } from './seed';

const home = JSON.parse(readFileSync('src/data/home.json', 'utf8'));

test('the home page screen loads the real front-page content', async ({ page }) => {
  await seedAdmin(page);
  await loginAdmin(page);
  await page.goto('/admin/#/collections/home/entries/home');
  await page.waitForTimeout(6000);

  // The text Ivan sees must be the text the site renders. If home.json and the field names ever
  // drift apart the widgets render blank, which saves cleanly and wipes the front page.
  await expect(page.locator(`input[value="${home.title}"]`)).toBeVisible();
  await expect(page.getByText(home.intro, { exact: false })).toBeVisible();

  // Both photos resolve to a real preview rather than an empty image widget.
  for (const src of [home.cangguImage, home.uluwatuImage]) {
    await expect(page.locator(`img[src$="${src.split('/').pop()}"]`).first()).toBeVisible();
  }
});
