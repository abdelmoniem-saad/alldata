/**
 * Plot library — I4/I5
 *
 * One file = one library. Each `PlotSpec` is a tiny D3 component that reads
 * named keys from `state` and re-renders on change. The `spec` directive
 * value picks which one to mount.
 *
 * Why one file: each plot is small (~30–60 lines), they share helpers
 * (axis drawing, theme reads), and a single registry keeps the renderer's
 * spec→component mapping trivially auditable. New specs are appended here.
 *
 * `ghost` (optional) is the playground target shadow: a dashed faint curve
 * drawn underneath the user's live curve.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { cssVarHex } from '../../../../lib/domain'
import type { StateValue } from '../../../../stores/topicState'

export interface PlotProps {
  state: Record<string, StateValue>
  /** Optional dashed-target overlay — used by playground goals. */
  ghost?: Record<string, StateValue> | null
  width?: number
  height?: number
}

type Spec = (props: PlotProps) => JSX.Element

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(state: Record<string, StateValue>, key: string, fallback: number): number {
  const v = state[key]
  return typeof v === 'number' ? v : fallback
}

function str(state: Record<string, StateValue>, key: string, fallback: string): string {
  const v = state[key]
  return typeof v === 'string' ? v : fallback
}

/** Standard normal PDF. */
function gaussianPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI))
}

/**
 * Log-gamma (Lanczos). Module-level so the discrete/continuous specs that
 * need factorials or the gamma function — binomial (inline, historical),
 * poisson_pmf, student_t_pdf — share one implementation. `lgamma(k+1) = ln(k!)`.
 */
function lgamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953]
  const x = z
  let y = z
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (const v of c) { y += 1; ser += v / y }
  return -tmp + Math.log(2.5066282746310005 * ser / x)
}

/** Poisson PMF P(X=k) = λ^k e^−λ / k!, via logs for stability. */
function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0
  return Math.exp(k * Math.log(lambda) - lambda - lgamma(k + 1))
}

/** Student's t PDF with ν degrees of freedom. */
function studentTPdf(t: number, df: number): number {
  const v = Math.max(1, df)
  const logNorm = lgamma((v + 1) / 2) - lgamma(v / 2) - 0.5 * Math.log(v * Math.PI)
  return Math.exp(logNorm) * Math.pow(1 + (t * t) / v, -(v + 1) / 2)
}

/** Exponential PDF f(x;λ) = λe^−λx, x ≥ 0. Mean 1/λ. (R0) */
function exponentialPdf(x: number, rate: number): number {
  if (x < 0 || rate <= 0) return 0
  return rate * Math.exp(-rate * x)
}

/** Chi-squared PDF with k degrees of freedom, via logs. Diverges at x→0 for
 *  k ≤ 2; callers clamp the y-domain. (R0) */
function chiSquaredPdf(x: number, k: number): number {
  if (x <= 0 || k <= 0) return 0
  const log = (k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - lgamma(k / 2)
  return Math.exp(log)
}

/** F PDF with (d1, d2) degrees of freedom, via logs. (R0) */
function fPdf(x: number, d1: number, d2: number): number {
  if (x <= 0 || d1 <= 0 || d2 <= 0) return 0
  const log =
    lgamma((d1 + d2) / 2) - lgamma(d1 / 2) - lgamma(d2 / 2) +
    (d1 / 2) * Math.log(d1 / d2) +
    (d1 / 2 - 1) * Math.log(x) -
    ((d1 + d2) / 2) * Math.log(1 + (d1 / d2) * x)
  return Math.exp(log)
}

/** Beta PDF on (0,1) via logs; used by the Bayesian posterior spec. (R2) */
function betaPdf(p: number, a: number, b: number): number {
  if (p <= 0 || p >= 1 || a <= 0 || b <= 0) return 0
  const logB = lgamma(a) + lgamma(b) - lgamma(a + b)
  return Math.exp((a - 1) * Math.log(p) + (b - 1) * Math.log(1 - p) - logB)
}

/** Error function (Abramowitz & Stegun 7.1.26). (R2) */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return x >= 0 ? y : -y
}

/** Standard normal CDF Φ(z). (R2) */
function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

/** Inverse standard normal CDF (Acklam's rational approximation). (R2) */
function invNorm(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [-3.969683028665376e+1, 2.209460984245205e+2, -2.759285104469687e+2, 1.38357751867269e+2, -3.066479806614716e+1, 2.506628277459239e+0]
  const b = [-5.447609879822406e+1, 1.615858368580409e+2, -1.556989798598866e+2, 6.680131188771972e+1, -1.328068155288572e+1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e+0, -2.549732539343734e+0, 4.374664141464968e+0, 2.938163982698783e+0]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e+0, 3.754408661907416e+0]
  const plow = 0.02425, phigh = 1 - plow
  let q: number, r: number
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= phigh) {
    q = p - 0.5; r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
}

/**
 * Theme colors used by every plot. J5: memoized at module scope and
 * invalidated only when `document.documentElement`'s theme attribute or class
 * changes. Pre-J5 this called `getComputedStyle` once per useEffect on every
 * state change; for the population dot grid that meant five `getComputedStyle`
 * calls *per slider tick*.
 *
 * Subscribers re-render when the cache is invalidated. Plots wrap their
 * effect deps with the colors object; identical reference between theme
 * flips means the effect doesn't re-run.
 */
type Colors = {
  accent: string
  text: string
  muted: string
  border: string
  advanced: string
}

let _colorsCache: Colors | null = null
const _colorsListeners = new Set<() => void>()

function _readColorsFresh(): Colors {
  return {
    accent: cssVarHex('--color-accent', document.documentElement, '#5eead4'),
    text: cssVarHex('--color-text', document.documentElement, '#e4e4e7'),
    muted: cssVarHex('--color-text-muted', document.documentElement, '#71717a'),
    border: cssVarHex('--color-border-subtle', document.documentElement, '#3f3f46'),
    advanced: cssVarHex('--color-advanced', document.documentElement, '#c98b8b'),
  }
}

function _invalidateColorsCache(): void {
  _colorsCache = null
  for (const fn of _colorsListeners) fn()
}

// Lazily install a single MutationObserver the first time a plot mounts.
// Watches for `data-theme` attr flips and class changes on <html>.
let _observerInstalled = false
function _ensureThemeObserver(): void {
  if (_observerInstalled || typeof document === 'undefined') return
  _observerInstalled = true
  const obs = new MutationObserver(() => _invalidateColorsCache())
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  })
}

/** Hook variant — returns the cached colors and re-renders on theme flip. */
function useColors(): Colors {
  const [, force] = useState(0)
  useEffect(() => {
    _ensureThemeObserver()
    const fn = () => force(n => n + 1)
    _colorsListeners.add(fn)
    return () => { _colorsListeners.delete(fn) }
  }, [])
  if (_colorsCache === null) _colorsCache = _readColorsFresh()
  return _colorsCache
}

/** Function variant — safe to call inside `useEffect`. Returns the cache;
 *  asserts a hook subscription has been set up so theme flips propagate. */
