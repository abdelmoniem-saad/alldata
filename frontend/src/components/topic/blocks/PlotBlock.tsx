/**
 * PlotBlock — I4/I5
 *
 * The state-binding wrapper around the spec library in `./plots`. Reads
 * `meta.spec` to pick a renderer, subscribes to topic state via
 * `useTopicState(slug)`, and forwards an optional `ghost` overlay (used by
 * playground goals to draw a dashed target curve).
 *
 * `meta` shape (set by the parser from a `<!-- block: plot, ... -->` directive):
 *   {
 *     spec: "gaussian_pdf",            // required — name in PLOT_SPECS
 *     params: { mu: 0, sigma: 1 },     // initial defaults (seeded into state)
 *     binds: ["mu","sigma"],           // optional — narrows what's read from state
 *     ghost: { mu: 1.5, sigma: 0.8 }   // optional — dashed target overlay
 *   }
 *
 * If `binds` is omitted the spec receives the entire topic state — every spec
 * tolerates extra keys.
 */
import { useMemo } from 'react'
import { useShallow } from 'zustand/shallow'
import { getPlotSpec } from './plots'
import { useTopicStateStore, StateValue } from '../../../stores/topicState'

interface Props {
  slug: string
  meta: Record<string, unknown>
  /** Per-anchor playground ghost — overrides any meta.ghost when present. */
  ghostOverride?: Record<string, StateValue> | null
  width?: number
  height?: number
}

/**
 * T3: a11y labels for the SVG plots. Each spec renders a bare `<svg>` that's
 * meaningless to a screen reader; wrapping the mount in `role="img"` with one
 * of these labels presents the whole plot as a single described image (the
 * role hides the SVG's d3 internals from the a11y tree). Keyed by spec name —
 * mirror new entries here when `PLOT_SPECS` grows.
 */
const SPEC_LABELS: Record<string, string> = {
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

export default function PlotBlock({ slug, meta, ghostOverride, width, height }: Props) {
  const spec = String(meta.spec ?? '')
  const Spec = getPlotSpec(spec)

  // J5: fine-grained subscription. When `binds` is set, subscribe to *only*
  // those keys; a write to an unrelated state key (e.g. another playground's
  // slider) doesn't re-render this plot. When `binds` is absent, fall back to
  // the whole-topic-state subscription.
  const binds = useMemo<string[] | null>(
    () => (Array.isArray(meta.binds) ? (meta.binds as string[]) : null),
    [meta.binds],
  )

  const view = useTopicStateStore(
    useShallow((s): Record<string, StateValue> => {
      const all = s.byTopic[slug]?.state ?? {}
      if (!binds) return all
      const out: Record<string, StateValue> = {}
      for (const k of binds) out[k] = all[k] ?? null
      return out
    }),
  )

  const ghost = useMemo<Record<string, StateValue> | null>(() => {
    if (ghostOverride) return ghostOverride
    if (meta.ghost && typeof meta.ghost === 'object') {
      return meta.ghost as Record<string, StateValue>
    }
    return null
  }, [ghostOverride, meta.ghost])

  if (!Spec) {
    return (
      <div style={{
        padding: 12,
        borderRadius: 'var(--radius)',
        border: '1px dashed var(--color-border-subtle)',
        color: 'var(--color-text-muted)',
        fontSize: 12,
      }}>
        Unknown plot spec: <code>{spec}</code>
      </div>
    )
  }

  // T3: present the SVG as a single labeled image; role="img" collapses the
  // d3 internals out of the a11y tree.
  return (
    <div role="img" aria-label={SPEC_LABELS[spec] ?? 'Statistical plot'}>
      <Spec state={view} ghost={ghost} width={width} height={height} />
    </div>
  )
}
