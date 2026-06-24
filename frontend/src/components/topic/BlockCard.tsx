/**
 * BlockCard — X1. One directive segment as a friendly card.
 *
 * Shows a type tag + plain-language summary (never the raw `<!-- block -->`),
 * with reorder / delete / edit controls. "Edit" expands the per-directive form
 * (or the raw escape hatch) from `blockForms`. The contributor sees what the
 * block *is*, not how it's spelled.
 */
import { useState } from 'react'
import { DirectiveSegment } from '../../lib/contentDoc'
import { directiveTag, directiveSummary } from '../../lib/directiveMeta'
import { renderBlockEditor } from './blockForms'

interface Props {
  segment: DirectiveSegment
  isFirst: boolean
  isLast: boolean
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onChangeRaw: (raw: string) => void
  onCommit: () => void
  onOpenPlotPicker?: () => void
}

export default function BlockCard({
  segment, isFirst, isLast, onMove, onRemove, onChangeRaw, onCommit, onOpenPlotPicker,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const summary = directiveSummary(segment)

  return (
    <div className="block-card" data-type={segment.type}>
      <div className="block-card__head">
        <span className="block-card__tag">{directiveTag(segment.type)}</span>
        {summary && <span className="block-card__summary">{summary}</span>}
        <span className="block-card__spacer" />
        <div className="block-card__actions">
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
          {renderBlockEditor({ segment, onChange: onChangeRaw, onBlur: onCommit, onOpenPlotPicker })}
        </div>
      )}
    </div>
  )
}
