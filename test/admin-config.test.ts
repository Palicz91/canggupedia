import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { categories } from '../src/data/category-config';
import { subOrderKey } from '../src/lib/venues';

async function getConfig(env: Record<string, string> = {}) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    const mod = await import('../src/pages/admin/config.yml.ts');
    const res = mod.GET({ site: new URL('https://example.test') } as any);
    return parse(await res.text());
  } finally {
    for (const k of Object.keys(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

describe('admin config', () => {
  it('uses simple publish mode', async () => {
    const config = await getConfig();
    expect(config.publish_mode).toBe('simple');
  });

  it('has 8 collections in the right order', async () => {
    const config = await getConfig();
    const names = config.collections.map((c: any) => c.name);
    expect(names).toEqual([
      'home',
      'food-venues', 'hangout-venues', 'wellness-venues', 'fun-family-venues',
      'venue-order', 'deals', 'settings',
    ]);
  });

  it('every home page field matches a key in home.json', async () => {
    // A field named for a key that does not exist saves fine and changes nothing on the site —
    // the same silent no-op that made the venue pickers untrustworthy.
    const config = await getConfig();
    const home = JSON.parse(readFileSync('src/data/home.json', 'utf8'));
    const fields = config.collections.find((c: any) => c.name === 'home').files[0].fields;

    expect(fields.map((f: any) => f.name).sort()).toEqual(Object.keys(home).sort());
  });

  it('venue order is a numbered relation list per category and per type, per area', async () => {
    const config = await getConfig();
    const coll = config.collections.find((c: any) => c.name === 'venue-order');
    expect(coll.files.map((f: any) => f.name)).toEqual(['canggu', 'uluwatu']);

    // Each section contributes its own list, then one optional list per type inside it.
    const expectedNames = categories.flatMap((c) => [
      c.value,
      ...c.subcategories.map((s) => subOrderKey(c.value, s.value)),
    ]);

    for (const file of coll.files) {
      expect(file.fields.map((f: any) => f.name)).toEqual(expectedNames);
      for (const field of file.fields) {
        // Not Decap's `list`. That widget cannot start closed, cannot be reordered by anything but
        // dragging, and shows only the ids already stored, so an untouched tab reads as an empty
        // box — all reported on 2026-08-31. public/admin/venue-order-widget.js registers this one.
        expect(field.widget, `${field.name} is back on Decap's list widget`).toBe('venue_order');

        // Every option below is read by the widget off the field, and a missing one fails quietly:
        // it would just render a list narrowed by the wrong thing, or ordered by the wrong rule.
        const [section, sub] = field.name.split('__');
        // A type list still queries its section's venue collection, not a "food__dinner" one.
        expect(field.collection).toBe(`${section}-venues`);
        expect(field.section).toBe(section);
        expect(field.area).toBe(file.name);
        // Absent on a section's own list, which covers every type in the section.
        expect(field.subcategory).toBe(sub);
        // Drives the tie-break for venues nobody has placed by hand; if it drifts from
        // category-config the widget shows a different order from the website.
        expect(field.sub_order).toEqual(
          categories.find((c) => c.value === section)!.subcategories.map((s) => s.value),
        );
      }
    }
  });


  it('the admin page loads a script that registers every custom widget the config asks for', async () => {
    // A widget name Decap does not know does not fail loudly — it renders a small "Widget not
    // found" box in place of the control, and the editor is left looking at a broken section with
    // no way to reorder anything. Deleting the script tag, renaming the file or renaming the
    // widget would each do that, so all three are pinned here.
    const config = await getConfig();
    const html = readFileSync('public/admin/index.html', 'utf8');
    const builtIn = new Set([
      'string', 'text', 'number', 'boolean', 'list', 'object', 'relation', 'select', 'image',
      'file', 'markdown', 'datetime', 'hidden', 'code', 'map', 'color', 'uuid',
    ]);

    const widgets = new Set<string>();
    const walk = (node: any) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (typeof node.widget === 'string') widgets.add(node.widget);
      Object.values(node).forEach(walk);
    };
    walk(config.collections);

    const custom = [...widgets].filter((w) => !builtIn.has(w));
    expect(custom).toEqual(['venue_order']);
    for (const widget of custom) {
      const script = `${widget.replace(/_/g, '-')}-widget.js`;
      expect(html, `index.html does not load ${script}`).toContain(`/admin/${script}`);
      const source = readFileSync(`public/admin/${script}`, 'utf8');
      expect(source, `${script} does not register ${widget}`).toContain(
        `registerWidget('${widget}'`,
      );
    }
  });

  it('every per-type order list says it follows the section order until it is touched', async () => {
    // A tab list holds nothing until someone moves a venue inside it, and until then the tab
    // inherits the section order. That is invisible from the screen — the list looks identical
    // either way — so the hint has to say it. On 2026-08-31 it was reported as "every subcategory
    // is empty", which was the widget showing the stored ids rather than the inherited order.
    const config = await getConfig();
    const coll = config.collections.find((c: any) => c.name === 'venue-order');

    for (const file of coll.files) {
      const typeLists = file.fields.filter((f: any) => f.name.includes('__'));
      expect(typeLists.length).toBeGreaterThan(0);
      for (const field of typeLists) {
        expect(field.hint, `${field.name} does not explain the inherited case`).toMatch(
          /follows the section order/i,
        );
      }
    }
  });

  it('keeps the order hints short enough to not bury the controls', async () => {
    // There are 21 of these lists per area. A paragraph on each turned the screen into a wall of
    // near-identical grey text with the actual controls lost inside it.
    const config = await getConfig();
    const coll = config.collections.find((c: any) => c.name === 'venue-order');

    for (const file of coll.files) {
      for (const field of file.fields) {
        expect(field.hint.length, `${field.name} hint is too long`).toBeLessThanOrEqual(140);
      }
    }
  });

  it('every order list only offers venues from the area it orders', async () => {
    // Without this the Canggu lists also showed Uluwatu venues; picking one saved cleanly and
    // changed nothing, because the id never matches on that page. It used to be a Decap relation
    // filter and is now the widget's own `area`, since the widget derives the list rather than
    // offering a picker. Proven end-to-end in e2e/admin-venue-order.spec.ts — this is the cheap
    // unit-level guard on the config itself.
    const config = await getConfig();
    const coll = config.collections.find((c: any) => c.name === 'venue-order');

    for (const file of coll.files) {
      for (const field of file.fields) {
        expect(field.area, `${file.name}/${field.name} points at another area`).toBe(file.name);
      }
    }
  });

  it('venue subcategory options match categories.json', async () => {
    const config = await getConfig();
    const venueColls = config.collections.filter((c: any) => c.name.endsWith('-venues'));
    for (const coll of venueColls) {
      const catValue = coll.name.replace('-venues', '');
      const expected = categories.find((c) => c.value === catValue);
      const subField = coll.fields.find((f: any) => f.name === 'subcategory');
      expect(subField.options.map((o: any) => o.value)).toEqual(
        expected!.subcategories.map((s) => s.value),
      );
    }
  });

  it('hides id and category fields', async () => {
    const config = await getConfig();
    const venueColls = config.collections.filter((c: any) => c.name.endsWith('-venues'));
    for (const coll of venueColls) {
      const idField = coll.fields.find((f: any) => f.name === 'id');
      const catField = coll.fields.find((f: any) => f.name === 'category');
      expect(idField.widget).toBe('hidden');
      expect(catField.widget).toBe('hidden');
    }
  });

  it('location is the second field', async () => {
    const config = await getConfig();
    const venueColls = config.collections.filter((c: any) => c.name.endsWith('-venues'));
    for (const coll of venueColls) {
      expect(coll.fields[1].name).toBe('location');
    }
  });

  it('image widgets disable choose_url', async () => {
    const config = await getConfig();
    const venueColls = config.collections.filter((c: any) => c.name.endsWith('-venues'));
    for (const coll of venueColls) {
      const imgField = coll.fields.find((f: any) => f.name === 'imageUrl');
      expect(imgField.choose_url).toBe(false);
    }
  });

  /**
   * Text the admin puts on screen from the config. `keys` picks which kind: labels and hints are
   * the controls, `description` is the paragraph at the top of a screen — the longest thing Ivan
   * reads and, until 2026-08-31, the only text here that nothing checked.
   */
  function readableText(config: any, keys: string[] = ['label', 'hint', 'description']) {
    const lines: string[] = [];
    function collect(obj: any) {
      if (typeof obj === 'string') return;
      if (Array.isArray(obj)) return obj.forEach(collect);
      if (obj && typeof obj === 'object') {
        for (const key of keys) if (typeof obj[key] === 'string') lines.push(obj[key]);
        Object.values(obj).forEach(collect);
      }
    }
    collect(config.collections);
    return lines;
  }

  it('no jargon in labels, hints or descriptions', async () => {
    // Ivan is not technical, and a word he cannot place is a word that stops him: he decided once
    // already that this CMS was broken. Each of these named something real that has a plain name
    // here instead — the media "library" is Choose an image, the venue "popup" is what opens when
    // someone clicks the card, "publish" is Put online now.
    const config = await getConfig();
    const forbidden =
      /\b(slug|widget|collection|field|JSON|repo|commit|deploy|URL|boolean|string|subcategory|popup|dropdown|library|entry|entries|CMS|publish\w*|metadata|parameter|attribute)\b/i;

    const hits = readableText(config).filter((l) => forbidden.test(l));
    expect(hits).toEqual([]);
  });

  it('keeps every hint to a line or two', async () => {
    // A hint is grey 14px text under a control. Past roughly two lines it stops being read at all,
    // and the one it buries is the next control's. The order screen has a tighter cap of its own
    // below, because it stacks 21 of them.
    const config = await getConfig();
    const long = readableText(config, ['hint']).filter((l) => l.length > 200);
    expect(long).toEqual([]);
  });

  it('CMS_BACKEND=test-repo uses test-repo backend', async () => {
    const config = await getConfig({ CMS_BACKEND: 'test-repo' });
    expect(config.backend.name).toBe('test-repo');
  });

  it('HEAD env sets backend branch', async () => {
    const config = await getConfig({ HEAD: 'feat/x' });
    expect(config.backend.branch).toBe('feat/x');
  });

  it('all 5 commit_messages end with [skip netlify]', async () => {
    const config = await getConfig();
    const msgs = config.backend.commit_messages;
    const keys = ['create', 'update', 'delete', 'uploadMedia', 'deleteMedia'];
    for (const k of keys) {
      expect(msgs[k], `${k} missing [skip netlify]`).toMatch(/\[skip netlify\]$/);
    }
    expect(keys.length).toBe(5);
  });
});
