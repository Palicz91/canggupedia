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

export const categories = categoriesData.categories.map((c) => ({
  value: c.value || slugify(c.title),
  title: c.title,
  description: c.description,
  subcategories: (c.subcategories || [])
    .filter((s) => s && s.name)
    .map((s) => ({ name: s.name, value: s.value || slugify(s.name) })),
}));

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
