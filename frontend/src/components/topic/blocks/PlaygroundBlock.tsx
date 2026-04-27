/**
 * PlaygroundBlock — I5b
 *
 * Controls + goal status. No plot. The pinned plot in the right column reads
 * the same `useTopicState` keys this block writes — moving a slider here
 * recolors the curve there. That's the architectural payoff: the playground
 * owns *intent* (controls, target, success predicate); the plot owns visuals.
 *
 * `meta` shape:
 *   {
 *     binds: ["mu","sigma"],
 *     controls: [
 *       { param: "mu",    label: "Mean",     min: -3, max: 3, step: 0.1 },
 *       { param: "sigma", label: "Std dev",  min: 0.2, max: 3, step: 0.1 },
 *     ],
 *     goal: {
 *       prompt: "Match the dashed target curve.",
 *       target: { mu: 1.5, sigma: 0.8 },
 *       success_when: "abs(mu - 1.5) < 0.1 and abs(sigma - 0.8) < 0.1",
 *       on_success: "That's it. ...",
 *       hints: [{ after_seconds: 30, text: "..." }, ...]
 *     }
 *   }
 *
 * Goal is optional. Without it, the component is exploratory — sliders only.
 *
 * Hint timer starts on mount (or first interaction) and surfaces hint lines
 * one at a time at their `after_seconds` thresholds — quiet text, no modals.
 *
 * The plot's ghost overlay (dashed target) is wired by ScrollReader: when
 * this playground is the active anchor, ScrollReader passes `goal.target`
 * down to the pinned PlotBlock as `ghostOverride`.
 */
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useTopicStateStore, StateValue } from '../../../stores/topicState'
import { safeBool } from '../../../lib/safeExpr'

interface ControlSpec {
  param: string
  label?: string
  min: number
  max: number
  step?: number
}

interface HintSpec {
  after_seconds: number
  text: string
}

interface GoalSpec {
  prompt?: string
  target?: Record<string, StateValue>
  success_when?: string
  on_success?: string
  hints?: HintSpec[]
}

interface PlaygroundMeta {
  binds?: string[]
  controls?: ControlSpec[]
  goal?: GoalSpec
}

interface Props {
  slug: string
  anchor: string | null
  meta: PlaygroundMeta
}

export default function PlaygroundBlock({ slug, anchor, meta }: Props) {
  const controls = meta.controls ?? []
  const goal = meta.goal

  const state = useTopicStateStore(s => s.byTopic[slug]?.state ?? {})
  const defaults = useTopicStateStore(s => s.byTopic[slug]?.defaults ?? {})
  const patchState = useTopicStateStore(s => s.patchState)
  const markSuccess = useTopicStateStore(s => s.markSuccess)
  const clearSuccess = useTopicStateStore(s => s.clearSuccess)
  const succeeded = useTopicStateStore(
    s => (anchor ? Boolean(s.byTopic[slug]?.successes?.[anchor]) : false),
  )

  // Hint timer — counts seconds since mount; releases hint text as thresholds pass.
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Continuous match meter — 1 when success_when is true; otherwise a fraction
  // based on distance from target params (max 1 unit each, summed). Cosmetic;
  // the hard gate is `success_when`.
  const matchScore = useMemo(() => {
    if (!goal) return 0
    if (goal.success_when && safeBool(goal.success_when, state)) return 1
    if (!goal.target) return 0
    let dist = 0
    let n = 0
    for (const [k, v] of Object.entries(goal.target)) {
      if (typeof v !== 'number') continue
      const cur = typeof state[k] === 'number' ? (state[k] as number) : 0
      dist += Math.min(1, Math.abs(cur - v))
      n++
    }
    return n === 0 ? 0 : Math.max(0, 1 - dist / n)
  }, [state, goal])

  // Persist success once when the predicate first fires.
  useEffect(() => {
    if (!goal?.success_when || !anchor) return
    if (matchScore >= 1) markSuccess(slug, anchor)
  }, [matchScore, goal?.success_when, anchor, slug, markSuccess])

  const reset = () => {
    if (!meta.binds) return
    const patch: Record<string, StateValue> = {}
    for (const k of meta.binds) {
      if (k in defaults) patch[k] = defaults[k]
    }
    patchState(slug, patch)
  }

  const skip = () => {
    if (!goal?.target) return
    patchState(slug, goal.target)
    if (anchor) markSuccess(slug, anchor)
  }

  // J4: re-arm the meter without resetting bound state. The reader keeps
  // their current slider positions but the success affordance + hint timer
  // start fresh. "Reset" still snaps to defaults.
  const tryAgain = () => {
    if (!anchor) return
    clearSuccess(slug, anchor)
    setElapsed(0)
  }

  const visibleHints = (goal?.hints ?? []).filter(h => elapsed >= h.after_seconds && !succeeded)

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}
      >
        Playground
      </div>

      {goal?.prompt && (
        <div className="prose" style={{ marginBottom: 16, fontSize: 14 }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {goal.prompt}
          </ReactMarkdown>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {controls.map(c => {
          const cur = typeof state[c.param] === 'number' ? (state[c.param] as number) : 0
          return (
            <div key={c.param}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>{c.label ?? c.param}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
                  {cur.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={c.min}
                max={c.max}
                step={c.step ?? 0.1}
                value={cur}
                onChange={e => patchState(slug, { [c.param]: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
            </div>
          )
        })}
      </div>

      {goal && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: 'var(--color-border-subtle)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(matchScore * 100)}%`,
                height: '100%',
                background: 'var(--color-accent)',
                transition: 'width var(--transition-smooth)',
              }}
            />
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: succeeded ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            {succeeded ? 'Match' : 'Match meter'}
          </div>
        </div>
      )}

      {visibleHints.length > 0 && !succeeded && (
        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            lineHeight: 1.7,
          }}
        >
          {visibleHints.map((h, i) => <div key={i}>{h.text}</div>)}
        </div>
      )}

      {succeeded && goal?.on_success && (
        <div
          className="animate-fade-in prose"
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 'var(--radius)',
            background: 'var(--color-bg)',
            borderLeft: '3px solid var(--color-accent)',
            fontSize: 14,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {goal.on_success}
          </ReactMarkdown>
          {/* J4: re-arm the goal without resetting bound state. */}
          <button
            onClick={tryAgain}
            style={{
              marginTop: 12,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              padding: 0,
            }}
          >
            Try again
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {meta.binds && meta.binds.length > 0 && (
          <button
            onClick={reset}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Reset
          </button>
        )}
        {goal?.target && !succeeded && (
          <button
            onClick={skip}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
