export interface VenueLike { id: string; name: string; featured?: boolean; subcategory: string | string[] }

export function subsOf(v: VenueLike): string[] {
  return Array.isArray(v.subcategory) ? v.subcategory : v.subcategory ? [v.subcategory] : [];
}

export function sortVenues<T extends VenueLike>(venues: T[], subOrder: string[]): T[] {
  return [...venues].sort((a, b) => {
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
