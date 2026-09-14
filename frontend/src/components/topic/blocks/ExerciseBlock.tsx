/**
 * ExerciseBlock, D3. Numeric-entry practice with tolerance checking.
 *
 * The answer is checked numerically (|value - answer| <= tolerance), not
 * as a string, so 0.499 passes a 0.5 +/- 0.01 exercise. One review event
 * per block: quality 5 on a correct check, quality 1 when the reader
 * reveals the solution without a correct check. The reveal walks the
 * solution; committing your own number first is the whole exercise.
 */
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useProgressStore } from '../../../stores/progressStore'

interface ExerciseMeta {
  prompt?: string
  answer?: number
  tolerance?: number
  unit?: string
  hint?: string
  solution?: string
}

interface Props {
  slug: string
  anchor: string | null
  meta: ExerciseMeta
}

export default function ExerciseBlock({ slug, meta }: Props) {
  const recordReview = useProgressStore(s => s.recordReview)

  const prompt = meta.prompt ?? ''
  const answer = meta.answer
  const tolerance = meta.tolerance ?? 0.01
  const unit = meta.unit ?? ''

  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct' | 'revealed'>('idle')
  const [recorded, setRecorded] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const parsed = useMemo(() => {
    const v = parseFloat(value.replace(',', '.').trim())
    return Number.isFinite(v) ? v : null
  }, [value])

  const recordOnce = (quality: number) => {
    if (recorded) return
    setRecorded(true)
    recordReview(slug, quality)
  }

  const handleCheck = () => {
    if (parsed == null || answer == null) return
    const ok = Math.abs(parsed - answer) <= tolerance
    setStatus(ok ? 'correct' : 'wrong')
    recordOnce(ok ? 5 : 1)
  }

  const handleReveal = () => {
    setStatus('revealed')
    recordOnce(1)
  }

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
          fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}
      >
        Exercise
      </div>

      {prompt && (
        <div className="prose" style={{ marginBottom: 14 }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {prompt}
          </ReactMarkdown>
        </div>
      )}

      {status !== 'correct' && status !== 'revealed' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCheck() }}
            placeholder="your answer"
            aria-label="Your answer"
            inputMode="decimal"
            style={{
              width: 140,
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
            }}
          />
          {unit && <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{unit}</span>}
          <button
            onClick={handleCheck}
            disabled={parsed == null}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: parsed == null ? 'var(--color-surface)' : 'var(--color-accent)',
              color: parsed == null ? 'var(--color-text-muted)' : 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: parsed == null ? 'default' : 'pointer',
            }}
          >
            Check
          </button>
          {meta.hint && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--color-text-secondary)', fontSize: 12,
                cursor: 'pointer', textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Hint
            </button>
          )}
        </div>
      )}

      {showHint && meta.hint && (
        <div className="prose" style={{
          marginTop: 12, padding: 12, fontSize: 13,
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg)',
          borderLeft: '3px solid var(--color-border)',
        }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {meta.hint}
          </ReactMarkdown>
        </div>
      )}

      {status === 'wrong' && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-advanced)' }}>
          Not quite. Wrong attempts count as a miss on review; check the hint or try again.
        </div>
      )}

      {status === 'correct' && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-accent)', fontWeight: 600 }}>
          Correct. This will come back a little later on review.
        </div>
      )}

      {status !== 'correct' && meta.solution && (
        <button
          onClick={handleReveal}
          style={{
            marginTop: 12,
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
          {status === 'revealed' ? 'Solution' : 'Show me the solution'}
        </button>
      )}

      {(status === 'correct' || status === 'revealed') && meta.solution && (
        <div
          className="animate-fade-in prose"
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 'var(--radius)',
            background: 'var(--color-bg)',
            borderLeft: `3px solid ${status === 'correct' ? 'var(--color-accent)' : 'var(--color-advanced)'}`,
            fontSize: 14,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {meta.solution}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
