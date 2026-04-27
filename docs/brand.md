# Brand & visual language

The surface aims for a working scientist's notebook: zinc, hairline, deliberate. Everything in this doc is already enforced in code; the doc exists so contributors don't have to read CSS comments to find it.

Token references throughout cite vars defined in `frontend/src/styles/tokens.css` (typography, spacing, motion) and `frontend/src/styles/global.css` (color, theme, radius). The achromatopsia and reduced-motion rules in `docs/principles.md` apply across this whole doc.

---

## 1. Voice and tone

Direct, specific, no marketing language. Sentence case in UI. Math is allowed to be hairy; prose is not.

Write the way a careful colleague explains something at a whiteboard. The reader is not a customer; the reader is a peer who wants to understand the math. Skip the warm-up. Skip the hype words. Lead with the concrete claim.

| Surface | ✗ Don't | ✓ Do |
|---|---|---|
| Topic prose | "Bayes' Theorem is a powerful tool that revolutionizes how we think about probability!" | "Bayes' Theorem flips a conditional. You know P(B \| A); you want P(A \| B)." |
| Decision response (correct) | "🎉 Awesome job! You got it right!" | "You're already past the trap most people fall into. Here's why the rarity pulls the posterior down." |
| Decision response (wrong) | "Oops, that's not quite right. Try again!" | "Watch the plot — under your strategy, most treated patients are healthy. The test's accuracy isn't the whole story." |
| Error state | "Oh no! Something went wrong 😢" | "Topic not found." |
| Empty state | "Looks like there's nothing here yet. Check back soon!" | "Content coming soon." |
| Button label | "Click here to begin your learning journey" | "Start" |

