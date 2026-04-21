import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { ContentBlock, Misconception } from '../../api/client'
import CodeRunner from './CodeRunner'

interface Props {
  blocks: ContentBlock[]
  misconceptions: Misconception[]
  activeLayer: 'intuition' | 'formal' | 'both'
  topicTitle: string
  domainColor: string
  current: number
  onChange: (i: number) => void
  onSlidesCount?: (n: number) => void
}

interface Slide {
  type: 'content' | 'code' | 'quiz' | 'misconceptions'
  block?: ContentBlock
  misconceptions?: Misconception[]
}

export default function SlideView({
  blocks, misconceptions, activeLayer, current, onChange, onSlidesCount,
}: Props) {
  const visibleBlocks = blocks.filter(b =>
    activeLayer === 'both' || b.layer === 'both' || b.layer === activeLayer
  )

  // Build slides from blocks — each block becomes a slide, misconceptions at the end
  const slides: Slide[] = [
    ...visibleBlocks.map(b => ({ type: b.block_type === 'quiz' ? 'quiz' as const : b.block_type.startsWith('code') || b.block_type === 'simulation' ? 'code' as const : 'content' as const, block: b })),
    ...(misconceptions.length > 0 ? [{ type: 'misconceptions' as const, misconceptions }] : []),
  ]

  const total = slides.length

  // Push total up to parent for the bottom-bar slide counter.
  useEffect(() => {
    onSlidesCount?.(total)
  }, [total, onSlidesCount])

  // Keyboard navigation — arrows + spacebar advance/retreat slides.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (current < total - 1) { e.preventDefault(); onChange(current + 1) }
      } else if (e.key === 'ArrowLeft') {
        if (current > 0) { e.preventDefault(); onChange(current - 1) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, total, onChange])

  // Clamp current when slides count changes (e.g. layer toggle shrinks the set).
  useEffect(() => {
    if (current >= total && total > 0) onChange(total - 1)
  }, [total, current, onChange])

  if (total === 0) return null

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
    }}>
      {/* Crossfade stack — each slide is absolutely positioned over the same
          surface; opacity toggles drive the fade. Only the active slide gets
          pointer events so clicks don't fall through to hidden slides. */}
      {slides.map((s, i) => {
        const isActive = i === current
        // Hero treatment for the first content-type slide only.
        const isSpark = i === 0 && s.type === 'content'
        return (
          <div
            key={i}
            aria-hidden={!isActive}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
              transition: 'opacity var(--transition-smooth)',
              overflowY: 'auto',
              padding: 'clamp(88px, 12vh, 160px) clamp(32px, 8vw, 180px) clamp(104px, 14vh, 160px)',
            }}
          >
            <div className={isSpark ? 'prose-hero' : undefined}>
              <SlideContent slide={s} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SlideContent({ slide }: { slide: Slide }) {
  if (slide.type === 'misconceptions' && slide.misconceptions) {
    return (
      <div>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28, fontWeight: 700, marginBottom: 24,
          color: 'var(--color-intermediate)',
          letterSpacing: '-0.3px',
        }}>
          Common Misconceptions
        </h2>
        {slide.misconceptions.map(m => (
          <SlideMisconception key={m.id} misconception={m} />
        ))}
      </div>
    )
  }

  if (!slide.block) return null
  const block = slide.block

  switch (block.block_type) {
    case 'markdown':
      return (
        <div className="prose" style={{ fontSize: 16, lineHeight: 1.8 }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {block.content}
          </ReactMarkdown>
        </div>
      )

    case 'code_python':
    case 'simulation':
    case 'code_r':
      return (
        <CodeRunner
          code={block.content}
          language={block.block_type === 'code_r' ? 'r' : 'python'}
          isEditable={block.is_editable}
          expectedOutput={block.expected_output}
          isSimulation={block.block_type === 'simulation'}
        />
      )

    case 'quiz':
      return <SlideQuiz block={block} />

    default:
      return (
        <div className="prose">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      )
  }
}

function SlideQuiz({ block }: { block: ContentBlock }) {
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')

  return (
    <div>
      <div className="prose" style={{ fontSize: 16, lineHeight: 1.8, marginBottom: 20 }}>
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {block.content}
        </ReactMarkdown>
      </div>

      {!showSolution && (
        <textarea
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          placeholder="Type your answer here (optional)"
          style={{
            width: '100%', minHeight: 72, padding: '12px 14px',
            borderRadius: 'var(--radius)', border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg)', color: 'var(--color-text)',
            fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5,
            resize: 'vertical', outline: 'none', marginBottom: 12,
          }}
        />
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {block.hint && !showHint && !showSolution && (
          <button className="btn btn-sm btn-ghost" onClick={() => setShowHint(true)}>Show Hint</button>
        )}
        {block.solution && !showSolution && (
          <button className="btn btn-sm" onClick={() => setShowSolution(true)}
            style={{ background: 'var(--color-accent)', color: 'white', border: 'none' }}>
            Reveal Solution
          </button>
        )}
      </div>

      {showHint && !showSolution && block.hint && (
        <div style={{
          marginTop: 12, padding: 14, borderRadius: 'var(--radius)',
          background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
          fontSize: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-intermediate)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>Hint</div>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{block.hint}</ReactMarkdown>
        </div>
      )}

      {showSolution && block.solution && (
        <div className="animate-fade-in" style={{
          marginTop: 12, padding: 16, borderRadius: 'var(--radius)',
          background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
          fontSize: 14, lineHeight: 1.7,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-intro)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>Solution</div>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{block.solution}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

function SlideMisconception({ misconception }: { misconception: Misconception }) {
  return (
    <div style={{
      padding: 18, borderRadius: 'var(--radius)',
      border: '1px solid var(--color-border)',
      background: 'var(--color-bg-secondary)',
      marginBottom: 16,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: 'var(--color-intermediate)'
      }} />
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>
        "{misconception.title}"
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7 }}>
        <p style={{ color: 'var(--color-advanced)', marginBottom: 8 }}>
          <strong>Wrong:</strong> {misconception.wrong_belief}
        </p>
        <p style={{ color: 'var(--color-intro)', marginBottom: 8 }}>
          <strong>Correct:</strong> {misconception.correction}
        </p>
        {misconception.why_common && (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            <strong>Why common:</strong> {misconception.why_common}
          </p>
        )}
      </div>
    </div>
  )
}
