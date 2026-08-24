import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { categories } from '../src/data/category-config';

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

  it('has 6 collections in the right order', async () => {
    const config = await getConfig();
    const names = config.collections.map((c: any) => c.name);
    expect(names).toEqual([
      'food-venues', 'hangout-venues', 'wellness-venues', 'fun-family-venues',
      'deals', 'settings',
    ]);
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

  it('no jargon in labels or hints', async () => {
    const config = await getConfig();
    const forbidden = /\b(slug|widget|collection|field|JSON|repo|commit|deploy|URL|boolean|string|subcategory)\b/i;
    const lines: string[] = [];
    function collect(obj: any) {
      if (typeof obj === 'string') return;
      if (Array.isArray(obj)) return obj.forEach(collect);
      if (obj && typeof obj === 'object') {
        if (obj.label) lines.push(obj.label);
        if (obj.hint) lines.push(obj.hint);
        Object.values(obj).forEach(collect);
      }
    }
    collect(config.collections);
    const hits = lines.filter((l) => forbidden.test(l));
    expect(hits).toEqual([]);
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
