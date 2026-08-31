import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { categories } from '../src/data/category-config';
import { mergeOrder, sortVenues, subsOf } from '../src/lib/venues';

/**
 * The venue-order widget shows Ivan a numbered list and tells him it is the order the page will
 * use. It cannot import src/lib/venues.ts — it is a plain script the CMS page loads from /admin/ —
 * so public/admin/helpers.js carries a hand port, and this runs both over every real list in
 * src/data. A drift here is worse than the hours one: the widget would be lying about the single
 * thing it exists to control, and the lie is invisible until someone compares the CMS to the site.
 *
 * Evaluated the way a browser does rather than imported: Vite rewrites the UMD wrapper's `module`
 * check on import and sends it down the wrong branch (see test/hours.test.ts).
 */
const CpHelpers = (() => {
  const src = readFileSync('public/admin/helpers.js', 'utf8');
  const globalStub: Record<string, unknown> = {};
  new Function('self', src)(globalStub);
  return globalStub.CpHelpers as {
    effectiveOrder(
      venues: unknown[],
      stored: string[],
      sectionOrder: string[],
      sub: string | null,
      subOrder: string[],
    ): string[];
  };
})();

interface Venue {
  id: string;
  name: string;
  featured?: boolean;
  subcategory: string | string[];
  location?: string;
}

const AREAS = ['canggu', 'uluwatu'];

function venuesOf(section: string, area: string): Venue[] {
  const dir = join('src/data/venues', section);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Venue)
    .filter((v) => v.location === area);
}

function orderFile(area: string): Record<string, string[]> {
  return JSON.parse(readFileSync(`src/data/venue-order/${area}.json`, 'utf8'));
}

/** What VenueGrid.tsx does for one tab, reduced to the ids it ends up rendering. */
function siteOrder(venues: Venue[], stored: string[], sectionOrder: string[], sub: string | null, subOrder: string[]) {
  const base = sub ? venues.filter((v) => subsOf(v).includes(sub)) : venues;
  const activeOrder = mergeOrder(sub ? stored : undefined, sectionOrder);
  return sortVenues(base, subOrder, activeOrder).map((v) => v.id);
}

describe('the widget orders venues exactly like the website', () => {
  // Every list on the screen: 2 areas x (4 sections + 17 tabs).
  const cases: { name: string; area: string; section: string; sub: string | null; subOrder: string[] }[] = [];
  for (const area of AREAS) {
    for (const cat of categories) {
      cases.push({ name: `${area}/${cat.value}`, area, section: cat.value, sub: null, subOrder: cat.subcategories.map((s) => s.value) });
      for (const sub of cat.subcategories) {
        cases.push({
          name: `${area}/${cat.value}/${sub.value}`,
          area,
          section: cat.value,
          sub: sub.value,
          subOrder: cat.subcategories.map((s) => s.value),
        });
      }
    }
  }

  it('covers every list the CMS renders', () => {
    expect(cases.length).toBe(AREAS.length * categories.reduce((n, c) => n + 1 + c.subcategories.length, 0));
  });

  for (const c of cases) {
    it(`matches on ${c.name}`, () => {
      const venues = venuesOf(c.section, c.area);
      const file = orderFile(c.area);
      const sectionOrder = file[c.section] ?? [];
      const stored = c.sub ? (file[`${c.section}__${c.sub}`] ?? []) : sectionOrder;

      const fromWidget = CpHelpers.effectiveOrder(venues, stored, sectionOrder, c.sub, c.subOrder);
      const fromSite = siteOrder(venues, stored, sectionOrder, c.sub, c.subOrder);

      expect(fromWidget).toEqual(fromSite);
      // Every venue that belongs on the tab is on the screen, exactly once. This is the half Ivan
      // reported: a tab list showing nothing while the tab itself had venues on it.
      const belong = c.sub ? venues.filter((v) => subsOf(v).includes(c.sub!)) : venues;
      expect(fromWidget.length).toBe(belong.length);
      expect(new Set(fromWidget).size).toBe(belong.length);
    });
  }

  it('a hand-pinned tab order still wins over the section order', () => {
    // The inherit path is what the real data exercises today, so pin something and check the
    // widget follows the site into the other branch too.
    const venues = venuesOf('food', 'canggu');
    const section = orderFile('canggu').food;
    const dinner = venues.filter((v) => subsOf(v).includes('dinner')).map((v) => v.id);
    const pinned = [dinner[dinner.length - 1]];
    const subOrder = categories.find((c) => c.value === 'food')!.subcategories.map((s) => s.value);

    const fromWidget = CpHelpers.effectiveOrder(venues, pinned, section, 'dinner', subOrder);
    expect(fromWidget[0]).toBe(pinned[0]);
    expect(fromWidget).toEqual(siteOrder(venues, pinned, section, 'dinner', subOrder));
  });
});
