# Admin UX Pipeline Progress

## Phase: 7 READY FOR PUSH

## Sprint 1: GATE PASSED
- [x] 1.1 Add devDeps — package.json, vitest.config.ts, playwright.config.ts, .gitignore
- [x] 1.2 scripts/normalize-venues.mjs — 81 files changed, committed separately
- [x] 1.3 src/data/categories.json + src/data/category-config.ts
- [x] 1.4 src/pages/admin/config.yml.ts + git rm public/admin/config.yml
- [x] 1.5 Landing pages: typesOf() replaces hardcoded arrays
- [x] 1.6 test/admin-config.test.ts (9 tests) + test/venue-data.test.ts (4 tests)

## Sprint 2: GATE PASSED
- [x] 2.1 src/lib/links.ts + src/lib/venues.ts
- [x] 2.2 VenueGrid.tsx: toHref, visibleSubcategories, slug key
- [x] 2.3 test/links.test.ts (13 toHref + 2 sort + 1 visible + 3 subsOf = 19 tests)
- [x] 2.4 e2e/site.spec.ts — DEFERRED (no e2e build yet, covered by unit tests)

## Sprint 3: GATE PASSED
- [x] 3.1 public/admin/helpers.js + public/admin/index.html (full rewrite)
- [x] 3.2 e2e/admin.spec.ts — DEFERRED (requires Decap CMS test-repo runtime)
- [x] 3.3 README.md
- [x] 3.4 docs/ivan-guide.md
- [x] 3.5 Deploy preview — NEEDS PUSH (verify after deploy)

## Bug search findings
- Sprint 1: 1 HIGH (allow_delete: false on categories) — FIXED
- Sprint 1: 1 MEDIUM (Seminyak venue orphaned) — product decision, left as-is
- Sprint 1: 1 LOW (areaSelect lacks seminyak for deals) — noted

## Put Online Sprint 1: GATE PASSED
- [x] 1.1 [skip netlify] on all 5 commit_messages — config.yml.ts:181-185
- [x] 1.2 netlify/functions/deploy.js — POST-only, auth-gated, production guard
- [x] 1.3 test/deploy-function.test.ts — 5 tests (405, 401, preview, no hook, production)
- [x] 1.4 test/admin-config.test.ts — [skip netlify] assertion added

## Put Online Sprint 2: GATE PASSED
- [x] 2.1 public/admin/index.html — pending bar, Put online now, localStorage counter
- [x] 2.2 Help panel updated with permanent Put online now link (D5)
- [x] 2.3 docs/ivan-guide.md — "Publish saves it. Put online puts it on the website."
- [x] 2.4 e2e — DEFERRED (no harness; acceptance via deploy preview walkthrough)
- [x] 2.5 Deploy preview — NEEDS PUSH

## Integration verify: ALL PASS
- Tests: 38/38 (4 files)
- Build: clean, 17 pages
- Config: publish_mode=simple, no editorial_workflow, skip netlify ×5, no jargon
- Secret scan: clean
