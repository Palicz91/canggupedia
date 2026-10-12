import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { uniqueKeys, slugify } from '../src/data/category-config';

describe('uniqueKeys', () => {
  const key = (name: string) => slugify(name);

  it('keeps keys that are already unique', () => {
    expect(uniqueKeys(['Brunch', 'Dinner'], key, 'type')).toEqual(['brunch', 'dinner']);
  });

  it('suffixes a repeated name instead of producing two identical keys', () => {
    expect(uniqueKeys(['Brunch', 'Brunch', 'brunch!'], key, 'type')).toEqual(['brunch', 'brunch-2', 'brunch-3']);
  });

  it('gives a symbol-only name a fallback key rather than an empty one', () => {
    expect(uniqueKeys(['🍕', '!!'], key, 'type')).toEqual(['type', 'type-2']);
  });
});

// The admin's preSave runs the plain-script copy in public/admin/helpers.js.
const H = (() => {
  const g: Record<string, unknown> = {};
  new Function('self', readFileSync('public/admin/helpers.js', 'utf8'))(g);
  return g.CpHelpers as {
    uniqueKey(base: string, taken: string[], fallback: string): string;
    sortByWeekday<T>(items: T[], dayOf: (item: T) => string): T[];
  };
})();

describe('admin uniqueKey', () => {
  it('matches uniqueKeys for the same names', () => {
    const names = ['Brunch', 'Brunch', '🍕', 'Dinner', '!!'];
    const taken: string[] = [];
    for (const n of names) taken.push(H.uniqueKey(slugify(n), taken, 'type'));
    expect(taken).toEqual(uniqueKeys(names, slugify, 'type'));
  });
});

describe('sortByWeekday', () => {
  it('puts promos in week order and keeps same-day order', () => {
    const items = [
      { day: 'Wednesday', t: 'a' }, { day: 'Monday', t: 'b' }, { day: 'Sunday', t: 'c' },
      { day: 'Monday', t: 'd' }, { day: '', t: 'e' },
    ];
    expect(H.sortByWeekday(items, (i) => i.day).map((i) => i.t)).toEqual(['b', 'd', 'a', 'c', 'e']);
  });
});
