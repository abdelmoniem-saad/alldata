/**
 * ConfusionFlag — K4.
 *
 * A minimal "I want to revisit this" toggle attached to every block in
 * ScrollReader. Click to flag, click again to unflag. The label exactly
 * matches the vision doc — no "I'm confused," no "this is bad." Just a
 * private signal that the reader wants to come back.
 *
 * Visual: a small text-button at the bottom-right of the block. Default
 * off (color-text-muted, no border accent). When flagged, a teal dot
 * prefixes the label and a hairline left-border appears on the parent
 * block (handled by the caller — ScrollReader wraps the BlockSwitch with
 * a div that gets `border-left` when this block is flagged).
 */

import { useProgressStore } from '../../../stores/progressStore'

interface Props {
  slug: string
  blockId: string
}

export default function ConfusionFlag({ slug, blockId }: Props) {
  const flagged = useProgressStore(
    s => (s.confusionFlags?.[slug]?.[blockId] ?? 0) > 0,
  )
  const flag = useProgressStore(s => s.flagConfusion)
  const unflag = useProgressStore(s => s.unflagConfusion)

  const toggle = () => {
    if (flagged) unflag(slug, blockId)
    else flag(slug, blockId)
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={flagged}
      style={{
        marginTop: 'var(--space-2)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        color: flagged ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
        fontSize: 11,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        opacity: flagged ? 1 : 0.6,
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = flagged ? '1' : '0.6'
      }}
    >
      {flagged && (
        <span style={{ color: 'var(--color-accent)', fontSize: 9 }}>●</span>
      )}
      <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
        {flagged ? 'Marked to revisit' : 'I want to revisit this'}
      </span>
    </button>
  )
}