Notes:
- Sentence case for buttons, headings in chrome, and labels. Title case is reserved for proper nouns (Bayes' Theorem).
- One emoji limit: zero. The surface doesn't use them.
- Math in prose uses KaTeX (`$P(A \mid B)$`). Don't spell out "P of A given B" in body text — write the notation and trust the reader.
- Decision response text is the verdict. It does double duty: explains why the choice was right or wrong, and points the reader at what to look at next on the visible plot.

---

## 2. Color system

The surface has four families: neutrals (zinc), one accent (teal), five domain hues, and three difficulty hues. Every color is defined as a CSS var in `global.css`; the dark theme is the default and `[data-theme='light']` overrides hold the same vocabulary at different luminance.

### Neutrals

| Var | Dark | Light | Use |
|---|---|---|---|
| `--color-bg` | `#050505` | `#fdfdfd` | Page background |
| `--color-bg-secondary` | `#0d0d0d` | `#f4f4f5` | Panels, cards, decision/playground bodies |
| `--color-bg-tertiary` | `#141414` | `#e4e4e7` | Slightly elevated panels |
| `--color-surface` | `#1a1a1a` | `#ffffff` | Buttons, inputs, code blocks |
| `--color-surface-hover` | `#262626` | `#f1f1f2` | Button / row hover |
| `--color-border` | `#262626` | `#e4e4e7` | Standard 1px borders |
| `--color-border-subtle` | `#1a1a1a` | `#f4f4f5` | Hairline borders |
| `--color-text` | `#ffffff` | `#09090b` | Primary text |
| `--color-text-secondary` | `#a1a1aa` | `#52525b` | Body prose, secondary labels |
| `--color-text-muted` | `#52525b` | `#a1a1aa` | Tertiary labels, axis ticks |

### Accent — the teal energy

| Var | Dark | Light | Use |
|---|---|---|---|
| `--color-accent` | `#14b8a6` | `#0d9488` | The single "this is interactive" hue. Plot strokes, accent bars on correct decisions, link color, focus rings, primary buttons. |
| `--color-accent-hover` | `#2dd4bf` | `#0f766e` | Hover state |
| `--color-accent-subtle` | `rgba(20,184,166,0.08)` | `rgba(13,148,136,0.08)` | Tints (selection wash, callout backgrounds) |
| `--color-accent-glow` | `rgba(20,184,166,0.2)` | `rgba(13,148,136,0.15)` | Focus glow, hover ring |

Rule: there is exactly one accent. If a new surface needs to read as interactive, it uses teal. Pages don't get their own accents.

### Domain hues — muted jewel tones

The five domains the platform covers. Hue + stroke pattern together is belt + suspenders — at the 11–28px node scale, hue alone reads as "five shades of gray with squiggles."

| Var | Dark | Light | Domain |
|---|---|---|---|
| `--color-probability` | `#6b9bd1` | `#3b6ea5` | Probability foundations |
| `--color-distributions` | `#8b7ec8` | `#6453a3` | Distributions |
| `--color-inference` | `#d4a574` | `#a67028` | Statistical inference |
| `--color-regression` | `#7cb098` | `#4a8268` | Regression modeling |
| `--color-practice` | `#c98b8b` | `#9b5858` | Data science practice |

**Achromatopsia rule.** Each hue's luminance value is distinct — a reader with no color vision can still tell domains apart by darkness. New hues must pass the same test (use the existing palette or have a clear luminance step). The stroke-pattern vocabulary (`--difficulty-dash` solid / dashed / dotted) is the secondary signal for that case.

### Difficulty hues

| Var | Dark | Light | Use |
|---|---|---|---|
| `--color-intro` | `#22c55e` | `#15803d` | Difficulty: intro. Also "right answer" affirmation in prose chips. |
| `--color-intermediate` | `#eab308` | `#a16207` | Difficulty: intermediate. |
| `--color-advanced` | `#ef4444` | `#b91c1c` | Difficulty: advanced. Also wrong-decision accent bar and inline misconception left border. |

Rule: difficulty hues are domain-orthogonal. They don't replace the domain hue on a node; they're encoded as the stroke pattern.

---

## 3. Typography scale

Defined in `tokens.css`. Six steps. Use the var, never the raw px.

| Var | Size (desktop) | Size (≤768px) | Line | Weight | Tracking | Use |
|---|---|---|---|---|---|---|
| `--text-display-*` | `clamp(32px, 5vw, 56px)` | unchanged | 1.05 | 700 | -1.5px | Topic-page header only |
| `--text-h1-*` | 32px | 22px | 1.2 | 700 | -0.5px | Prose h1 / hero title |
| `--text-h2-*` | 26px | 18px | 1.25 | 700 | -0.3px | Prose h2 / section title |
| `--text-h3-*` | 20px | 15px | 1.3 | 600 | 0 | Prose h3 / subsection |
| `--text-body-*` | 15px | 14px | 1.75 | 400 | — | Body prose, decision response, callout body |
| `--text-small-*` | 13px | 12px | 1.6 | 400 | — | Labels, axis ticks, control values |
| `--text-mono-*` | 13px | 12px | 1.6 | 400 | — | Code, numeric readouts in playground sliders |

Headings use `var(--font-serif)` (STIX Two Text); body and chrome use `var(--font-sans)` (Inter); code uses `var(--font-mono)` (JetBrains Mono → Fira Code → Consolas).

The 1.75 body line-height is intentional: long-form math prose with inline KaTeX needs the breathing room. Don't tighten.

---

## 4. Spacing scale

4-px base. Defined in `tokens.css`. Use these instead of raw px in component CSS / inline styles.

| Var | px | Common use |
|---|---|---|
| `--space-1` | 4 | Tight gaps inside small components |
| `--space-2` | 8 | Icon ↔ label, list-item vertical spacing |
| `--space-3` | 12 | Inline padding inside buttons |
| `--space-4` | 16 | Standard panel padding, paragraph margin |
| `--space-5` | 20 | Decision/playground block padding |
| `--space-6` | 24 | Block-to-block vertical rhythm |
| `--space-7` | 28 | Heading top margin |
| `--space-8` | 32 | Heading top margin (h1) |
| `--space-10` | 40 | Section breaks |
| `--space-12` | 48 | Page-edge gaps |
| `--space-16` | 64 | Hero-scale separation |

Rule: if you reach for a number that doesn't match the scale, the scale is wrong (extend it) or the layout is fighting the grid (refactor). Inline `style={{ padding: 17 }}` is a smell.

---

## 5. Motion

Three durations, one easing. Every animation honors `prefers-reduced-motion`.

| Var | Duration | Use |
|---|---|---|
| `--duration-fast` (also `--transition-fast`) | 120ms / 0.15s | Hover states, button color flips, focus ring appearance |
| `--duration-smooth` (also `--transition-smooth`) | 200ms / 0.3s | Most transitions: panel reveals, theme dissolves, plot crossfades |
| `--duration-slow` (also `--transition-spring`) | 600ms / 0.5s spring | Decision plot recolor, playground meter fill, anything where the user should *see* the change |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | The default. Use spring `cubic-bezier(0.34, 1.56, 0.64, 1)` only for the existing transition-spring |

Under `prefers-reduced-motion`, all three durations collapse to 0ms (set in `tokens.css`). Components reading `var(--duration-*)` inherit that automatically — no per-component check needed.

**Rule.** If the change is essential to the lesson (the plot reacting to a decision), use `--duration-slow`. If the change is just chrome (a hover, a focus ring), use `--duration-fast`. Don't guess; pick the slot.

---

## 6. Component vocabulary

Recurring elements, defined once.

- **Hairline border.** `1px solid var(--color-border-subtle)`. The default border. Don't make it thicker without a reason.
- **Zinc panel.** `var(--color-bg-secondary)` background, hairline border, `var(--radius)` corner. The container for decisions, playgrounds, callouts, derivations.
- **Accent bar.** `3px solid var(--color-accent)` (right answer) or `3px solid var(--color-advanced)` (wrong answer). Only on the left edge of the panel that contains the verdict.
- **Small-cap label.** `font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--color-text-muted);`. Used as the block-type label ("Decision", "Playground", "Insight"). Sits at the top of a zinc panel above the body.
- **Dashed ghost.** `stroke-dasharray: 4 4; stroke-width: 1.5; opacity: 0.4–0.5; stroke: var(--color-text-muted)`. Plot overlay representing a target the reader is trying to match. Only used by playground goals.
- **Match meter.** `4px` tall bar, `var(--color-border-subtle)` background, fill `var(--color-accent)`, transition `width var(--duration-slow)`. Shows progress toward a playground goal predicate.
- **Focus ring.** `2px solid var(--color-accent); outline-offset: 2px`. Only on `:focus-visible`. Mouse users don't see it; keyboard users always do.

Each element is one decision the surface has already made. New components reuse the vocabulary; new vocabulary needs a reason and the doc gets amended.

---

## How to use this doc

When adding a new component:
1. Use existing tokens — color, type, space, motion. Inline raw px or hex is a smell.
2. Inherit the component vocabulary above (zinc panel, hairline, accent bar) before designing something new.
3. If you need a token that doesn't exist, add it to `tokens.css` first and update this doc in the same change.
4. Verify the achromatopsia and reduced-motion rules still hold for what you've added.