function readColors(): Colors {
  if (_colorsCache === null) _colorsCache = _readColorsFresh()
  return _colorsCache
}

// ─── Specs ──────────────────────────────────────────────────────────────────

const GaussianPdf: Spec = ({ state, ghost, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const mu = num(state, 'mu', 0)
  const sigma = num(state, 'sigma', 1)
  // Q3: optional `n` — when present (and > 1) the curve drawn is the
  // *sampling distribution of the mean*, N(mu, sigma/√n). Sampling-
  // distributions binds [mu, sigma, n] to show the standard error shrink.
  // Topics that bind only [mu, sigma] leave n absent → n=1 → no change.
  const n = Math.max(1, num(state, 'n', 1))
  const sigmaEff = sigma / Math.sqrt(n)
  useColors() // J5: subscribe to theme flips (cache invalidation re-renders).

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    // Adaptive y-domain so a narrow/tall curve (small σ, or σ/√n at large n)
    // doesn't clip against a fixed ceiling. Peak of an N(μ, s²) density is
    // 1/(s√(2π)); pad 10%, floor at 0.45 so the standard curve still looks
    // familiar.
    const peak = 1 / (sigmaEff * Math.sqrt(2 * Math.PI))
    const x = d3.scaleLinear().domain([-5, 5]).range([0, w])
    const y = d3.scaleLinear().domain([0, Math.max(0.45, peak * 1.1)]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const samples = d3.range(-5, 5.05, 0.05)
    const line = d3.line<number>()
      .x(d => x(d))
      .y(d => y(gaussianPdf(d, mu, sigmaEff)))
      .curve(d3.curveMonotoneX)

    if (ghost) {
      const gMu = num(ghost, 'mu', 0)
      const gN = Math.max(1, num(ghost, 'n', 1))
      const gSigma = num(ghost, 'sigma', 1) / Math.sqrt(gN)
      const ghostLine = d3.line<number>()
        .x(d => x(d))
        .y(d => y(gaussianPdf(d, gMu, gSigma)))
        .curve(d3.curveMonotoneX)
      g.append('path').datum(samples).attr('d', ghostLine)
        .attr('fill', 'none').attr('stroke', colors.muted)
        .attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4')
        .attr('opacity', 0.7)
    }

    g.append('path').datum(samples).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)
  }, [mu, sigma, sigmaEff, ghost, width, height])

  return <svg ref={ref} width={width} height={height} />
}

const GaussianCdf: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const mu = num(state, 'mu', 0)
  const sigma = num(state, 'sigma', 1)
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const x = d3.scaleLinear().domain([-5, 5]).range([0, w])
    const y = d3.scaleLinear().domain([0, 1]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    // Numerical CDF via cumulative trapezoid of the PDF — simpler than erf.
    const samples = d3.range(-5, 5.05, 0.05)
    let acc = 0
    const cdf = samples.map((v, i) => {
      if (i > 0) acc += (gaussianPdf(samples[i - 1], mu, sigma) + gaussianPdf(v, mu, sigma)) / 2 * 0.05
      return acc
    })

    const line = d3.line<number>().x((_, i) => x(samples[i])).y(d => y(d)).curve(d3.curveMonotoneX)
    g.append('path').datum(cdf).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)
  }, [mu, sigma, width, height])

  return <svg ref={ref} width={width} height={height} />
}

const BinomialPmf: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const n = Math.max(1, Math.round(num(state, 'n', 10)))
  const p = Math.min(1, Math.max(0, num(state, 'p', 0.5)))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    // log-binomial coefficient via lgamma trick to avoid overflow at large n.
    const lgamma = (z: number): number => {
      // Stirling-ish via Lanczos. Accurate enough for plot.
      const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.001208650973866179, -0.000005395239384953]
      let x = z, y = z
      let tmp = x + 5.5
      tmp -= (x + 0.5) * Math.log(tmp)
      let ser = 1.000000000190015
      for (const v of c) { y += 1; ser += v / y }
      return -tmp + Math.log(2.5066282746310005 * ser / x)
    }
    const probs: number[] = []
    for (let k = 0; k <= n; k++) {
      const logC = lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)
      const logP = logC + k * Math.log(Math.max(p, 1e-12)) + (n - k) * Math.log(Math.max(1 - p, 1e-12))
      probs.push(Math.exp(logP))
    }
    const x = d3.scaleBand<number>().domain(d3.range(n + 1)).range([0, w]).padding(0.1)
    const y = d3.scaleLinear().domain([0, Math.max(...probs) * 1.15 || 1]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % Math.max(1, Math.floor((n + 1) / 8)) === 0)))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.selectAll('rect').data(probs).enter().append('rect')
      .attr('x', (_, i) => x(i) ?? 0)
      .attr('y', d => y(d))
      .attr('width', x.bandwidth())
      .attr('height', d => h - y(d))
      .attr('fill', colors.accent)
      .attr('opacity', 0.85)
  }, [n, p, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * population_dot_grid — the I5a Bayes consequence canvas.
 *
 * 1,000 dots arranged in a grid, recolored by:
 *   - true_status      (sick / healthy) determined by `prior`
 *   - test_status      (positive / negative) by `sensitivity` / `specificity`
 *   - treatment_strategy (treat_all / treat_half / retest)
 *
 * Color encoding:
 *   - correctly handled: muted accent
 *   - false positive treated:    muted advanced (amber/red)
 *   - missed sick:               muted advanced (different shade)
 *   - untreated healthy:         muted text
 *
 * Deterministic — uses a tiny LCG seeded by topic state so the same params
 * always produce the same grid. That way "state X recolors Y dots" is
 * reproducible across reloads.
 */
const PopulationDotGrid: Spec = ({ state, width = 420, height = 320 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const prior = num(state, 'prior', 0.01)
  const sens = num(state, 'sensitivity', 0.99)
  const spec = num(state, 'specificity', 0.99)
  const strategy = str(state, 'treatment_strategy', 'none')
  useColors()

  // L5: track the previous strategy so we can pick a snappier transition
  // when the user picks a decision option (discrete state change). The
  // 600ms ease feels right for slider drags but laggy on one-shot picks
  // — see the K retrospective for the carry-over.
  const prevStrategyRef = useRef(strategy)

  // J5: scaffolding effect. Runs once per mount (or geometry change). Creates
  // 1,000 circles at fixed positions. The expensive bit — DOM allocation — is
  // paid once instead of every state write.
  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 8, right: 8, bottom: 8, left: 8 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g')
      .attr('class', 'dot-grid-root')
      .attr('transform', `translate(${m.left},${m.top})`)

    const N = 1000
    const cols = 50
    const rows = N / cols
    const cellW = w / cols
    const cellH = h / rows
    const r = Math.max(2, Math.min(cellW, cellH) / 2 - 1)

    g.selectAll<SVGCircleElement, number>('circle')
      .data(d3.range(N))
      .enter().append('circle')
      .attr('cx', i => (i % cols) * cellW + cellW / 2)
      .attr('cy', i => Math.floor(i / cols) * cellH + cellH / 2)
      .attr('r', r)
  }, [width, height])

  // J5: update effect. Recomputes per-dot fill + opacity given current state
  // and writes them to the existing circles. No DOM allocation. The 1,000-dot
  // recolor on a `treatment_strategy` write is now an O(N) attribute pass
  // instead of an O(N) clear + O(N) re-allocation.
  useEffect(() => {
    const svg = d3.select(ref.current!)
    const g = svg.select<SVGGElement>('g.dot-grid-root')
    if (g.empty()) return
    const colors = readColors()

    const N = 1000
    const seed = Math.floor((prior * 1000 + sens * 100 + spec * 10) * 1e6) || 1
    let s = seed
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }

    type Dot = { sick: boolean; treated: boolean }
    const dots: Dot[] = Array.from({ length: N }, () => {
      const sick = rand() < prior
      const positive = sick ? rand() < sens : rand() >= spec
      let treated = false
      if (strategy === 'treat_all') treated = positive
      else if (strategy === 'treat_half') treated = positive && rand() < 0.5
      else if (strategy === 'retest') treated = positive && (sick ? rand() < sens : rand() >= spec)
      return { sick, treated }
    })

    function colorFor(d: Dot): string {
      if (d.sick && d.treated) return colors.accent
      if (d.sick && !d.treated) return colors.advanced
      if (!d.sick && d.treated) return colors.advanced
      return colors.muted
    }

    // J6 / L5: respect prefers-reduced-motion. Without it, dot recolor eases
    // over a duration that depends on what changed:
    //   - 300ms when `treatment_strategy` changed (a discrete option pick —
    //     the user clicked a decision, wants snappy feedback)
    //   - 600ms when only scalar parameters changed (prior / sens / spec —
    //     usually a slider drag where the smoother ease reads as the curve
    //     "responding" to the drag)
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const strategyChanged = prevStrategyRef.current !== strategy
    prevStrategyRef.current = strategy
    const duration = strategyChanged ? 300 : 600

    const sel = g.selectAll<SVGCircleElement, number>('circle').data(d3.range(N))
    if (reducedMotion) {
      sel
        .attr('fill', i => colorFor(dots[i]))
        .attr('opacity', i => dots[i].sick ? 1 : 0.55)
    } else {
      sel.transition().duration(duration).ease(d3.easeCubicInOut)
        .attr('fill', i => colorFor(dots[i]))
        .attr('opacity', i => dots[i].sick ? 1 : 0.55)
    }
  }, [prior, sens, spec, strategy])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * empirical_histogram — counts a sample array bound from state.
 *
 * Reads `state[meta.from_key || "samples"]` as an array of numbers. Useful
 * for code blocks that produce data (`expected_output`) which the parser
 * stuffs into a state key, then a histogram visualizes it. Falls back to a
 * normal sample drawn from current `mu`/`sigma` so the plot has something to
 * show even before any data lands.
 */
