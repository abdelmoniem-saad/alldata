/**
 * Plot-spec catalog, W2.
 *
 * Single source of truth for the *metadata* about each plot spec: its human
 * label, which group it belongs to, and the `state` keys it reads with sane
 * defaults. Two consumers:
 *   - `PlotBlock` reads `SPEC_LABELS` for the `role="img"` a11y label (T3).
 *   - the fork-editor plot picker (W2) lists `PLOT_SPEC_CATALOG` and inserts a
 *     canonical `state` + `plot` directive pair via `plotScaffold`.
 *
 * The *renderers* live in `components/topic/blocks/plots/index.tsx` (`PLOT_SPECS`).
 * Keep this catalog's keys in lock-step with that registry, same discipline as
 * the frontend `PLOT_SPECS` / importer `_KNOWN_PLOT_SPECS` mirror. The defaults
 * here mirror each spec's `num(state, key, fallback)` fallbacks and the
 * canonical authored examples in `seed/topics`.
 */

export type ParamValue = number | string

export interface PlotSpecMeta {
  /** Registry key, must match a key in `PLOT_SPECS`. */
  name: string
  /** Human description (also the plot's a11y label). */
  label: string
  /** Picker grouping. */
  group: string
  /** Default state values seeded into the inserted `state` block. */
  params: Record<string, ParamValue>
  /** State keys the spec reads, the inserted `plot` directive's `binds`. */
  binds: string[]
}

/**
 * A11y labels, keyed by spec name. Mirror new entries when `PLOT_SPECS` grows.
 * (Moved here from `PlotBlock.tsx` in W2 so the picker and the renderer share
 * one map.)
 */
export const SPEC_LABELS: Record<string, string> = {
  gaussian_pdf: 'Normal distribution bell curve',
  gaussian_cdf: 'Normal distribution cumulative curve',
  binomial_pmf: 'Binomial distribution bar chart',
  poisson_pmf: 'Poisson distribution bar chart',
  student_t_pdf: "Student's t distribution curve with a normal reference",
  exponential_pdf: 'Exponential distribution density curve',
  chi_squared_pdf: 'Chi-squared distribution density curve',
  f_pdf: 'F-distribution density curve',
  likelihood_curve: 'Likelihood curve over a parameter',
  power_curves: 'Null and alternative distributions with shaded power regions',
  beta_posterior: 'Bayesian prior, likelihood, and posterior curves',
  added_variable_plot: 'Added-variable (partial regression) scatter plot',
  residual_plot: 'Residuals versus fitted values scatter plot',
  logistic_curve: 'Logistic regression S-curve over binary outcomes',
  coefficient_path: 'Regularization coefficient shrinkage paths',
  proportion_test: 'Two-proportion comparison bars with confidence intervals',
  cv_error_curve: 'Training versus validation error curve over complexity',
  bias_variance_curve: 'Bias-variance decomposition curve',
  missingness_grid: 'Data grid showing the missing-value pattern',
  empirical_histogram: 'Histogram of a sample',
  scatter_with_fit: 'Scatter plot with a least-squares fit line',
  posterior_update: 'Bayesian posterior probability bars',
  population_dot_grid: 'Population dot grid',
}

/**
 * The pickable catalog. Order within a group is teaching order; groups are
 * the same five clusters the knowledge graph uses, plus a Bayesian set.
 */
