import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { subOrderKey, subOrdersFor, sortVenues, type VenueLike } from '../src/lib/venues';

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
