import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { subOrdersFor, mergeOrder } from '../src/lib/venues';

/**
 * The whole point of the feature, checked on the rendered page rather than in a unit test.
 *
 * The unit tests prove mergeOrder and sortVenues agree with each other. They cannot prove the
 * order file reaches VenueGrid, that the tab filter runs before the sort, or that hydration does
 * not reshuffle what the server rendered. Every real bug in this area so far survived green unit
 * tests, so this walks the actual site.
 */
const order = JSON.parse(readFileSync('src/data/venue-order/canggu.json', 'utf8'));

async function cardNames(page: import('@playwright/test').Page) {
  return (await page.locator('div.p-6 h3').allInnerTexts()).map((t) => t.trim());
}

test('the Food page follows the section order file', async ({ page }) => {
  await page.goto('/canggu/food');
  await page.waitForTimeout(1500);

  const names = await cardNames(page);
  expect(names.length).toBeGreaterThan(0);

  // Whatever the file lists first must be the first card on the All tab.
  const firstId = order.food[0];
  const firstName = JSON.parse(
    readFileSync(`src/data/venues/food/${firstId}.json`, 'utf8'),
  ).name;
  expect(names[0]).toBe(firstName);
});

test('a tab shows only that type, in the order the tab list gives it', async ({ page }) => {
  await page.goto('/canggu/food');
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Dinner', exact: true }).click();
  await page.waitForTimeout(800);

  const names = await cardNames(page);
  expect(names.length).toBeGreaterThan(0);

  // Rebuild the expected order the same way the page is supposed to: the tab's own list in front,
  // the section order behind it. Today no tab list is set, so this asserts the inherit path.
  //
  // Resolve id -> name, never name -> id. Four venues share a name with another entry (see the
  // duplicate-name note in the README), so a name lookup silently picks the wrong id and reports
  // a shuffle that is not there.
  const expected = mergeOrder(subOrdersFor(order, 'food')['dinner'], order.food)
    .map((id) => {
      try {
        return JSON.parse(readFileSync(`src/data/venues/food/${id}.json`, 'utf8'));
      } catch {
        return null; // an id left behind by a deleted venue
      }
    })
    .filter((v) => v && v.location === 'canggu' && v.subcategory?.includes('dinner'))
    .map((v) => v!.name);

  // Everything the order file lists comes first, in exactly its order. Venues missing from the
  // file — Billy Ho today — fall in behind, which is what puts a new venue at the bottom.
  expect(names.slice(0, expected.length)).toEqual(expected);
});
