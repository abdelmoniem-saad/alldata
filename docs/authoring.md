# Authoring guide

The directive reference. This is the spec for everyone writing topic content. Pair with [`meta-yaml.md`](meta-yaml.md) for the per-topic header and [`principles.md`](principles.md) for the hard constraints. For the rendered behavior of each directive — what the reader actually sees on the page — see [`features.md`](features.md).

The authoring loop is short:

```sh
python -m seed.watch     # one terminal
npm run dev              # another
```

Edit any file under `seed/topics/{domain}/{slug}/`, save, refresh.

---

## The six-gear scaffold (recommended template)

The platform's vision document names six gears every topic should pass through. Treat this as a fill-in-the-blanks template; it makes a topic feel complete and rhymes with how readers already navigate.

| Gear | Name | Purpose | Block types that fit |
|---|---|---|---|
| 1 | Spark | One to three sentences that make the reader feel the concept before understanding it. Viewport-centered. | `markdown` |
| 2 | Intuition | Conversational prose building a mental model through analogy. No equations, no jargon. | `markdown`, optional `callout` |
| 3 | Visualization | The user manipulates something. Two valid modes: *observational* (a `playground` slider drags the curve) or *commitment* (a `decision` forces a pick before the consequence is revealed). | `playground`, `decision`, `plot` |
| 4 | Formalism | The equation, color-coded term-by-term, walked through as a sentence. | `markdown` for the equation, `derivation` (collapsed) for the proof |
| 5 | Code | Running code that demonstrates exactly what was just explained. Comments are part of the explanation. | `simulation`, `code_python` (with `auto_run: true`) |
| 6 | Connections | One to three nearby topics with one-sentence reasons each. Not definitions — reasons. | `callout` listing related anchors |

Mark each gear with a `gear` directive at the start of its section:

```markdown
<!-- block: gear, n: 1, label: "The spark" -->

You're 99% accurate, the disease is rare, and you tested positive. Should
you be worried?

---

<!-- block: gear, n: 2, label: "Intuition" -->

The trap is treating the test's accuracy as the answer to the question...

---

<!-- block: gear, n: 3, label: "The decision" -->

<!-- block: decision, anchor: bayes-intuition -->
question: "What's the chance you actually have it?"
options: [...]
correct: c
<!-- /block -->
```

Gear markers are pure metadata. The reader sees only the `label:` text — a quiet hairline divider with a small-caps caption. The `n:` number is for ordering and validation only; it doesn't appear in the rendered topic. Markers without an explicit `label:` render *nothing* — they're invisible structural anchors.

**Don't reuse the canonical gear names verbatim.** The names *Spark / Intuition / Visualization / Formalism / Code / Connections* are template placeholders, not section titles. When every topic carries the same six labels in the same order the topics feel templated. Pick a label that names what *this* section is about: "The 99% trap," "Why $1/\sqrt{n}$," "Where Monty's choice gives you information." Or drop the label entirely and let the section flow without a divider — that's also fine.

**Rule of thumb.** Most topics walk through all six gears. Exceptions:
- The "Shape of Statistics" intro skips Formalism and Code (gears 4 + 5).
- A pure derivation topic might skip the Spark + Intuition (1 + 2) and lead with the equation.
- Don't skip Connections (gear 6) — that's where the graph stays alive on the page.

Pick *one* mechanic for Gear 3 — observational (playground) or commitment (decision). Mixing both in one topic dilutes the felt experience.

---

## Mental model

A topic is a directory: `seed/topics/{domain}/{slug}/` containing `meta.yaml` plus one or more `.md` files. The parser splits each `.md` file into typed **blocks** the frontend renders. There are two block syntaxes:

1. **Section separator** (`\n---\n`) — splits prose into sequential markdown blocks. A directive comment at the top of a section assigns that section a non-default block type.
2. **Directive pair** (`<!-- block: TYPE attrs --> body <!-- /block -->`) — delimits a multi-paragraph block without forcing `---` between paragraphs.

Both forms accept attributes after the type as YAML: `, key: value, key2: {a: 1, b: 2}`. Bare keys, quoted strings, inline maps, and inline arrays all work; the parser unwraps them via `yaml.safe_load`.

Every block can take an `anchor: some-slug`. Anchors are how `ScrollReader` pins the right-column visualization to scroll position. **Give every plot, decision, and playground an anchor.** Static prose blocks rarely need them.

---

## Reactive state

