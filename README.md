# Canggupedia

Venue guide for Canggu and Uluwatu, Bali. Astro 7 static site with React islands and Decap CMS.

## Development

```sh
npm run dev          # Astro dev server at localhost:4321
npm test             # Vitest unit tests
npm run build        # Production build to dist/
npm run build:e2e && npm run test:e2e  # Playwright e2e tests
```

## Admin CMS

The admin panel lives at `/admin/` and uses Decap CMS with Netlify Identity (git-gateway).

The CMS config is **generated at build time** by `src/pages/admin/config.yml.ts`. There is no `public/admin/config.yml`. The "Type" dropdown on venue forms comes from `src/data/categories.json`, which Ivan edits in the CMS under "Categories & types".

## Deploys

Two things build the site:

- **Netlify's native GitHub integration** — builds on push and honours `[skip netlify]`. Every CMS commit carries that flag (`src/pages/admin/config.yml.ts`), so Ivan saving an edit does *not* build.
- **The "Put online now" button** — `netlify/functions/deploy.js` POSTs to `BUILD_HOOK_URL` (the "Admin: put online" build hook). This is what publishes a batch of CMS edits, and the only reason the batching works.

Build hooks ignore `[skip netlify]` by design, which is exactly why the button uses one.

### The 2026-08-26 relink

For a long time a GitHub `push` webhook pointed straight at a build hook, because native push
events were not arriving. That webhook ignored `[skip netlify]`, so every CMS save built anyway and
the "Not on the website yet" banner was a lie. Relinking the repo in Netlify fixed the native
integration; the webhook was deleted afterwards.

The relink itself did three destructive things, none of them announced in the UI:

1. **Wiped the build settings** and immediately deployed with them empty — publishing an empty site
   over the live one. Netlify reported that deploy as successful: `ready` in 16 seconds, no build.
   Every page 404'd for 9 minutes. `netlify.toml` now pins the command, publish dir and functions
   dir, so a future relink cannot repeat this.
2. **Deleted every build hook on the site.** `BUILD_HOOK_URL` still pointed at a dead one, so "Put
   online now" would have returned 502 to Ivan with nothing in the UI to explain it. A replacement
   hook was created and the env var repointed.
3. Left the old `push` webhook returning 404 on every push.

**After any relink, check all three:** `netlify api getSite` for `build_settings.cmd`/`.dir`,
`netlify api listSiteBuildHooks` for a non-empty list, and that `BUILD_HOOK_URL` matches a hook in
it. Then confirm a push actually deploys before walking away.

## Photos

`imageUrl` is optional on a venue. When it is missing — or the file is not deployed yet — `VenueGrid` renders a branded placeholder instead of a broken `<img>`. A freshly uploaded photo lives in git immediately but only reaches the site on the next build, so the CMS preview says "Photo saved…" rather than showing a broken image.

## Venue order

Decap cannot drag-reorder entries of a folder collection, so the running order lives beside the
venues in `src/data/venue-order/<area>.json` — one list of venue ids per category. Ivan edits it
under **Venue order** in the CMS, where each list is a draggable `relation` widget.

`sortVenues()` in `src/lib/venues.ts` treats that list as authoritative. A venue missing from it —
newly added, or dropped by mistake — falls back to the old rule (featured, then type order, then
numeric id) and sorts *after* everything listed. That is why `featured` no longer floats a venue to
the top: it is now only the "Our Top Pick" badge.

The lists were seeded from the order the site already rendered, by `scripts/backfill-venue-order.mjs`.
**Re-running that script overwrites whatever Ivan has dragged** — its `legacyCompare()` duplicates
the fallback branch of `sortVenues`, so if you change one, change both or a rebuild silently
reshuffles the site.

A venue deleted in the CMS leaves a dangling id behind here. That is harmless — `sortVenues` ignores
ids it cannot match — and deliberately not a test failure, so it can never block Ivan's next deploy.

## How to add an area

1. Add the area key and label to `locations` in `src/data/category-config.ts`
2. Create `src/pages/<area>/index.astro` and `src/pages/<area>/[category].astro` (copy from canggu)
3. Rebuild. The area appears in venue dropdowns automatically.

## How to add a category

1. Add it to `src/data/categories.json` via the CMS or directly
2. Add a `venueCollection()` call in `src/pages/admin/config.yml.ts`
3. Create `src/data/venues/<category>/` folder
4. Rebuild.

## Bumping Decap CMS

Change the version in `public/admin/index.html` (pinned at 3.15.1). Re-run `npm run build:e2e && npm run test:e2e` to verify.
