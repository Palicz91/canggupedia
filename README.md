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
