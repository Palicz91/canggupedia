import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const VENUES_DIR = 'src/data/venues';
const CATEGORIES = ['food', 'hangout', 'wellness', 'fun-family'];

function allVenueFiles() {
  const files: { path: string; data: any; category: string }[] = [];
  for (const cat of CATEGORIES) {
    const dir = join(VENUES_DIR, cat);
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const path = join(dir, f);
      files.push({ path, data: JSON.parse(readFileSync(path, 'utf8')), category: cat });
    }
  }
  return files;
}

describe('venue data', () => {
  const venues = allVenueFiles();

  it('subcategory is always an array', () => {
    for (const { path, data } of venues) {
      expect(Array.isArray(data.subcategory), `${path} subcategory is not an array`).toBe(true);
    }
  });

  it('featured is always a boolean', () => {
    for (const { path, data } of venues) {
      expect(typeof data.featured, `${path} featured is not boolean`).toBe('boolean');
    }
  });

  it('category matches folder', () => {
    for (const { path, data, category } of venues) {
      expect(data.category, `${path} category mismatch`).toBe(category);
    }
  });

  it('links start with https:// or are empty', () => {
    const linkKeys = ['googleMapsUrl', 'instagramUrl', 'tableBookingUrl', 'guestlistUrl', 'ticketUrl'];
    for (const { path, data } of venues) {
      for (const k of linkKeys) {
        const val = data[k];
        if (val === undefined || val === null || val === '') continue;
        expect(val, `${path} ${k}`).toMatch(/^https?:\/\//);
      }
    }
  });
});
