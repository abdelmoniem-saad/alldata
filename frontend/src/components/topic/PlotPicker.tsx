/**
 * PlotPicker — W2.
 *
 * The marquee of the fork authoring studio: a modal that surfaces the whole
 * plot library so an author *sees what's available and chooses*, rather than
 * memorizing spec names. Picking a plot inserts a canonical `state` + `plot`
 * directive pair (via `plotScaffold`) at the editor cursor — so it renders in
 * the live preview immediately and reacts to its bound state.
 *
 * Rendered through a portal to `document.body` (like the auth modal, V0) so the
 * fork editor's transformed ancestors don't clip or offset it.
 */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  PlotSpecMeta,
  plotSpecGroups,
  plotScaffold,
  graphViewScaffold,
} from '../../lib/plotSpecs'

interface Props {
  onPick: (snippet: string) => void
  onClose: () => void
}

/** A readable, collision-resistant anchor for an inserted block. */
function genAnchor(base: string): string {
  const slug = base.replace(/_/g, '-')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${slug}-${rand}`
}

export default function PlotPicker({ onPick, onClose }: Props) {
  // Escape closes; mirrors the reader's modal affordances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pick = (meta: PlotSpecMeta) => {
    onPick(plotScaffold(meta, genAnchor(meta.name)))
    onClose()
  }

  const pickGraphView = () => {
    onPick(graphViewScaffold('all', genAnchor('tour')))
    onClose()
  }

  return createPortal(
    <div className="plot-picker__overlay" onClick={onClose}>
      <div
        className="plot-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Insert a visualization"
        onClick={e => e.stopPropagation()}
      >
        <div className="plot-picker__head">
          <h2 className="plot-picker__title">Insert a visualization</h2>
          <button type="button" className="plot-picker__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="plot-picker__hint">
          Choose a plot — it drops in a <code>state</code> + <code>plot</code> pair you can edit,
          and renders live in the preview.
        </p>

        <div className="plot-picker__body">
          {plotSpecGroups().map(({ group, specs }) => (
            <section key={group} className="plot-picker__group">
              <h3 className="plot-picker__group-title">{group}</h3>
              <div className="plot-picker__grid">
                {specs.map(spec => (
                  <button
                    key={spec.name}
                    type="button"
                    className="plot-picker__item"
                    onClick={() => pick(spec)}
                    title={`Inserts a ${spec.name} plot bound to ${spec.binds.join(', ')}`}
                  >
                    <span className="plot-picker__item-label">{spec.label}</span>
                    <span className="plot-picker__item-meta">
                      <code>{spec.name}</code> · binds {spec.binds.join(', ')}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          <section className="plot-picker__group">
            <h3 className="plot-picker__group-title">Knowledge graph</h3>
            <div className="plot-picker__grid">
              <button
                type="button"
                className="plot-picker__item"
                onClick={pickGraphView}
                title="Inserts a graph_view tour step — edit the target to a domain or topic slug"
              >
                <span className="plot-picker__item-label">Immersive graph view (tour step)</span>
                <span className="plot-picker__item-meta">
                  <code>graph_view</code> · edit <code>target</code> to a domain or topic
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
