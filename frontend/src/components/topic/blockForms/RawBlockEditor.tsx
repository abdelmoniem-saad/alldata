/**
 * RawBlockEditor, X1. The universal escape hatch.
 *
 * A plain textarea bound to a directive segment's *raw* source. It's the
 * fallback for any directive type that doesn't (yet) have a friendly form, and
 * the "Edit source" expander on every card, so an expert never loses raw
 * control, while a contributor never has to use it. Edits set the raw text in
 * place; the parent re-tokenizes on blur to refresh the card's label.
 */
import { DirectiveSegment } from '../../../lib/contentDoc'

interface Props {
  segment: DirectiveSegment
  onChange: (raw: string) => void
  onBlur?: () => void
}

export default function RawBlockEditor({ segment, onChange, onBlur }: Props) {
  const rows = Math.max(2, Math.min(20, segment.raw.split('\n').length))
  return (
    <textarea
      className="block-card__raw"
      value={segment.raw}
      rows={rows}
      spellCheck={false}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      aria-label={`${segment.type} block source`}
    />
  )
}
