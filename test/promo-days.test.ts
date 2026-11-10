import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { promoDays, promosForDay } from '../src/lib/promo-days';

// The admin (order screen, preSave) runs the plain-script copy in public/admin/helpers.js.
type P = { id?: string; day?: string; days?: string[] };
const H = (() => {
  const g: Record<string, unknown> = {};
  new Function('self', readFileSync('public/admin/helpers.js', 'utf8'))(g);
  return g.CpHelpers as {
    promoDays(p: P): string[];
    promosForDay<T extends P>(promos: T[], order: Record<string, string[]> | undefined, day: string): T[];
    cleanPromoOrder(promos: P[], order: Record<string, string[]> | undefined): Record<string, string[]> | null;
  };
})();

const promos: P[] = [
  { id: 'a', days: ['Thursday', 'Tuesday'] },
  { id: 'b', day: 'Tuesday' },
  { id: 'c', days: ['Tuesday'] },
  { id: 'd', days: ['Thursday'] },
  { id: 'e', days: [] },
];

for (const [name, impl] of [['site (TS)', { promoDays, promosForDay }], ['admin (helpers.js)', H]] as const) {
  describe(`multi-day promos: ${name}`, () => {
    it('reads days, falls back to the old single day, and puts them in week order', () => {
      expect(impl.promoDays(promos[0])).toEqual(['Tuesday', 'Thursday']);
      expect(impl.promoDays(promos[1])).toEqual(['Tuesday']);
      expect(impl.promoDays({ days: [], day: 'Monday' })).toEqual(['Monday']);
      expect(impl.promoDays(promos[4])).toEqual([]);
    });

    it('a two-day promo is on both days, in file order without a stored order', () => {
      expect(impl.promosForDay(promos, undefined, 'Tuesday').map((p) => p.id)).toEqual(['a', 'b', 'c']);
      expect(impl.promosForDay(promos, undefined, 'Thursday').map((p) => p.id)).toEqual(['a', 'd']);
    });

    it('each day has its own order; unlisted promos follow in file order', () => {
      const order = { Tuesday: ['c', 'a'], Thursday: ['d'] };
      expect(impl.promosForDay(promos, order, 'Tuesday').map((p) => p.id)).toEqual(['c', 'a', 'b']);
      expect(impl.promosForDay(promos, order, 'Thursday').map((p) => p.id)).toEqual(['d', 'a']);
    });
  });
}

describe('cleanPromoOrder', () => {
  it('drops ids no longer on that day, duplicates and empty days', () => {
    const order = { Tuesday: ['c', 'gone', 'c', 'd', 'a'], Thursday: ['b'], Funday: ['a'] };
    expect(H.cleanPromoOrder(promos, order)).toEqual({ Tuesday: ['c', 'a'] });
  });
  it('returns null when nothing is left', () => {
    expect(H.cleanPromoOrder(promos, { Monday: ['a'] })).toBeNull();
    expect(H.cleanPromoOrder(promos, undefined)).toBeNull();
  });
});
