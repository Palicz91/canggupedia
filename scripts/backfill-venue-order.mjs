/**
 * Seeds src/data/venue-order/<area>.json from the order the site currently renders.
 *
 * Run once when introducing hand-dragged ordering, and again only if the order files
 * ever need rebuilding from scratch. Re-running OVERWRITES whatever Ivan has dragged.
 *
 * The comparator below mirrors the fallback branch of sortVenues() in src/lib/venues.ts.
 * Keep them in step, or a rebuild will silently reshuffle the site.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VENUES_DIR = 'src/data/venues';
const OUT_DIR = 'src/data/venue-order';
const AREAS = ['canggu', 'uluwatu'];

const categoriesData = JSON.parse(readFileSync('src/data/categories.json', 'utf8'));
const slugify = (s) =>
  String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const categories = categoriesData.categories.map((c) => ({
  value: c.value || slugify(c.title),
  subOrder: (c.subcategories || []).filter((s) => s && s.name).map((s) => s.value || slugify(s.name)),
}));

const subsOf = (v) => (Array.isArray(v.subcategory) ? v.subcategory : v.subcategory ? [v.subcategory] : []);

function legacyCompare(subOrder) {
  return (a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    const subDiff = subOrder.indexOf(subsOf(a)[0]) - subOrder.indexOf(subsOf(b)[0]);
    if (subDiff !== 0) return subDiff;
    const aNum = parseInt(a.id.match(/-(\d+)$/)?.[1] || '', 10);
    const bNum = parseInt(b.id.match(/-(\d+)$/)?.[1] || '', 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    if (Number.isNaN(aNum) !== Number.isNaN(bNum)) return Number.isNaN(aNum) ? 1 : -1;
    return a.name.localeCompare(b.name);
  };
}

const venues = [];
for (const { value: category } of categories) {
  const dir = join(VENUES_DIR, category);
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    venues.push({ ...data, id: data.id || f.replace(/\.json$/, ''), category });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
for (const area of AREAS) {
  const out = {};
  for (const { value: category, subOrder } of categories) {
    out[category] = venues
      .filter((v) => v.location === area && v.category === category)
      .sort(legacyCompare(subOrder))
      .map((v) => v.id);
  }
  const path = join(OUT_DIR, `${area}.json`);
  writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
  const counts = Object.entries(out).map(([k, v]) => `${k}=${v.length}`).join(' ');
  console.log(`${path}  ${counts}`);
}