const EmpiricalHistogram: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  // Convention: state.samples is an array; otherwise synthesize from mu/sigma.
  const samples = useMemoSamples(state)
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    if (!samples.length) return
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const ext = d3.extent(samples) as [number, number]
    const x = d3.scaleLinear().domain(ext).nice().range([0, w])
    const bins = d3.bin<number, number>().domain(x.domain() as [number, number]).thresholds(20)(samples)
    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, b => b.length) || 1])
      .range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.selectAll('rect').data(bins).enter().append('rect')
      .attr('x', d => x(d.x0!) + 1)
      .attr('y', d => y(d.length))
      .attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
      .attr('height', d => h - y(d.length))
      .attr('fill', colors.accent)
      .attr('opacity', 0.85)
  }, [samples, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * Pull a sample array out of state, or synthesize one from mu/sigma so the
 * plot is never empty. Stable across renders when the bound keys don't move.
 */
function useMemoSamples(state: Record<string, StateValue>): number[] {
  const raw = state.samples
  const mu = num(state, 'mu', 0)
  const sigma = num(state, 'sigma', 1)
  // Key the memo by content so a state mutation that doesn't touch samples
  // doesn't reshuffle the synth set.
  const key = Array.isArray(raw) ? raw.join(',') : `synth:${mu}:${sigma}`
  return useMemo(() => {
    if (Array.isArray(raw)) return raw.filter(n => typeof n === 'number') as number[]
    // Box–Muller — deterministic via simple LCG so re-renders don't reshuffle.
    const out: number[] = []
    let s = 1234567
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
    for (let i = 0; i < 200; i++) {
      const u = Math.max(1e-9, rand())
      const v = rand()
      out.push(mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/**
 * scatter_with_fit — points + fit line.
 *
 * Reads `state.points` as an array of `[x, y]` tuples (or `{x, y}` objects)
 * and renders a least-squares fit. Bound parameters (`slope`, `intercept`)
 * override the computed fit when present — useful for "drag the line to
 * match" interactions.
 */
const ScatterWithFit: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const slopeOverride = state.slope
  const interceptOverride = state.intercept
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const raw = Array.isArray(state.points) ? (state.points as unknown[]) : []
    const points: Array<[number, number]> = []
    for (const p of raw) {
      if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') points.push([p[0], p[1]])
      else if (p && typeof p === 'object' && 'x' in (p as any) && 'y' in (p as any)) {
        const o = p as { x: number; y: number }
        if (typeof o.x === 'number' && typeof o.y === 'number') points.push([o.x, o.y])
      }
    }
    if (!points.length) {
      // Synthesize a small noisy linear cloud so the plot is informative
      // before any author-supplied data lands.
      let s = 99
      const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
      for (let i = 0; i < 30; i++) {
        const x = -3 + 6 * rand()
        const y = 0.7 * x + 0.3 + (rand() - 0.5) * 1.5
        points.push([x, y])
      }
    }

    const xExt = d3.extent(points, d => d[0]) as [number, number]
    const yExt = d3.extent(points, d => d[1]) as [number, number]
    const x = d3.scaleLinear().domain(xExt).nice().range([0, w])
    const y = d3.scaleLinear().domain(yExt).nice().range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.selectAll('circle').data(points).enter().append('circle')
      .attr('cx', d => x(d[0]))
      .attr('cy', d => y(d[1]))
      .attr('r', 3)
      .attr('fill', colors.muted)
      .attr('opacity', 0.7)

    // Compute least-squares fit unless the author supplied params via state.
    let slope = 0, intercept = 0
    if (typeof slopeOverride === 'number' && typeof interceptOverride === 'number') {
      slope = slopeOverride
      intercept = interceptOverride
    } else {
      const n = points.length
      const sx = d3.sum(points, d => d[0])
      const sy = d3.sum(points, d => d[1])
      const sxy = d3.sum(points, d => d[0] * d[1])
      const sxx = d3.sum(points, d => d[0] * d[0])
      const denom = n * sxx - sx * sx
      slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom
      intercept = (sy - slope * sx) / n
    }

    const line = d3.line<number>()
      .x(d => x(d))
      .y(d => y(slope * d + intercept))
    const xs = [xExt[0], xExt[1]]
    g.append('path').datum(xs).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)
  }, [state.points, slopeOverride, interceptOverride, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * posterior_update — stacked bar of P(H), P(H|+), P(H|−) given a test.
 *
 * Binds `prior`, `sensitivity`, `specificity`, and optional `observed_result`
 * ("positive" or "negative"). When an observed_result is present, that bar
 * gets the accent emphasis — the visual answer to "what's my posterior?"
 */
const PosteriorUpdate: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const prior = num(state, 'prior', 0.01)
  const sens = num(state, 'sensitivity', 0.99)
  const spec = num(state, 'specificity', 0.99)
  const observed = str(state, 'observed_result', '')
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 32, left: 64 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    // Posterior given positive: P(H|+) = P(+|H)P(H) / P(+)
    const pPos = sens * prior + (1 - spec) * (1 - prior)
    const postPos = pPos > 0 ? (sens * prior) / pPos : 0
    const pNeg = (1 - sens) * prior + spec * (1 - prior)
    const postNeg = pNeg > 0 ? ((1 - sens) * prior) / pNeg : 0

    const data: Array<{ label: string; value: number; key: string }> = [
      { label: 'Prior P(H)', value: prior, key: 'prior' },
      { label: 'After +', value: postPos, key: 'positive' },
      { label: 'After −', value: postNeg, key: 'negative' },
    ]

    const x = d3.scaleBand<string>().domain(data.map(d => d.label)).range([0, w]).padding(0.3)
    const y = d3.scaleLinear().domain([0, 1]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted).style('font-size', '10px'))
    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.selectAll('rect').data(data).enter().append('rect')
      .attr('x', d => x(d.label) ?? 0)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => h - y(d.value))
      .attr('fill', d => observed === d.key ? colors.accent : colors.muted)
      .attr('opacity', d => observed === '' || observed === d.key ? 1 : 0.5)

    g.selectAll('.label').data(data).enter().append('text')
      .attr('x', d => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .style('font-size', '11px')
      .text(d => `${(d.value * 100).toFixed(1)}%`)
  }, [prior, sens, spec, observed, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * poisson_pmf — Q0. Bars of P(X=k) for a Poisson(λ). Binds `lambda`.
 * x-range grows with λ so the right tail stays visible: k = 0…max(10,
 * ⌈λ + 4√λ⌉). Visual vocabulary matches binomial_pmf (accent bars).
 */
const PoissonPmf: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const lambda = Math.max(0.1, num(state, 'lambda', 4))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const kMax = Math.max(10, Math.ceil(lambda + 4 * Math.sqrt(lambda)))
    const probs: number[] = []
    for (let k = 0; k <= kMax; k++) probs.push(poissonPmf(k, lambda))

    const x = d3.scaleBand<number>().domain(d3.range(kMax + 1)).range([0, w]).padding(0.1)
    const y = d3.scaleLinear().domain([0, Math.max(...probs) * 1.15 || 1]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % Math.max(1, Math.floor((kMax + 1) / 8)) === 0)))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.selectAll('rect').data(probs).enter().append('rect')
      .attr('x', (_, i) => x(i) ?? 0)
      .attr('y', d => y(d))
      .attr('width', x.bandwidth())
      .attr('height', d => h - y(d))
      .attr('fill', colors.accent)
      .attr('opacity', 0.85)
  }, [lambda, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * student_t_pdf — Q0. Student's t density over t ∈ [−5, 5]. Binds `df`.
 * Heavy tails at df=1 (Cauchy-ish), converging onto the standard normal as
 * df grows. A faint dashed N(0,1) reference shows the convergence.
 */
const StudentTPdf: Spec = ({ state, ghost, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const df = Math.max(1, num(state, 'df', 5))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const x = d3.scaleLinear().domain([-5, 5]).range([0, w])
    const y = d3.scaleLinear().domain([0, 0.45]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const samples = d3.range(-5, 5.05, 0.05)

    // Dashed N(0,1) reference — the limit the t-curve approaches as df → ∞.
    const refLine = d3.line<number>().x(d => x(d)).y(d => y(gaussianPdf(d, 0, 1))).curve(d3.curveMonotoneX)
    g.append('path').datum(samples).attr('d', refLine)
      .attr('fill', 'none').attr('stroke', colors.muted)
      .attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4').attr('opacity', 0.6)

    if (ghost) {
      const gDf = num(ghost, 'df', 5)
      const ghostLine = d3.line<number>().x(d => x(d)).y(d => y(studentTPdf(d, gDf))).curve(d3.curveMonotoneX)
      g.append('path').datum(samples).attr('d', ghostLine)
        .attr('fill', 'none').attr('stroke', colors.muted)
        .attr('stroke-width', 1.5).attr('stroke-dasharray', '2 3').attr('opacity', 0.5)
    }

    const line = d3.line<number>().x(d => x(d)).y(d => y(studentTPdf(d, df))).curve(d3.curveMonotoneX)
    g.append('path').datum(samples).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)
  }, [df, ghost, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * exponential_pdf — R0. Exponential density f(x)=λe^−λx over x ≥ 0. Binds
 * `rate` (λ). A dashed marker at the mean 1/λ anchors the headline fact that
 * the mean is the reciprocal of the rate.
 */
const ExponentialPdf: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const rate = Math.max(0.1, num(state, 'rate', 1))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const xMax = 8
    const x = d3.scaleLinear().domain([0, xMax]).range([0, w])
    const y = d3.scaleLinear().domain([0, Math.max(0.6, rate) * 1.1]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const samples = d3.range(0, xMax + 0.05, 0.05)
    const line = d3.line<number>().x(d => x(d)).y(d => y(exponentialPdf(d, rate))).curve(d3.curveMonotoneX)
    g.append('path').datum(samples).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)

    const mean = 1 / rate
    if (mean <= xMax) {
      g.append('line').attr('x1', x(mean)).attr('x2', x(mean)).attr('y1', 0).attr('y2', h)
        .attr('stroke', colors.advanced).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4').attr('opacity', 0.85)
      g.append('text').attr('x', x(mean) + 4).attr('y', 12).attr('fill', colors.advanced)
        .attr('font-size', 11).text(`mean 1/λ = ${mean.toFixed(2)}`)
    }
  }, [rate, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * chi_squared_pdf — R0. Chi-squared density with k degrees of freedom, binds
 * `df`. Strongly right-skewed at small k, approaching symmetry as k grows.
 * y-domain clamped because the density diverges at x→0 for k ≤ 2.
 */
const ChiSquaredPdf: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const k = Math.max(1, num(state, 'df', 3))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const xMax = Math.max(12, Math.ceil(k + 4 * Math.sqrt(2 * k)))
    const samples = d3.range(0.1, xMax + 0.1, xMax / 200)
    const probs = samples.map(s => chiSquaredPdf(s, k))
    const yMax = (Math.min(0.55, Math.max(...probs.filter(Number.isFinite))) || 0.5) * 1.15

    const x = d3.scaleLinear().domain([0, xMax]).range([0, w])
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const line = d3.line<number>().x(d => x(d)).y(d => y(Math.min(chiSquaredPdf(d, k), yMax))).curve(d3.curveMonotoneX)
    g.append('path').datum(samples).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)
  }, [k, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * f_pdf — R0. F density with (d1, d2) degrees of freedom, binds `df1`, `df2`.
 * Right-skewed; concentrates near 1 as both df grow. y clamped for d1 ≤ 2.
 */
const FPdf: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const d1 = Math.max(1, num(state, 'df1', 5))
  const d2 = Math.max(1, num(state, 'df2', 10))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const xMax = 5
    const samples = d3.range(0.02, xMax + 0.02, xMax / 200)
    const probs = samples.map(s => fPdf(s, d1, d2))
    const yMax = (Math.min(1.1, Math.max(...probs.filter(Number.isFinite))) || 1) * 1.15

    const x = d3.scaleLinear().domain([0, xMax]).range([0, w])
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const line = d3.line<number>().x(d => x(d)).y(d => y(Math.min(fPdf(d, d1, d2), yMax))).curve(d3.curveMonotoneX)
    g.append('path').datum(samples).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)
  }, [d1, d2, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * likelihood_curve — R2. The likelihood L(p) = p^k (1−p)^(n−k) of a binomial
 * parameter p given k successes in n trials, over p ∈ [0,1], display-normalized
 * to peak 1, with a marker at the MLE p̂ = k/n. With `loglik` set (> 0 in state)
 * it draws the log-likelihood instead — same peak, the sum-of-logs view.
 */
const LikelihoodCurve: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const n = Math.max(1, Math.round(num(state, 'trials', 10)))
  const kk = Math.min(Math.max(0, Math.round(num(state, 'successes', 7))), n)
  const logMode = num(state, 'loglik', 0) > 0.5
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 32, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const ps = d3.range(0.001, 1.0, 0.002)
    const phat = kk / n
    const safePhat = Math.min(0.999, Math.max(0.001, phat))
    let vals: number[]
    if (logMode) {
      const ll = (p: number) => kk * Math.log(p) + (n - kk) * Math.log(1 - p)
      const peak = ll(safePhat)
      const floor = Math.min(ll(0.02), ll(0.98))
      vals = ps.map(p => Math.max(0, (ll(p) - floor) / (peak - floor)))
    } else {
      const lik = (p: number) => Math.exp(kk * Math.log(p) + (n - kk) * Math.log(1 - p))
      const peak = lik(safePhat) || 1
      vals = ps.map(p => lik(p) / peak)
    }

    const x = d3.scaleLinear().domain([0, 1]).range([0, w])
    const y = d3.scaleLinear().domain([0, 1.08]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(3))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const data = ps.map((p, i) => [p, vals[i]] as [number, number])
    const line = d3.line<[number, number]>().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX)
    g.append('path').datum(data).attr('d', line)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)

    g.append('line').attr('x1', x(phat)).attr('x2', x(phat)).attr('y1', 0).attr('y2', h)
      .attr('stroke', colors.advanced).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4').attr('opacity', 0.85)
    g.append('text').attr('x', x(phat) + 4).attr('y', 12).attr('fill', colors.advanced)
      .attr('font-size', 11).text(`p̂ = ${phat.toFixed(2)}`)
    g.append('text').attr('x', w).attr('y', h + 28).attr('text-anchor', 'end')
      .attr('fill', colors.muted).attr('font-size', 10)
      .text(logMode ? 'log-likelihood (normalized)' : 'likelihood (normalized)')
  }, [kk, n, logMode, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * power_curves — R2. The two-world picture behind a one-sided z-test: the null
 * N(0,1) and the alternative N(d,1), where d = effect·√n. The critical value
 * z* = invNorm(1−α) splits them — the α tail of the null is the Type-I region,
 * the alternative beyond z* is power, the alternative below z* is Type II (β).
 */
const PowerCurves: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const effect = num(state, 'effect', 1.5)
  const alpha = Math.min(0.4, Math.max(0.001, num(state, 'alpha', 0.05)))
  const n = Math.max(1, num(state, 'n', 1))
  const d = effect * Math.sqrt(n)
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 12, bottom: 28, left: 12 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const lo = -4, hi = Math.max(6, d + 4)
    const x = d3.scaleLinear().domain([lo, hi]).range([0, w])
    const y = d3.scaleLinear().domain([0, 0.45]).range([h, 0])
    const zStar = invNorm(1 - alpha)

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const xs = d3.range(lo, hi + 0.02, 0.02)
    const nullPts = xs.map(t => [t, gaussianPdf(t, 0, 1)] as [number, number])
    const altPts = xs.map(t => [t, gaussianPdf(t, d, 1)] as [number, number])
    const area = d3.area<[number, number]>().x(p => x(p[0])).y0(h).y1(p => y(p[1]))

    g.append('path').datum(altPts.filter(p => p[0] >= zStar)).attr('d', area)
      .attr('fill', colors.accent).attr('opacity', 0.35)
    g.append('path').datum(nullPts.filter(p => p[0] >= zStar)).attr('d', area)
      .attr('fill', colors.advanced).attr('opacity', 0.5)

    const line = d3.line<[number, number]>().x(p => x(p[0])).y(p => y(p[1])).curve(d3.curveMonotoneX)
    g.append('path').datum(nullPts).attr('d', line).attr('fill', 'none').attr('stroke', colors.muted).attr('stroke-width', 2)
    g.append('path').datum(altPts).attr('d', line).attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)

    g.append('line').attr('x1', x(zStar)).attr('x2', x(zStar)).attr('y1', 0).attr('y2', h)
      .attr('stroke', colors.text).attr('stroke-width', 1).attr('stroke-dasharray', '3 3').attr('opacity', 0.7)
    const power = 1 - normCdf(zStar - d)
    g.append('text').attr('x', x(zStar) + 4).attr('y', 12).attr('fill', colors.text).attr('font-size', 11)
      .text(`z*=${zStar.toFixed(2)}  power=${power.toFixed(2)}`)
  }, [effect, alpha, n, d, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * beta_posterior — R2. Continuous Bayesian updating for a proportion: a Beta(a,b)
 * prior (dashed), the normalized binomial likelihood from k of n (dotted), and
 * the Beta(a+k, b+n−k) posterior (solid accent). Add data and the posterior
 * sharpens and slides toward k/n.
 */
const BetaPosterior: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const a = Math.max(0.5, num(state, 'prior_a', 2))
  const b = Math.max(0.5, num(state, 'prior_b', 2))
  const n = Math.max(0, Math.round(num(state, 'trials', 10)))
  const kk = Math.min(Math.max(0, Math.round(num(state, 'successes', 6))), n)
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 30, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const ps = d3.range(0.002, 1.0, 0.002)
    const prior = (p: number) => betaPdf(p, a, b)
    const post = (p: number) => betaPdf(p, a + kk, b + (n - kk))
    const like = (p: number) => betaPdf(p, kk + 1, (n - kk) + 1)
    const peak = Math.max(...ps.flatMap(p => [prior(p), post(p), like(p)]).filter(Number.isFinite))
    const yMax = Math.min(peak, 14) * 1.1 || 3

    const x = d3.scaleLinear().domain([0, 1]).range([0, w])
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(3))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const draw = (f: (p: number) => number, color: string, dash: string, wgt: number) => {
      const ln = d3.line<number>().x(p => x(p)).y(p => y(Math.min(f(p), yMax))).curve(d3.curveMonotoneX)
      g.append('path').datum(ps).attr('d', ln).attr('fill', 'none')
        .attr('stroke', color).attr('stroke-width', wgt).attr('stroke-dasharray', dash)
    }
    draw(prior, colors.muted, '5 4', 1.5)
    draw(like, colors.advanced, '2 3', 1.5)
    draw(post, colors.accent, '', 2.5)

    const legend = [['prior', colors.muted], ['likelihood', colors.advanced], ['posterior', colors.accent]] as const
    legend.forEach(([label, color], i) => {
      g.append('text').attr('x', 4).attr('y', 12 + i * 13).attr('fill', color).attr('font-size', 10).text(label)
    })
  }, [a, b, kk, n, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * added_variable_plot — R4. The "holding others constant" picture for multiple
 * regression. A confounder x₂ drives both x₁ and y. With `controlled` = 0 it
 * scatters y vs x₁ and shows the misleading *marginal* slope; with `controlled`
 * = 1 it shows the added-variable plot — y and x₁ each residualized on x₂ —
 * whose slope is the true *partial* coefficient. Here the two flip sign.
 */
const AddedVariablePlot: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const controlled = num(state, 'controlled', 0) > 0.5
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 32, left: 40 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    let s = 1234
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
    const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand())
    const x1: number[] = [], x2: number[] = [], yv: number[] = []
    for (let i = 0; i < 90; i++) {
      const a2 = -2 + 4 * rand()
      const a1 = a2 + 0.7 * gauss()
      x2.push(a2); x1.push(a1); yv.push(-1 * a1 + 3 * a2 + 0.6 * gauss())
    }

    const fit = (u: number[], v: number[]): [number, number] => {
      const n = u.length, su = d3.sum(u), sv = d3.sum(v)
      const suv = d3.sum(u.map((ui, i) => ui * v[i])), suu = d3.sum(u.map(ui => ui * ui))
      const den = n * suu - su * su
      const sl = den === 0 ? 0 : (n * suv - su * sv) / den
      return [sl, (sv - sl * su) / n]
    }
    const resid = (u: number[], v: number[]): number[] => {
      const [sl, ic] = fit(u, v)
      return v.map((vi, i) => vi - (sl * u[i] + ic))
    }

    let px: number[], py: number[], label: string
    if (controlled) {
      px = resid(x2, x1); py = resid(x2, yv); label = 'partial: y, x₁ residualized on x₂'
    } else {
      px = x1.slice(); py = yv.slice(); label = 'marginal: y vs x₁ (ignoring x₂)'
    }
    const pts = px.map((u, i) => [u, py[i]] as [number, number])
    const [slope, intercept] = fit(px, py)

    const xExt = d3.extent(pts, d => d[0]) as [number, number]
    const yExt = d3.extent(pts, d => d[1]) as [number, number]
    const x = d3.scaleLinear().domain(xExt).nice().range([0, w])
    const y = d3.scaleLinear().domain(yExt).nice().range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.selectAll('circle').data(pts).enter().append('circle')
      .attr('cx', d => x(d[0])).attr('cy', d => y(d[1])).attr('r', 3)
      .attr('fill', colors.muted).attr('opacity', 0.6)

    const ln = d3.line<number>().x(d => x(d)).y(d => y(slope * d + intercept))
    g.append('path').datum(xExt).attr('d', ln)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)

    g.append('text').attr('x', 2).attr('y', 11).attr('fill', colors.text).attr('font-size', 11)
      .text(`slope = ${slope.toFixed(2)}`)
    g.append('text').attr('x', w).attr('y', h + 30).attr('text-anchor', 'end')
      .attr('fill', colors.muted).attr('font-size', 10).text(label)
  }, [controlled, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * residual_plot — R4. Residuals vs fitted values with a y=0 reference. The
 * `pattern` toggle synthesizes the three diagnostic situations: `random` (a
 * structureless band — assumptions OK), `funnel` (widening spread —
 * heteroscedasticity), `curve` (a U-shape — a missed nonlinearity).
 */
const ResidualPlot: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const pattern = str(state, 'pattern', 'random')
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 40 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    let s = 4321
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
    const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand())
    const pts: [number, number][] = []
    for (let i = 0; i < 100; i++) {
      const xf = 0.5 + 9.5 * rand()
      let r: number
      if (pattern === 'funnel') r = gauss() * (0.25 + 0.32 * xf)
      else if (pattern === 'curve') r = 0.18 * (xf - 5) * (xf - 5) - 1.5 + 0.5 * gauss()
      else r = gauss()
      pts.push([xf, r])
    }

    const x = d3.scaleLinear().domain([0, 10]).range([0, w])
    const yAbs = Math.max(3, d3.max(pts, p => Math.abs(p[1])) ?? 3)
    const y = d3.scaleLinear().domain([-yAbs, yAbs]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(5))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', colors.advanced).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4').attr('opacity', 0.8)

    g.selectAll('circle').data(pts).enter().append('circle')
      .attr('cx', d => x(d[0])).attr('cy', d => y(d[1])).attr('r', 3)
      .attr('fill', colors.accent).attr('opacity', 0.6)
  }, [pattern, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * logistic_curve — R4. The logistic-regression S-curve σ(β₀ + β₁x) over binary
 * 0/1 data. Binds `beta0`, `beta1`; a playground drags them to fit the cloud.
 * A dashed marker shows the decision boundary where p = 0.5 (x = −β₀/β₁).
 */
const LogisticCurve: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const beta0 = num(state, 'beta0', 0)
  const beta1 = num(state, 'beta1', 1)
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    let s = 777
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
    const pts: [number, number][] = []
    for (let i = 0; i < 60; i++) {
      const xi = -6 + 12 * rand()
      const pTrue = 1 / (1 + Math.exp(-(-0.5 + 1.3 * xi)))
      pts.push([xi, rand() < pTrue ? 1 : 0])
    }

    const x = d3.scaleLinear().domain([-6, 6]).range([0, w])
    const y = d3.scaleLinear().domain([-0.1, 1.1]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).tickValues([0, 0.5, 1]))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', y(0.5)).attr('y2', y(0.5))
      .attr('stroke', colors.muted).attr('stroke-dasharray', '2 3').attr('opacity', 0.5)

    g.selectAll('circle').data(pts).enter().append('circle')
      .attr('cx', d => x(d[0])).attr('cy', d => y(d[1])).attr('r', 3)
      .attr('fill', colors.muted).attr('opacity', 0.5)

    const sig = (xi: number) => 1 / (1 + Math.exp(-(beta0 + beta1 * xi)))
    const samples = d3.range(-6, 6.05, 0.05)
    const ln = d3.line<number>().x(d => x(d)).y(d => y(sig(d))).curve(d3.curveMonotoneX)
    g.append('path').datum(samples).attr('d', ln)
      .attr('fill', 'none').attr('stroke', colors.accent).attr('stroke-width', 2)

    if (Math.abs(beta1) > 1e-3) {
      const xb = -beta0 / beta1
      if (xb >= -6 && xb <= 6) {
        g.append('line').attr('x1', x(xb)).attr('x2', x(xb)).attr('y1', 0).attr('y2', h)
          .attr('stroke', colors.advanced).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4').attr('opacity', 0.8)
      }
    }
  }, [beta0, beta1, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * coefficient_path — R4. How regularization shrinks coefficients as the penalty
 * λ grows. Binds `lambda` (a moving vertical marker) and `penalty`
 * (`ridge` | `lasso`). Ridge decays each coefficient smoothly toward 0; lasso
 * drives them to *exactly* 0 one at a time — the sparsity that does feature
 * selection. Stylized paths (soft-threshold vs 1/(1+λ)) for the teaching point.
 */
const CoefficientPath: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const lambda = Math.max(0, num(state, 'lambda', 0))
  const penalty = str(state, 'penalty', 'lasso')
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 40 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const betas = [2.0, -1.2, 0.6, 0.15]
    const lamMax = 2.5
    const shrink = (b: number, l: number) =>
      penalty === 'ridge' ? b / (1 + l) : Math.sign(b) * Math.max(0, Math.abs(b) - l)

    const x = d3.scaleLinear().domain([0, lamMax]).range([0, w])
    const y = d3.scaleLinear().domain([-1.6, 2.2]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(5))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(5))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', colors.muted).attr('opacity', 0.4)

    const palette = [colors.accent, colors.advanced, colors.text, colors.muted]
    const ls = d3.range(0, lamMax + 0.02, 0.02)
    betas.forEach((b, bi) => {
      const path = ls.map(l => [l, shrink(b, l)] as [number, number])
      const ln = d3.line<[number, number]>().x(d => x(d[0])).y(d => y(d[1]))
      g.append('path').datum(path).attr('d', ln)
        .attr('fill', 'none').attr('stroke', palette[bi]).attr('stroke-width', 2).attr('opacity', 0.9)
    })

    g.append('line').attr('x1', x(lambda)).attr('x2', x(lambda)).attr('y1', 0).attr('y2', h)
      .attr('stroke', colors.text).attr('stroke-width', 1).attr('stroke-dasharray', '3 3').attr('opacity', 0.6)

    const nz = betas.map(b => shrink(b, lambda)).filter(c => Math.abs(c) > 1e-9).length
    g.append('text').attr('x', w).attr('y', 12).attr('text-anchor', 'end')
      .attr('fill', colors.text).attr('font-size', 11)
      .text(`${penalty}  λ=${lambda.toFixed(2)}  nonzero: ${nz}/4`)
  }, [lambda, penalty, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * proportion_test — R6. The A/B-test picture: two conversion-rate bars (control
 * A, variant B) with 95% error bars, plus a verdict from the two-proportion
 * z-test. Binds `p_a`, `p_b`, `n_a`, `n_b`. Significant when |z| > 1.96.
 */
const ProportionTest: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const pA = Math.min(1, Math.max(0, num(state, 'p_a', 0.10)))
  const pB = Math.min(1, Math.max(0, num(state, 'p_b', 0.12)))
  const nA = Math.max(1, num(state, 'n_a', 1000))
  const nB = Math.max(1, num(state, 'n_b', 1000))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 30, right: 16, bottom: 28, left: 44 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const seA = Math.sqrt(pA * (1 - pA) / nA)
    const seB = Math.sqrt(pB * (1 - pB) / nB)
    const seDiff = Math.sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB)
    const z = seDiff > 0 ? (pB - pA) / seDiff : 0
    const sig = Math.abs(z) > 1.96

    const data = [{ k: 'A (control)', p: pA, se: seA }, { k: 'B (variant)', p: pB, se: seB }]
    const x = d3.scaleBand<string>().domain(data.map(d => d.k)).range([0, w]).padding(0.4)
    const yMax = Math.max(pA + 2 * seA, pB + 2 * seB, 0.05) * 1.2
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4, '%'))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    g.selectAll('rect').data(data).enter().append('rect')
      .attr('x', d => x(d.k)!).attr('y', d => y(d.p)).attr('width', x.bandwidth())
      .attr('height', d => h - y(d.p))
      .attr('fill', (_, i) => i === 0 ? colors.muted : colors.accent).attr('opacity', 0.8)

    data.forEach(d => {
      const cx = x(d.k)! + x.bandwidth() / 2
      const hi = Math.min(yMax, d.p + 1.96 * d.se), lo = Math.max(0, d.p - 1.96 * d.se)
      g.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(hi)).attr('y2', y(lo))
        .attr('stroke', colors.text).attr('stroke-width', 1.5)
      ;[hi, lo].forEach(v => g.append('line').attr('x1', cx - 5).attr('x2', cx + 5)
        .attr('y1', y(v)).attr('y2', y(v)).attr('stroke', colors.text).attr('stroke-width', 1.5))
    })

    const lift = ((pB - pA) * 100).toFixed(1)
    g.append('text').attr('x', 0).attr('y', -14).attr('fill', sig ? colors.accent : colors.muted).attr('font-size', 11)
      .text(`lift ${pB >= pA ? '+' : ''}${lift} pts   z = ${z.toFixed(2)}   ${sig ? 'significant (p<0.05)' : 'not significant'}`)
  }, [pA, pB, nA, nB, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * cv_error_curve — R6. Training error (falls forever) vs validation error
 * (U-shaped) against model complexity. Binds `complexity` (a moving marker).
 * The validation minimum is the sweet spot cross-validation hunts for.
 */
const CvErrorCurve: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const complexity = Math.max(1, num(state, 'complexity', 1))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 18, right: 16, bottom: 30, left: 40 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const cMax = 15
    const train = (c: number) => 1.8 / (c + 1) + 0.1
    const val = (c: number) => 1.8 / (c + 1) + 0.02 * Math.pow(c, 1.6) + 0.12
    const cs = d3.range(1, cMax + 0.1, 0.1)
    const x = d3.scaleLinear().domain([1, cMax]).range([0, w])
    const yMax = Math.max(val(1), val(cMax), train(1)) * 1.1
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(7))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const mkLine = (f: (c: number) => number, color: string, dash: string) => {
      const ln = d3.line<number>().x(c => x(c)).y(c => y(f(c))).curve(d3.curveMonotoneX)
      g.append('path').datum(cs).attr('d', ln).attr('fill', 'none')
        .attr('stroke', color).attr('stroke-width', 2).attr('stroke-dasharray', dash)
    }
    mkLine(train, colors.muted, '5 4')
    mkLine(val, colors.accent, '')

    let cMin = 1, vMin = Infinity
    cs.forEach(c => { const v = val(c); if (v < vMin) { vMin = v; cMin = c } })
    g.append('circle').attr('cx', x(cMin)).attr('cy', y(vMin)).attr('r', 4).attr('fill', colors.accent)

    g.append('line').attr('x1', x(complexity)).attr('x2', x(complexity)).attr('y1', 0).attr('y2', h)
      .attr('stroke', colors.text).attr('stroke-width', 1).attr('stroke-dasharray', '3 3').attr('opacity', 0.6)
    g.append('text').attr('x', 2).attr('y', 12).attr('fill', colors.muted).attr('font-size', 10).text('— train   — validation')
  }, [complexity, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * bias_variance_curve — R6. The decomposition: bias² falls and variance rises
 * with model complexity, and their sum plus irreducible noise is the U-shaped
 * total error. Binds `complexity` (a moving marker).
 */
const BiasVarianceCurve: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const complexity = Math.max(1, num(state, 'complexity', 1))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 18, right: 16, bottom: 30, left: 40 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const cMax = 15
    const bias2 = (c: number) => 2.0 / (c + 0.3)
    const variance = (c: number) => 0.025 * Math.pow(c, 1.6)
    const irred = 0.3
    const total = (c: number) => bias2(c) + variance(c) + irred
    const cs = d3.range(1, cMax + 0.1, 0.1)
    const x = d3.scaleLinear().domain([1, cMax]).range([0, w])
    const yMax = Math.max(total(1), total(cMax)) * 1.1
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0])

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(7))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))
    g.append('g').call(d3.axisLeft(y).ticks(4))
      .call(sel => sel.selectAll('line, path').attr('stroke', colors.muted))
      .call(sel => sel.selectAll('text').attr('fill', colors.muted))

    const mkLine = (f: (c: number) => number, color: string, dash: string, wgt: number) => {
      const ln = d3.line<number>().x(c => x(c)).y(c => y(f(c))).curve(d3.curveMonotoneX)
      g.append('path').datum(cs).attr('d', ln).attr('fill', 'none')
        .attr('stroke', color).attr('stroke-width', wgt).attr('stroke-dasharray', dash)
    }
    mkLine(() => irred, colors.muted, '2 3', 1)
    mkLine(bias2, colors.advanced, '5 4', 1.5)
    mkLine(variance, colors.muted, '5 4', 1.5)
    mkLine(total, colors.accent, '', 2.5)

    let cMin = 1, vMin = Infinity
    cs.forEach(c => { const v = total(c); if (v < vMin) { vMin = v; cMin = c } })
    g.append('circle').attr('cx', x(cMin)).attr('cy', y(vMin)).attr('r', 4).attr('fill', colors.accent)
    g.append('line').attr('x1', x(complexity)).attr('x2', x(complexity)).attr('y1', 0).attr('y2', h)
      .attr('stroke', colors.text).attr('stroke-width', 1).attr('stroke-dasharray', '3 3').attr('opacity', 0.6)
    g.append('text').attr('x', 2).attr('y', 12).attr('fill', colors.muted).attr('font-size', 10).text('bias²↓   variance↑   — total')
  }, [complexity, width, height])

  return <svg ref={ref} width={width} height={height} />
}

