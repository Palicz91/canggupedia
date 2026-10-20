/**
 * Deals (promos, events, happy hours) can be posted once for both areas. Venues cannot: a venue sits
 * in one place, and its area decides which page it lives on.
 */
export const BOTH_AREAS = 'both';

/** True when a deal saved with `location` belongs on the `area` page (canggu, uluwatu). */
export function showsInArea(location: string | null | undefined, area: string): boolean {
  return location === area || location === BOTH_AREAS;
}
