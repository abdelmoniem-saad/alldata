# meta.yaml schema

The per-topic header. Every topic directory under `seed/topics/{domain}/{slug}/` needs a `meta.yaml`. The importer (`seed/import_seed.py`) reads it; the schema in `seed/schema.yaml` is the master index that drives the graph view.

## Example

```yaml
title: "Bayes' Theorem"
slug: bayes-theorem
domain: probability-foundations
difficulty: intro
summary: Reversing conditional probabilities — the foundation of Bayesian thinking.
prerequisites: [conditional-probability]
has_intuition_layer: true
has_formal_layer: true
estimated_minutes: 12
cycle_ported: I
```

## Fields

### `title`
**Type:** string. **Required.**
The display title — proper case, includes punctuation. Used in the topic page header, the graph node tooltip, and the breadcrumb. If omitted, the slug is title-cased as a fallback.

### `slug`
**Type:** string (kebab-case). **Required.** Must match the directory name.
The URL slug. Used in `/topic/{slug}` and as the key in `useTopicState` and `progressStore`. Lowercase, hyphens between words, no spaces or underscores.
**If omitted:** the importer uses the directory name. Mismatched slug + directory = silent confusion; keep them aligned.

### `domain`
**Type:** string (slug). **Required.**
Must match a key in `frontend/src/lib/domain.ts` `DOMAIN_LABEL`. Currently: `probability-foundations`, `distributions`, `statistical-inference`, `regression-modeling`, `data-science-practice`. Drives node color, tick glyph, and grouping in the graph.
**If omitted:** the topic doesn't get a domain hue — renders as zinc, sorts to "uncategorized." Always set.

### `difficulty`
**Type:** `intro` | `intermediate` | `advanced`. **Required.**
Controls the stroke-pattern (solid / dashed / dotted) on the graph node and the readiness pill copy in the chrome.
**If omitted:** treated as `intermediate`.

### `summary`
**Type:** string. **Required.**
One sentence (≤140 chars). Shown under the topic title, in the graph tooltip, and in the search-chip results. Should answer "why does this concept exist?" not "what's in this topic?"
**Bad:** "This topic covers Bayes' Theorem with examples."
**Good:** "Reversing conditional probabilities — the foundation of Bayesian thinking."

### `prerequisites`
**Type:** list of slugs. Optional, defaults to `[]`.
Each slug must reference a topic that exists in `seed/schema.yaml`. The graph builds prerequisite edges from this list; the chrome's left drawer shows them as the "what you need" panel.
**Note:** prereqs are not required to have content — a shell topic can still be a prereq. The graph renders them with reduced opacity.

### `has_intuition_layer`
**Type:** bool. Optional, defaults to `true`.
When `true`, content blocks under `<!-- layer: intuition -->` render in the topic page when the layer toggle is set to "intuition" or "both." When `false`, the toggle hides the intuition layer entirely (rare — almost every topic has one).
**Practical effect today:** the toggle in `ZenChrome` only shows the "Both / Intuition / Formal" tri-state when at least one of the two flags is true and the topic has matching `<!-- layer: -->` markers.

### `has_formal_layer`
**Type:** bool. Optional, defaults to `false`.
When `true`, content blocks under `<!-- layer: formal -->` render when the toggle is set to "formal" or "both." Set this to `true` only if the topic has a real formal layer — math, proofs, derivations beyond what fits in a `derivation` block.

### `estimated_minutes`
**Type:** integer. Optional.
Reading-time estimate in minutes. Surfaced as a chip in the topic header and used by the graph to summarize learning paths. Skip rather than guess; a missing estimate is honest.
**If omitted:** no estimate chip rendered.

### `cycle_ported`
**Type:** single uppercase letter (e.g. `I`, `J`). Optional.
The cycle in which the topic was last ported to the current directive vocabulary. `I` means the topic uses the I-cycle's `decision` / `playground` / `plot` directives; legacy topics omit this (or set it to nothing). Useful for filtering "what still needs porting?"
**If omitted:** treated as legacy. Doesn't affect rendering.

---

## Fields *not* on this list

If you see a field in some `meta.yaml` that isn't documented here, it's either:
- **Legacy** — historical fields the parser ignores. Safe to remove.
- **A typo** — the parser is permissive and won't warn. Run `python -m seed.import_seed --strict` to surface them.
- **An undocumented addition** — should be added to this doc in the same change that introduces it.

The `schema.yaml` master index (the file at `seed/schema.yaml`) carries the same fields plus topic ordering and edge metadata; that file is generated/maintained separately and not part of the per-topic authoring loop.

---

## How `meta.yaml` interacts with content

- **`title` / `summary` / `domain` / `difficulty`** — feed the graph node and the topic-page header; rendered before any `content.md` is parsed.
- **`prerequisites`** — used to build edges in the graph; the chrome's left drawer shows them on the topic page.
- **`has_intuition_layer` / `has_formal_layer`** — gate which `<!-- layer: -->` sections render. The content file's section markers are the actual switch; these flags say "the toggle should be available."
- **`estimated_minutes` / `cycle_ported`** — pure metadata, no rendering effects beyond their respective chips.

If you change `meta.yaml`, the watch-mode importer picks it up immediately — no separate command needed.