/**
 * missingness_grid — R6. A data matrix as a grid of cells; the `mechanism`
 * (`mcar` | `mar` | `mnar`) controls *which* cells go missing and `missing_frac`
 * how many. MCAR scatters at random; MAR concentrates by row (an observed
 * covariate); MNAR concentrates by column here, standing in for "the value
 * itself drives its own absence." Missing cells are dashed outlines.
 */
const MissingnessGrid: Spec = ({ state, width = 420, height = 280 }) => {
  const ref = useRef<SVGSVGElement | null>(null)
  const mechanism = str(state, 'mechanism', 'mcar')
  const frac = Math.min(0.8, Math.max(0, num(state, 'missing_frac', 0.25)))
  useColors()

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 26, right: 8, bottom: 8, left: 8 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const rows = 10, cols = 12
    let s = 2025
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
    const cells: { r: number; c: number; missing: boolean }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let prob: number
        if (mechanism === 'mar') prob = frac * (0.25 + 1.5 * (r / (rows - 1)))       // rises down the rows
        else if (mechanism === 'mnar') prob = frac * (0.25 + 1.5 * (c / (cols - 1))) // rises across the columns
        else prob = frac                                                              // mcar: uniform
        cells.push({ r, c, missing: rand() < prob })
      }
    }

    const cw = w / cols, ch = h / rows
    g.selectAll('rect').data(cells).enter().append('rect')
      .attr('x', d => d.c * cw + 1).attr('y', d => d.r * ch + 1)
      .attr('width', cw - 2).attr('height', ch - 2)
      .attr('fill', d => d.missing ? 'none' : colors.accent)
      .attr('stroke', d => d.missing ? colors.advanced : 'none')
      .attr('stroke-dasharray', d => d.missing ? '2 2' : '')
      .attr('opacity', d => d.missing ? 0.9 : 0.5)

    const pct = Math.round(100 * cells.filter(c => c.missing).length / cells.length)
    const note = mechanism === 'mar' ? 'MAR — missingness tracks the row (an observed covariate)'
      : mechanism === 'mnar' ? 'MNAR — missingness tracks the value itself'
      : 'MCAR — missing completely at random'
    g.append('text').attr('x', 0).attr('y', -10).attr('fill', colors.muted).attr('font-size', 10)
      .text(`${note}  ·  ${pct}% missing`)
  }, [mechanism, frac, width, height])

  return <svg ref={ref} width={width} height={height} />
}

