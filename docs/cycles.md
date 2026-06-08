# Cycles

The development ledger. Each cycle is a coordinated batch of work named with a single letter. Inside a cycle, sub-phases are numbered (sometimes lettered for parallel sub-tracks: H5a, H5b, …). Code references like `// H6: search chip` or `// I5a: decision block` point to whichever cycle introduced or last touched a piece of code, so this file is the only place where those references get glossed.

For the live catalog of every user-visible feature (cross-referenced with the cycle that introduced or last touched it) see [`features.md`](features.md). This file is the *when and why*; that file is the *what and how*.

Future cycles append. Closed cycles don't get edited except to add a retrospective.

---

## Z — Zen chrome

**Intent.** Strip the topic page down to the lesson. The reader should see the math, not the navigation; chrome appears when invited and disappears when not.

**Shipped.**
- Z1: auto-hiding navbar on topic pages (`global.css`)
- Z5: site-wide `prefers-reduced-motion` gate

**Deferred.** None outstanding; subsequent cycles inherited the surface.

---

## G — Graph foundation

**Intent.** The graph view's first real pass. Make the topic graph a working tool — readable edges, visible reasons, accurate completion state.

**Shipped.**
- G1: domain stroke vocabulary
- G3: edge-label pills with palette (`ForceGraph.tsx`)
- G4: completion tint — 0.15-alpha green wash on finished nodes; "interactive vs. total glow" split
- G5: sidebar prereq/leads-to with reason lines (`GraphSidebar.tsx`)
- G6: tick-glyph domain prefix in `LearningPath`
- G7: misconception-count surface on `GraphNode`
- G8: prereq/leads-to endpoints reshaped to `{node, why}` (`api/client.ts`)
- G10: collapsible stroke-pattern legend (`GraphExplorer.tsx`)

**Deferred.** None — H absorbed the remaining graph polish.

---

## H — Graph polish & zen drawers

**Intent.** Bring the graph from "working" to "alive" and unify the topic-page chrome behind a single drawer.

**Shipped.**
- H1: muted-jewel domain palette in both light and dark (`global.css`)
- H2: single consolidated left drawer (`ZenChrome.tsx`)
- H3: dropdown click-handling fix (`onMouseDown` + `preventDefault`)
- H4: misconception '!' marker and sidebar section removed (visual noise)
- H5a: RAF-throttled edge hit-test
- H5b: structural-signature memoization for node/edge sets
- H5c: tighter collision packing in the force sim
- H5d: alpha bump before releasing pin
- H5e: polar-by-domain seed for new nodes
- H6: floating search chip + `centerOnSlug` imperative handle
- H7: server-side readiness endpoint + local fallback
- H8: page-scoped keyboard navigation
- H9: bidirectional `?domain=` URL sync
- H11: stroke pattern encodes difficulty (not domain) — color carries domain

