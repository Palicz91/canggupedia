import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { subOrderKey, subOrdersFor, sortVenues, mergeOrder, type VenueLike } from '../src/lib/venues';

const AREAS = ['canggu', 'uluwatu'];

function orderFile(area: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`src/data/venue-order/${area}.json`, 'utf8'));
}

describe('subOrderKey', () => {
  it('joins section and type with a double underscore', () => {
    expect(subOrderKey('food', 'dinner')).toBe('food__dinner');
  });

  it('produces a prefix when the type is blank', () => {
    expect(subOrderKey('food', '')).toBe('food__');
  });
});

describe('subOrdersFor', () => {
  it('picks out only the requested section', () => {
    const file = { food: ['a'], food__dinner: ['b'], hangout__bars: ['c'] };
    expect(subOrdersFor(file, 'food')).toEqual({ dinner: ['b'] });
  });

  it('ignores the section list itself', () => {
    expect(subOrdersFor({ food: ['a', 'b'] }, 'food')).toEqual({});
  });

  it('drops empty lists so the type falls back to the section order', () => {
    // Opening a type list in the CMS and saving without dragging writes []. That must mean
    // "inherit", not "order by nothing".
    expect(subOrdersFor({ food__dinner: [] }, 'food')).toEqual({});
  });

  it('ignores values that are not arrays', () => {
    expect(subOrdersFor({ food__dinner: 'oops' }, 'food')).toEqual({});
  });

  it('reads the real order files without error', () => {
    for (const area of AREAS) {
      const file = orderFile(area);
      for (const category of ['food', 'hangout', 'wellness', 'fun-family']) {
        expect(() => subOrdersFor(file, category)).not.toThrow();
      }
    }
  });
});

describe('mergeOrder', () => {
  it('inherits the section order when the type list is empty or missing', () => {
    expect(mergeOrder(undefined, ['a', 'b'])).toEqual(['a', 'b']);
    expect(mergeOrder([], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('puts the type list first and keeps the section order behind it', () => {
    expect(mergeOrder(['c'], ['a', 'b', 'c', 'd'])).toEqual(['c', 'a', 'b', 'd']);
  });

  it('does not repeat a venue that appears in both lists', () => {
    const merged = mergeOrder(['b', 'a'], ['a', 'b', 'c']);
    expect(merged).toEqual(['b', 'a', 'c']);
    expect(new Set(merged).size).toBe(merged.length);
  });

  it('keeps a pinned venue that is missing from the section order', () => {
    expect(mergeOrder(['new'], ['a', 'b'])).toEqual(['new', 'a', 'b']);
  });

  it('collapses a venue listed twice down to its first position', () => {
    expect(mergeOrder(['a', 'b', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('a venue added to a list twice still sorts by its first position', () => {
  // Nothing in the CMS stops Ivan adding the same venue twice. Ranking by the last occurrence
  // would drop a venue he dragged to the top down to wherever the duplicate sat.
  const venues: VenueLike[] = [
    { id: 'a', name: 'A', subcategory: ['dinner'] },
    { id: 'b', name: 'B', subcategory: ['dinner'] },
    { id: 'c', name: 'C', subcategory: ['dinner'] },
  ];

  it('keeps the first position when an id repeats in the order list', () => {
    expect(sortVenues(venues, ['dinner'], ['a', 'b', 'a', 'c']).map((v) => v.id)).toEqual([
      'a', 'b', 'c',
    ]);
  });
});

describe('pinning one venue to a tab does not reshuffle the rest', () => {
  // The regression this exists for. Ivan drags Woods Bali to the top of the whole Food section,
  // then separately pins Billy Ho to the top of Dinner. Before mergeOrder, that second action
  // unranked every other dinner venue and dropped Woods Bali from 1st to last, because the type
  // list replaced the section order instead of sitting in front of it.
  const venues: VenueLike[] = [
    { id: 'woods', name: 'Woods Bali', subcategory: ['dinner'] },
    { id: 'avocado', name: 'Avocado Factory', subcategory: ['dinner'] },
    { id: 'skool', name: 'Skool', subcategory: ['dinner'] },
    { id: 'billy-ho', name: 'Billy Ho', subcategory: ['dinner'] },
  ];
  const subOrder = ['dinner'];
  const sectionOrder = ['woods', 'avocado', 'skool', 'billy-ho'];

  it('inherits his dragged section order when the type list is empty', () => {
    const order = mergeOrder(undefined, sectionOrder);
    expect(sortVenues(venues, subOrder, order).map((v) => v.id)).toEqual([
      'woods', 'avocado', 'skool', 'billy-ho',
    ]);
  });

  it('moves only the pinned venue and leaves the others in his order', () => {
    const order = mergeOrder(['billy-ho'], sectionOrder);
    expect(sortVenues(venues, subOrder, order).map((v) => v.id)).toEqual([
      'billy-ho', 'woods', 'avocado', 'skool',
    ]);
  });
});

describe('sortVenues with a per-type order', () => {
  const venues: VenueLike[] = [
    { id: 'avocado', name: 'Avocado', subcategory: ['brunch', 'dinner'] },
    { id: 'billy-ho', name: 'Billy Ho', subcategory: ['dinner', 'brunch'] },
    { id: 'crate', name: 'Crate', subcategory: ['brunch'] },
  ];
  const subOrder = ['brunch', 'dinner'];

  it('follows the section order when no type order is given', () => {
    const sectionOrder = ['avocado', 'crate', 'billy-ho'];
    expect(sortVenues(venues, subOrder, sectionOrder).map((v) => v.id)).toEqual([
      'avocado',
      'crate',
      'billy-ho',
    ]);
  });

  it('puts Billy Ho first on the Dinner tab without moving him in the section', () => {
    // The exact thing Ivan asked for: "How to make lets say Dinner - Billy Ho is no 1?"
    const sectionOrder = ['avocado', 'crate', 'billy-ho'];
    const dinnerOrder = ['billy-ho', 'avocado'];

    const dinnerVenues = venues.filter((v) => v.subcategory.includes('dinner'));
    expect(sortVenues(dinnerVenues, subOrder, dinnerOrder).map((v) => v.id)).toEqual([
      'billy-ho',
      'avocado',
    ]);

    // ...and the whole section is untouched.
    expect(sortVenues(venues, subOrder, sectionOrder).map((v) => v.id)[0]).toBe('avocado');
  });

  it('leaves a venue missing from the type order at the bottom', () => {
    const dinnerVenues = venues.filter((v) => v.subcategory.includes('dinner'));
    expect(sortVenues(dinnerVenues, subOrder, ['billy-ho']).map((v) => v.id)).toEqual([
      'billy-ho',
      'avocado',
    ]);
  });
});
