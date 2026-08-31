# Canggupedia

Venue guide for Canggu and Uluwatu, Bali. Astro 7 static site with React islands and Decap CMS.

## Development

```sh
npm run dev          # Astro dev server at localhost:4321
npm test             # Vitest unit tests
npm run build        # Production build to dist/
npm run build:e2e && npm run test:e2e  # Playwright e2e tests
```

`build:e2e` swaps the CMS backend to Decap's `test-repo`, which boots the admin with a one-click
login and reads an in-memory repo from `window.repoFiles`. `e2e/seed.ts` fills that from the real
files on disk, so the admin specs drive the actual CMS against actual venue data. It writes the tree
in **two shapes on purpose**: folder collections read `repoFiles['src/data/venues/food']` with the
whole path as one flat key, while file collections split the path and walk it nested. Every leaf
needs both `path` and `content`. Get any of that wrong and the admin renders "No Entries" with no
console error.

## Admin CMS

The admin panel lives at `/admin/` and uses Decap CMS with Netlify Identity (git-gateway).

The CMS config is **generated at build time** by `src/pages/admin/config.yml.ts`. There is no `public/admin/config.yml`. The "Type" dropdown on venue forms comes from `src/data/categories.json`, which Ivan edits in the CMS under "Categories & types".

### Decap style overrides

`public/admin/index.html` carries a block of CSS that overrides Decap's own styling — larger field
labels and hints, 44px touch targets, WCAG-passing colours, and a phone layout that drops the
preview pane instead of scrolling sideways at 800px. It came out of `docs/admin-ux-audit.md`
(2026-08-26); that doc records what each rule fixes and the two ways it is easy to break. Read the
"If you are the next person editing these overrides" section before touching it.

Every rule targets an emotion class via `[class*=]`, so bumping Decap can make them inert — the
admin then degrades to stock rather than breaking.

### The Save button

Decap's save control is a *dropdown*, not a button. Clicking it opens a menu; the "Save now" item
inside is what commits. Nothing in the UI says so, so on 2026-08-26 Ivan clicked Save, saw a menu,
and concluded the CMS was broken — reported as "adding pictures doesn't work", because a picked
photo is held in the browser and only uploaded when the entry is saved. Git Gateway was never at
fault: it accepts writes to `public/images` with an ordinary Identity token.

`public/admin/one-click-save.js` presses "Save now" for him, so one click saves. It degrades
safely: if the menu doesn't appear the dropdown is simply left open. The cost is that "Save and add
another" and "Save and duplicate" are no longer reachable — a fair trade for a Save button that
saves.

Note the editor still shows a broken-image icon for a just-picked photo, and a 404 for it in the
console. That is cosmetic: the file is not on the site until the next build. The custom preview pane
says "Photo saved…" instead of showing it.

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

Those lists are deliberately **not** collapsed. Decap builds a collapsed row's summary from the raw
stored value, and these rows store a bare venue id, so every row rendered as the word "Venue" —
draggable but unreadable. Adding `summary: '{{fields.venue}}'` does render the id instead, but the
older venues carry ids like `canggu-brunch-1`, so the list still reads as nonsense (checked on
screen). Expanded, each row renders its relation control, which resolves the id to the venue's real
name. The cost is a tall page (54 rows for Canggu wellness); `test/admin-config.test.ts` pins
`collapsed: false` so it can't quietly regress.

Each picker is filtered to the area being ordered — `filters: [{field: location, values: [area]}]` —
because an order file covers one area, and without it the Canggu lists also offered Uluwatu venues.
Picking one saved cleanly and changed nothing, since the id never matches on that page.

The same trap exists for the per-tab lists, and is **not** fixed the same way. `location` is a plain
string, but `subcategory` is an array, and Decap's relation filter does not match inside arrays: with
`filters` on `subcategory`, the picker offered **zero** venues where the unfiltered control offered
12. An empty picker is worse than an over-full one, so the tab lists stay unfiltered by type.
`e2e/admin-venue-order.spec.ts` drives the real admin to hold both of these in place.

Hints on these fields are kept to one short line and capped by a unit test. There are 21 lists per
area, and a paragraph on each buried the controls under a wall of near-identical grey text — the
state that made the screen unusable in the first place. The long explanation lives once, in the
collection description.

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
