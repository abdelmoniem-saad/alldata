/**
 * RecallPrompt — K3.
 *
 * Surfaced above the prose on a topic page when the topic is due-for-review
 * (per `progressStore.reviewSchedule`) and not yet reviewed in this session.
 * One question, three quality buttons. Dispatching dismisses the prompt and
 * grows the SM-2 interval.
 *
 * The doc's voice rule: never tell the user they're wrong. The buttons name
 * what the *user* feels, not what the system thinks. "Show me again"
 * (quality 1), "Coming back" (quality 3), "I remember" (quality 5).
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useProgressStore } from '../../stores/progressStore'

interface Props {
  slug: string
  prompt: string
}

export default function RecallPrompt({ slug, prompt }: Props) {
  const recordReview = useProgressStore(s => s.recordReview)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const respond = (quality: number) => {
    recordReview(slug, quality)
    setDismissed(true)
  }

  return (
    <div
      role="region"
      aria-label="Recall prompt"
      style={{
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        borderLeft: '3px solid var(--color-accent)',
        marginBottom: 'var(--space-6)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Recall prompt
      </div>
      <div className="prose" style={{ marginBottom: 'var(--space-4)' }}>
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {prompt}
        </ReactMarkdown>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <button onClick={() => respond(1)} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Show me again
        </button>
        <button onClick={() => respond(3)} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Coming back
        </button>
        <button onClick={() => respond(5)} className="btn btn-sm" style={{ fontSize: 12, borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
          I remember
        </button>
      </div>
    </div>
  )
}
