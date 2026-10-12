import { readFileSync } from 'node:fs';
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
    ['bali.socialclub', 'instagram', 'https://instagram.com/bali.socialclub'],
    ['@the.lawn.canggu', 'instagram', 'https://instagram.com/the.lawn.canggu'],
    ['instagram.com/cratecafe?igsh=x', 'instagram', 'https://instagram.com/cratecafe'],
    ['mailto:hi@x.com', undefined, 'mailto:hi@x.com'],
    ['tel:+62812', undefined, 'tel:+62812'],
    ['+62 812 3456', undefined, undefined],
    ['crate cafe', undefined, undefined],
    ['crate cafe', 'instagram', undefined],
    ['cratecafe', undefined, undefined],
    ['maps.app.goo.gl/abc', undefined, 'https://maps.app.goo.gl/abc'],
  ];

  for (const [input, kind, expected] of cases) {
    it(`${kind ? kind + ' ' : ''}"${input}" → ${expected === undefined ? 'undefined' : `"${expected}"`}`, () => {
      expect(toHref(input, kind as 'instagram' | undefined)).toBe(expected);
    });
  }
});

// public/admin/helpers.js is the CMS-side mirror. Same inputs, same result, except that it keeps
// the typed text where toHref gives up.
const { fixUrl } = (() => {
  const g: Record<string, unknown> = {};
  new Function('self', readFileSync('public/admin/helpers.js', 'utf8'))(g);
  return g.CpHelpers as { fixUrl(v: unknown, kind?: string): string | undefined };
})();

describe('fixUrl mirrors toHref', () => {
  const inputs: [string, 'instagram' | undefined][] = [
    ['https://maps.app.goo.gl/x', undefined], ['wa.me/628', undefined], ['/wa.me/628', undefined],
    ['mailto:hi@x.com', undefined], ['tel:+62812', undefined], ['maps.app.goo.gl/abc', undefined],
    ['@the.lawn.canggu', 'instagram'], ['@cratecafe', 'instagram'],
    ['instagram.com/cratecafe?igsh=x', 'instagram'], ['https://instagram.com/cratecafe', 'instagram'],
  ];
  for (const [input, kind] of inputs) {
    it(`"${input}" ${kind ?? ''}`, () => expect(fixUrl(input, kind)).toBe(toHref(input, kind)));
  }
  it('keeps what the editor typed when it is not a link', () => {
    expect(fixUrl('  +62 812 3456 ')).toBe('+62 812 3456');
    expect(fixUrl('crate cafe', 'instagram')).toBe('crate cafe');
    expect(fixUrl('cratecafe')).toBe('cratecafe');
  });
  it('empty stays empty', () => {
    expect(fixUrl('')).toBe('');
    expect(fixUrl('   ')).toBe('');
    expect(fixUrl(undefined)).toBe(undefined);
    expect(fixUrl(null)).toBe(null);
  });
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

  it('the dragged order beats both featured and type order', () => {
    const venues = [
      { id: 'c-brunch-1', name: 'A', featured: true, subcategory: ['brunch'] },
      { id: 'c-dinner-1', name: 'D', featured: false, subcategory: ['dinner'] },
      { id: 'c-brunch-2', name: 'B', featured: false, subcategory: ['brunch'] },
    ];
    const sorted = sortVenues(venues, ['brunch', 'dinner'], ['c-dinner-1', 'c-brunch-2', 'c-brunch-1']);
    expect(sorted.map((v) => v.id)).toEqual(['c-dinner-1', 'c-brunch-2', 'c-brunch-1']);
  });

  it('a venue missing from the order list sorts below the ones that are in it', () => {
    const venues = [
      // featured, but unlisted — it still goes last
      { id: 'c-brunch-9', name: 'Z', featured: true, subcategory: ['brunch'] },
      { id: 'c-brunch-1', name: 'A', featured: false, subcategory: ['brunch'] },
      { id: 'c-brunch-2', name: 'B', featured: false, subcategory: ['brunch'] },
    ];
    const sorted = sortVenues(venues, ['brunch'], ['c-brunch-2', 'c-brunch-1']);
    expect(sorted.map((v) => v.id)).toEqual(['c-brunch-2', 'c-brunch-1', 'c-brunch-9']);
  });

  it('an empty order list leaves the old behaviour alone', () => {
    const venues = [
      { id: 'c-brunch-2', name: 'B', featured: false, subcategory: ['brunch'] },
      { id: 'c-brunch-1', name: 'A', featured: true, subcategory: ['brunch'] },
    ];
    expect(sortVenues(venues, ['brunch'], []).map((v) => v.id)).toEqual(['c-brunch-1', 'c-brunch-2']);
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
