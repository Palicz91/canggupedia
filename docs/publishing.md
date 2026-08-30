# How content gets onto the website

Two paths reach production, and they behave differently. Most confusion about "I changed it and
nothing happened" comes from not knowing which path a change took.

## Path 1 — a developer pushes to `main`

Normal commit, no tag. GitHub notifies Netlify, Netlify builds, the site updates. Nothing else needed.

## Path 2 — Ivan saves in the admin

Decap CMS uses a `git-gateway` backend, so **Save commits straight to GitHub within seconds**,
authored as `canggupedia <canggupedia@gmail.com>`. His work is never sitting unsaved somewhere.

But every CMS commit is stamped `[skip netlify]` — see the `commit_messages` block in
`src/pages/admin/config.yml.ts`. Netlify honours that tag and does **not** build. This is deliberate:
without it, twenty field edits in an afternoon would mean twenty full rebuilds and a two-minute wait
after every click.

So for CMS edits the automatic build is switched off on purpose, and the only way to publish is the
**`Put online now`** button in the status strip at the bottom of the admin:

```
admin button -> POST /.netlify/functions/deploy  (with a Netlify Identity JWT)
             -> function checks: logged in? known-bad context? BUILD_HOOK_URL present?
             -> POST to the site's build hook  ("Admin: put online", branch main)
             -> Netlify builds -> live in ~2 minutes
```

`BUILD_HOOK_URL` is a Netlify environment variable, scoped **functions-only, production context
only**. It is not in the repo and must not be.

## Known traps

**`CONTEXT` is a build variable, not a reliable runtime one.** `deploy.js` originally refused to
publish unless `process.env.CONTEXT === 'production'`. If the function runtime does not carry
`CONTEXT`, that test is true on the live site too and the button refuses every real publish. This
broke publishing from 2026-08-26 to 2026-08-30 — the hook fired zero times and nobody noticed,
because saving genuinely worked and the changes genuinely reached GitHub. The guard now only refuses
a *known-bad* context (`CONTEXT` set and not `production`), never an absent one. Covered by
`test/deploy-function.test.ts`.

**A silent publish step fails silently.** Nothing on the site or in the admin reveals that a
`[skip netlify]` commit is waiting. The strip's pending counter lives in `localStorage`, so it is
per-browser: edits made on a phone are invisible to the counter on a laptop. If you need to know
whether content is actually live, compare the newest CMS commit on `main` against the commit of the
last Netlify deploy — if the deploy is older, something is waiting.

**Do not let a refusal message guess at the cause.** The admin used to print "this is a test copy of
the admin, not the real one" for *every* failure, including an expired login. That one sentence is
why the dead button read as working-as-intended for three days. `deploy.js` now returns a specific
`reason` and the strip prints a message per reason.

**Relinking the repo in the Netlify UI wipes build settings.** It happened on 2026-08-26 and
published an empty site over the live one. `netlify.toml` pins the build command and publish
directory so a build always knows what to run; leave it in place.

## Publishing manually

If the button is broken and something must go out, any push to `main` rebuilds the site and carries
all pending `[skip netlify]` commits live with it.