There is one topic-scoped state bag (`useTopicState`). Plots subscribe to keys; decisions write keys; playground sliders are two-way bound. Seed it once near the top of the file:

```markdown
<!-- block: state, values: {prior: 0.01, sensitivity: 0.99, specificity: 0.99, treatment_strategy: "none"} -->
```

You can also let `plot` directives' `params:` seed defaults — `block: state` is the canonical home for keys not owned by any single plot.

To restore defaults at a section boundary (e.g. before a clean playground):

```markdown
<!-- block: state_reset, anchor: gaussian-feel -->
```

The reset fires once when its anchor scrolls into view.

### State key conventions

The plot library reserves a small set of names. Use these when binding to existing plot specs:

| Key | Type | Meaning |
|---|---|---|
| `mu` | number | Mean of a normal distribution |
| `sigma` | number | Standard deviation of a normal distribution |
| `n` | number | Sample size or trial count (binomial) |
| `p` | number | Success probability (binomial) |
| `prior` | number ∈ [0,1] | Bayesian prior |
| `sensitivity` | number ∈ [0,1] | P(+ \| condition) |
| `specificity` | number ∈ [0,1] | P(− \| ¬condition) |
| `treatment_strategy` | "treat_all" \| "treat_half" \| "retest" \| "none" | Population dot grid coloring rule |
| `observed_result` | "positive" \| "negative" \| "" | Posterior bar emphasis |
| `samples` | number[] | Sample array for `empirical_histogram` |
| `points` | [x, y][] or {x, y}[] | Points for `scatter_with_fit` |
| `slope` / `intercept` | number | Optional fit-line override for `scatter_with_fit` |

New keys are free-form but must be declared in `<!-- block: state -->` so the parser's strict-mode check catches typos.

---

## Directive reference

### `markdown` (default)

No directive needed. Prose between `\n---\n` separators. KaTeX math (`$inline$` and `$$display$$`) and the standard remark/rehype plugins are on.

### `code_python` / `code_r`

```markdown
<!-- block: code_python, editable: true, anchor: opt -->
import numpy as np
print(np.mean([1, 2, 3]))
```

| Attr | Type | Default | Effect |
|---|---|---|---|
| `editable` | bool | false | Show a textarea so the reader can edit and re-run |
| `expected_output` | string | — | Static stdout shown before any run |
| `auto_run` | bool | false | Execute once on first scroll-into-view; result cached |
| `anchor` | slug | — | Pin to scroll position for nav / state_reset targeting |

### `simulation`

Same shape as `code_python` but flagged. Gets the teal indicator in the runner header. Use when the code *is* the lesson.

### `plot`

```markdown
<!-- block: plot, spec: gaussian_pdf, params: {mu: 0, sigma: 1}, binds: [mu, sigma], anchor: bell-curve -->
```

Pinned right-column visual on desktop. Inline on mobile.

| Attr | Type | Default | Effect |
|---|---|---|---|
| `spec` | string (required) | — | Name from the plot library — see below |
| `params` | map | `{}` | Seed values for the keys this plot reads (merged into state defaults) |
| `binds` | string[] | all keys | Narrow what the plot subscribes to; omit to receive the full state bag |
| `ghost` | map | — | Dashed target overlay (rare; usually set automatically by an active playground) |
| `anchor` | slug | — | Required if you want this plot pinned when its section is in view |

**Available plot specs** (extend by adding a file under `frontend/src/components/topic/blocks/plots/`):

- `gaussian_pdf` — bell curve. Binds `mu`, `sigma`. Optional ghost for playground targets.
- `gaussian_cdf` — cumulative normal. Binds `mu`, `sigma`.
- `binomial_pmf` — discrete bars. Binds `n`, `p`.
- `empirical_histogram` — bins a sample array. Binds `samples` (or synthesizes from `mu`, `sigma`).
- `scatter_with_fit` — points + least-squares line. Binds `points`, optional `slope`, `intercept`.
- `posterior_update` — three-bar P(H), P(H \| +), P(H \| −). Binds `prior`, `sensitivity`, `specificity`, `observed_result`.
- `population_dot_grid` — 1,000-dot Bayes canvas. Binds `prior`, `sensitivity`, `specificity`, `treatment_strategy`. The Bayes decision drives this one.

### `gear`

```markdown
<!-- block: gear, n: 1, label: "The spark" -->
```