export const PLOT_SPEC_CATALOG: PlotSpecMeta[] = [
  // ── Distributions ────────────────────────────────────────────────────────
  { name: 'gaussian_pdf', group: 'Distributions', label: SPEC_LABELS.gaussian_pdf, params: { mu: 0, sigma: 1 }, binds: ['mu', 'sigma'] },
  { name: 'gaussian_cdf', group: 'Distributions', label: SPEC_LABELS.gaussian_cdf, params: { mu: 0, sigma: 1 }, binds: ['mu', 'sigma'] },
  { name: 'binomial_pmf', group: 'Distributions', label: SPEC_LABELS.binomial_pmf, params: { n: 10, p: 0.5 }, binds: ['n', 'p'] },
  { name: 'poisson_pmf', group: 'Distributions', label: SPEC_LABELS.poisson_pmf, params: { lambda: 4 }, binds: ['lambda'] },
  { name: 'student_t_pdf', group: 'Distributions', label: SPEC_LABELS.student_t_pdf, params: { df: 5 }, binds: ['df'] },
  { name: 'exponential_pdf', group: 'Distributions', label: SPEC_LABELS.exponential_pdf, params: { rate: 1 }, binds: ['rate'] },
  { name: 'chi_squared_pdf', group: 'Distributions', label: SPEC_LABELS.chi_squared_pdf, params: { df: 3 }, binds: ['df'] },
  { name: 'f_pdf', group: 'Distributions', label: SPEC_LABELS.f_pdf, params: { df1: 5, df2: 10 }, binds: ['df1', 'df2'] },

  // ── Inference & testing ──────────────────────────────────────────────────
  { name: 'likelihood_curve', group: 'Inference & testing', label: SPEC_LABELS.likelihood_curve, params: { trials: 10, successes: 7 }, binds: ['trials', 'successes'] },
  { name: 'power_curves', group: 'Inference & testing', label: SPEC_LABELS.power_curves, params: { effect: 0.5, alpha: 0.05, n: 1 }, binds: ['effect', 'alpha', 'n'] },
  { name: 'proportion_test', group: 'Inference & testing', label: SPEC_LABELS.proportion_test, params: { p_a: 0.1, p_b: 0.12, n_a: 1000, n_b: 1000 }, binds: ['p_a', 'p_b', 'n_a', 'n_b'] },

  // ── Bayesian ─────────────────────────────────────────────────────────────
  { name: 'beta_posterior', group: 'Bayesian', label: SPEC_LABELS.beta_posterior, params: { prior_a: 2, prior_b: 2, trials: 10, successes: 6 }, binds: ['prior_a', 'prior_b', 'trials', 'successes'] },
  { name: 'posterior_update', group: 'Bayesian', label: SPEC_LABELS.posterior_update, params: { prior: 0.01, sensitivity: 0.99, specificity: 0.99 }, binds: ['prior', 'sensitivity', 'specificity'] },
  { name: 'population_dot_grid', group: 'Bayesian', label: SPEC_LABELS.population_dot_grid, params: { prior: 0.01, sensitivity: 0.99, specificity: 0.99, treatment_strategy: 'none' }, binds: ['prior', 'sensitivity', 'specificity', 'treatment_strategy'] },

  // ── Regression ───────────────────────────────────────────────────────────
  { name: 'scatter_with_fit', group: 'Regression', label: SPEC_LABELS.scatter_with_fit, params: { slope: 0, intercept: 0 }, binds: ['slope', 'intercept'] },
  { name: 'added_variable_plot', group: 'Regression', label: SPEC_LABELS.added_variable_plot, params: { controlled: 0 }, binds: ['controlled'] },
  { name: 'residual_plot', group: 'Regression', label: SPEC_LABELS.residual_plot, params: { pattern: 'random' }, binds: ['pattern'] },
  { name: 'logistic_curve', group: 'Regression', label: SPEC_LABELS.logistic_curve, params: { beta0: 0, beta1: 1 }, binds: ['beta0', 'beta1'] },
  { name: 'coefficient_path', group: 'Regression', label: SPEC_LABELS.coefficient_path, params: { lambda: 0, penalty: 'lasso' }, binds: ['lambda', 'penalty'] },

  // ── Model & data ─────────────────────────────────────────────────────────
  { name: 'cv_error_curve', group: 'Model & data', label: SPEC_LABELS.cv_error_curve, params: { complexity: 1 }, binds: ['complexity'] },
  { name: 'bias_variance_curve', group: 'Model & data', label: SPEC_LABELS.bias_variance_curve, params: { complexity: 1 }, binds: ['complexity'] },
  { name: 'missingness_grid', group: 'Model & data', label: SPEC_LABELS.missingness_grid, params: { mechanism: 'mcar', missing_frac: 0.25 }, binds: ['mechanism', 'missing_frac'] },
  { name: 'empirical_histogram', group: 'Model & data', label: SPEC_LABELS.empirical_histogram, params: { mu: 0, sigma: 1 }, binds: ['mu', 'sigma'] },
]

/** Catalog grouped by `group`, preserving declaration order. */
export function plotSpecGroups(): Array<{ group: string; specs: PlotSpecMeta[] }> {
  const out: Array<{ group: string; specs: PlotSpecMeta[] }> = []
  for (const spec of PLOT_SPEC_CATALOG) {
    let bucket = out.find(b => b.group === spec.group)
    if (!bucket) { bucket = { group: spec.group, specs: [] }; out.push(bucket) }
    bucket.specs.push(spec)
  }
  return out
}

/** Serialize params to the inline `{k: v, …}` directive form (strings quoted). */
function inlineParams(params: Record<string, ParamValue>): string {
  const parts = Object.entries(params).map(([k, v]) =>
    typeof v === 'string' ? `${k}: "${v}"` : `${k}: ${v}`,
  )
  return `{${parts.join(', ')}}`
}

/**
 * The canonical `state` + `plot` directive pair for a spec, mirrors the
 * authored form in `seed/topics` (e.g. t-distribution/content.md). `anchor`
 * should be unique within the topic; the picker passes a generated slug.
 */
export function plotScaffold(meta: PlotSpecMeta, anchor: string): string {
  const values = inlineParams(meta.params)
  const binds = `[${meta.binds.join(', ')}]`
  return (
    `<!-- block: state, values: ${values} -->\n\n` +
    `<!-- block: plot, spec: ${meta.name}, params: ${values}, binds: ${binds}, anchor: ${anchor} -->`
  )
}

/** The `graph_view` tour-step directive (immersive family-overview inserts). */
export function graphViewScaffold(target: string, anchor: string): string {
  return `<!-- block: graph_view, target: ${target}, anchor: ${anchor} -->`
}
