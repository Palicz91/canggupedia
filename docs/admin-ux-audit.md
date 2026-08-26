# Admin UI/UX audit — 2026-08-26

Audited `/admin/` on the live site (`canggupedia.netlify.app`, Decap CMS 3.15.1) against the skill
library. Skills applied:

- `mobile-app-design-standards` — touch targets, type sizes, WCAG contrast, loading states,
  cognitive accessibility (its `references/accessibility-checklist.md` and
  `references/common-mistakes.md`)
- `onboarding-cro` — one goal per session, empty states, discoverability of help
- `website-builder` — typography rules and the anti-pattern table

Method: Playwright against the live admin at 1440×900 and 390×844, logged in as a throwaway Identity
user (created, used, deleted — HTTP 204 — and the credentials shredded). Every number below was
measured in the browser, not estimated. Screens captured: login, collection list, venue editor,
Venue order, Deals & events, media route, help panel, and the status strip in both idle and pending
state.

The findings are ordered by how much damage they do to Ivan, not by severity label.

---

## 1. "Put online now" — the most important button — has 2.61:1 contrast

White text on `--cp-orange` `#ff7849` measures **2.61:1**. WCAG AA needs 4.5:1 for 14px text. On
hover it moves to `#f97316`, which is **2.8:1** — still failing.

This is the button the whole batching design exists to serve. It is also the one Ivan presses least
often (once a day), so it is the one he has the least muscle memory for.

Same root colour, same problem elsewhere:

| Element | Colours | Measured | Needs |
|---|---|---|---|
| `Put online now` label | `#fff` on `#ff7849` | 2.61:1 | 4.5:1 |
| Pending count digit (`.cp-lead`) | `#f97316` on `#fff7ed` | 2.64:1 | 4.5:1 (20px, not bold enough to count as large) |
| "Put online now" link in Help panel | `#f97316` on `#fff` | 2.8:1 | 4.5:1 |
| Live/green state digit | `#059669` on `#ecfdf5` | 3.58:1 | 4.5:1 |

Fix: darken the button fill to roughly `#c2410c` (orange-700) — that lands near 4.9:1 on white text
while staying recognisably the brand orange. For the orange-on-white text (`.cp-lead`, `.cp-link`)
use `#9a3412`, which the audit already found passing at 6.88:1 where it is used for `.cp-tip h4`.

`--cp-orange` on the marketing site is fine as a *fill behind large type*; it is only failing here
because it is carrying 14–15px text.

## 2. The venue editor is unusable on a phone

At a 390px viewport the document lays out at **800px** and scrolls horizontally. Cause: Decap's
split-pane editor keeps the control pane (400px) and the preview iframe (398px) side by side at every
width — it never stacks. Measured on the La Brisa editor.

Consequences Ivan actually hits:

- The **Delete** button renders at x 356–416, so it is half off a 390px screen. So is the right edge
  of the Save dropdown.
- `#cp-strip` stretches to 800px (it is `left:0;right:0` on an 800px document), so "Put online now"
  sits off-screen at the far right.
- Half the screen is spent on a preview iframe rendered at 398px, which is too narrow to read.

This matters because the person editing a Bali venue guide is frequently holding a phone.

Fix: one media query in `public/admin/index.html` — below ~900px, hide `[class*="-PreviewPaneContainer"]`
and the splitter, and force the control pane to 100% width. Decap has no config flag for this;
`editor: preview: false` is per-collection and would also remove the preview on desktop, where it is
genuinely useful (see §7).

## 3. Every hint on the form is 12px grey — the smallest text on the page

The venue editor has **21 text nodes below 14px**, nearly all of them `12px #5d626f`. They are the
field hints: "Decides which page the venue shows on", "Pick one or more. Missing a type? Add it under
Categories & types", "Click Choose an image, then Upload…".

`mobile-app-design-standards` puts the floor at 14sp for anything meant to be read, 16sp for body.
`common-mistakes.md` lists "Text Too Small" first for a reason. Every instruction Ivan needs is set
in the one size he is least likely to read.

The field *labels* have the same problem from a different angle: `VENUE NAME`, `SHORT DESCRIPTION`,
`FOOD & DINING (OPTIONAL)` are 12px uppercase grey. The checklist says explicitly: avoid all-caps
(harder to read), labels 11pt minimum. 12px uppercase grey is all three failure modes at once.

Fix: a CSS override bumping Decap's hint and label classes to 14px and dropping the
`text-transform: uppercase` on labels. Both are `[class*="-FieldLabel"]` / `[class*="-ControlHint"]`
selectors, same pattern as the two overrides already in `index.html`.

## 4. Photo controls are 21px tall

`Choose different image` measures **152×21**, `Remove image` **104×21**. The minimum is 44×44 (iOS) /
48×48 (Android); these are less than half.

`Remove image` is worse than a small target — it is *destructive*, it is **3.15:1** red-on-pink, and
it sits 12px under the button Ivan actually wants. The accessibility checklist has a line for exactly
this: "Destructive actions separated from primary."

Given the photo bug that started this whole thread, the photo control is the last part of this form
that should be hard to hit.

Fix: pad both to 44px min-height, put a real gap between them, and consider demoting `Remove image`
to a text link that asks for confirmation.

## 5. Destructive `Delete` sits next to the Save control

