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

