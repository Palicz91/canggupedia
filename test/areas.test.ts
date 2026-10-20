import { describe, it, expect } from 'vitest';
import { showsInArea, BOTH_AREAS } from '../src/lib/areas';

describe('showsInArea', () => {
  it('shows a deal on its own area page only', () => {
    expect(showsInArea('canggu', 'canggu')).toBe(true);
    expect(showsInArea('canggu', 'uluwatu')).toBe(false);
    expect(showsInArea('uluwatu', 'uluwatu')).toBe(true);
  });

  it('shows a deal saved for both areas on both pages', () => {
    expect(showsInArea(BOTH_AREAS, 'canggu')).toBe(true);
    expect(showsInArea(BOTH_AREAS, 'uluwatu')).toBe(true);
  });

  it('hides a deal with no area from every area page', () => {
    expect(showsInArea(null, 'canggu')).toBe(false);
    expect(showsInArea(undefined, 'uluwatu')).toBe(false);
  });
});
