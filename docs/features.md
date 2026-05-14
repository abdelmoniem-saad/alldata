# Features

The catalog. Every user-visible thing the platform does, no matter how small, lives here. Organized by surface so a reader can find a feature by where they encountered it.

Cross-link conventions used throughout:
- *(cycle: X)* — the cycle that introduced or last touched the feature. See [`cycles.md`](cycles.md).
- `code: path:line` — a pointer to the source. Treat as "look here first," not as a stable line number; cycles shuffle the line counts but the symbol names stay.

**Maintenance pact.** When a new feature ships in a cycle, the cycle's PR adds the entry here in the same change. This doc is the authoritative *what*; [`cycles.md`](cycles.md) is the *when and why*. They cross-link; they don't duplicate.

---

## Contents

- [Graph view (`/explore`)](#graph-view-explore)
- [Graph sidebar](#graph-sidebar)
- [Topic page (`/topic/:slug`)](#topic-page-topicslug)
- [Block types (the directive surface)](#block-types-the-directive-surface)
- [Reactive plot system](#reactive-plot-system)
- [Data layer](#data-layer)
- [Persistence](#persistence)
- [Theming & tokens](#theming--tokens)
- [Search](#search)
- [Authoring loop](#authoring-loop)
- [Public surfaces](#public-surfaces)
- [Debug overlays](#debug-overlays)
- [API surface](#api-surface)
- [Pages & routes](#pages--routes)

---

## Graph view (`/explore`)

### Force-directed canvas
The whole graph rendered on a single `<canvas>` with a D3 force simulation. Drag a node to move it; drag empty space to pan; scroll to zoom; double-click to open. Edges are drawn with concept-reason captions where present *(cycle: G3)*. `code: frontend/src/components/graph/ForceGraph.tsx`.

### Domain hue palette
Five muted jewel tones — steel blue (probability), violet (distributions), amber (inference), sage (regression), terracotta (practice). Pulled darker on light theme. Achromatopsia-safe: each hue has a distinct luminance step so a reader with no color vision can still tell domains apart. *(cycle: H1)* `code: frontend/src/styles/global.css` (the `--color-{probability,distributions,…}` vars), `frontend/src/lib/domain.ts`. See [`brand.md`](brand.md#color-system).

### Stroke pattern by difficulty
Solid / dashed / dotted rings around the outer node ring encode `intro` / `intermediate` / `advanced`. Pattern + hue together is belt + suspenders at the 11–28px node scale where hue alone reads as five shades of gray. *(cycle: H11)* `code: frontend/src/components/graph/ForceGraph.tsx` (search for "DIFFICULTY").

### Completion tint
0.15-alpha green wash on nodes the viewer has finished. The wash echoes the checkmark overlay so the "I'm done" signal is visible at a glance even when the node is small. *(cycle: G4)* `code: frontend/src/components/graph/ForceGraph.tsx` (search "completedTint").

### In-progress glow floor
A 0.3 ambient glow on nodes the viewer has *started* but not finished. Differs from the interactive hover glow — it's a *static* floor, not an animation, so reduced-motion users still see the "currently learning this" signal. *(cycle: G4)* `code: frontend/src/components/graph/ForceGraph.tsx` (search "glowIntensity").

### Spaced-repetition dim
Completed nodes whose review is overdue get a slight alpha lift (0.7×). The doc's "subtle dimming" cue — a quiet "ready to revisit." Driven by `progressStore.reviewSchedule` per the SM-2 schedule. *(cycle: K3)* `code: frontend/src/components/graph/ForceGraph.tsx` (search "dueSet").

### Empty-shell rendering
Nodes whose topic has no content (depth-0 domain roots and unpopulated topics) drop to 0.45 fill alpha. The ring stays at full alpha so the domain vocabulary survives. Signals "a node lives here but nobody's written it yet." *(cycle: G4)* `code: frontend/src/components/graph/ForceGraph.tsx` (search "hasContent").

### Edge labels
Concept edges (prereq → topic) get a small pill near the midpoint with the relationship's `description` text when hovered or when the edge is highlighted. Domain-root → entry-topic edges have no caption (the colors already say the domain). *(cycle: G3 introduced, K0 dropped the noisy root-edge labels)* `code: frontend/src/components/graph/ForceGraph.tsx` (search "edge-label").

### Domain filter pills
Top-left strip: "All / Probability / Distributions / …" toggles. Clicking a pill filters the graph to nodes in that domain plus their immediate prereq / leads-to neighbors. URL stays in sync via `?domain=` *(cycle: H9)*. `code: frontend/src/pages/GraphExplorer.tsx` (search "DOMAIN_SLUGS").

### Floating search chip
Top-right pill. Click or press `/` to expand into a fuzzy search combobox. Selecting a result pans and zooms the canvas onto that node (it doesn't navigate away). *(cycle: H6)* `code: frontend/src/pages/GraphExplorer.tsx` (`GraphSearchChip`). See also [Search](#search).

### "Start here" link
Quiet chip below the search trigger, top-right. Routes to `/topic/shape-of-statistics` — the 8-minute intro tour. *(cycle: K2)* `code: frontend/src/pages/GraphExplorer.tsx` (search "Start here").

### Stroke-pattern legend
Collapsible card bottom-left. Lists the difficulty patterns + domain hues with a small SVG sample for each. Remembered open/closed in localStorage. *(cycle: G10)* `code: frontend/src/pages/GraphExplorer.tsx` (`GraphLegend`).

### Stats bar
Bottom-left, below the legend. `"45 topics, 69 connections"` — running count of what's currently rendered. *(cycle: G earlier)* `code: frontend/src/pages/GraphExplorer.tsx` (search "topics," + "connections").

### Keyboard nav
- `/` — focus the search chip
- `1`–`5` — toggle domain filters in `DOMAIN_SLUGS` order
- Arrow keys — walk between connected nodes (selects the neighbor in the pressed cardinal direction, within a ±45° cone) *(cycle: H8)*. `code: frontend/src/pages/GraphExplorer.tsx` (search "handleKeyDown"), `frontend/src/components/graph/ForceGraph.tsx` (`getNeighborInDirection`).

### URL filter sync
Bidirectional: changing the domain filter updates `?domain=`; loading a URL with `?domain=` pre-selects the filter. *(cycle: H9)* `code: frontend/src/pages/GraphExplorer.tsx` (`useSearchParams`).

### Drag / hover / seed dynamics
- Drag a node — it pins under the cursor; releasing alpha-bumps the sim briefly so the layout re-settles smoothly *(cycle: H5d)*.
- Hover an edge — its label reveals; hover a node — its glow brightens *(cycle: G3, H5a — the hit-test is RAF-throttled)*.
- New nodes get a polar-by-domain seed position so initial layouts converge faster *(cycle: H5e)*.
`code: frontend/src/components/graph/ForceGraph.tsx`.

### Node click → sidebar; double-click → topic page
Single click selects (opens the right sidebar). Double-click opens `/topic/{slug}`. *(cycle: G5 selection, earlier double-click)* `code: frontend/src/pages/GraphExplorer.tsx` (`onNodeClick`, `onNodeDoubleClick`).

---

## Graph sidebar

The right column on `/explore`, visible once a node is selected.

### Selected-node card
Title, summary, difficulty chip, completed/in-progress marker. Topic open button. *(cycle: G earlier, G5 — added reasons)* `code: frontend/src/components/graph/GraphSidebar.tsx`.

### Prereq + leads-to lists with reason lines
Each prereq/leads-to row has the topic title, domain tick glyph, and (when the edge has a `description`) a one-sentence "because {reason}" / "unlocks {reason}" line. *(cycle: G5, G8 reshaped to `{node, why}`)* `code: frontend/src/components/graph/GraphSidebar.tsx`, `frontend/src/api/client.ts` (`PrerequisiteEntry`).

### Readiness pill
Above the prereq list: shows "ready to start" when all prereqs are completed, or "X / N prereqs complete" with the partial fraction. Computed locally from `progressStore.completedSlugs`; server endpoint exists for the post-H10 sync version. *(cycle: H7)* `code: frontend/src/components/graph/GraphSidebar.tsx` (search "readiness").

---

## Topic page (`/topic/:slug`)

### Zen surface
The whole topic page is a fixed-inset-0 surface with `var(--color-bg)` background. The site nav auto-hides on this route so the content has the whole viewport. *(cycle: Z1)* `code: frontend/src/pages/TopicView.tsx`, `frontend/src/styles/global.css` (`navbar-auto-hide`).

### ScrollReader (default)
Two-column scrollytelling on ≥1024px: prose on the left, pinned viz pane on the right. Below 1024px the layout collapses to single-column linear. IntersectionObserver-based active-anchor signal drives what the pinned column shows. *(cycle: I3)* `code: frontend/src/components/topic/ScrollReader.tsx`. See [Block types](#block-types-the-directive-surface).

### Pinned viz pane
The right column hosts a `PlotBlock` (or `GraphFlythrough` for tour topics) keyed to the topic's current active anchor. When the reader scrolls past an anchor that names a plot, the pane crossfades to that plot. Empty anchors leave the previous viz in place. *(cycle: I3, K2 added graph_view)* `code: frontend/src/components/topic/ScrollReader.tsx` (search "PINNED_BLOCK_TYPES").

### Pinned graph variant
The `graph_view` directive pins a `GraphFlythrough` (a small mounted graph that pans + zooms imperatively) instead of a plot. Used by the "Shape of Statistics" intro and any future tour topic. *(cycle: K2)* `code: frontend/src/components/topic/blocks/GraphFlythrough.tsx`.

### Mobile linear fallback
Below 1024px, plots/graphs render inline at their natural sort_order. The pinned pane is hidden via CSS (not unmounted — that keeps the IntersectionObserver state alive across breakpoint flips). *(cycle: I3, J4 — kept-mounted refactor)* `code: frontend/src/components/topic/ScrollReader.tsx` (search "isWide").

### Mobile plot ordering
Optional `mobile_order:` attribute on `plot` directives reorders plots on mobile. Lets authors curate a desktop pinning sequence that differs from the mobile linear flow. *(cycle: J6)* `code: frontend/src/components/topic/ScrollReader.tsx` (search "mobile_order").

### ZenChrome
Auto-hiding peek strips on the edges of the topic page. The left strip expands into the single consolidated drawer (prereq + leads-to + next-topic suggestion). The right strip carries the in-topic actions ("Mark learned"). The bottom strip carries the view-mode toggle, layer toggle, and slide nav. *(cycle: H2)* `code: frontend/src/components/topic/ZenChrome.tsx`.

### View-mode toggle (scroll ↔ slides)
Bottom chrome. Scroll is the default; `?mode=slides` (via the toggle or a deep link) flips to a crossfade slide deck. SlideView block-type parity with ScrollReader landed in L2. *(cycle: I3 made scroll the default; L2 brought slides to parity)* `code: frontend/src/pages/TopicView.tsx` (`viewMode`).

### Layer toggle (intuition / formal / both)
Bottom chrome, three-state. Filters which content blocks render by their `<!-- layer: -->` marker. A topic without a formal layer omits the toggle. *(cycle: earlier — pre-Z)* `code: frontend/src/components/topic/ZenChrome.tsx`, `frontend/src/pages/TopicView.tsx` (`activeLayer`).

### LEARNED chip
Bottom-right zen chrome. Toggles `progressStore.completedSlugs` for the current topic; on first toggle, also seeds an SM-2 review schedule (interval = 1 day). *(cycle: earlier; K3 wired the review seed)* `code: frontend/src/components/topic/ZenChrome.tsx`.

### Read-progress bar
Thin teal bar at the top of the topic surface that tracks scroll position within the article. *(cycle: earlier)* `code: frontend/src/pages/TopicView.tsx` (`readProgress`).

### Recall prompt
Surfaced above the prose when the topic is due-for-review AND has a `recall_prompt` in `meta.yaml`. A single question + three quality buttons ("Show me again" / "Coming back" / "I remember"). Picking one advances the SM-2 schedule and dismisses the prompt for the session. *(cycle: K3)* `code: frontend/src/components/topic/RecallPrompt.tsx`.

### Block-level confusion flag
Quiet "I want to revisit this" toggle on every flag-eligible block. Click to flag, click to unflag. Flagged blocks grow a hairline left-border. Per-(slug, blockId) count persists to localStorage. *(cycle: K4)* `code: frontend/src/components/topic/blocks/ConfusionFlag.tsx`, `frontend/src/components/topic/ScrollReader.tsx` (`BlockShell`).

### Gear divider
Quiet hairline + small-caps label section divider rendered from `<!-- block: gear, label: "..." -->`. The `n` field is metadata (ordering / parser validation); only the `label` reaches the reader. Unlabeled markers render nothing. *(cycle: K1 introduced; L1 dropped the "Gear N" prefix and hid unlabeled markers)* `code: frontend/src/components/topic/blocks/BlockRenderer.tsx` (`case 'gear'`).

---

## Block types (the directive surface)

Authored via markdown directives, parsed by `seed/import_seed.py`, rendered by `BlockRenderer`. See [`authoring.md`](authoring.md) for the syntax reference; this section is the rendered-behavior catalog.

### `markdown`
Default body. Plain prose between `\n---\n` separators. KaTeX inline + display math. `code: frontend/src/components/topic/blocks/BlockRenderer.tsx` (`case 'markdown'`). See [`authoring.md`](authoring.md#markdown-default).

### `code_python` / `code_r` / `simulation`
Server-executed code blocks. `simulation` flags the runner with a teal indicator. Optional `editable: true` makes the textarea writable. `auto_run: true` runs once on first scroll-into-view (cached afterward). The `load(name)` helper is injected into the Python preamble so code can pull curated datasets. *(cycles: earlier — code; I4 — auto_run; K5 — load() helper)* `code: frontend/src/components/topic/CodeRunner.tsx`, `backend/services/execution_service.py` (search `load`).

### `plot`
A reactive D3 plot bound to topic state via `useTopicState`. The `spec` field names a renderer from the plot library; `params` seeds the initial state; `binds` narrows the subscription. Optional `ghost` draws a dashed target overlay (used by playground goals). *(cycle: I4–I5)* `code: frontend/src/components/topic/blocks/PlotBlock.tsx`, `frontend/src/components/topic/blocks/plots/index.tsx`. See [Reactive plot system](#reactive-plot-system).

### `step_through`
Numbered steps revealed with a 300ms stagger when the list scrolls into view. Under `prefers-reduced-motion` all steps appear at once. *(cycle: I4)* `code: frontend/src/components/topic/blocks/StepThrough.tsx`.

### `callout`
Quiet zinc panel with a colored left border. `kind: insight` (teal) / `warning` (amber) / `aside` (muted). Small-caps label inside; body is markdown. *(cycle: I4)* `code: frontend/src/components/topic/blocks/BlockRenderer.tsx` (`case 'callout'`).

### `derivation`
Collapsible `<details>` block for hairy math. `collapsed: true` (default) hides the body behind a summary; `collapsed: false` shows it open by default. *(cycle: I4)* `code: frontend/src/components/topic/blocks/BlockRenderer.tsx` (`case 'derivation'`).

### `misconception_inline`
In-flow misconception card with a `--color-advanced` amber left border. Authored as `<!-- block: misconception, inline: true -->`. *(cycle: I4)* The legacy `<!-- block: misconception -->` (no `inline:`) writes to a separate `Misconception` table for a future consolidated misconceptions page (H10 backlog).

### `decision`
The headline I-cycle block. A question with options; picking an option dispatches the option's `writes:` into `useTopicState` (so the pinned plot reacts) and records the event in `progressStore.decisionEvents` (so branch-tagged downstream blocks reveal). Selected option gets a left accent bar — teal if `correct`, amber otherwise. Optional "Show me the answer" plain-text link applies the correct option's writes without progress credit. *(cycle: I5a; J4 — re-pickable, A11y; K0/K4 — confusion overlay)* `code: frontend/src/components/topic/blocks/DecisionBlock.tsx`.

### `playground`
Two-way bound controls. Each control writes to a `useTopicState` key the pinned plot reads. Optional `goal` block: `target` parameters, a `success_when` predicate evaluated against state, an `on_success` reveal, and time-gated hints. Match meter fills as the user approaches the goal. Reset / Skip / Try-again affordances. *(cycle: I5b; J4 — try-again)* `code: frontend/src/components/topic/blocks/PlaygroundBlock.tsx`.

### `state` / `state_reset`
Authoring-only directives. `state` seeds `useTopicState` defaults at mount. `state_reset` (with an anchor) fires when the named anchor scrolls into view, snapping bound state keys back to defaults. Both render nothing. *(cycle: I5)* `code: frontend/src/components/topic/ScrollReader.tsx` (search "state_reset"), `frontend/src/stores/topicState.ts`.

### `gear`
See [Gear divider](#gear-divider) above. *(cycles: K1, L1)*

### `graph_view`
Pins a `GraphFlythrough` in the right column instead of a `PlotBlock`. `target:` is a node slug or a domain-root slug; the latter pans to the cluster centroid. *(cycles: K2, L3)* `code: frontend/src/components/topic/blocks/GraphFlythrough.tsx`.

### `dataset`
In-prose attribution chip linking to `/datasets#{name}`. Pairs with the topic-level `meta.yaml: dataset:` field. *(cycle: K5)* `code: frontend/src/components/topic/blocks/BlockRenderer.tsx` (`case 'dataset'`). See [`authoring.md`](authoring.md#dataset).

### `quiz` (legacy)
SlideView-only renderer with an answer textarea + hint / solution toggles. Pre-dates the I-cycle decision/playground model and survives in slides mode only. *(cycle: earlier)* `code: frontend/src/components/topic/SlideView.tsx` (`SlideQuiz`).

### `parse_error` (fallback)
Surfaced when a multi-line directive's YAML body fails to parse. The body's original raw text shows in a dashed amber panel so authors see exactly what didn't parse instead of getting an invisible bug. *(cycle: J3)* `code: frontend/src/components/topic/blocks/BlockRenderer.tsx` (`case 'parse_error'`), `seed/import_seed.py` (search `_parse_error_block`).

---

## Reactive plot system

### `useTopicState`
One Zustand store keyed by topic slug. Each record holds the live `state` bag, the `defaults` bag (for `state_reset`), the per-anchor `decisions` map, and the per-anchor `successes` map. Persisted to localStorage. *(cycle: I5)* `code: frontend/src/stores/topicState.ts`.

### Per-key fine-grained subscriptions
`PlotBlock` uses Zustand's `useShallow` so a plot bound to `[mu, sigma]` doesn't re-render when an unrelated key (e.g. `treatment_strategy`) changes. *(cycle: J5)* `code: frontend/src/components/topic/blocks/PlotBlock.tsx`.

### Module-level color cache
The D3 plot library reads `--color-accent / text / muted / border / advanced` once per theme flip, not once per render. A `MutationObserver` on `document.documentElement` (`data-theme` + `class` attrs) invalidates the cache; a Zustand-like listener pattern then re-renders every subscribed plot. *(cycle: J5)* `code: frontend/src/components/topic/blocks/plots/index.tsx` (`useColors`).

### Incremental D3 updates (population_dot_grid)
1,000 dots created once in a mount effect; subsequent state writes attribute-update the existing circles instead of clearing + recreating. Re-render dropped from full SVG remount (~40ms) to attribute pass (~3ms). *(cycle: J5)* `code: frontend/src/components/topic/blocks/plots/index.tsx` (`PopulationDotGrid`).

### Dot-grid recolor transition
600ms cubic-in-out easing on `prior / sensitivity / specificity` changes (slider drags); 300ms on `treatment_strategy` changes (option picks). Honors `prefers-reduced-motion` — snaps instantly. *(cycle: J6 introduced 600ms; L5 split scalar vs. discrete timing)* `code: frontend/src/components/topic/blocks/plots/index.tsx` (search `strategyChanged`).

### Branch filter
Blocks tagged `depends_on: X, branch: Y` (or `branch: a|c`) only render if the user picked an allowed option on decision anchor `X`. Untagged blocks always render — branching is opt-in. Reads from `progressStore.decisionEvents` so re-picking a decision live-flips the visible branches. *(cycle: I5; J4 — re-pickable; L2 — shared util for SlideView)* `code: frontend/src/components/topic/blocks/branchFilter.ts`.

### Decision event log
`progressStore.decisionEvents` keyed by `(slug, anchor)` → `{ optionId, pickedAt }`. The single source of truth for "have they answered this decision?" and "which option?" *(cycle: J4)* `code: frontend/src/stores/progressStore.ts`.

### Plot library (7 specs)
- `gaussian_pdf` — bell curve. Binds `mu, sigma`. Optional `ghost` target overlay.
- `gaussian_cdf` — cumulative normal. Binds `mu, sigma`.
- `binomial_pmf` — discrete bars. Binds `n, p`. Lanczos lgamma for stability at large `n`.
- `empirical_histogram` — bins a sample array. Binds `samples` or synthesizes from `mu, sigma`.
- `scatter_with_fit` — points + least-squares fit. Binds `points` (+ optional `slope, intercept` overrides).
- `posterior_update` — three-bar P(H) / P(H|+) / P(H|−). Binds `prior, sensitivity, specificity, observed_result`.
- `population_dot_grid` — 1,000-dot Bayes canvas. Binds `prior, sensitivity, specificity, treatment_strategy`.

`code: frontend/src/components/topic/blocks/plots/index.tsx` (`PLOT_SPECS`). *(cycle: I5; specs added incrementally)*

---

## Data layer

### Dataset directive
In-prose attribution chip; see [`dataset` block type](#dataset).

### `/datasets` index page
Flat catalog of every shipped dataset. Each card shows title, description, source, columns, rows, synthetic flag, and the topics that declare this dataset in their `meta.yaml`. Reads `GET /api/datasets`. *(cycle: K5)* `code: frontend/src/pages/Datasets.tsx`.

### `load(name)` helper
Injected into the Python execution context. Reads `seed/datasets/{name}.csv` from disk; returns a `pandas.DataFrame` if pandas is available, otherwise a list of dicts. Slug-shaped names only — guards against path traversal. *(cycle: K5)* `code: backend/services/execution_service.py` (search `def load`).

### Curated CSVs (initial 4)
- `coin-flips-1000` — synthetic, 1,000 fair-coin trials.
- `medical-test-results` — synthetic, 1,000 patients with 1% prevalence + 99% sensitivity/specificity.
- `monty-hall-runs` — synthetic, 1,000 simulated games.
- `heights` — synthetic, 500 adult heights drawn from sex-conditional normals.

`code: seed/datasets/*.csv`, `seed/datasets/manifest.yaml`. *(cycle: K5)*

---

## Persistence

### `progressStore` (Zustand + persist)
LocalStorage-backed under `alldata-progress`. Versioned (currently `v4`) with a `migrate` that seeds missing fields on rehydrate so legacy shapes don't crash the page. Fields:
- `completedSlugs: string[]`
- `inProgressSlugs: string[]`
- `decisionEvents: Record<slug, Record<anchor, DecisionEvent>>` *(cycle: J4)*
- `reviewSchedule: Record<slug, ReviewRecord>` *(cycle: K3)*
- `confusionFlags: Record<slug, Record<blockId, count>>` *(cycle: K4)*

`code: frontend/src/stores/progressStore.ts`. Server-side sync is the H10 backlog item; until then, every browser is its own progress universe.

### `useTopicState` (per-topic state)
See [Reactive plot system](#reactive-plot-system).

---

## Theming & tokens

### Dark / light flip
Theme toggle in the navbar flips `data-theme` on `<html>`. Every color var has a light-mode override; the transition fades over `--transition-smooth`. *(cycle: earlier)* `code: frontend/src/stores/themeStore.ts`, `frontend/src/styles/global.css`.

### Tokens (`tokens.css`)
Typography ramps (`--text-display`, `--text-h1` through `--text-mono` with size / line-height / weight / tracking per ramp step), spacing scale (`--space-1` through `--space-16`, 4-px base), motion durations (`--duration-fast/smooth/slow`), and `--header-h`. *(cycle: J2)* `code: frontend/src/styles/tokens.css`. See [`brand.md`](brand.md).

### Prose styles
The `.prose` class — body typography for markdown-rendered content blocks. Routed through `tokens.css` ramps. *(cycle: J2)* `code: frontend/src/styles/prose.css`.

### Reduced-motion gate
Site-wide CSS — under `prefers-reduced-motion: reduce`, the three motion duration vars collapse to `0ms`. Every animation across the surface inherits this automatically. *(cycle: Z5; J2 — token-level gate)* `code: frontend/src/styles/tokens.css`.

### Focus-visible ring
2px accent outline + 2px offset on `:focus-visible`. Mouse users don't see it; keyboard users always do. Applied at the token level so every interactive element inherits it without per-component wiring. *(cycle: J6)* `code: frontend/src/styles/tokens.css`.

---

## Search

### `SearchDropdown` component
Single component with `inline` (Home hero) and `embedded` (navbar modal) variants. Owns: debounce, fetch (`api.searchTopics`), keyboard nav (↑ / ↓ / Enter), dropdown rendering, empty state. Callers pass `onSelect` to override the default navigate-to-topic. *(cycle: L4)* `code: frontend/src/components/SearchDropdown.tsx`.

### Navbar search (Ctrl-K modal)
Top-right pill on every page. Click or press `Ctrl-K` / `Cmd-K` to open the modal; inside, `SearchDropdown` handles the query. Escape closes. *(cycle: H6 — earlier; L4 — refactored to share the dropdown component)* `code: frontend/src/components/Layout.tsx` (`CommandSearch`).

### Home-page hero search
The "What do you want to learn?" input on `/`. Replaced naive Enter-slugify navigation with a live dropdown. *(cycle: L4)* `code: frontend/src/pages/Home.tsx`.

### Graph search chip
`/explore`-only, in-canvas. Behaves like the others but on select pans + zooms the canvas onto the chosen node rather than navigating away. *(cycle: H6)* `code: frontend/src/pages/GraphExplorer.tsx` (`GraphSearchChip`).

### `/api/graph/search`
Backend endpoint. Postgres path uses `pg_trgm.similarity()` for trigram fuzzy ranking + ILIKE fallback for short queries. SQLite path ranks by where in the title the match lands (prefix → word-boundary → anywhere). *(cycle: H6; L4 — dialect-portable)* `code: backend/services/graph_engine.py` (`search_graph_nodes`).

---

## Authoring loop

### `python -m seed.import_seed`
End-to-end importer. Reads `seed/schema.yaml` + every `seed/topics/{domain}/{slug}/{meta.yaml,content.md}` and upserts. Self-healing: tables that don't exist get created; columns the model declares but the live DB lacks get added via `ALTER TABLE`. Idempotent — repeat runs are safe. *(cycle: seed-era; J3 self-heal; K2 additive schema-merge)* `code: seed/import_seed.py`.

### `--strict` flag
`python -m seed.import_seed --strict`. Warnings become errors. Catches: unknown plot specs, undeclared state keys referenced in playground `binds:` or decision `writes:`, dangling `depends_on` references, branch ids that don't match any option, YAML body parse failures. *(cycle: J3)* `code: seed/import_seed.py` (search `_validate_topic_blocks`).

### `python -m seed.watch`
Watchdog-based file-watcher. Edit a `.md` or `meta.yaml` under `seed/topics/`; the importer re-runs on save (debounced 200ms per topic dir). Author edits markdown, refreshes the page, sees the change. *(cycle: I6)* `code: seed/watch.py`.

### `meta.yaml` header schema
Per-topic header. Documents: `slug`, `title`, `domain`, `difficulty`, `summary`, `prerequisites`, `has_intuition_layer`, `has_formal_layer`, `estimated_minutes`, `cycle_ported`, `recall_prompt`, `dataset`. *(cycles: J3 — schema doc; K3 — recall_prompt; K5 — dataset)* See [`meta-yaml.md`](meta-yaml.md).

### Self-healing column adds
`create_tables()` walks every mapped table on every run and ALTERs missing columns. The "no migrations" ergonomic survives every new column the team ships. *(cycle: J3)* `code: seed/import_seed.py` (`_self_heal_columns`).

### Additive schema-merge
When the DB already has topics, new entries in `seed/schema.yaml` get inserted on every run (rather than only on first-seed). Domains, topics, prerequisite edges. *(cycle: K2)* `code: seed/import_seed.py` (search `additive schema-merge`).

### `_meta` hidden-domain convention
Domains prefixed with `_` are hidden navigation surfaces — filtered from `/explore`, searchable only by direct URL. Used for the Shape of Statistics intro and any future "topic page but not part of the curriculum graph" content. *(cycle: K2)* `code: backend/services/graph_engine.py` (search `_meta`).

---

## Public surfaces

### `/u/:username` — public graph snapshot
Read-only graph rendered with someone else's progress. Routes:
- `/u/me` — reads local `progressStore`. Shareable URL for the *viewer*'s own progress.
- `/u/{display_name}` — fetches `/api/users/{name}/snapshot`. Returns empty progress today (server-side sync is H10 backlog); the route exists so the URL contract is in place when sync lands.

Below the graph: per-cluster depth bars (proportional fill, no numbers — "depth signal, not a grade"). *(cycle: K7)* `code: frontend/src/pages/UserGraph.tsx`, `backend/api/users.py`.

---

## Debug overlays

### `?debug=confusion`
Visit any topic with this query string. Blocks the user has flagged with the confusion signal grow a tint scaled to their flag count. Author-facing only — no public surface yet (server aggregation is gated on H10). *(cycle: K4)* `code: frontend/src/components/topic/ScrollReader.tsx` (`BlockShell`, search `debug=confusion`).

---

## API surface

| Endpoint | Purpose | Cycle |
|---|---|---|
| `GET /api/graph` | Full graph (nodes + edges). Filters `_meta` domains. | seed-era; K2 hidden-domain filter |
| `GET /api/graph/search?q=` | Fuzzy search topics by title. Postgres trigram, SQLite prefix-ranked. | H6, L4 dialect-portable |
| `GET /api/graph/subgraph?root=&depth=` | Local neighborhood of a topic. | seed-era |
| `GET /api/graph/path?from=&to=` | Shortest learning path between two topics. | seed-era |
| `GET /api/graph/prerequisites/{slug}` | Direct + transitive prereqs as `{node, why}`. | G5; G8 reshape |
| `GET /api/graph/leads-to/{slug}` | Direct + transitive downstream. | G5; G8 reshape |
| `GET /api/graph/readiness/{slug}` | Server-side readiness check (auth-required). | H7 |
| `GET /api/topics` | List topics (filterable). | seed-era |
| `GET /api/topics/{slug}` | Single topic + all content blocks + misconceptions. | seed-era |
| `GET /api/topics/search?q=` | Alt-search (keyword-literal). | seed-era |
| `POST /api/execute` | Run Python or R in the sandbox, return stdout / stderr / images. | seed-era |
| `GET /api/datasets` | Manifest + reverse index of topics-per-dataset. | K5 |
| `GET /api/datasets/{name}` | Stream the CSV file. | K5 |
| `GET /api/users/{username}/snapshot` | Public progress snapshot. Currently empty (H10 backlog). | K7 |
| `POST /api/auth/login` / `POST /api/auth/register` | Account flows (used by H7 readiness; no UI on the public-snapshot path yet). | seed-era |

---

## Pages & routes

| Route | Component | Notes | Cycle |
|---|---|---|---|
| `/` | `Home` | Hero search, domain cards, top-topic chips | seed-era; L4 — search refactor |
| `/explore` | `GraphExplorer` | Full graph + sidebar + chrome | seed-era; G + H — most of the polish |
| `/topic/:slug` | `TopicView` | Zen surface; ScrollReader by default, `?mode=slides` flips to SlideView | I3 default; J4 stickiness fixes |
| `/path` | `LearningPath` | "Find a path from X to Y" pair-pick UI | seed-era |
| `/datasets` | `Datasets` | Dataset catalog with reverse-index | K5 |
| `/u/:username` | `UserGraph` | Public read-only snapshot | K7 |

`code: frontend/src/App.tsx`.
