/**
 * B2: the fork author's view of a reviewer's note.
 *
 * Shown on accept AND reject: a thank-you is a valid review outcome, not
 * just a rejection reason. Quiet by design, one panel under the status
 * chip, tinted by the outcome.
 */

import type { MergeBackStatus } from '../api/client'

interface Props {
  note: string
  reviewerName: string | null
  reviewedAt: string | null
  status: MergeBackStatus | null
}

export default function ReviewerNotePanel({ note, reviewerName, reviewedAt, status }: Props) {
  const accent = status === 'accepted'
    ? 'var(--color-intro, #22c55e)'
    : status === 'rejected'
      ? 'var(--color-advanced, #ef4444)'
      : 'var(--color-accent)'

  return (
    <div style={{
      marginTop: 8,
      padding: '10px 14px',
      borderRadius: 'var(--radius-md)',
      borderLeft: `3px solid ${accent}`,
      background: 'var(--color-bg-secondary)',
      fontSize: 13,
      color: 'var(--color-text-secondary)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
        Reviewer note
        {reviewerName && (
          <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>
            {' '}from {reviewerName}
            {reviewedAt ? ` · ${new Date(reviewedAt).toLocaleDateString()}` : ''}
          </span>
        )}
      </div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{note}</div>
    </div>
  )
}