// ─── Registry ──────────────────────────────────────────────────────────────

export const PLOT_SPECS: Record<string, Spec> = {
  gaussian_pdf: GaussianPdf,
  gaussian_cdf: GaussianCdf,
  binomial_pmf: BinomialPmf,
  poisson_pmf: PoissonPmf,
  student_t_pdf: StudentTPdf,
  exponential_pdf: ExponentialPdf,
  chi_squared_pdf: ChiSquaredPdf,
  f_pdf: FPdf,
  likelihood_curve: LikelihoodCurve,
  power_curves: PowerCurves,
  beta_posterior: BetaPosterior,
  added_variable_plot: AddedVariablePlot,
  residual_plot: ResidualPlot,
  logistic_curve: LogisticCurve,
  coefficient_path: CoefficientPath,
  proportion_test: ProportionTest,
  cv_error_curve: CvErrorCurve,
  bias_variance_curve: BiasVarianceCurve,
  missingness_grid: MissingnessGrid,
  empirical_histogram: EmpiricalHistogram,
  scatter_with_fit: ScatterWithFit,
  posterior_update: PosteriorUpdate,
  population_dot_grid: PopulationDotGrid,
}

export function getPlotSpec(name: string | undefined): Spec | null {
  if (!name) return null
  return PLOT_SPECS[name] ?? null
}
