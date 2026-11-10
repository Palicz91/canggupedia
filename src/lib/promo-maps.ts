/**
 * The Map button on a promo or deal card. The promo's own Google Maps link wins; when Ivan left it
 * empty, the card borrows the link from the venue's own page on the site, if that venue is listed.
 *
 * Added 2026-11-10: Ivan typed promos without the link and asked why some cards had no Map button.
 * Names are matched loosely ("La Brisa" = "La Brisa Bali") but must point at exactly one link, so a
 * vague name never sends a guest to the wrong place.
 */
import { toHref } from './links';
import { BOTH_AREAS } from './areas';

export interface MapsVenue { name: string; location?: string; googleMapsUrl?: string }

const AREA_WORDS = new Set(['bali', 'canggu', 'uluwatu']);

/** "La Brisa Bali" and "la brisa" both become "labrisa". */
export function venueKey(name: string | undefined): string {
  return (name || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !AREA_WORDS.has(word))
    .join('');
}

export function promoMapsHref(
  promo: { venue: string; location?: string; googleMapsUrl?: string },
  venues: MapsVenue[],
): string | undefined {
  const own = toHref(promo.googleMapsUrl);
  if (own) return own;

  const key = venueKey(promo.venue);
  if (!key) return undefined;

  const anyArea = !promo.location || promo.location === BOTH_AREAS;
  const links = new Set<string>();
  for (const venue of venues) {
    if (venueKey(venue.name) !== key) continue;
    if (!anyArea && venue.location !== promo.location) continue;
    const href = toHref(venue.googleMapsUrl);
    if (href) links.add(href);
  }
  return links.size === 1 ? [...links][0] : undefined;
}
