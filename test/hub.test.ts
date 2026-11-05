import { describe, it, expect } from 'vitest';
import { hubSections } from '../src/lib/hub';

const cfg = {
  food: { title: 'Food & Dining', description: 'Eat', subcategories: [{ name: 'Brunch', value: 'brunch' }, { name: 'Dinner', value: 'dinner' }] },
  wellness: { title: 'Wellness', description: 'Relax', subcategories: [{ name: 'Yoga', value: 'yoga' }] },
};

describe('hubSections', () => {
  it('uses CMS titles, drops empty types and keeps empty sections', () => {
    const venues = [
      { location: 'canggu', category: 'food', subcategory: ['brunch'] },
      { location: 'uluwatu', category: 'wellness', subcategory: 'yoga' },
    ];
    expect(hubSections(cfg, venues, 'canggu')).toEqual([
      { key: 'food', title: 'Food & Dining', description: 'Eat', types: ['Brunch'] },
      { key: 'wellness', title: 'Wellness', description: 'Relax', types: [] },
    ]);
  });
  it('still lists every section for an area without venues', () => {
    expect(hubSections(cfg, [], 'canggu').map((s) => s.key)).toEqual(['food', 'wellness']);
  });
});
