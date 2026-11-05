import { describe, it, expect } from 'vitest';
import { areaBoxes, BOX_ORDER } from '../src/lib/area-boxes';
import { hubSections } from '../src/lib/hub';
import { categoryConfigs } from '../src/data/category-config';

const boxes = (area: string, deals: { location: string }[] = []) =>
  areaBoxes(area, hubSections(categoryConfigs[area], [], area), deals);

describe('areaBoxes', () => {
  it.each(['canggu', 'uluwatu'])('shows all 12 boxes in the agreed order on %s', (area) => {
    expect(boxes(area).map((b) => b.key)).toEqual(BOX_ORDER);
    expect(BOX_ORDER).toHaveLength(12);
  });

  it('marks a section with no venues Coming Soon and links it to its area page', () => {
    const byob = boxes('canggu').find((b) => b.key === 'byob')!;
    expect(byob.subcategories).toEqual(['Coming Soon']);
    expect(byob.href).toBe('/canggu/byob');
  });

  it('gives every box a style of its own', () => {
    expect(boxes('canggu').every((b) => !b.gradient.includes('gray'))).toBe(true);
  });

  it('counts a deal for both areas on each page, and not one for the other area', () => {
    const tag = (area: string, location: string) =>
      boxes(area, [{ location }]).find((b) => b.key === 'deals')!.subcategories[0];
    expect(tag('uluwatu', 'both')).toBe('Everyday & Limited Time');
    expect(tag('canggu', 'canggu')).toBe('Everyday & Limited Time');
    expect(tag('uluwatu', 'canggu')).toBe('Coming Soon');
  });
});