Pure structure metadata. `n` is 1..6 (Spark / Intuition / Visualization / Formalism / Code / Connections) — used for parser validation and authoring ordering; **not rendered**. `label` is what the reader sees: a small-caps hairline divider. A marker without `label:` renders nothing — invisible structural anchor. See "The six-gear scaffold" above for the template and the rule against reusing the canonical gear names verbatim.

Optional. A topic without gear markers renders identically.

### `dataset`

```markdown
<!-- block: dataset, name: "titanic", source: "Kaggle" -->
```

In-prose attribution chip above a code block that uses `load("titanic")`. `name` must match a dataset in `seed/datasets/manifest.yaml` (and a corresponding `seed/datasets/{name}.csv`). `source` is free-form attribution text. Pure metadata — links to `/datasets#{name}`.

The topic-level `dataset:` field in `meta.yaml` is the parallel surface: setting `dataset: titanic` adds the topic to `/datasets`' reverse index (so a reader can browse "what topics use the titanic dataset?"). The two are independent — use the directive for inline attribution, the meta.yaml field for catalog membership.

**The manifest format.** `seed/datasets/manifest.yaml` catalogs every shipped dataset. Each entry has:

| Field | Required | Description |
|---|---|---|
| `name` | yes | Slug used in `load("…")` and `meta.yaml: dataset:`. Must match `{name}.csv` in the same directory. |
| `title` | yes | Human-readable name shown in the `/datasets` index. |
| `description` | yes | One sentence about what the dataset shows. |
| `source` | yes | Origin / attribution (free-form string: "Synthetic (seeded RNG)", "Kaggle", "1936 Fisher", etc.). |
| `columns` | yes | Column names, for the dataset card. |
| `rows` | yes | Row count, for the dataset card. |
| `synthetic` | yes | `true` if generated, `false` if real-world. |

A manifest entry without a matching CSV will return 404 from `/api/datasets/{name}` — keep the two paired.

### `step_through`

```markdown
<!-- block: step_through, anchor: bayes-walk -->
1. Start with the prior $P(H)$.
2. Multiply by the likelihood $P(E|H)$.
3. Normalize by the evidence $P(E)$.
<!-- /block -->
```

Numbered steps revealed with a 300ms stagger when the list scrolls into view. Under `prefers-reduced-motion` all steps appear at once.

### `callout`

```markdown
<!-- block: callout, kind: insight -->
Every distribution you'll meet in this course is a sum, a transformation, or a
limit of these five.
<!-- /block -->
```

| Attr | Type | Default | Effect |
|---|---|---|---|
| `kind` | "insight" \| "warning" \| "aside" | "insight" | Color-coded left border + label |
| `depends_on` | anchor | — | Branch filter — only render if `depends_on`'s decision was answered |
| `branch` | id (or `a\|b`) | — | Branch filter — only render if the picked option matches |

### `derivation`

```markdown
<!-- block: derivation, title: "Why the mean minimizes squared error", collapsed: true -->
Differentiate $\sum (x_i - c)^2$ w.r.t. $c$: $-2 \sum (x_i - c) = 0 \Rightarrow c = \bar{x}$.
<!-- /block -->
```

Collapsible `<details>`. Default to `collapsed: true` for "hairy math the curious reader can descend into."

### `misconception` (inline)

```markdown
<!-- block: misconception, inline: true -->
**"A 95% CI contains the true value 95% of the time."**

*Wrong:* the bound shifts with the data; the parameter doesn't move.
*Correct:* 95% of intervals built this way will trap the true value.
<!-- /block -->
```

