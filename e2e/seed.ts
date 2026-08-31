import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

const CATEGORIES = ['food', 'hangout', 'wellness', 'fun-family'];
const DATA_DIR = 'src/data';
const VENUES_DIR = 'src/data/venues';
const ORDER_DIR = 'src/data/venue-order';

/**
 * Decap's `test-repo` backend reads an in-memory repo from `window.repoFiles`, and it reads it
 * two different ways depending on the collection type:
 *
 *   - folder collections go through getFolderFiles, which does `tree[folder]` with the WHOLE
 *     path as a single flat key: repoFiles['src/data/venues/food'].
 *   - file collections go through getFile, which does `path.split('/')` and walks the tree
 *     one segment at a time: repoFiles.src.data['venue-order']['canggu.json'].
 *
 * So the seed has to provide both shapes. Getting this wrong produces a silent "No Entries"
 * with no console error, which is why this is spelled out rather than guessed at.
 *
 * Every leaf is `{ path, content }`; both keys are required.
 */
function leaf(path: string) {
  return { path, content: readFileSync(path, 'utf8') };
}

export function buildRepoFiles(): Record<string, unknown> {
  const tree: Record<string, unknown> = {};

  // Flat keys, for entriesByFolder.
  for (const cat of CATEGORIES) {
    const dir = join(VENUES_DIR, cat);
    const files: Record<string, unknown> = {};
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      files[f] = leaf(join(dir, f));
    }
    tree[dir] = files;
  }

  // Nested keys, for getFile on the venue-order and settings file collections.
  const orderFiles: Record<string, unknown> = {};
  for (const f of readdirSync(ORDER_DIR).filter((x) => x.endsWith('.json'))) {
    orderFiles[f] = leaf(join(ORDER_DIR, f));
  }
  const nestedVenues: Record<string, unknown> = {};
  for (const cat of CATEGORIES) {
    const dir = join(VENUES_DIR, cat);
    const files: Record<string, unknown> = {};
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      files[f] = leaf(join(dir, f));
    }
    nestedVenues[cat] = files;
  }
  // Every other file collection (home.json, categories.json, events.json…) is a top-level json
  // file in src/data. Seed the whole directory so a new one does not need a change here.
  const dataFiles: Record<string, unknown> = { venues: nestedVenues, 'venue-order': orderFiles };
  for (const f of readdirSync(DATA_DIR).filter((x) => x.endsWith('.json'))) {
    dataFiles[f] = leaf(join(DATA_DIR, f));
  }
  tree.src = { data: dataFiles };

  return tree;
}

export async function seedAdmin(page: Page) {
  const repoFiles = buildRepoFiles();
  await page.addInitScript((files) => {
    (window as unknown as { repoFiles: unknown }).repoFiles = files;
  }, repoFiles);
}

export async function loginAdmin(page: Page) {
  await page.goto('/admin/');
  await page.getByRole('button', { name: /login/i }).click({ timeout: 15000 });
  await page.waitForTimeout(3000);
}
