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

  return <Spec state={view} ghost={ghost} width={width} height={height} />
}
