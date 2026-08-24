import { describe, it, expect } from 'vitest';
import { toHref } from '../src/lib/links';
import { sortVenues, visibleSubcategories, subsOf } from '../src/lib/venues';

describe('toHref', () => {
  const cases: [string, string | undefined, string | undefined][] = [
    ['', undefined, undefined],
    ['  ', undefined, undefined],
    ['https://maps.app.goo.gl/x', undefined, 'https://maps.app.goo.gl/x'],
    ['http://example.com', undefined, 'http://example.com'],
    ['wa.me/6281139619892', undefined, 'https://wa.me/6281139619892'],
    ['/wa.me/628', undefined, 'https://wa.me/628'],
    ['maps.app.goo.gl/1gSM', undefined, 'https://maps.app.goo.gl/1gSM'],
    ['@cratecafe', 'instagram', 'https://instagram.com/cratecafe'],
    ['cratecafe', 'instagram', 'https://instagram.com/cratecafe'],
    ['instagram.com/cratecafe', 'instagram', 'https://instagram.com/cratecafe'],
    ['www.instagram.com/cratecafe/', 'instagram', 'https://instagram.com/cratecafe'],
    ['https://instagram.com/cratecafe', 'instagram', 'https://instagram.com/cratecafe'],
    ['bali.socialclub', 'instagram', 'https://bali.socialclub'],
  ];

  for (const [input, kind, expected] of cases) {
    it(`${kind ? kind + ' ' : ''}"${input}" → ${expected === undefined ? 'undefined' : `"${expected}"`}`, () => {
      expect(toHref(input, kind as 'instagram' | undefined)).toBe(expected);
    });
  }
});

describe('sortVenues', () => {
  it('featured first, then type order, then numeric id', () => {
    const venues = [
      { id: 'c-brunch-3', name: 'C', featured: false, subcategory: ['brunch'] },
      { id: 'c-dinner-1', name: 'D', featured: false, subcategory: ['dinner'] },
      { id: 'c-brunch-1', name: 'A', featured: true, subcategory: ['brunch'] },
      { id: 'c-brunch-2', name: 'B', featured: false, subcategory: ['brunch'] },
    ];
    const sorted = sortVenues(venues, ['brunch', 'dinner']);
    expect(sorted.map((v) => v.id)).toEqual([
      'c-brunch-1', 'c-brunch-2', 'c-brunch-3', 'c-dinner-1',
    ]);
  });

  it('venues without trailing number sort after numbered ones alphabetically', () => {
    const venues = [
      { id: 'new-place', name: 'New Place', featured: false, subcategory: ['brunch'] },
      { id: 'c-brunch-2', name: 'B', featured: false, subcategory: ['brunch'] },
      { id: 'c-brunch-1', name: 'A', featured: false, subcategory: ['brunch'] },
    ];
    const sorted = sortVenues(venues, ['brunch']);
    expect(sorted.map((v) => v.id)).toEqual(['c-brunch-1', 'c-brunch-2', 'new-place']);
  });
});

describe('visibleSubcategories', () => {
  it('drops a type with zero venues', () => {
    const subs = [
      { name: 'Brunch', value: 'brunch' },
      { name: 'Healthy', value: 'healthy' },
    ];
    const venues = [
      { id: 'a', name: 'A', subcategory: ['brunch'] },
    ];
    const result = visibleSubcategories(subs, venues);
    expect(result.map((s) => s.value)).toEqual(['brunch']);
  });
});

describe('subsOf', () => {
  it('handles array subcategory', () => {
    expect(subsOf({ id: 'a', name: 'A', subcategory: ['brunch', 'dinner'] })).toEqual(['brunch', 'dinner']);
  });
  it('handles string subcategory', () => {
    expect(subsOf({ id: 'a', name: 'A', subcategory: 'brunch' })).toEqual(['brunch']);
  });
  it('handles empty subcategory', () => {
    expect(subsOf({ id: 'a', name: 'A', subcategory: [] })).toEqual([]);
  });
});
