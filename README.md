# Canggupedia

Venue guide for Canggu and Uluwatu, Bali. Astro 7 static site with React islands and Decap CMS.

## Development

```sh
npm run dev          # Astro dev server at localhost:4321
npm test             # Vitest unit tests
npm run build        # Production build to dist/
npm run build:e2e && npm run test:e2e  # Playwright e2e tests
```

`npm run test:e2e` rebuilds `dist-e2e` itself, via `globalSetup` in `playwright.config.ts`. That is
not belt-and-braces: the Playwright `webServer` only serves the prebuilt directory, and
`reuseExistingServer` skips its command entirely whenever something is already listening on 4321.
On 2026-08-31 a `serve` left over from an earlier session held the port and the whole admin suite
passed green against a build made before the changes under test. Do not move the build back into
`webServer`.

`build:e2e` swaps the CMS backend to Decap's `test-repo`, which boots the admin with a one-click
login and reads an in-memory repo from `window.repoFiles`. `e2e/seed.ts` fills that from the real
files on disk, so the admin specs drive the actual CMS against actual venue data. It writes the tree
in **two shapes on purpose**: folder collections read `repoFiles['src/data/venues/food']` with the
whole path as one flat key, while file collections split the path and walk it nested. Every leaf
needs both `path` and `content`. Get any of that wrong and the admin renders "No Entries" with no
console error.

## Admin CMS

The admin panel lives at `/admin/` and uses Decap CMS with Netlify Identity (git-gateway).

The CMS config is **generated at build time** by `src/pages/admin/config.yml.ts`. There is no `public/admin/config.yml`. The "Type" dropdown on venue forms comes from `src/data/categories.json`, which Ivan edits in the CMS under "Sections & types".

### The words on the screen

Every label, hint and screen description in that file is written for a non-technical reader, and two
tests in `test/admin-config.test.ts` hold it there: one rejects CMS vocabulary (`widget`,
`collection`, `library`, `popup`, `publish`, …) anywhere Ivan can read it, the other caps hint
length. Add a word to that list rather than fixing one hint by hand.

Decap's own chrome is renamed the same way, in the `renameStrings` locale patch in
`public/admin/index.html`: the top nav is **Edit | Photos** rather than "Contents | Media", the
sidebar is headed "What you can edit" rather than "Collections", and Save means save (Decap calls it
publish). `CMS.getLocale('en')` in the browser console prints every string available to rename.

The panel also uses one word per thing, which is not something a test can check: the four groups are
**sections** everywhere (never "categories"), going online is **Put online now** everywhere (never
"publish"), and the panel that opens on a venue card is "when someone opens the venue" (never
"popup"). If you add a screen, reuse the existing word.

### Home page

`src/pages/index.astro` reads its heading, tagline, intro and the two area photos from
`src/data/home.json`, edited under **Home page** in the CMS. Everything else on that page is
navigation and stays hardcoded, so there is nothing on that screen Ivan can press that breaks a
link. A photo cleared in the CMS falls back to the image the page shipped with, rather than
rendering `url('')` and leaving a white card. `test/admin-config.test.ts` asserts the field names
match the keys in `home.json` — a field named for a key that does not exist would save fine and
change nothing.

### Decap style overrides

`public/admin/index.html` carries a block of CSS that overrides Decap's own styling — larger field
labels and hints, 44px touch targets, WCAG-passing colours, and a phone layout that drops the
preview pane instead of scrolling sideways at 800px. It came out of `docs/admin-ux-audit.md`
(2026-08-26); that doc records what each rule fixes and the two ways it is easy to break. Read the
"If you are the next person editing these overrides" section before touching it.

Every rule targets an emotion class via `[class*=]`, so bumping Decap can make them inert — the
admin then degrades to stock rather than breaking.

