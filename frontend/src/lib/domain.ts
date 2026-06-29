/**
 * Single source of truth for domain → color token mapping.
 *
 * Laboratory Monolith rule:
 *   - Every domain gets a CSS custom property defined in global.css.
 *   - Components MUST resolve domain colors through this helper so:
 *       a) Theme switching (dark/light) flips all domain colors in one place.
 *       b) Adjusting the monochrome palette is a one-file change.
 *       c) We never regress to the `domain.split('-')[0]` pattern, which
 *          silently fails for `statistical-inference` and `data-science-practice`.
 */

export const DOMAIN_VAR: Record<string, string> = {
  'probability-foundations': 'var(--color-probability)',
  'distributions':           'var(--color-distributions)',
  'statistical-inference':   'var(--color-inference)',
  'regression-modeling':     'var(--color-regression)',
  'data-science-practice':   'var(--color-practice)',
}

export const DOMAIN_LABEL: Record<string, string> = {
  'probability-foundations': 'Probability',
  'distributions':           'Distributions',
  'statistical-inference':   'Inference',
  'regression-modeling':     'Regression',
  'data-science-practice':   'Practice',
}

export const DOMAIN_DESC: Record<string, string> = {
  'probability-foundations': 'Events, Bayes, Random Variables',
  'distributions':           'Normal, Binomial, Poisson',
  'statistical-inference':   'Hypothesis Tests, Confidence',
  'regression-modeling':     'Linear, Logistic, Regularization',
  'data-science-practice':   'EDA, A/B Tests, Cross-Validation',
}

export const DOMAIN_SLUGS = Object.keys(DOMAIN_VAR)

/** Get the CSS var() expression for a domain slug. Safe for any unknown slug. */
export function domainVar(slug?: string | null): string {
  if (!slug) return 'var(--color-probability)'
  return DOMAIN_VAR[slug] ?? 'var(--color-probability)'
}

/** Human-readable domain label. Falls back to the slug itself. */
export function domainLabel(slug?: string | null): string {
  if (!slug) return ''
  return DOMAIN_LABEL[slug] ?? slug.replace(/-/g, ' ')
}

/**
 * Resolve a domain's CSS var to an actual hex color at call time.
 *
 * Only use this from canvas rendering contexts (e.g. ForceGraph). DOM components
 * should use `domainVar(slug)` and let the browser resolve the CSS variable.
 * Re-read once per frame if the theme can change, getComputedStyle is cheap.
 */
export function domainColorHex(
  slug: string | null | undefined,
  root: Element = document.documentElement,
): string {
  const cssVar = domainVar(slug)
  const match = cssVar.match(/var\((--[^)]+)\)/)
  if (!match) return '#71717a'
  const resolved = getComputedStyle(root).getPropertyValue(match[1]).trim()
  return resolved || '#71717a'
}

/**
 * Resolve any CSS var token (e.g. `--color-accent`) to a hex color.
 * Useful for canvas code that wants to respect the active theme.
 */
export function cssVarHex(
  tokenName: string,
  root: Element = document.documentElement,
  fallback = '#ffffff',
): string {
  const resolved = getComputedStyle(root).getPropertyValue(tokenName).trim()
  return resolved || fallback
}

// ─── H11: Difficulty stroke vocabulary ─────────────────────────────────────
//
// H1 restored domain color (muted jewel palette), which freed up the stroke
// pattern, previously used to encode domain alongside color, to carry a
// second, independent signal. We now use it for **difficulty**, the most
// useful "should I open this?" signal after topic title:
//
//   intro        → solid ring   (foundations, walk right in)
//   intermediate → dashed ring  (needs some background)
//   advanced     → dotted ring  (deep end, come back after prereqs)
//
// Difficulty color (green/amber/red dot on the node corner) + ring pattern
// = redundant encoding for colorblind accessibility without doubling up
// on domain vocabulary.
//
// The DOMAIN_TICK glyph still exists, it's used in DOM labels (sidebar
// chips, badges) where color is already legible, and reads as "which
// discipline" in the context of a row of text, not as a second copy of
// the graph's domain signal.

/** Canvas dash array per difficulty. Empty array = solid line. */
export const DIFFICULTY_DASH: Record<string, number[]> = {
  intro:        [],
  intermediate: [6, 3],
  advanced:     [2, 3],
}

/** Box-drawing tick glyph. Used inline in labels to prefix domain context. */
export const DOMAIN_TICK: Record<string, string> = {
  'probability-foundations': '─',
  'distributions':           '┈',
  'statistical-inference':   '═',
  'regression-modeling':     '━',
  'data-science-practice':   '┄',
}

/** Canvas dash array for the given difficulty. Safe for unknown/null. */
export function difficultyDash(difficulty?: string | null): number[] {
  if (!difficulty) return []
  return DIFFICULTY_DASH[difficulty] ?? []
}

/** Tick glyph for the given domain. Falls back to a hairline rule. */
export function domainTick(slug?: string | null): string {
  if (!slug) return '─'
  return DOMAIN_TICK[slug] ?? '─'
}

/** Uniform node ring stroke width. Pattern carries the variation now. */
export const NODE_STROKE_WIDTH = 1.2
