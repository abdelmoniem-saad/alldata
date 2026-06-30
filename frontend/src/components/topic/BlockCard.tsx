/**
 * BlockCard, X1 (+ #2 layer selector). One directive segment as a friendly card.
 *
 * Shows a type tag + plain-language summary (never the raw `<!-- block -->`),
 * with reorder / delete / edit controls and a per-block layer selector
 * (Both / Intuition / Formal). "Edit" expands the per-directive form (or the
 * raw escape hatch) from `blockForms`. The contributor sees what the block
 * *is*, not how it's spelled.
 */
import { useState } from 'react'
import { DirectiveSegment, setLayerAttr } from '../../lib/contentDoc'
import { directiveTag, directiveSummary } from '../../lib/directiveMeta'
import { renderBlockEditor } from './blockForms'

interface Props {
  segment: DirectiveSegment
  isFirst: boolean
  isLast: boolean
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  /** In-place raw set (form field edits; no reparse, keeps focus). */
  onChangeRaw: (raw: string) => void
  /** Set raw AND re-tokenize atomically (layer change, raw-hatch apply). */
  onReplaceRaw: (raw: string) => void
  onCommit: () => void
  onOpenPlotPicker?: () => void
}

function attrStr(seg: DirectiveSegment, key: string): string {
  const v = seg.attrs[key]
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

export default function BlockCard({
  segment, isFirst, isLast, onMove, onRemove, onChangeRaw, onReplaceRaw, onCommit, onOpenPlotPicker,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const summary = directiveSummary(segment)
  // #2: the layer selector applies to every real directive — but not to the
  // `<!-- layer: … -->` marker itself (that's the section-level control).
  const showLayer = segment.type !== 'layer'
  const layer = attrStr(segment, 'layer') || 'both'

  return (
    <div className="block-card" data-type={segment.type} data-layer={layer}>
      <div className="block-card__head">
        <span className="block-card__tag">{directiveTag(segment.type)}</span>
        {summary && <span className="block-card__summary">{summary}</span>}
        <span className="block-card__spacer" />
        <div className="block-card__actions">
          {showLayer && (
            <select
              className="block-card__layer"
              value={layer}
              onChange={e => onReplaceRaw(setLayerAttr(segment.raw, e.target.value))}
              title="Which reading layer this block belongs to"
              aria-label="Block layer"
            >
              <option value="both">Both</option>
              <option value="intuition">Intuition</option>
              <option value="formal">Formal</option>
            </select>
          )}
          <button
            type="button" className="block-card__btn"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            title={expanded ? 'Close editor' : 'Edit this block'}
          >
            {expanded ? 'Done' : 'Edit'}
          </button>
          <button
            type="button" className="block-card__btn" onClick={() => onMove(-1)}
            disabled={isFirst} aria-label="Move block up" title="Move up"
          >↑</button>
          <button
            type="button" className="block-card__btn" onClick={() => onMove(1)}
            disabled={isLast} aria-label="Move block down" title="Move down"
          >↓</button>
          <button
            type="button" className="block-card__btn block-card__btn--danger"
            onClick={onRemove} aria-label="Delete block" title="Delete block"
          >✕</button>
        </div>
      </div>
      {expanded && (
        <div className="block-card__body">
          {renderBlockEditor({
            segment,
            // Re-inject the current layer so a form's emit doesn't drop it.
            onChange: raw => onChangeRaw(setLayerAttr(raw, layer)),
            onBlur: onCommit,
            onOpenPlotPicker,
          })}
        </div>
      )}
    </div>
  )
}
