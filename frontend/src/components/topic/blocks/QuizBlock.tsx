/**
 * QuizBlock, D3. Multi-question check-yourself practice.
 *
 * Sequential questions; each pick gets an immediate verdict + teaching
 * response, and every answered question fires a review event (quality 5
 * first-pick-correct, 1 otherwise) so the spaced-repetition scheduler
 * sees the practice, not just the single decision. Picks live in local
 * state only, deliberately: re-answering on a revisit is practice, and
 * the scheduler is what remembers.
 */
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useProgressStore } from '../../../stores/progressStore'

interface QuizQuestion {
  prompt: string
  options: string[]
  correct: number
  response?: string
}

interface QuizMeta {
  title?: string
  questions?: QuizQuestion[]
}

interface Props {
  slug: string
  anchor: string | null
  meta: QuizMeta
}

export default function QuizBlock({ slug, meta }: Props) {
  const questions = useMemo(
    () => (Array.isArray(meta.questions) ? meta.questions : []),
    [meta.questions],
  )
  const recordReview = useProgressStore(s => s.recordReview)

  const [qIdx, setQIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)

  const q = questions[qIdx]
  const correct = picked != null && picked === q?.correct
  const finished = qIdx >= questions.length - 1 && answered

  const handlePick = (i: number) => {
    if (answered) return
    setPicked(i)
    setAnswered(true)
    recordReview(slug, i === q.correct ? 5 : 1)
  }

  const handleNext = () => {
    setQIdx(i => Math.min(i + 1, questions.length - 1))
    setPicked(null)
    setAnswered(false)
  }

  if (questions.length === 0) return null

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: 'var(--color-text-muted)',
          }}
        >
          {meta.title ?? 'Check yourself'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {Math.min(qIdx + 1, questions.length)}/{questions.length}
        </div>
      </div>

      {q && (
        <>
          <div className="prose" style={{ marginBottom: 14 }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {q.prompt}
            </ReactMarkdown>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map((opt, i) => {
              const isPicked = picked === i
              const isCorrectPick = answered && i === q.correct
              const isWrongPick = isPicked && i !== q.correct
              const accent = isCorrectPick
                ? 'var(--color-accent)'
                : isWrongPick
                ? 'var(--color-advanced)'
                : 'transparent'
              return (
                <button
                  key={i}
                  onClick={() => handlePick(i)}
                  aria-pressed={isPicked}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius)',
                    background: isPicked ? 'var(--color-surface)' : 'transparent',
                    border: '1px solid var(--color-border-subtle)',
                    borderLeft: `3px solid ${accent}`,
                    color: 'var(--color-text)',
                    fontSize: 14,
                    cursor: answered ? 'default' : 'pointer',
                    opacity: answered && !isPicked && i !== q.correct ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>

          {answered && q.response && (
            <div
              className="animate-fade-in prose"
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 'var(--radius)',
                background: 'var(--color-bg)',
                borderLeft: `3px solid ${correct ? 'var(--color-accent)' : 'var(--color-advanced)'}`,
                fontSize: 14,
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {q.response}
              </ReactMarkdown>
            </div>
          )}

          {answered && !finished && (
            <button
              onClick={handleNext}
              style={{
                marginTop: 14,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-accent)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next question
            </button>
          )}
          {finished && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Quiz complete. Missed questions come back sooner on review.
            </div>
          )}
        </>
      )}
    </div>
  )
}
