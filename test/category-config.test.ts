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
    canonical(v: unknown): string;
    decodeBase64Utf8(b64: string): string;
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

describe('canonical (the admin save guard)', () => {
  it('treats the same JSON as equal whatever the key order, spacing or trailing newline', () => {
    const file = '{\n  "daily_promos": [\n    { "id": "a", "day": "Monday" }\n  ]\n}\n';
    expect(H.canonical(file)).toBe(H.canonical({ daily_promos: [{ day: 'Monday', id: 'a' }] }));
  });

  it('sees a changed value or a reordered list as a change', () => {
    const before = '{"items":[{"id":"a"},{"id":"b"}]}';
    expect(H.canonical(before)).not.toBe(H.canonical('{"items":[{"id":"b"},{"id":"a"}]}'));
    expect(H.canonical(before)).not.toBe(H.canonical('{"items":[{"id":"a"},{"id":"c"}]}'));
  });

  it('drops undefined fields like JSON.stringify does', () => {
    expect(H.canonical({ a: 1, b: undefined })).toBe(H.canonical('{"a":1}'));
  });

  it('compares text that is not JSON as trimmed text', () => {
    expect(H.canonical('title: x\n')).toBe(H.canonical('title: x'));
    expect(H.canonical('title: x')).not.toBe(H.canonical('title: y'));
  });
});

describe('decodeBase64Utf8', () => {
  it('decodes GitHub contents-API base64, line breaks and non-ASCII included', () => {
    const text = '{"title":"Brochette Monday – Café 🍢"}\n';
    const b64 = Buffer.from(text, 'utf8').toString('base64').replace(/(.{60})/g, '$1\n');
    expect(H.decodeBase64Utf8(b64)).toBe(text);
  });

  it('returns an empty string for empty input', () => {
    expect(H.decodeBase64Utf8('')).toBe('');
  });
});
