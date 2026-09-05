/**
 * FillIn, C2 (the I7 backlog item).
 *
 * Progressive-reveal derivation steps. A `step_through` fades lines in as
 * you scroll; a `fill_in` makes the reader *commit* first: every step is
 * hidden behind its own placeholder until you reveal it, one at a time.
 * Built for the formal layer, where the reader should attempt each step
 * of the argument mentally before checking.
 *
 * Each hidden step is itself the reveal control for everything up to it,
 * so a reader can jump ahead without peeling one line at a time; a quiet
 * "reveal all" link sits below for the skimmers. No persisted state: the
 * reveal is a reading gesture, not progress.
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export function FillIn({ steps }: { steps: string[] }) {
  const [revealed, setRevealed] = useState(0)
  const done = revealed >= steps.length

  return (
    <div style={{
      borderLeft: '2px solid var(--color-accent)',
      paddingLeft: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {steps.map((s, i) => {
        if (i >= revealed) {
          return (
            <button
              key={i}
              onClick={() => setRevealed(i + 1)}
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                border: '1px dashed var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Step {i + 1} hidden. Think it through, then reveal.
            </button>
          )
        }
        return (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'baseline',
              lineHeight: 1.7,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-accent)',
                flexShrink: 0,
              }}
            >
              {i + 1}.
            </span>
            <div className="prose" style={{ minWidth: 0 }}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {s}
              </ReactMarkdown>
            </div>
          </div>
        )
      })}

      {!done && steps.length > 1 && (
        <button
          onClick={() => setRevealed(steps.length)}
          style={{
            alignSelf: 'flex-start',
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
          Reveal all
        </button>
      )}
    </div>
  )
}
