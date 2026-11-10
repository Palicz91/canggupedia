import { describe, it, expect } from 'vitest';
import { promoMapsHref, venueKey } from '../src/lib/promo-maps';

const venues = [
  { name: 'La Brisa Bali', location: 'canggu', googleMapsUrl: 'https://maps.app.goo.gl/brisa' },
  { name: 'Sol Rooftop', location: 'canggu', googleMapsUrl: 'https://maps.app.goo.gl/sol' },
  { name: 'Luna and Sol', location: 'canggu', googleMapsUrl: 'https://maps.app.goo.gl/luna' },
  { name: 'Twin Spot', location: 'canggu', googleMapsUrl: 'https://maps.app.goo.gl/twin-a' },
  { name: 'Twin Spot', location: 'uluwatu', googleMapsUrl: 'https://maps.app.goo.gl/twin-b' },
  { name: 'No Link Cafe', location: 'canggu' },
];

describe('venueKey', () => {
  it('ignores case, punctuation, accents and area words', () => {
    expect(venueKey('La Brisa Bali')).toBe('labrisa');
    expect(venueKey('la brisa')).toBe('labrisa');
    expect(venueKey("Old Man's")).toBe('oldmans');
    expect(venueKey('Café Canggu')).toBe('cafe');
    expect(venueKey('')).toBe('');
  });
});

describe('promoMapsHref', () => {
  it("keeps the promo's own link", () => {
    expect(promoMapsHref({ venue: 'Sol rooftop', location: 'canggu', googleMapsUrl: 'maps.app.goo.gl/own' }, venues))
      .toBe('https://maps.app.goo.gl/own');
  });

  it("borrows the venue's link when the promo has none", () => {
    expect(promoMapsHref({ venue: 'Sol rooftop', location: 'canggu' }, venues)).toBe('https://maps.app.goo.gl/sol');
    expect(promoMapsHref({ venue: 'La Brisa', location: 'canggu', googleMapsUrl: '  ' }, venues))
      .toBe('https://maps.app.goo.gl/brisa');
  });

  it('never matches part of a name', () => {
    expect(promoMapsHref({ venue: 'Sol', location: 'canggu' }, venues)).toBeUndefined();
  });

  it('uses the area to pick between two venues with the same name', () => {
    expect(promoMapsHref({ venue: 'Twin Spot', location: 'uluwatu' }, venues)).toBe('https://maps.app.goo.gl/twin-b');
  });

  it('shows no button when a both-areas promo matches two different places', () => {
    expect(promoMapsHref({ venue: 'Twin Spot', location: 'both' }, venues)).toBeUndefined();
  });

  it('shows no button for an unlisted venue or one without a link', () => {
    expect(promoMapsHref({ venue: 'Warung Gouthe', location: 'canggu' }, venues)).toBeUndefined();
    expect(promoMapsHref({ venue: 'No Link Cafe', location: 'canggu' }, venues)).toBeUndefined();
    expect(promoMapsHref({ venue: 'La Brisa', location: 'uluwatu' }, venues)).toBeUndefined();
  });
});
