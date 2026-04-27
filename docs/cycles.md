# Cycles

The development ledger. Each cycle is a coordinated batch of work named with a single letter. Inside a cycle, sub-phases are numbered (sometimes lettered for parallel sub-tracks: H5a, H5b, …). Code references like `// H6: search chip` or `// I5a: decision block` point to whichever cycle introduced or last touched a piece of code, so this file is the only place where those references get glossed.

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
