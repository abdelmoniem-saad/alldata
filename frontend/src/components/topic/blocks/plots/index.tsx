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
  useColors() // J5: subscribe to theme flips (cache invalidation re-renders).

  useEffect(() => {
    const svg = d3.select(ref.current!)
    svg.selectAll('*').remove()
    const m = { top: 16, right: 16, bottom: 28, left: 36 }
    const w = width - m.left - m.right
    const h = height - m.top - m.bottom
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
    const colors = readColors()

    const x = d3.scaleLinear().domain([-5, 5]).range([0, w])
    const y = d3.scaleLinear().domain([0, 0.6]).range([h, 0])

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
      .y(d => y(gaussianPdf(d, mu, sigma)))
      .curve(d3.curveMonotoneX)

    if (ghost) {
      const gMu = num(ghost, 'mu', 0)
      const gSigma = num(ghost, 'sigma', 1)
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
  }, [mu, sigma, ghost, width, height])

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

    // J6: respect prefers-reduced-motion. Without it, dot recolor eases over
    // ~600ms so the consequence of a decision lands as a visible pulse rather
    // than an instant snap.
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sel = g.selectAll<SVGCircleElement, number>('circle').data(d3.range(N))
    if (reducedMotion) {
      sel
        .attr('fill', i => colorFor(dots[i]))
        .attr('opacity', i => dots[i].sick ? 1 : 0.55)
    } else {
      sel.transition().duration(600).ease(d3.easeCubicInOut)
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

// ─── Registry ──────────────────────────────────────────────────────────────

export const PLOT_SPECS: Record<string, Spec> = {
  gaussian_pdf: GaussianPdf,
  gaussian_cdf: GaussianCdf,
  binomial_pmf: BinomialPmf,
  empirical_histogram: EmpiricalHistogram,
  scatter_with_fit: ScatterWithFit,
  posterior_update: PosteriorUpdate,
  population_dot_grid: PopulationDotGrid,
}

export function getPlotSpec(name: string | undefined): Spec | null {
  if (!name) return null
  return PLOT_SPECS[name] ?? null
}