Renders in flow with an amber accent. Without `inline: true`, the same content goes to the consolidated misconceptions footer (legacy path; deprecated when H10's misconceptions page lands).

### `decision`

```markdown
<!-- block: decision, anchor: bayes-intuition -->
question: |
  A test is 99% accurate. The disease affects 1% of people. You test positive.
  What's the chance you actually have it?
options:
  - id: a
    label: "About 99%"
    writes: { treatment_strategy: "treat_all" }
    response: |
      Watch the plot — most who got the same result and followed your logic
      were treated for a disease they never had.
  - id: c
    label: "About 10%"
    writes: { treatment_strategy: "retest" }
    response: |
      You're already past the trap.
correct: c
<!-- /block -->
```

Three-state lifecycle:

1. **Prompt** — question + options.
2. **React** — picking an option dispatches `writes:` into topic state. The pinned plot recolors. Then the response text fades in below the question.
3. **Reveal** — downstream blocks tagged `depends_on: <anchor>, branch: <id>` become visible.

### Branch-tagged downstream blocks

Tag any `callout`, `derivation`, `step_through`, `decision`, or `playground` with `depends_on:` and `branch:` (single id, or `a|b` for "any of"). Untagged blocks always render — branching is opt-in.

```markdown
<!-- block: callout, kind: insight, depends_on: bayes-intuition, branch: c -->
You instinctively went for the right answer. Here's the math behind why...
<!-- /block -->
```

The `correct:` field powers a quiet "Show me the answer" link — applies the correct option's writes without marking progress.

**Rule of thumb.** 1–2 decisions per topic, placed *before* the section that delivers the answer. The decision creates the question the rest of the prose answers.

### `playground`

```markdown
<!-- block: playground, anchor: gaussian-feel -->
binds: [mu, sigma]
controls:
  - param: mu
    label: "Mean"
    min: -3
    max: 3
    step: 0.1
  - param: sigma
    label: "Std dev"
    min: 0.2
    max: 3
    step: 0.1
goal:
  prompt: "Match the dashed target curve."
  target: { mu: 1.5, sigma: 0.8 }
  success_when: "abs(mu - 1.5) < 0.1 and abs(sigma - 0.8) < 0.1"
  on_success: |
    That's it. Width and center are independent — you found sigma by squeezing,
    then mu by sliding.
  hints:
    - after_seconds: 30
      text: "The peak is to the right of zero."
    - after_seconds: 60
      text: "The peak is around x = 1.5. Now the width."
<!-- /block -->
```

Goal-directed exploration. The pinned plot reads the same state keys these sliders write — moving controls re-renders the plot, which now also draws a dashed target ghost overlay (from `goal.target`).

`goal` is **optional**. Omit for pure exploration ("what does heavy-tailed feel like?"). With it, the user has a *thing they can do* — and the win is the felt understanding the lesson is trying to deliver.

### Expression syntax (`safeExpr`)

Used by `goal.success_when`, observation `when:` clauses, and decision-branch predicates. Intentionally tiny.

| Syntax | Example |
|---|---|
| Identifiers | `mu`, `sigma`, `treatment_strategy` |
| Number literals | `1.5`, `-0.3`, `42` |
| String literals | `"treat_all"`, `'retest'` |
| Booleans | `true`, `false` |
| Comparison | `<` `<=` `>` `>=` `==` `!=` |
| Boolean | `and` / `or` / `not` (or `&&` / `\|\|` / `!`) |
| Arithmetic | `+` `-` `*` `/` |
| Functions (whitelist) | `abs(x)`, `min(a, b)`, `max(a, b)` |

No member access, no indexing, no method calls, no `eval`. Parse errors return `false` (logged once) so a typo doesn't crash the page. Run `python -m seed.import_seed --strict` in CI to surface predicate parse errors as failures.

---

## When to reach for which block

| Situation | Block |
|---|---|
| Standard prose | `markdown` (default) |
| Pinned visualization | `plot` |
| Side note that breaks the flow | `callout` (`kind: insight`) |
| Hairy derivation that's optional | `derivation` (`collapsed: true`) |
| Sequence the user should walk | `step_through` |
| Common error you want to call out | `misconception` (`inline: true`) |
| Force a *commitment before the answer* | `decision` |
| Goal-directed parameter exploration | `playground` (with `goal:`) |
| Pure exploration | `playground` (no `goal:`) |
| Code the reader should run | `code_python` / `code_r` |
| Code that *is* the lesson | `simulation` |

The two stars of the surface are `decision` and `playground`. Use them when you want the reader to **think** before they read.

---

## Tips

- **Authoring in plain markdown is the contract.** No WYSIWYG. Editors get diffable, grep-able, version-controlled lessons.
- **Anchors are slugs**, not titles. Lowercase, hyphens, no spaces.
- **`writes:` should change a state key the pinned plot already reads.** Otherwise the user picks an option and nothing visible happens — the whole point is the plot reacts.
- **Don't gamify.** No celebratory animations, no points, no badges. Feedback is the response text and the visible plot change.
- **`prefers-reduced-motion` is honored.** Step-through reveals all steps at once; viz crossfades are skipped. Don't author content that requires motion to make sense.
- **Run `--strict` before merging.** `python -m seed.import_seed --strict` fails on unknown plot specs, undeclared state keys, dangling `depends_on` references, and YAML parse errors. CI runs it; you can too.