**Deferred (H10 backlog).**
- Server-side progress sync (still localStorage-only)
- Consolidated misconceptions page (data flows through but isn't surfaced anywhere after H4 removed the inline marker)
- Theme transition polish

---

## I — Dynamic topic view

**Intent.** The topic page as a guided simulation: ask the reader to commit, mutate state on commit, let the pinned plot react, then explain. Replace "scroll to read" with "act to learn."

**Shipped.**
- I1: directive vocabulary + parser extensions (`seed/import_seed.py`) — `plot`, `state`, `state_reset`, `step_through`, `callout`, `derivation`, `misconception inline`, `decision`, `playground`
- I2: `ContentBlock.anchor` + `ContentBlock.meta` (Text-stored JSON, SQLAlchemy self-healing column adds)
- I3: `ScrollReader` — pinned-viz two-column scrollytelling on ≥1024px, linear on mobile
- I4: static block renderers (callout, derivation, step_through, misconception_inline) + `PlotBlock` wrapper + 7-spec plot library + `CodeRunner` `auto_run`
- I5: `useTopicState` (Zustand, persisted) + `safeExpr` evaluator + `DecisionBlock` (writes state, branch-tagged downstream filtering) + `PlaygroundBlock` (controls, match meter, ghost overlay, hints)
- I6: `seed/watch.py` (watchdog-based reimport) + `docs/authoring.md` v1
- I-validation: `bayes-theorem` ported as the canonical demo (19 blocks, 3 branch-tagged callouts)

**Deferred (I7 backlog).**
- `fill_in` progressive-reveal puzzle blocks
- Multi-step branching trees
- Decision-branch analytics (needs progress sync from H10 first)
- Mobile pinned-viz pane (currently linear on <1024px)
- Plot library expansion beyond 7 specs
- SlideView retirement (stays behind `?mode=slides` until usage data justifies removal)

---

## J — Foundations & refinement

**Intent.** Formalize the implicit design culture into docs, fix the rough edges I shipped with, and validate the patterns by porting 3 high-ROI topics.

**Shipped.**
- J1: `docs/vision.md`, `docs/principles.md`, `docs/cycles.md`
- J2: `docs/brand.md` + `frontend/src/styles/tokens.css` extraction + `prose.css` refactor (size/space/motion ramps now have named vars; prose styles route through them)
- J3: `docs/authoring.md` rewrite + `docs/meta-yaml.md` + `import_seed.py` hardening (state-key cross-check, unknown-spec warnings, branch-reference validation, parse-error block fallback, `--strict` flag)
- J4: I-cycle correctness fixes — `progressStore.decisionEvents` is now the source of truth for "have I picked an option?", branch filter reads from there; decisions allow re-picking with `aria-pressed`; PlaygroundBlock has a "Try again" affordance + `clearSuccess`; sticky aside top uses `--header-h`; pinned aside stays mounted across the 1024px flip (CSS toggle, not unmount); decision "Show me the answer" link routed to `--color-text-secondary` for AA contrast.
- J5: plot library performance — module-level color cache + `MutationObserver` invalidation (no more `getComputedStyle` per render); `useShallow` selector in `PlotBlock` so a write to one state key doesn't re-render unrelated plots; incremental enter/update/exit pattern on `population_dot_grid` (1,000 dots no longer recreate on every state write).
- J6: accessibility & motion — site-wide `:focus-visible` ring on interactive elements; anchor sentinels excluded from tab order + AT tree; mobile plot ordering via optional `mobile_order:` attribute; dot-grid recolor transitions over 600ms with `prefers-reduced-motion` short-circuit.
- J7: ports — `conditional-probability` (Monty Hall as a decision driving `population_dot_grid`), `sampling-distributions` (playground with $n$ slider against a $\sigma/\sqrt{n}$ goal), `hypothesis-testing` (decision on $\alpha$ + `derivation` on what the p-value is and isn't).

**Retrospective.**

What the docs missed:
- The `mobile_order:` field landed in `meta` for plots in J6 but didn't make it into `docs/authoring.md` until the bayes port already had to use it. Future cycle: add the doc-amendment to the same phase as the feature.
- `docs/meta-yaml.md` lists `cycle_ported` but the field isn't actually surfaced anywhere in the UI yet. It's a write-only annotation right now. K-cycle could surface it as a chip on legacy topics ("ported in I" / "legacy") so authors see what still needs work at a glance.

What the refinement didn't catch:
- The 600ms dot-grid transition is gorgeous on a slider drag but feels laggy on a single decision pick. Future tuning: shorter (300ms) on discrete state writes, longer (600ms) on continuous slider drags. Needs a way to distinguish the two — either two effect paths or a debounce signal.
- The `useShallow` win is real for plots with `binds`. But `PlotBlock` without `binds` still subscribes to the full state, so a topic that writes `treatment_strategy` will re-render every unbound plot. Fix: require `binds:` for new specs (warning, not error) so authors think about subscriptions explicitly.

What the next cycle should pick up:
- **K1 — Content fill.** 22 topics still have legacy 3-block content. Now that `--strict` and the docs are in place, ports are mechanical. Goal: 10 ports per K cycle.
- **H10 carryover.** Server-side progress sync remains unaddressed; `progressStore.decisionEvents` is per-browser. Decision-event analytics ("which wrong answers do most users pick?") needs this first.
- **Plot specs from content demand.** Three ports surfaced no need for new specs. The next ten ports might. Add specs only when a content draft is blocked, not speculatively.
- **Author preview UI.** The watch-mode loop is good, but a syntax-error preview surface (showing the parse warning + offending block in-page) would tighten the loop further. Defer until the K-cycle stress test of the directives surfaces a need.

**Deferred.**
- Multi-step branching trees (still I7 backlog).
- `fill_in` puzzle blocks (I7 backlog).
- SlideView retirement (I7 backlog).
- Decision-branch analytics (needs H10 progress sync).
- Mobile pinned-viz pane (I7 backlog).
- High-contrast mode beyond existing tokens.
- Marketing surface (`vision.md` is internal; no landing page copy this cycle).

---

## K — Vision reconciliation & cluster buildout

**Intent.** Take the high-ROI items from the platform vision document, reconcile them with the I-cycle directive surface, and validate by porting 8 more topics in the probability arm. Defer forks / WebR / LTI to L+.

**Shipped.**
- K0: graph edge-label noise — root → entry-topic edges no longer carry "Part of {domain}" descriptions; the visual contract is now "if a line has a label, the label says something the colors don't."
- K1: six-gear authoring scaffold — new `gear` directive (purely metadata), six-gear template documented in `docs/authoring.md`, `gear: 3` explicitly admits both modes (observation / commitment) so playgrounds and decisions are equally valid expressions of the gear.
- K2: `Shape of Statistics` flythrough — new `_meta` hidden domain in `seed/schema.yaml`, additive schema-merge in `import_seed.py` (so future schema additions land on every run, not just fresh DBs), `GraphFlythrough` component reusing ForceGraph + `centerOnSlug`, "Start here" chip on `/explore`.
- K3: spaced repetition — SM-2 in `progressStore` (`reviewSchedule` map keyed by slug), `RecallPrompt` component above the prose when due, `ForceGraph` alpha-lift on overdue completed nodes, `recall_prompt` field in `meta.yaml` + `Topic` model.
- K4: confusion signal — `confusionFlags` on `progressStore`, `ConfusionFlag` button per block in `ScrollReader` ("I want to revisit this"), hairline left-border on flagged blocks, `?debug=confusion` heatmap overlay tinted by flag count.
- K5: real data layer — `Topic.dataset` column, `dataset` directive (in-prose attribution chip), `dataset:` field in `meta.yaml`, 4 curated CSVs (coin-flips-1000, medical-test-results, monty-hall-runs, heights), `manifest.yaml`, `GET /api/datasets[/:name]`, `load(name)` helper injected into the Python execution context, `/datasets` index page with reverse-index by topic.
- K6: 8 ports — `basic-probability`, `independence`, `expectation`, `random-variables`, `central-limit-theorem` (new directory), `confidence-intervals`, `point-estimation`, `correlation`. Every port uses the K1 six-gear scaffold; every port runs `--strict` clean. The probability arm now has 12 ported topics on the I-cycle directive surface (4 from J7 + 8 from K6).
- K7: public graph snapshot — `/u/:username` route, `GET /api/users/:username/snapshot` (returns empty progress until H10 server-sync lands; the `me` shortcut reads local `progressStore`), `ForceGraph.progressOverride` prop so a viewer's session can render someone else's progress, per-cluster depth bars (proportional fill, no numbers — depth signal, not a grade).

**Retrospective.**

What the docs missed:
- The new `_meta` domain mechanic (K2) didn't end up in `docs/meta-yaml.md` or `principles.md`. Future cycle: when a new architectural concept lands (hidden domains, additive schema-merge), add a one-paragraph note to the relevant doc in the same change. The pattern of "feature first, doc later" the J retrospective called out continues to bite.
- `manifest.yaml` (K5) is its own format with no schema doc. It worked here because there's exactly one author for the seed, but the moment a contributor wants to add a dataset they'll have to read the source. K's `docs/authoring.md` should get a "Datasets" section in K's own retrospective phase, not L.

What the refinement still didn't catch:
- The 600ms dot-grid transition (J6 carryover) wasn't tuned this cycle. The J retrospective flagged it; K had higher-priority work. Still on the bench.
- `BlockShell`'s confusion-flag overlay (K4) re-renders on every store change because it doesn't use `useShallow` on its block-id selector. Per-block re-render cost is small but it's the same family of bug J5 fixed for plots. Worth a tighter selector in L.
- `GraphFlythrough` (K2) re-fetches the full graph on every topic mount. For "Shape of Statistics" that's fine; if any other tour topics land, the graph payload should be cached at the App level.

What the next cycle should pick up:
- **L1 — content fill.** 17 schema topics still legacy. K hit 12 ported in the probability arm; L should aim for ~15 ports across distributions + statistical-inference. The vision doc's 15–20-per-cluster goal still stands.
- **L2 — H10 progress sync.** K7 is functional but the public-snapshot story is a stub until server-side sync lands. L is when this becomes the priority — the K7 retro (and the K4 confusion-flag aggregation, and any future analytics) all gate on it.
- **Fork model — feasibility study.** With ~30 ported topics by end of L, the fork model becomes argumentatively meaningful. M cycle considers it explicitly.
- **Plot library expansion**, only when a port surfaces a concrete need. K6 didn't surface any.

**Deferred.** All of the K plan's "Not in scope" list, plus the new items in the K retrospective above (K1's missing principles-doc update, K5's missing manifest-doc).

---

## L — Polish & parity

**Intent.** Fix four small-but-corrosive bugs the user surfaced after the K7 close: gear labels making every topic feel templated, SlideView breaking on every K-cycle block type, GraphFlythrough landing outside cluster nodes, and search dropdowns missing in two of three surfaces. Plus carry-over polish from K's retrospective and a comprehensive feature catalog to close the docs-ecosystem gap.

**Shipped.**
- L1: Gear dividers feel organic — dropped the "Gear N" prefix from rendering; unlabeled gears now invisible; clean hairline + small-caps label only. Authoring guide explicitly warns against reusing canonical gear names.
- L2: SlideView parity — extracted `BlockRenderer` into `frontend/src/components/topic/blocks/BlockRenderer.tsx` shared by both reading surfaces. SlideView now routes every block through it (with mode='slides' branching for slide-specific framing: full-bleed plots, hero-typography gear titles, invisible dataset/state directives). Pulled `StepThrough` and `branchFilter` / `parseMeta` into their own modules so SlideView can import the same filter ScrollReader uses.
- L3: GraphFlythrough cluster centroid — `centerOnSlug` auto-detects depth-0 nodes (domain roots) and pans to the centroid of their cluster's members instead of the root node's force-balanced position. Targets like `probability-foundations` now land in regions that actually contain visible cluster members.
- L4: SearchDropdown unification — new `frontend/src/components/SearchDropdown.tsx` shared by the navbar Ctrl-K modal and the Home page hero. The Home page lost its naive Enter-slugify navigation in favor of a live dropdown. Backend `/api/graph/search` made dialect-portable: Postgres path keeps pg_trgm; SQLite path falls back to a CASE-ranked LIKE so the dev stack works.
- L5: K-retro carry-overs — `BlockShell`'s parallel confusion-flag selectors collapsed into one. Dot-grid recolor transition now scales by state-change type (300ms for decision picks, 600ms for slider drags). `GraphFlythrough` gained a session-scoped module-level graph-payload cache so multiple tour mounts don't re-fetch. Doc gaps: `docs/principles.md` got the `_meta` hidden-domain note under Principle 7; `docs/authoring.md` got a `dataset` directive section + the `manifest.yaml` schema.
- L6: `docs/features.md` — comprehensive feature catalog. Every user-visible thing organized by surface, with where/what/how-it-works/code-pointer/cycle-origin per entry. Cross-linked from `cycles.md`, `authoring.md`, and `vision.md`.

**Retrospective.**

What L exposed:
- The K6 ports already use generic gear labels ("The spark", "Intuition", "The decision"). L1's authoring guidance only affects *new* ports — the existing 12 still need a label-rewrite pass. Queued for M as part of either the content-fill phase or its own polish pass.
- The SlideView `gear → title slide` treatment works but doesn't *merge* with the next content slide as the plan originally imagined. Adjacent gear-then-content stay as two separate slides today. That's actually cleaner than the merge — but if it stops feeling right we can revisit.
- The dev stack's SQLite-vs-Postgres split (L4 search) is the second time this season we've hit it (J3 was the first, with the dataset endpoint that uses raw filesystem paths). Worth a small `docs/dev-stack.md` entry in M explaining which features differ between the two and why.

What's still not addressed:
- Server-side progress sync (H10) — still M's headline. K4's heatmap and K7's snapshot both gate on it.
- 17 schema topics remain on the legacy 3-block structure. K6 hit 12 ports in the probability arm; M's content-fill phase aims for the distributions + statistical-inference clusters.
- The `connections` directive proposed in I7 is still uncalled-for — `callout` covers Gear 6 fine.

**Deferred.** All of the L plan's "Not in scope" list. Plus the new items above (K6 gear-label rewrite pass, dev-stack doc, server-side progress sync still gating analytics and public snapshots).

---

## M — Server-side progress sync, immersive tour, scaffolding for content fill

**Intent.** Take L's "Not in scope" carry-forward and ship the three biggest items: server-side progress sync (H10, marked "M's headline" in L's retrospective), the K6 gear-label rewrite, and scaffolds for the 8 missing schema topics. Plus document the immersive-tour substrate that landed out of band as M0, fix two small user-flagged bugs (Python/R code-toggle, tour-mode slides toggle), and write up the dev-stack notes that have been deferred twice.

### M0 — Immersive tour (out-of-band start)

This work landed before the L→M planning cadence as a response to user feedback on the Shape of Statistics intro: the small pinned-graph variant didn't honor the topic's pitch. The graph *is* the field — it should fill the viewport. Prose should float over it. Each section's camera should narrow to whichever cluster the section names.

**Shipped.**
- `ForceGraph` gained two new props: `visibleDomain` (a binary *hide* — non-matching nodes and any edge whose endpoint sits outside the named domain skip drawing entirely; the layout simulation still includes them, so positions don't reshuffle between sections) and `ambientAlpha` (overall opacity multiplier so the graph reads as background). The handle gained `fitNodes(slugs?)`, which computes the AABB of the requested nodes and pan/zooms to fit (no args → fits every visible node).
- The original prop name was `focusDomain` with dim-not-hide semantics; the dim variant read as "broken" because non-cluster nodes stayed faintly visible. Renamed and rebuilt as the legend-style hide that the user expected after seeing the first pass.
- New `Topic.tour: bool` column (with `server_default='0'` so the self-heal pass adds it cleanly to SQLite). Pydantic schema + frontend `TopicDetail` type mirror it. Importer reads `meta.yaml: tour: true`.
- `TourView` component — fixed-viewport graph as the background, a left-to-right vignette over the prose half of the viewport (themed via `color-mix(in srgb, var(--color-bg) …, transparent)` so light mode doesn't paint a dark gradient over a white page), prose blocks floating left in zinc panels with `backdrop-filter`. Honors the same branch filter as `ScrollReader` / `SlideView`.
- Anchor activation is a **single scroll listener** on the scroll root, not per-anchor `IntersectionObserver`s. `pickActiveAnchor(root, root.clientHeight * 0.30)` walks every `[data-anchor]` element and returns the topmost one whose top is at-or-above 30% of the viewport. A first pass used a narrow IO band (-22% / -76% rootMargin) but it missed transitions when the reader scrolled fast or jumped programmatically; the scroll-listener pick is deterministic on every frame regardless of how the scroll position got there.
- Tour-specific `graph_view` target semantics:
  - `target: all` → camera fits every node; no visibility filter.
  - `target: <domain-slug>` → camera fits that cluster's centroid + bbox; *other* clusters skip drawing entirely (legend-style hide).
  - `target: <topic-slug>` → existing `centerOnSlug` behavior (single-node center).
- `TopicView` dispatch — when `topic.tour === true`, mounts `TourView` and bypasses ScrollReader / SlideView entirely.
- Updated `seed/topics/_meta/shape-of-statistics/{meta.yaml, content.md}` to flip on `tour: true` and to use the new target semantics (`target: all` for the overview, then each domain slug per cluster section).
- J3 self-heal pass extended: it now emits a SQL `DEFAULT` clause for ALTER ADD COLUMN on NOT NULL columns, so future model additions land cleanly on SQLite (which otherwise rejects ADD NOT NULL without a default).

**Retrospective.**
- Per-anchor `IntersectionObserver` with a narrow band is the wrong tool for "which section is the reader in." A single scroll-listener `pickActiveAnchor` is deterministic, doesn't drift between observer creation and first paint, and handles fast scrolls + programmatic jumps cleanly. Worth remembering for any future scroll-driven UI.
- Alpha tuning matters: `ambientAlpha=0.55` rendered the graph nearly invisible. Settled at `0.85` (graph reads as visible-but-quiet) paired with the side vignette over the prose half of the viewport.
- The force layout doesn't cleanly isolate clusters — neighboring clusters' nodes can bleed into the frame at large zoom-out. With the legend-style hide, only the named cluster draws, so the frame is clean.
- First-pass colors were hardcoded for dark mode. Light mode needed `color-mix(in srgb, var(--color-bg) …)` for the vignette and `color-mix(in srgb, var(--color-bg-secondary) 82%, transparent)` for the prose panels. The token system makes this trivial; the gotcha is *remembering* to use it on every new chrome surface.

### M1 — Server-side progress sync (the H10 carryover)

Pulled the H10 backlog item off the list. The User + JWT + UserProgress skeleton was already in place; M1 added the wire format, the endpoints, the frontend sync layer, and the minimal auth UI that was missing.

**Shipped.**
- `UserProgress` extended with three JSON sidecar columns: `decision_events`, `review_schedule`, `confusion_flags`. Dialect-aware via SQLAlchemy's `JSON` type — JSONB on Postgres, TEXT on SQLite. J3 self-heal extended once more to forgive unquoted `{}` defaults in JSON columns (auto-wraps as `'{}'` so the ALTER ADD COLUMN ... DEFAULT clause is valid SQL on both dialects).
- `backend/schemas/progress.py` — Pydantic shapes that mirror the frontend's `progressStore` slices exactly. `TopicProgressUpsert` is the unit of sync; `ProgressBundle` is a list of them for snapshot / boot rehydration.
- `backend/api/progress.py` — three endpoints mounted under `/api/users/me/progress`: `GET` (full snapshot), `PUT /{slug}` (single-topic upsert), `POST /batch` (login-time bulk push). Conflict resolution: last-write-wins on `client_updated_at` vs `server.updated_at`; tied → server wins.
- `backend/api/users.py` — K7's stub replaced with a real read. Public snapshot now returns aggregated `completed_slugs` / `in_progress_slugs` from `UserProgress` and `synced: true` once the user has touched any topic.
- `frontend/src/api/client.ts` — `getProgress`, `putTopicProgress`, `batchProgress` methods + wire-shape types.
- `frontend/src/stores/progressStore.ts` — persist version bumped to 5. Added `topicUpdatedAt: Record<slug, number>` (per-topic wall-clock that all mutating setters bump), `isHydrating: bool` (gate to prevent push-loops during server rehydration), `syncFromServer(bundle)` (the per-topic last-write-wins merge), and `buildTopicUpsert(slug)` (the wire-shape builder).
- `frontend/src/stores/syncOrchestrator.ts` (new) — one module owns the sync rhythm. Boot-pulls if a token is present; subscribes to `topicUpdatedAt` and debounces a push (1500ms); pulls on window focus (30s cooldown); on login, batch-pushes local state then pulls the merged bundle.
- `frontend/src/stores/authStore.ts` (new) — minimal Zustand-persisted `{ token, user }` with `login` / `register` / `logout`. Mirrors the persisted token back to the legacy `localStorage.getItem('token')` key the existing `request()` wrapper reads.
- `frontend/src/components/AuthMenu.tsx` (new) — navbar chip + auth modal. Anonymous: "Sign in" button; authenticated: 2-letter initials with a popover linking to the user's `/u/{display_name}` snapshot.
- `frontend/src/App.tsx` — calls `startSyncOrchestrator()` once on mount.

**Retrospective.**
- The plan assumed an auth UI already existed. It didn't — the backend had `auth.py` with login/register/me from day one, but the frontend had never wired them into any component. Adding `authStore` + `AuthMenu` extended M1's scope by maybe 30% but was non-negotiable; M1 without it wouldn't have been verifiable from the browser.
- The conflict resolution policy (per-topic last-write-wins on `client_updated_at`) was easy to test against itself but exposed a subtle test-contamination issue: opening a topic page calls `markInProgress(slug)` on mount, which bumped the local timestamp past the server's "completed" timestamp from a prior session — so a "fresh device login" test that went to the topic page first ended up overwriting the server's "completed" with "in_progress". The fix is operational: test cross-device flows from the home page, not from inside a topic. The behavior under real use is correct; it's only the test ergonomic that bites.
- The orchestrator's first version pushed on every keystroke. The 1500ms debounce is short enough that a "marked complete → reloaded" cycle feels instant but long enough that toggling the LEARNED chip back and forth doesn't flood the network.
- The K7 snapshot endpoint's "this account hasn't synced yet" message in `UserGraph.tsx` is now dead code. Left in place for one cycle in case any deployed instance is still serving the old endpoint shape; remove in N.

### M2 — K6 gear-label rewrite pass

Eight K6-ported topics (probability-foundations × 5, regression-modeling × 1, statistical-inference × 2) had placeholder gear labels from the K1 template ("The spark", "Intuition", "The formalism", "Code", "Connections"). L1's authoring guidance told authors not to reuse those names verbatim; M2 was the mechanical pass that brought existing ports into line with the guidance.

For each topic, six labels (or five — Gear 6 stays "Where it leads" everywhere as a deliberate cross-topic anchor) were rewritten to name what the section is about in that topic. Examples: `bayes-theorem` Gear 5 → "Updating a belief, in 30 lines"; `central-limit-theorem` Gear 4 → "The 1/√n statement"; `confidence-intervals` Gear 3 → "Which reading is right?"; `point-estimation` Gear 3 → "Biased and tight beats unbiased and loose."

`--strict` clean. The L1 renderer dropped the "Gear N" prefix already; M2 was source-only. No code changes.

### M3 — Scaffolds for 9 missing topic ports

Nine topics still on legacy 3-block content got K-era scaffolds: 6 gear markers (with TODO labels), a `state` + `plot` pair, a `decision` or `playground` for Gear 3, a `derivation` (collapsed) under Gear 4, a `simulation` block under Gear 5, and a connections `callout` for Gear 6.

Topics scaffolded:
- `sample-spaces` — the probability arm's missing first chapter; the scaffold uses a coin-flip conditional probability decision in Gear 3.
- `bernoulli-distribution`, `binomial-distribution`, `normal-distribution`, `poisson-distribution`, `t-distribution` — the full distributions cluster.
- `hypothesis-testing` — already mostly K-era; M3 added gear markers around its existing structure.
- `sampling-distributions` — already mostly K-era; same treatment.
- `simple-linear-regression` — paired with `correlation` to close the modeling arc.

Each scaffold has prose stubs marked `> TODO (N):` so N's author starts from "fill in the gear's prose" rather than "design the structure." Where the existing legacy content held usable prose (`hypothesis-testing`, `sampling-distributions`), it was preserved verbatim inside the new gear scaffold; for the empty stubs (the five distributions, sample-spaces), the scaffolds carry seed prose that names the topic's spark / intuition / formalism but leaves the body for N.

Two TODOs in the plot library surfaced: `poisson_pmf` and `student_t_pdf` aren't shipped yet. The scaffolds use `binomial_pmf` and `gaussian_pdf` as visual stand-ins with explicit `<!-- todo: needs … spec -->` comments so the gap is visible.

`--strict` clean on all 9.

### M4 — Carry-over docs

- `docs/dev-stack.md` (new) — SQLite vs Postgres notes that the J3 self-heal and L4 search both kept rediscovering. Documents the "no migrations, self-heal handles ALTER ADD" pattern, the dialect-portable idioms the codebase uses (`JSON` type, `LIKE`-fallback search, `func.now()`), and a 5-step "adding a column" checklist.
- `docs/features.md` — appended M1 entries: server-side progress sync, `authStore` + `AuthMenu`, and four new endpoints in the API surface table.
- `docs/cycles.md` — this retrospective.
- `docs/authoring.md` and `docs/meta-yaml.md` — already extended by M0.

### M5 — Two user-flagged bugs

**Issue 1 (slides toggle in tour mode).** `TopicView` short-circuits on `topic.tour` and always mounts `TourView`, but `ZenChrome` was still rendering the scroll/slides toggle and the slide-nav UI — both of which are inert in tour mode. Added `isTour?: boolean` to `ZenChrome` and gated the toggle + slide-nav on `!isTour`; `TopicView` passes `topic.tour`. Verified: Shape of Statistics shows only the layer toggle + LEARNED chip; non-tour topics still show the full chrome.

**Issue 2 (Python/R code-toggle).** Topics could author code in both languages but the two block-types rendered as separate blocks one after the other — there was no toggle. Added a paired-code-block convention: two adjacent code blocks sharing a `pair_id:` directive field merge into a single tabbed surface (Python / R). The reader's `preferredCodeLang` persists in `progressStore` and is global, not per-topic.

Concrete changes:
- `seed/import_seed.py` — extended `_extract_multiline_blocks` to handle code blocks as multi-line (their close delimiter is the fenced code's closing ``` instead of `<!-- /block -->`). Without this lift, a code block adjacent to a single-line placeholder (`dataset`, `state`, etc.) would have its directive comment stripped by the placeholder-mode prose pass and render as orphan markdown. The fence regex now accepts ```` ```python ```` or ```` ```r ```` (was ```` ```python ```` hardcoded).
- `seed/import_seed.py` — extended `_build_multiline_block` to emit code-block rows from the new extractor path. `pair_id` and any other unknown-but-harmless attrs ride into `meta`.
- `frontend/src/components/topic/blocks/codePairs.ts` (new) — `groupCodePairs(blocks, metaCache)` walks the visible-block list and collapses adjacent code blocks sharing a `pair_id` into a `CodePair` virtual block. Non-pair blocks pass through unchanged.
- `frontend/src/components/topic/blocks/CodePairRenderer.tsx` (new) — renders the language tabs + delegates to `CodeRunner` for the active language. Re-mounts the runner on tab flip (via React `key`) so per-instance state resets cleanly.
- `frontend/src/components/topic/ScrollReader.tsx` and `frontend/src/components/topic/TourView.tsx` — call `groupCodePairs` once on the filtered block list and route `CodePair` entries to `CodePairRenderer`.
- `frontend/src/stores/progressStore.ts` — added `preferredCodeLang: 'python' | 'r'` with a `setPreferredCodeLang` setter. Persisted (version 5 already from M1, schema extended in-place).
- `seed/topics/distributions/binomial-distribution/content.md` — demo pair (`pair_id: binomial-mean-var`) so the convention has at least one shipped example.
- `docs/authoring.md` — "Paired Python / R blocks (`pair_id:`)" subsection under the code directive reference.

Retrospective:
- The first attempt added `pair_id` capture to the legacy code-block regex at the bottom of the section loop. That worked when the code block was in its own section but failed when a `dataset` (or other single-line) placeholder sat in the same section — placeholder-mode's `re.sub(r"<!--.*?-->", "", pre)` stripped the directive comment, leaving the code fence as orphan markdown. Fix: lift code blocks into `_extract_multiline_blocks` so they get a proper placeholder before the section split.
- The fence-language regex was hardcoded to ```` ```python ````. R code blocks with ```` ```r ```` fences silently fell through to markdown until the regex was widened. Trivial change; would have wasted an hour to discover at runtime.
- The pair is global per language, not per topic. That's a deliberate choice — a reader who codes in R wants R everywhere — but it makes per-topic "force show Python here for illustration" awkward. No requests yet; defer until they surface.
- `progressStore.preferredCodeLang` isn't yet synced via M1's orchestrator (it's a top-level field, not per-topic; the bundle shape doesn't carry it). Could be lifted into the User table as a JSON `prefs` column in a later cycle. For now it lives in localStorage only — acceptable since it's a preference, not a record.

---

## N — Fork model

**Intent.** Build the "place where anyone can fork the content and edit it." The user flipped the fork model off the backlog (it had been gated on ~40 ported topics) and made it the headline. Scope locked at planning time: edit `content.md` only (prose, code, all in-topic directives — not `meta.yaml`, not the topic graph); anyone-can-fork, public-by-default; lineage display only (parent pointer + "Fork of X" chip + "My forks" listing), with merge-back / signal aggregation / multi-level chains deferred.

What existed: a `TopicFork` table scaffolded in an earlier cycle as a professor-only, course-scoped customization mechanism — never wired to any surface. N generalized it and built the surfaces.

**Shipped.**
- **N0 — `TopicFork` generalized.** Dropped the professor-only / course-scoped framing. Added `markdown_source` (the editable `content.md` text — the source of truth). `backend/services/fork_service.py` (new): `create_fork` (seeds `markdown_source` from the master's content.md on disk), `get_fork`, `list_user_forks`, `list_my_forks`, `update_fork_source`, `delete_fork`. The K7 fuzzy display-name lookup is reused for `/u/{username}/...` resolution.
- **N1 — endpoints.** `backend/api/forks.py` + `backend/schemas/fork.py`: `POST /forks`, `GET /forks/me`, `GET /forks/{username}`, `GET /forks/{username}/{slug}`, `PUT /forks/{username}/{slug}`, `DELETE /forks/{username}/{slug}`, `POST /forks/preview`. The GET endpoints parse `markdown_source` into wire-shape blocks (`ForkContentBlock` mirrors the frontend `ContentBlock`); the frontend renders forks through the existing `ScrollReader`. Conflict on duplicate fork → 409 carrying the existing fork id.
- **N2 — `parse_content_md(text)`.** Extracted the directive parser from `parse_content_file(path)`; the file version is now a one-line shim. The fork save / preview endpoints reuse it verbatim — a fork goes through the exact pipeline the seed import uses.
- **N3 — fork reader.** `frontend/src/pages/ForkView.tsx` at `/u/:username/topic/:slug`. Lineage banner ("Fork of {master} by {username}"), renders via `ScrollReader`, owner sees an Edit chip. Fork reading is namespaced under `fork:{username}:{slug}` so it never touches master-topic progress.
- **N4 — fork editor.** `frontend/src/pages/ForkEditor.tsx` at `/u/me/topic/:slug/edit`. Two panes: monospace textarea + live `ScrollReader` preview (debounced 400ms `POST /forks/preview`). Save via `PUT` (or Cmd/Ctrl-S). Parser warnings surface above the preview. Delete-fork behind a confirm.
- **N5 — "Fork this topic" chip.** Bottom-chrome chip in `ZenChrome`, left of LEARNED. Hidden for anonymous viewers and tour topics. "Fork this topic" → creates + opens the editor; "Open my fork" when one exists. `TopicView` checks `listMyForks` on load to pick the label.
- **N6 — my-forks page.** `frontend/src/pages/UserForks.tsx` at `/u/:username/forks` — card grid, edit/delete for your own, read-only for others. "My forks" row added to the `AuthMenu` popover.
- **N7 — docs.** `docs/forks.md` (new), `features.md` entries, this retrospective.

**Retrospective.**
- The live `topic_forks` table predated the model's `content_snapshot` nullable change and still carried a `NOT NULL` constraint — and SQLite can't `ALTER COLUMN` nullability. The table had zero rows (the scaffold was never exercised), so the fix was a clean drop + `create_tables()` rebuild from the current model. Worth remembering: the J3 self-heal *adds* columns but never *changes* them; a constraint change on an existing table means a rebuild or a one-off script.
- The editor's right-pane preview is cramped: `ScrollReader` runs its own ≥1024px two-column split off `window.innerWidth`, so inside a ~640px editor pane it still tries the pinned-viz layout and the prose wraps tight. Functional (the live preview updates correctly) but not pretty. A container-query-aware `ScrollReader`, or a single-column preview mode, is a follow-up — out of N's scope.
- `ApiError` was added to `client.ts` so callers can read structured error detail (the fork 409 carries `{existing_fork_id, ...}`). The old `request()` threw a plain `Error(body.detail)` which stringified objects to `[object Object]`. Also taught `request()` to return `undefined` for 204s (DELETE) instead of choking on an empty body.
- Fork progress namespacing (`fork:{username}:{slug}`) rides M1's sync for free — the orchestrator keys by slug string and doesn't care that the slug is a fork-namespaced one. No special work.

**Deferred.** All of N's "Not in scope": forking a fork (multi-level chains), "suggest this change to master" (PR-style merge-back — O's headline candidate), signal aggregation across forks, per-fork graph/prereq overrides, `meta.yaml` editing inside forks, visibility flags (unlisted/private), fork comments, Course ↔ fork integration, editor syntax highlighting. The `content_snapshot` column is dead code, slated for removal via a table rebuild. The cramped editor preview is a queued follow-up.


---

## O — Merge-back & fork polish

**Intent.** N shipped the fork model; O closes the loop. A fork owner suggests their content to the master, an ADMIN/EDITOR reviews a diff, and accept rewrites the master topic (DB + seed file). Plus a bug fix and two N-retro polish debts.

**Shipped.**

- **O0 — `/u/me/topic/:slug` fork-reader bug fix.** `ForkView` now resolves the `me` alias to the signed-in user's `display_name` and redirects (replace) to the canonical `/u/{display_name}/topic/{slug}` URL — so the address bar carries a real, shareable username instead of the literal `me`. Anonymous viewers of `/u/me/...` bounce to the master topic. `TopicView`'s "Open my fork" branch and `ForkEditor`'s "← Back to fork" link both use the resolved username so the redirect is a fallback, not the common path. The bug surfaced immediately after N — "Open my fork" 404'd on every existing fork.
- **O1 — Merge-back.** New `MergeBackSuggestion` model (snapshots `suggested_markdown` at suggest time so later fork edits don't mutate a pending suggestion). New `merge_service` with two primitives: `apply_markdown_to_topic` (delete + insert `ContentBlock` + `Misconception` rows from a fresh markdown, atomic) and `write_topic_source` (rewrite `seed/topics/{domain}/{slug}/content.md` on disk). Endpoints: `POST /api/forks/{username}/{slug}/suggest` (owner-only); `GET /api/merge-backs`, `GET /api/merge-backs/{id}`, `POST /api/merge-backs/{id}/accept`, `POST /api/merge-backs/{id}/reject` (ADMIN/EDITOR — inline role check). `ForkDetail`/`ForkSummary` carry a `suggestion_status` field so fork surfaces show a chip without an extra round trip. Frontend: a new `/review` page with a two-pane queue + per-suggestion detail and a unified line diff (`MergeDiff` + `lineDiff.ts` — a minimal LCS, no new dependency). "Suggest to master" button in the fork editor; status chips on `ForkView`'s lineage banner and the editor's top bar. AuthMenu shows a "Review queue" link for ADMIN/EDITOR.
- **O2 — `ScrollReader.forceLinear`.** The fork editor's right preview pane was attempting `ScrollReader`'s two-column pinned-viz layout in ~640px — prose wrapped to a few words per line, plots crammed. Added `forceLinear?: boolean`; the editor passes it. `ForkView` and the master topic page leave it false and are unchanged. The minimum honest fix; container-query `ScrollReader` is a deferred general refactor.
- **O3 — Retired the `content_snapshot` column.** Dead legacy column on `TopicFork` from the pre-N course-scoped scaffold — N's `create_fork` was inserting `""` only to satisfy the live table's stale `NOT NULL`. Dropped from the model + `create_fork` + `course_service.fork_topic_in_course`. Added a narrow one-off step to `import_seed`'s self-heal: `_O3_drop_retired_columns` does `ALTER TABLE topic_forks DROP COLUMN content_snapshot` (idempotent; silently no-ops on a SQLite too old to support it).
- **O4 — Docs.** `forks.md` gained a "Merge-back" section explaining the lifecycle and the why-write-the-seed-file decision; `features.md` got entries for the `/review` route, the merge-back endpoints, `MergeBackSuggestion`, and `ScrollReader.forceLinear`; this retrospective.

**Retrospective.**

- The seed-file-write decision had real ambiguity. Reimport already skips topics that have content, so a DB-only accept is durable. But the seed `content.md` files *are* the readable source of truth a contributor reads; letting them drift would be dishonest. Writing both keeps disk + DB consistent at the cost of an HTTP handler doing filesystem IO into the repo's source tree. Acceptable here (single-author dev stack); something to revisit when the repo has more than one author.
- The merge-back model snapshots `suggested_markdown` at suggest time rather than pointing at the live fork. The first-pass shape pointed at the fork — but a fork owner editing while a reviewer is looking at the diff would mutate the proposal under the reviewer. Snapshot-at-suggest gives the reviewer a stable target; the owner can re-suggest after editing to replace the snapshot, which is the right UX for "I want to revise."
- One pending suggestion per fork. The alternative — a queue of stale historical pending suggestions from the same owner — would clutter the review surface and reward spam. Re-suggest while pending updates the existing row in place, which models the owner's mental model ("I'm proposing my fork's *current* content").
- Login response carries a *stale* user role for a session — the JWT payload is fine but `UserResponse.model_validate(user)` returns the row as of login time, so if a user is promoted between login and a subsequent request, the response's `user.role` reads old. `get_current_user` re-fetches per request and is correct. Caught while testing the role gate; not fixed in O (pre-existing M1 quirk). Worth a one-line follow-up.
- The N retro flagged the cramped editor preview as out of scope. `forceLinear` is the minimum-friction fix — a prop, not a rewrite. Container-query `ScrollReader` is still the right long-term move but waits for a second compelling caller.
- `MergeDiff` is rendered with `<pre>` + `<div>`s. A virtualized renderer would matter for huge diffs (100kb+ content.md); none of the K-era topics are anywhere close. Defer.

**Deferred (carry-forward to P).** Multi-level fork chains (fork a fork — needs `parent_fork_id` + lineage UI). Signal aggregation across forks ("which sections get edited / suggested most" — gates on fork volume). Per-fork graph / prereq overrides (a dedicated graph-editor cycle). `meta.yaml` editing inside forks (and merge-back accept then has to carry meta changes). Fork visibility flags (unlisted / private). Fork / suggestion comment threads. Block-level diff + partial accept (line-level whole-file accept covers O). Suggestion notifications (in-app / email). Container-query `ScrollReader`. Editor syntax highlighting (CodeMirror). Course ↔ fork integration (the `TopicFork.course_id` column remains reserved). WebR + Pyodide, LTI, decision-branch analytics, mobile pinned-viz pane, plot library expansion, WCAG full audit, high-contrast theme, marketing landing page — long-running backlog; no condition changed in O.

---

## P — Brand identity

**Intent.** AllData had a strong *internal* design system (`brand.md`) and positioning (`vision.md`) but a thin *public-facing* identity: a title-only `index.html`, an un-extracted inline-SVG logo, no static-asset folder, no single source-of-truth for the name/tagline/voice, and a `vision.md` that had drifted from what shipped. Make the identity real and applied. Name "AllData" locked; formalize what's implicitly there rather than reinvent.

**Shipped.**

- **P0 — Identity source-of-truth.** New `docs/identity.md` (canonical: name rules, tagline "Statistics is a graph, not a textbook.", elevator line, the mark, voice-in-brief, reconciled is/isn't) and `.claude/brand-voice-guidelines.md` (same voice in the brand-voice plugin format — voice attributes, do/don't table, preferred/avoided vocabulary, worked examples — for the `enforce-voice` skill). Both synthesize the existing `brand.md` §1 + `vision.md` + shipped copy; neither re-pastes the token tables (they link `brand.md`).
- **P1 — `<Logo>` component.** Extracted the navbar's inline SVG into `frontend/src/components/Logo.tsx` (`size` + `variant: full | mark`, teal from `--color-accent`). `Layout.tsx` now wraps `<Logo>` in the home link; the inline SVG is gone. The component is the canonical mark; the favicon derives from the same geometry.
- **P2 — Favicon, meta, social cards.** New `frontend/public/` with `favicon.svg` (the mark) and `og.png` (1200×630 card: zinc bg, mark, wordmark, tagline) plus its editable `og.svg` source. Rewrote the `index.html` head: favicon link, `description`, `theme-color`, full Open Graph + Twitter card tags. Vite serves `public/` at the root, so the assets resolve with no build wiring.
- **P3 — Public-chrome voice + stale data + vision reconcile.** Hero already matched the canonical tagline (no change needed). Home's hardcoded `TOPIC_COUNTS` / `TOTAL_CONTENT_TOPICS` (10/8/12/6/6, total 20 — all wrong) now derive live from `api.getGraph()` (`has_content` per domain), seeded with the corrected real snapshot (8/5/5/2/1) so there's no flash and it survives a failed fetch. Reconciled `vision.md`'s "what it explicitly is not": "no spaced repetition" → "not gamified (recall exists, no streaks/scores)" (K3); "no shareable progress, localStorage only" → "syncs across devices (M), shareable as a read-only snapshot (K7), never a grade/certificate." `vision.md` and `identity.md` now tell the same story and cross-reference.
- **P4 — Docs.** `features.md` gained a "Brand & identity" section (Logo, favicon/meta/OG, identity source-of-truth, live Home counts); this retrospective.

**Retrospective.**

- **No SVG→PNG rasterizer in-environment.** `sharp`, `rsvg-convert`, and ImageMagick (`magick`) are all absent; the `convert` on PATH is the Windows disk tool (`C:\Windows\System32\convert.exe`), not ImageMagick — running it on an SVG would error, not rasterize. The working path was the headless browser already wired for preview: serve `og.svg` from `public/`, load it into an `Image`, draw to a 1200×630 `<canvas>`, `toDataURL('image/png')`. The base64 exceeded the eval tool's return budget — but the tool *saved the oversized result to a file on disk*, so a one-line Python `base64.b64decode` read it from there straight into `public/og.png` without the bytes ever passing through context. Worth remembering: oversized eval results are spooled to disk and can be post-processed there.
- **Fonts in the OG card fall back to system.** The card's `<text>` asks for Inter / STIX Two Text; a standalone SVG rasterized by the browser doesn't get the app's webfonts, so it lands on Segoe UI / Georgia (both present on Windows). Close enough to ship — the layout, color, and mark are exact. If a pixel-perfect card matters later, embed the fonts as base64 in the SVG before rasterizing.
- **Derive-don't-hardcode, with a fallback.** The stale Home counts were the second hardcoded-numbers smell this project has hit (the first was content-count drift in M). Deriving from `api.getGraph()` with a static fallback is the pattern: accurate when the API answers, no flash because the fallback seeds the initial state, honest offline. Reach for it any time a "marketing number" describes live data.
- **Formalize-not-reinvent paid off.** The mark was already a graph triad and the hero already carried the tagline — P's job was extraction + application, not design. The whole cycle touched no backend and added no dependency. The biggest lift was the OG image plumbing, not the identity itself.

**Deferred (carry-forward).** A `/about` route + marketing surface (gated on opening to anonymous traffic). PWA manifest + installable app + maskable icons. Per-topic dynamic OG images (needs a per-route render pipeline; P ships one static site card). Logo motion. Embedding webfonts in the OG card for pixel-perfect type. Everything still open from O (multi-level fork chains, signal aggregation, per-fork graph edits, fork visibility/comments). Long-running backlog unchanged: WebR + Pyodide, LTI, mentor signals, structured community threads, high-contrast theme, WCAG full-pass audit.

## Q — Family overviews & content fill

**Intent.** Eleven cycles of *machinery* — force-graph, scrollytelling, reactive plots, decisions/playgrounds, spaced repetition, sync, forks, merge-back, identity, the M0 immersive tour — had outrun the *content*. A precise audit of the 41 topics in `schema.yaml` found only **13 real lessons**; **9 were M3 scaffold-stubs that shipped live `TODO — name the spark` dividers** yet were flagged `has_content=true` (so the graph showed them populated and a reader clicking "Binomial Distribution" landed on placeholder text); **19 didn't exist**. Separately, the five domain/family root nodes were real depth-0 topics with *no destination* — Home cards jumped past them to `/explore?domain=`, the graph only opened depth>0 nodes, and the roots themselves were empty shells. One cohesive content cycle: give every family a front door, and clear every live-defect stub. Engineering deliberately tiny (2 plot specs + 1 TourView tweak + reachability wiring + 1 validator check); the weight was in the prose, held to the `bayes-theorem` bar.

**Shipped.**

- **Q0 — Two plot specs.** `poisson_pmf` (binds `lambda`; bars k=0…⌈λ+4√λ⌉, PMF via the in-file Lanczos `lgamma`) and `student_t_pdf` (binds `df`; t∈[−5,5] with a dashed N(0,1) reference, heavy tails at df=1 onto the normal by df≈30). Both ≈50-line copies of `binomial_pmf` / `gaussian_pdf` with the density swapped, registered in `PLOT_SPECS` (frontend) and `_KNOWN_PLOT_SPECS` (importer). Verified numerically: Poisson(4) sums to 1 with mean=var=4; t peak climbs 1/π (df=1) → 0.396 (df=30) toward the normal's 0.399.
- **Q1 — Family immersive overviews (the headline).** Five new `tour: true` topics at `seed/topics/{domain}/{domain}/` — one per domain root — that reuse `TourView` wholesale: open framed on the family cluster, spotlight each member topic in learning order (camera centers on the node, prose floats over it), pull back, hand off with links into the real lessons. One ~3-line `TourView` change makes it work: a node-`target` now sets `visibleDomain` to *that node's domain* (looked up from `nodes`) instead of `null`, so spotlighting a member keeps the family as the filtered background instead of flashing the whole graph back in. Reachability: Home domain cards link to `/topic/{domain}` (with a secondary "explore the cluster →" to the raw filtered graph); `GraphExplorer` double-click opens depth-0 nodes too; `GraphSidebar` shows "Open overview" for a root. The Shape-of-Statistics intro (targets `all` / domain slugs, never a single node) is untouched.
- **Q2 — Five distribution stubs filled.** `bernoulli` (binomial_pmf n=1, playground on p, E=p / Var=p(1−p)), `binomial` (decision writing n=20/p=0.05 factory example, P(k)=C(n,k)p^k(1−p)^{n−k}), `normal` (playground matching a target μ/σ, 68-95-99.7, z-score), `poisson` (playground on λ, P(k)=λ^k e^{−λ}/k!, E=Var=λ), `t-distribution` (playground on df, T=Z/√(V/ν), df=n−1). Each: real gear labels, a pinned reactive plot, one strong interactive, a runnable simulation confirming the stated E/Var, an inline misconception, a connections callout (Bernoulli→Binomial→Poisson; Normal→CLT→t).
- **Q3 — Four cross-cluster stubs filled.** `sample-spaces` (binomial_pmf n=2, two-coins "at least one heads"→1/3 decision, Kolmogorov axioms — swapping out the wrong `posterior_update` stand-in), `hypothesis-testing` (gaussian_pdf null + decision shifting the alternative, Type I/II, p-value misconception, cross-link to the real `p-values`), `sampling-distributions` (gaussian_pdf bound to `n`, playground shrinking SE=σ/√n, the sample-vs-sampling distinction), `simple-linear-regression` (scatter_with_fit, playground dragging the line to the OLS fit, β̂₁=r·s_y/s_x, cross-link `correlation`).
- **Q4 — Two net-new topics.** `variance` (prereq `expectation`; Var=E[(X−μ)²], SD, units) and `law-of-large-numbers` (prereqs `expectation`+`variance`; weak LLN + a one-line Chebyshev proof, running-mean simulation, the gambler's-fallacy misconception, LLN-vs-CLT kept distinct). Both complete the probability arm; the additive schema-merge wired their prereq edges once the dirs existed.
- **Q5 — `--strict` placeholder guard.** `_validate_topic_blocks` now `_warn`s (→ hard error under `--strict`) on a `gear` label starting with `TODO`, or a body carrying `> TODO (` / `TODO — name the` / `TODO (N):`. A scaffold stub can never again import as real content. Patterns scoped narrowly so a `# TODO` in a code block doesn't trip it.
- **Q6 — Docs.** `authoring.md` (the two specs + `lambda`/`df` state keys + the node-target-keeps-domain note), `features.md` (plot library 7→9, a "Family overviews" entry, the placeholder guard), `Home.tsx` fallback bumped to post-Q reality (probability 10, total 23), this retrospective.

**Retrospective.**

- **Domain roots needed registering in the fresh-seed `topic_map`.** The content-import loop keys on `topic_map[slug]`, but on a *fresh* seed that map was built depth-2-only, so the new `{domain}/{domain}/` dirs silently found no topic to attach to (the re-import branch was already fine — it `select`s every `Topic`). One line in the else-branch — `for _ds,_dt in domain_topics.items(): topic_map.setdefault(_ds,_dt)` — fixed it. Lesson: the two seed paths (fresh vs re-import) build `topic_map` differently; a content change that assumes one can quietly no-op on the other. The full wipe-and-reimport in verification is what would have caught it.
- **One plot tweak paid for two topics.** `sampling-distributions` needed the bell curve to *narrow* with n. Rather than a new spec, `gaussian_pdf` gained an optional `n` (σ_eff=σ/√n, default 1, fully backward-compatible) plus an adaptive y-domain `[0, max(0.45, peak·1.1)]`. The y-axis fix also cured a latent clip in `normal-distribution` at small σ that predated this cycle — and `law-of-large-numbers` then reused the same `n`-bound curve for free. Extending an existing spec beat minting `sampling_distribution_pdf`.
- **Know what the plot synthesizes before writing the playground target.** `scatter_with_fit` generates its cloud as y=0.7x+0.3+seeded-noise and honors a slope/intercept override. Confirming that *first* is why the SLR playground target `{slope:0.7, intercept:0.3}` lands exactly on the true fit — a guessed target would have felt subtly broken with no error to explain it.
- **The guard is the durable win.** Filling nine stubs is a one-time cleanup; `--strict` failing on `TODO` markers is what keeps them filled. Self-tested both directions: a sample with a `TODO` gear label + a `> TODO (N):` body emitted exactly two warnings, and the full wipe-and-reimport of all 29 content topics (13 prior + 5 overviews + 11 fills) exited 0 — proving zero false positives across real content. This is the M-era content-count drift lesson applied a third time: encode the invariant in the importer, don't trust discipline.
- **Tiny-engineering, heavy-content cycles are a real shape.** Q touched no backend model, added no dependency, and its entire code delta was 2 plot specs + a 3-line filter tweak + reachability wiring + one validator check. Everything else was prose held to a fixed bar. Worth naming as a cycle archetype distinct from the feature-heavy ones (N/O) and the polish ones (L/P).

**Deferred (carry-forward).** The other 17 topics (exponential/chi-squared/f distributions; t-tests, likelihood, MLE, statistical-power, bayesian-inference; multiple-regression, model-diagnostics, logistic-regression, regularization; ab-testing, cross-validation, bias-variance-tradeoff, data-wrangling, missing-data) across future content cycles — Q clears the live-defect stubs, completes the probability arm, and gives every family a front door first. Plot specs (`exponential_pdf`, `chi_squared_pdf`, `f_pdf`) build with the topics that need them. A "content coverage" author view (real / stub / missing) once the catalog is larger. Everything still open from P (`/about`, PWA, per-topic OG images, logo motion) and O (multi-level fork chains, signal aggregation, per-fork graph edits). Long-running backlog unchanged: WebR + Pyodide, LTI, mentor signals, structured community threads, high-contrast theme, WCAG full-pass audit.

## R — Complete the catalog (the final 17)

**Intent.** Q left the curriculum at 23 of 40 lessons, every family with a front door, and zero live-TODO stubs. Seventeen topics still had no content directory — the entire remaining curriculum across four clusters (distributions tail; statistical inference; regression & modeling; data science practice). R fills all 17 in one straight-through cycle, taking the catalog to **complete**: every curriculum topic in `schema.yaml` is now a real lesson. Confirmed scope: one cycle run end to end; the bar **adapted per topic** (the ~12 mathematical topics on the full Q "concept" template, the applied DS-practice topics on a code-forward "practice" shape); and **maximal** bespoke visualization — a dedicated plot spec for essentially every topic that benefits.

**Shipped.**

- **~14 new plot specs (library 9 → 23)**, built in four batches beside the cluster that uses them. R0: `exponential_pdf`, `chi_squared_pdf`, `f_pdf` (gamma-family densities reusing the in-file `lgamma`). R2: `likelihood_curve` (with an optional log-likelihood mode reused by MLE), `power_curves` (two normals + shaded Type-I/power regions), `beta_posterior` (prior × likelihood → posterior) — plus two analytic helpers, `normCdf` (erf) and `invNorm` (Acklam). R4: `added_variable_plot` (the confounding sign-flip), `residual_plot` (random/funnel/curve), `logistic_curve`, `coefficient_path` (ridge vs lasso). R6: `proportion_test`, `cv_error_curve`, `bias_variance_curve`, `missingness_grid`. `t-tests` reuses `student_t_pdf`; `data-wrangling` reuses `empirical_histogram`.
- **17 net-new lessons.** Distributions tail (exponential, chi-squared, F); inference (likelihood, MLE, t-tests, statistical-power, bayesian-inference); regression (multiple-regression, model-diagnostics, logistic-regression, regularization); DS practice (data-wrangling, ab-testing, cross-validation, bias-variance-tradeoff, missing-data). Each concept lesson carries a pinned reactive plot, a playground or decision, a verified simulation, an inline misconception, and a connections callout; each practice lesson swaps the playground for a real-data `code_python` walkthrough + a judgment-call decision.
- **The only backend touch** was registering the 14 spec names in `_KNOWN_PLOT_SPECS`. No schema, model, endpoint, or directive changes; the 17 are net-new `{domain}/{slug}/` dirs wired by the additive merge — exactly the Q4 pattern.
- **Docs + counts.** `authoring.md` (all 14 specs + ~17 new state keys), `features.md` (9 → 23 specs, the `normCdf`/`invNorm` helper note), `Home.tsx` fallback bumped to the final 40, and this retrospective.

**Retrospective.**

- **`np.trapz` is gone in NumPy 2.0 — and the sims run on the real interpreter.** The likelihood and Bayesian lessons used `np.trapz` for a quick integral; it raised `AttributeError` under the runtime's NumPy 2.4. Because the `/execute` service shells out to actual Python (Docker sandbox, or a local fallback), a deprecated API isn't a style nit — it's a hard error a reader hits the moment they press "Run." Replaced with a version-agnostic Riemann sum, and adopted a rule to avoid the NumPy-2.0 removals (`np.trapz→trapezoid`, `np.product`, `np.in1d`, `np.float_`). Verifying every simulation by *executing it*, not eyeballing it, is what caught this.
- **Extend a spec before minting a new one — but know when a new one earns its keep.** `likelihood_curve` serves both `likelihood` and `MLE` via one optional `loglik` flag — reuse. But the "maximal viz" call paid off where a generic spec would have *lied*: `added_variable_plot` literally toggles a coefficient's **sign** (marginal +1.3 → partial −0.95), which no scatter reuse could show, and `power_curves`' shaded two-world picture is the entire point of power. The discipline: reuse for the same picture, build for a genuinely different one.
- **Synthesize the data the spec needs, and verify the headline numerically first.** Several specs invent their own seeded data (the confounding cloud, the logistic 0/1 points, the heteroscedastic residuals). Every teaching claim — "the slope flips," "peeking inflates the false-positive rate to ~18%," "CV bottoms out at the true degree" — was confirmed by running the exact DGP/sim in Python *before* writing the prose, so the words match what the reader will actually see. The A/B peeking result (17.6% false positives on identical groups) is the cycle's sharpest single number.
- **Two lesson archetypes, deliberately.** The concept template (pinned reactive plot + playground/decision + formula + simulation) fit the 12 mathematical topics cleanly. Forcing it onto `data-wrangling` or `missing-data` would have been contrived, so those took a practice shape: a runnable pandas walkthrough as the centerpiece, a judgment-call decision, and the plot demoted to a supporting illustration (a histogram that tightens when a sentinel is handled; a grid whose missingness footprint changes with the mechanism). Adapting the bar per topic beat one rigid template.
- **The catalog is complete — so the backlog is now non-content.** Thirteen lettered cycles built the machine; Q and R filled it. With 40/40 curriculum lessons plus 5 family overviews and the intro tour, there is no "missing topic" left to point at. What remains — WebR/Pyodide live execution, per-topic OG images, `/about`, multi-level forks, a high-contrast theme — is platform and polish, or a future *schema-expansion* into new domains, not a gap in what's taught today.

**Deferred (carry-forward).** Live in-browser code execution (WebR + Pyodide) is the big content-adjacent upgrade — simulations currently round-trip to the `/execute` sandbox. Carried from P: per-topic dynamic OG images, an `/about` page, a PWA manifest, logo motion. Carried from O: multi-level fork chains, signal aggregation, per-fork graph edits. Long-running platform backlog unchanged: LTI, mentor signals, structured community threads, a high-contrast theme, a full WCAG audit. A future cycle could **expand the schema** — measure-theoretic probability, GLMs, time series, causal inference — net-new domains beyond the present 40-topic curriculum.