Rules that must apply to one screen only are scoped by a class the custom widget on that screen puts
on its own markup (`.cp-order-*`, see [Venue order](#venue-order)) — not by the collection. An
earlier version mirrored the route hash onto `<html data-cp-collection>` and scoped the CSS with
that; it needed a script to stay correct and a test to prove the rules were not leaking onto Deals,
where a row holds four fields and hiding their labels would leave four unlabelled boxes. Scoping to
markup we own removes both. Prefer that over reintroducing a collection attribute.

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

### The preview has to agree with the site

A preview that disagrees with the page is worse than no preview: it reports bugs that aren't there.
On 2026-08-31 the hours of a venue were reported as rendering badly when the live page was already
showing a correct day-by-day table — the preview was printing the raw pasted string.

The website splits opening hours with `parseOpeningHours` in `src/lib/hours.ts`. The preview cannot
import it: the preview is a plain script the admin page loads from `/admin/`, and there is no build
step between the two. So `public/admin/helpers.js` carries a hand port, and `test/hours.test.ts`
runs both over every opening-hours string in `src/data` plus every fixture and fails if they ever
disagree. **Change one, change both.** The test loads `helpers.js` through `new Function` rather
than importing it, because Vite rewrites the UMD wrapper's `module` check and sends it down the
browser branch with no global to attach to.

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
under **Order of venues** in the CMS (the label was "Venue order", which reads as an order someone
placed for a venue).

### It is a custom widget, not Decap's list

Each section is one `venue_order` control, registered by `public/admin/venue-order-widget.js` and
asked for by name in `src/pages/admin/config.yml.ts`. **The stored value is unchanged** — still a
plain array of venue ids — so nothing on the site knows the difference.

Decap's `list` widget was the obvious answer and could not do either of the two things reported on
2026-08-31. Both were tried through config first:

- **"chaotic and super difficult to use."** 21 lists open at once, 111 rows, a ~12,000px screen. A
  single row spent **168px** on one venue name: 36px of top margin, a 20px icon bar, a repeated
  "Venue" label and a select padded for a full-size form field. `list` has no option to start
  closed. Using its own collapse *unmounts* the rows, and when they mount again every venue picker
  comes back **blank** — measured, 29 rows, 29 empty selects, still empty 15 seconds later. The
  file is untouched, but a screen showing an empty picker where the order used to be is worse than
  a long one. `minimize_collapsed: true` looks like the feature and is not: it only takes effect
  *after* a collapse, so it inherits exactly that fault. Setting `summary` to show the id doesn't
  help either — older ids read `canggu-brunch-1`.
- **"if i chnage 25 to 3 ... it moves to 3rd position and pushes everything down with one."** A
  widget rendered inside a list row cannot reorder the list around it: Decap hands each control an
  `onChange` for its own value only. Owning the whole array is the only way, and then the move is
  a `splice`.

- **"every subcategory is empty."** They were, and always had been. A tab list stores nothing until
  someone reorders it, and empty means "inherit the section order" — correct behaviour that reads
  as seventeen broken boxes, because `list` can only show the ids already stored. It also told Ivan
  nothing about what the Dinner tab would actually look like.

So the widget owns the array and **derives what it shows**. It renders a heading (`14 venues`), a
numbered box and a venue name per row, and hides closed rows with `display: none` — **hidden, never
unmounted**, which is the whole point. Typing a number and pressing Enter (or clicking away) moves
that venue there and pushes the rest down; dragging is gone. Measured after: **2,642px** on load,
**34px** per row.

### Every list is derived, so there is nothing to add or remove

The rows are not the stored ids. They are every venue in this area, this section and — for a tab —
this subcategory, fetched through `props.query`, the same Decap search action the relation widget
uses (an empty search term returns the whole collection: probed, 34 hits for `food-venues`, each
with full `data`). One promise per collection is shared across all 21 controls on the screen.

That removes three problems at once. A venue created a minute ago is already in place, which
retires the old *"i can't found Billy Ho here"* — he was in no list because he was added after they
were written. There is nothing to delete either: removing an id never removed a venue from the
site, it only dropped it to the bottom. And an untouched tab now shows the order it will actually
inherit, rather than nothing.

**Nothing is written by looking.** The stored value stays empty until a position is typed, so a tab
keeps inheriting until it is deliberately given an order of its own; an e2e test asserts the file
still has no `food__dinner` key after the list has been opened and read. The first move writes the
whole derived list, which is also when a venue missing from a section list finally joins it.

The order comes from `CpHelpers.effectiveOrder` in `public/admin/helpers.js` — a hand port of
`subsOf` / `mergeOrder` / `sortVenues` from `src/lib/venues.ts`, because the widget is a plain
script and cannot import the TypeScript the site sorts with. `test/venue-order-parity.test.ts` runs
both over all 42 real lists and fails on any difference. **Change one, change both.** This matters
more than the hours port: the widget tells Ivan "this is the order the page will use", so a drift
makes the CMS lie about the one thing it exists to control.

Config carries what the widget needs — `collection`, `area`, `section`, `subcategory`, `sub_order`
— and each is pinned by `test/admin-config.test.ts`, because a missing one fails quietly as a list
narrowed by the wrong thing. `sub_order` in particular only affects venues nobody has placed by
hand, so dropping it would go unnoticed until someone compared the CMS to the site.

Every CSS rule is now on the widget's own class names, so a Decap bump cannot make the layout inert
and the rules cannot reach another screen. `Immutable` is not exposed as a global, so an empty List
is borrowed from a value already held rather than constructed. `e2e/admin-venue-order.spec.ts`
covers the row height, the closed-by-default load, a tab holding exactly its type's venues, the
empty-tab wording, a 25→3 move reaching disk, and a tab reorder leaving its section alone.
`test/admin-config.test.ts` also pins that `index.html` loads the script registering the widget —
an unregistered name renders a "Widget not found" box, not an error.

Unrelated but easy to trip over: Decap does **not** reload the entry when the route hash moves from
one file in a file collection to another. Loading `.../uluwatu` directly renders its own lists;
arriving there from `.../canggu` leaves all the Canggu rows on screen under the new address. That is
why the per-area tests take one area each.

The area narrowing used to be a Decap relation filter, `filters: [{field: location, values: [area]}]`,
and is now the widget's own `area`. Without it the Canggu lists also offered Uluwatu venues, and
picking one saved cleanly and changed nothing, since the id never matches on that page.

The same trap exists for the per-tab lists, and could **not** be fixed the Decap way. `location` is a
plain string, but `subcategory` is an array, and Decap's relation filter does not match inside arrays:
with `filters` on `subcategory`, the picker offered **zero** venues where the unfiltered control offered
12. So the subcategory narrowing is done by the widget, in `effectiveOrder`, where it is a plain
`subcategory.includes(sub)` over data the widget already holds. `e2e/admin-venue-order.spec.ts` drives
the real admin and checks each list against the venue files on disk, by name.

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

### Duplicate venue names (open, needs a content decision)

Four venues are entered twice and render two cards on the same page, confirmed on the built site:

| Name | Entries | Looks like |
|---|---|---|
| Woods Bali (canggu, food) | `canggu-dinner-6`, `canggu-brunch-19` | one venue split by type instead of one entry with both types |
| Canggu Padel (canggu, wellness) | `canggu-padel-3`, `canggu-padel-8` | a straight duplicate — same name, same type |
| Bali Social Club (canggu, wellness) | `canggu-padel-1`, `canggu-gym-1` | one venue offering two things |
| The Canggu Studio (canggu, wellness) | `canggu-yoga-1`, `canggu-boxing-10` | one venue offering two things |

Merging means choosing which description, photo and hours survive and deleting the other entry, so
it is deliberately left for Ivan/Adam rather than resolved in code. Note this also breaks
name-based lookups: `e2e/venue-order-site.spec.ts` resolves id to name, never the reverse, because
a name lookup here silently picks the wrong entry.

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
