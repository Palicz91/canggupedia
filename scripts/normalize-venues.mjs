import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const LINK_KEYS = ['googleMapsUrl', 'instagramUrl', 'tableBookingUrl', 'guestlistUrl', 'ticketUrl'];
let changed = 0;

for (const file of globSync('src/data/venues/*/*.json').sort()) {
  const before = readFileSync(file, 'utf8');
  const d = JSON.parse(before);
  if (typeof d.subcategory === 'string') d.subcategory = [d.subcategory];
  if (!Array.isArray(d.subcategory)) d.subcategory = [];
  if (typeof d.featured !== 'boolean') d.featured = Boolean(d.featured);
  for (const k of LINK_KEYS) {
    if (typeof d[k] !== 'string') continue;
    const v = d[k].trim();
    d[k] = v && !/^https?:\/\//i.test(v) ? 'https://' + v.replace(/^\/+/, '') : v;
  }
  const after = JSON.stringify(d, null, 2) + '\n';
  if (after !== before) { writeFileSync(file, after); changed += 1; }
}
console.log(`files changed: ${changed}`);
