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

describe('venue order files', () => {
  const areas = ['canggu', 'uluwatu'];

  // Deliberately no "every id still exists" check: when Ivan deletes a venue in the CMS the id
  // is left behind here, and sortVenues just ignores it. Failing the build over that would
  // block his next deploy for something harmless.
  it('has one list per category, per area, with no repeated venue', () => {
    for (const area of areas) {
      const path = `src/data/venue-order/${area}.json`;
      const data = JSON.parse(readFileSync(path, 'utf8'));
      expect(Object.keys(data), `${path} categories`).toEqual(CATEGORIES);

      for (const cat of CATEGORIES) {
        const ids = data[cat];
        expect(Array.isArray(ids), `${path} ${cat} is not a list`).toBe(true);
        for (const id of ids) expect(typeof id, `${path} ${cat} holds a non-id`).toBe('string');
        expect(new Set(ids).size, `${path} ${cat} lists a venue twice`).toBe(ids.length);
      }
    }
  });
});
