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

- **The GitHub `push` webhook (id `667271345`)** — fires on every push straight at a Netlify build hook. **This is currently the only thing that builds on push. Do not deactivate it.** Netlify's native GitHub integration is configured (the site is linked to installation `96440176`) but delivers no events, so turning this webhook off stops deploys entirely — that happened on 2026-08-26 and took the site's deploys down for ~5 minutes.
- **The "Put online now" button** — `netlify/functions/deploy.js` POSTs to `BUILD_HOOK_URL` (the "Admin: put online" build hook). This is what publishes a batch of CMS edits.

**Trap:** relinking the repo in the Netlify UI destroys the site's build settings and creates a
fresh, empty record — and then deploys. On 2026-08-26 that published an empty site over the live
one, and Netlify reported the deploy as successful (16 seconds, no build). `netlify.toml` now
carries the build command, publish dir and functions dir so a relink cannot cause this again.
After any relink, still check `netlify api getSite` for `build_settings.cmd` and `.dir`.

**Consequence:** build hooks ignore `[skip netlify]`, so the flag on every CMS commit (`src/pages/admin/config.yml.ts`) does nothing today — each CMS save triggers a build, and the "Not on the website yet" banner is untrue. The flag is left in place because it starts working the moment the native integration does. Fixing that means relinking the repo in Netlify so native push events arrive; only then can the webhook be removed. Test any such change by disabling the webhook, pushing a trivial commit, and confirming a deploy fires on its own — re-enable immediately if it does not.

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
