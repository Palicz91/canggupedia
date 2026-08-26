export interface VenueLike { id: string; name: string; featured?: boolean; subcategory: string | string[] }

export function subsOf(v: VenueLike): string[] {
  return Array.isArray(v.subcategory) ? v.subcategory : v.subcategory ? [v.subcategory] : [];
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
  const rank = new Map(orderIds.map((id, i) => [id, i]));
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
