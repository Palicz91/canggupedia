import { describe, it, expect } from 'vitest';
import { hubSections } from '../src/lib/hub';

const cfg = {
  food: { title: 'Food & Dining', description: 'Eat', subcategories: [{ name: 'Brunch', value: 'brunch' }, { name: 'Dinner', value: 'dinner' }] },
  wellness: { title: 'Wellness', description: 'Relax', subcategories: [{ name: 'Yoga', value: 'yoga' }] },
};

describe('hubSections', () => {
  it('uses CMS titles and drops empty types and sections', () => {
    const venues = [
      { location: 'canggu', category: 'food', subcategory: ['brunch'] },
      { location: 'uluwatu', category: 'wellness', subcategory: 'yoga' },
    ];
    expect(hubSections(cfg, venues, 'canggu')).toEqual([
      { key: 'food', title: 'Food & Dining', description: 'Eat', types: ['Brunch'] },
    ]);
  });
  it('returns nothing for an area without venues', () => {
    expect(hubSections(cfg, [], 'canggu')).toEqual([]);
  });
});
