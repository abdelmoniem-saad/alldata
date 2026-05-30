/**
 * MergeDiff — O1.
 *
 * Unified line diff between a master topic's current `content.md` and a
 * fork's suggested replacement. Green-tinted added lines, red-tinted
 * removed, muted unchanged. Monospace, line-wrapped.
 */

import { useMemo } from 'react'
import { lineDiff, type DiffLine } from '../lib/lineDiff'

interface Props {
  master: string
  suggested: string
}

export default function MergeDiff({ master, suggested }: Props) {
  const lines = useMemo(() => lineDiff(master, suggested), [master, suggested])

  // Aggregate counters for the header. Cheap; the diff is small enough.
  const added = lines.filter(l => l.kind === 'add').length
  const removed = lines.filter(l => l.kind === 'del').length

  return (
    <div style={{
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-bg-secondary)',
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--color-border-subtle)',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        display: 'flex',
        gap: 12,
      }}>
        <span>Diff (master ↔ suggested)</span>
        <span style={{ color: 'var(--color-intro)' }}>+{added}</span>
        <span style={{ color: 'var(--color-advanced)' }}>−{removed}</span>
      </div>
      <pre style={{
        margin: 0,
        padding: 0,
        background: 'transparent',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowX: 'auto',
        maxHeight: '70vh',
      }}>
        {lines.map((line, i) => (
          <DiffLineRow key={i} line={line} />
        ))}
      </pre>
    </div>
  )
}

function DiffLineRow({ line }: { line: DiffLine }) {
  // Background tints. Unchanged lines stay on the panel's own background;
  // adds get a green wash, dels a red wash. Sigil column on the left.
  const palette = (() => {
    if (line.kind === 'add') return { bg: 'rgba(34,197,94,0.10)', sigil: '+', color: 'var(--color-intro, #22c55e)' }
    if (line.kind === 'del') return { bg: 'rgba(239,68,68,0.10)', sigil: '−', color: 'var(--color-advanced, #ef4444)' }
    return { bg: 'transparent', sigil: ' ', color: 'var(--color-text-muted)' }
  })()
  return (
    <div style={{
      display: 'flex',
      padding: '0 12px',
      background: palette.bg,
    }}>
      <span style={{
        width: 16,
        color: palette.color,
        userSelect: 'none',
        flexShrink: 0,
      }}>{palette.sigil}</span>
      <span style={{ color: palette.color, whiteSpace: 'pre-wrap', flex: 1 }}>
        {line.text || ' '}
      </span>
    </div>
  )
}
