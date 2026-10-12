import categoriesData from './categories.json';

export interface SubcategoryConfig { name: string; value: string }
export interface CategoryConfig { title: string; description: string; subcategories: SubcategoryConfig[] }

export const locations: Record<string, string> = { canggu: 'Canggu', uluwatu: 'Uluwatu' };

export function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Keys must be non-empty and unique: the order screen builds one field per key, and two fields with
 * the same name (two types both called "Brunch", or a symbol-only name that slugifies to "") stop
 * the whole admin loading. The admin's preSave already stores unique keys; this covers files saved
 * before that, or edited by hand.
 */
export function uniqueKeys<T>(items: T[], keyOf: (item: T) => string, fallback: string): string[] {
  const seen = new Set<string>();
  return items.map((item) => {
    const base = keyOf(item) || fallback;
    let key = base;
    for (let n = 2; seen.has(key); n++) key = `${base}-${n}`;
    seen.add(key);
    return key;
  });
}

const rawCategories = categoriesData.categories.filter((c) => c && c.title);
const categoryKeys = uniqueKeys(rawCategories, (c) => c.value || slugify(c.title), 'section');

export const categories = rawCategories.map((c, i) => {
  const subs = (c.subcategories || []).filter((s) => s && s.name);
  const subKeys = uniqueKeys(subs, (s) => s.value || slugify(s.name), 'type');
  return {
    value: categoryKeys[i],
    title: c.title,
    description: c.description,
    subcategories: subs.map((s, j) => ({ name: s.name, value: subKeys[j] })),
  };
});

function buildFor(locationLabel: string): Record<string, CategoryConfig> {
  return Object.fromEntries(
    categories.map((c) => [
      c.value,
      { title: c.title, description: `${c.description} in ${locationLabel}`, subcategories: c.subcategories },
    ]),
  );
}

export const categoryConfigs: Record<string, Record<string, CategoryConfig>> = Object.fromEntries(
  Object.entries(locations).map(([key, label]) => [key, buildFor(label)]),
);
