export interface VenueLike { id: string; name: string; featured?: boolean; subcategory: string | string[] }

export function subsOf(v: VenueLike): string[] {
  return Array.isArray(v.subcategory) ? v.subcategory : v.subcategory ? [v.subcategory] : [];
}

/**
 * Key for a per-type order list inside venue-order/<area>.json, e.g. "food__dinner".
 *
 * A section has one main order plus an optional order per type. Ivan asked for Billy Ho to be
 * first under Dinner without moving him in the full Food & Dining list, which the single
 * per-section list could not express.
 *
 * Both the CMS field names (src/pages/admin/config.yml.ts) and the page that reads them build
 * their keys here, so the two cannot drift apart. Subcategory values are slugified to
 * [a-z0-9-], so a double underscore can never appear inside one and the split is unambiguous.
 */
export function subOrderKey(category: string, subcategory: string): string {
  return `${category}__${subcategory}`;
}

/**
 * Pulls one section's per-type order lists out of a venue-order file, keyed by type.
 *
 * Empty lists are dropped rather than returned as [], so a type Ivan opened and saved without
 * dragging anything still inherits the section order instead of silently ordering by nothing.
 */
export function subOrdersFor(
  orderFile: Record<string, unknown>,
  category: string,
): Record<string, string[]> {
  const prefix = subOrderKey(category, '');
  const out: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(orderFile)) {
    if (!key.startsWith(prefix)) continue;
    if (!Array.isArray(value) || value.length === 0) continue;
    out[key.slice(prefix.length)] = value as string[];
  }

  return out;
}

/**
 * Combines a per-type order with the section order for one tab.
 *
 * A type list is a PREFIX, not a replacement. Ivan only ever wants to pin a venue or two to the
 * top of a tab; everything he did not name should keep the order he already dragged at section
 * level. Treating the type list as the whole order instead would unrank every other venue on
 * that tab and drop them back to the automatic featured/type/name sort — so pinning one venue
 * under Dinner would silently reshuffle the other thirteen. That is the exact surprise this
 * feature exists to remove, so it must not be reintroduced one level down.
 *
 * An empty or missing type list means "inherit", and returns the section order untouched.
 */
export function mergeOrder(typeOrder: string[] | undefined, sectionOrder: string[]): string[] {
  if (!typeOrder?.length) return sectionOrder;
  const pinned = new Set<string>();
  const head: string[] = [];
  for (const id of typeOrder) {
    if (pinned.has(id)) continue;
    pinned.add(id);
    head.push(id);
  }
  return [...head, ...sectionOrder.filter((id) => !pinned.has(id))];
}

/**
 * `orderIds` is the hand-dragged order from src/data/venue-order/<area>.json and wins
 * outright. A venue missing from that list — added since Ivan last dragged, or dropped
 * by mistake — falls back to the original rule and sorts after the ordered ones.
 */
export function sortVenues<T extends VenueLike>(
  venues: T[],
  subOrder: string[],
  orderIds: string[] = [],
): T[] {
  // First occurrence wins. Nothing stops Ivan adding the same venue to a list twice — the CMS
  // relation control has no uniqueness check — and building the map straight from the array
  // would let the later, lower entry overwrite the earlier one, so a venue he dragged to the
  // top would render further down instead. Silent and baffling from his side.
  const rank = new Map<string, number>();
  orderIds.forEach((id, i) => {
    if (!rank.has(id)) rank.set(id, i);
  });
  return [...venues].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;

    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    const subDiff = subOrder.indexOf(subsOf(a)[0]) - subOrder.indexOf(subsOf(b)[0]);
    if (subDiff !== 0) return subDiff;
    const aNum = parseInt(a.id.match(/-(\d+)$/)?.[1] || '', 10);
    const bNum = parseInt(b.id.match(/-(\d+)$/)?.[1] || '', 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    if (Number.isNaN(aNum) !== Number.isNaN(bNum)) return Number.isNaN(aNum) ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

export function visibleSubcategories<S extends { value: string }>(subs: S[], venues: VenueLike[]): S[] {
  return subs.filter((s) => venues.some((v) => subsOf(v).includes(s.value)));
}
