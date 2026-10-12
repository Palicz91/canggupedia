# How content gets onto the website

Two paths reach production, and they behave differently. Most confusion about "I changed it and
nothing happened" comes from not knowing which path a change took.

## Path 1 — a developer pushes to `main`

Normal commit, no tag. GitHub notifies Netlify, Netlify builds, the site updates. Nothing else needed.

## Path 2 — Ivan saves in the admin

Decap CMS uses a `git-gateway` backend, so **Save commits straight to GitHub within seconds**,
authored as `canggupedia <canggupedia@gmail.com>`. That push triggers a normal Netlify build, so
**every Save goes live on its own in about 2 minutes**. The status strip at the bottom of the admin
counts down while it builds.

Changed 2026-10-12. Before that, every CMS commit was stamped `[skip netlify]` (see the
`commit_messages` block in `src/pages/admin/config.yml.ts`) and only a separate **Put online now**
button published. Ivan saved a Monday promo on 2026-10-06, never pressed the button, and the site
stayed on the 2026-08-31 build for six days while he reported "saved but not live" and "photos always
broken" (the admin loads photos from the live site, so a photo that never deployed 404s there too).
`test/admin-config.test.ts` now fails if `[skip netlify]` or `[skip ci]` returns to any commit message.

The button survives as a fallback in the help panel, **Update the website now**:

```
help panel button -> POST /.netlify/functions/deploy  (with a Netlify Identity JWT)
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

**A silent publish step fails silently.** That is why the two-step flow above was removed. To check
whether content is actually live, compare the newest commit on `main` with the commit of the current
Netlify deploy. If the deploy is older, a build failed or never started.

**Do not let a refusal message guess at the cause.** The admin used to print "this is a test copy of
the admin, not the real one" for *every* failure, including an expired login. That one sentence is
why the dead button read as working-as-intended for three days. `deploy.js` now returns a specific
`reason` and the strip prints a message per reason.

**Relinking the repo in the Netlify UI wipes build settings.** It happened on 2026-08-26 and
published an empty site over the live one. `netlify.toml` pins the build command and publish
directory so a build always knows what to run; leave it in place.

## Publishing manually

If a save's build did not go out, use **Update the website now** in the admin help panel, or push
any commit to `main`. Both rebuild from the current `main`.