On the editor toolbar: `Saved ▾` at 97×36 and `Delete` at 70×36, roughly 20px apart, comparable
visual weight. Both are also under the 44px minimum height.

Ivan has already once concluded this CMS was broken and started clicking things. Delete deserves
distance, not adjacency.

Fix: push `Delete` to the right edge of the toolbar with `margin-left: auto`, or move it out of the
toolbar entirely. The confirmation copy is already good ("Delete this from the website? This cannot
be undone.") — the problem is purely placement.

## 6. Help is the least visible thing on screen and the best content in the admin

The `Help` button is 58×34, borderless, `#6b7280` — 4.83:1, technically passing, visually a whisper —
parked in the bottom-right corner. It is the only entry point to the help panel.

The panel itself is genuinely well made: plain language, `kbd` chips, arrow-stepped instructions,
and it leads with the one thing that actually confuses Ivan ("Save is not the same as online"). This
is exactly what `onboarding-cro` asks for and it is hidden behind the quietest control on the page.

`onboarding-cro` also notes empty states are onboarding opportunities. The admin has one: after login
the app shows a collection list with no orientation at all.

Fix: give `Help` a visible border and 44px height. Consider auto-opening the panel on Ivan's first
visit per browser (a `localStorage` flag), dismissable — the skill's rule is "don't repeat for
returning users", not "never show it".

## 7. Screens render wrong content before they render right content

Screenshotting Venue order on a cold browser at 9 seconds captured "**0** food & dining", "**0**
hangout spots" — with no spinner, no skeleton, nothing to indicate loading. The real values are
29 / 25 / 54 / 3, and polling confirms they arrive (warm cache: 3.1s to settle). But for those
seconds the screen makes a confident, false statement: your lists are empty.

Same shape on the collection list: 0 cards → 99 cards at 3.7s, no intermediate state.

`mobile-app-design-standards` asks for a progress indicator on anything over 1s and no layout shift.
Decap gives neither here.

Note this is *also* why my earlier read of the Venue order screen was wrong — I saw "0" in a
screenshot and nearly reported a data bug that does not exist. If it fooled me with the JSON file
open in another window, it will fool Ivan.

Fix: hide the list widgets until the entry has loaded, or overlay a "Loading your venues…" state.

## 8. Deep-linking any unknown route dead-ends on bare "Not Found"

`/admin/#/media` renders the string `Not Found` at 14px in the top-left corner, on an otherwise blank
page, with no explanation and no link back. (Media is reachable via the top nav, which opens a modal
— the hash route simply is not one.) Any stale bookmark or mistyped hash lands here.

The accessibility checklist calls for error messages that describe the problem and offer a recovery
step. This is the opposite.

Fix: low priority, but a catch-all message with a "Back to Contents" link is a few lines.

## 9. Smaller items, measured

- **Sort by / Filter by / Group by**: 27px tall, and `Filter by` is 3.41:1 grey-on-grey. Four
  controls under 44px in a row.
- **List/grid view toggles**: 24×24 each, unlabelled icons, adjacent — the smallest targets in the
  app.
- **Preview pane icon buttons** (top right of the editor): 40×40, unlabelled, no tooltip. One toggles
  the preview, one syncs scrolling; neither is guessable.
- **`+ food venue`**: the primary action on the collection screen is rendered in Decap's default dark
  grey, not the brand orange, so it does not read as primary. The label is also awkward lowercase
  — "Add a food venue" would match the plain-language tone used everywhere else in this admin.
- **Collection list rows** show `Name · AREA` only. With 99 food venues and no thumbnail, scanning is
  slower than it needs to be. Grid view exists but is not the default.
- **`(OPTIONAL)` suffix** on the Venue order field labels reads as though the whole list is optional,
  which is not the intent — it is Decap's `required: false` rendering.
- **The status strip renders on the logged-out login screen**, telling an anonymous visitor "Nothing
  waiting to go online."

## What is already right

Worth recording so it does not get "improved" away:

- The plain-language relabelling (`Save`, `Not saved yet`, `Editing in Hangout Spots`, `Search by
  name`, `Open the website`) is the single best thing about this admin.
- Preview pane headings `ON THE WEBSITE` / `AFTER CLICKING MORE` explain themselves without jargon.
- The status strip's saved-vs-online distinction is the correct mental model, correctly worded.
- `role="status" aria-live="polite"` on the strip, `aria-label` on the help close button, and
  `:focus-visible` outlines on the custom controls — all present, all correct.
- Collection descriptions are written as instructions, not definitions.
- `test/admin-config.test.ts` already pins the no-jargon rule as a test.

## Priority

| # | Finding | Effort |
|---|---|---|
| 1 | `Put online now` contrast 2.61:1 | 1 line |
| 2 | Editor unusable on a phone (800px overflow) | ~8 lines of CSS |
| 3 | 12px hints and uppercase labels | ~4 lines of CSS |
| 4 | Photo controls 21px tall, `Remove image` adjacent and low-contrast | ~6 lines |
| 5 | `Delete` adjacent to Save | 1 line |
| 6 | `Help` invisible | ~3 lines, plus optional first-visit auto-open |
| 7 | "0 venues" shown while loading | needs a Decap-class override, ~10 lines |
| 8–9 | Dead-end route, small toolbar controls, primary button colour | assorted |

1 through 6 are CSS in `public/admin/index.html` and could ship in one commit. Nothing here requires
touching `config.yml.ts` or the Decap version.
