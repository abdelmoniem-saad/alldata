import { useState, useEffect, useCallback } from 'react'
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
}

interface Slide {
  type: 'content' | 'code' | 'quiz' | 'misconceptions'
  block?: ContentBlock
  misconceptions?: Misconception[]
}

export default function SlideView({ blocks, misconceptions, activeLayer, domainColor }: Props) {
  const [current, setCurrent] = useState(0)

  const visibleBlocks = blocks.filter(b =>
    activeLayer === 'both' || b.layer === 'both' || b.layer === activeLayer
  )

  // Build slides from blocks — each block becomes a slide, misconceptions at the end
  const slides: Slide[] = [
    ...visibleBlocks.map(b => ({ type: b.block_type === 'quiz' ? 'quiz' as const : b.block_type.startsWith('code') || b.block_type === 'simulation' ? 'code' as const : 'content' as const, block: b })),
    ...(misconceptions.length > 0 ? [{ type: 'misconceptions' as const, misconceptions }] : []),
  ]

  const total = slides.length
  const canPrev = current > 0
  const canNext = current < total - 1

  const prev = useCallback(() => { if (canPrev) setCurrent(c => c - 1) }, [canPrev])
  const next = useCallback(() => { if (canNext) setCurrent(c => c + 1) }, [canNext])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  // Reset to first slide on layer/block change
  useEffect(() => { setCurrent(0) }, [activeLayer])

  if (total === 0) return null

  const slide = slides[current]
  // First content-slide gets the "spark" hero treatment — teal rail, bigger
  // serif headline, lede paragraph. Non-content first slides skip it so we
  // don't hang editorial styling on a code block or quiz.
  const isSpark = current === 0 && slide.type === 'content'

  return (
    <div style={{
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      background: 'var(--color-bg-secondary)',
      overflow: 'hidden',
      minHeight: 400,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Progress bar */}
      <div style={{
        height: 3,
        background: 'var(--color-surface)',
      }}>
        <div style={{
          height: '100%',
          width: `${((current + 1) / total) * 100}%`,
          background: 'var(--color-accent)',
          boxShadow: '0 0 10px var(--color-accent-glow)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Slide header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlideTypeIcon type={slide.type} color="var(--color-accent)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)' }}>
            {isSpark
              ? 'Introduction'
              : slide.type === 'content' ? 'Concept'
              : slide.type === 'code' ? 'Code'
              : slide.type === 'quiz' ? 'Challenge'
              : 'Misconceptions'}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {current + 1} / {total}
        </span>
      </div>

      {/* Slide content */}
      <div style={{
        flex: 1,
        padding: 'clamp(16px, 4vw, 28px) clamp(14px, 4vw, 32px)',
        paddingLeft: isSpark ? 'clamp(24px, 5vw, 48px)' : undefined,
        borderLeft: isSpark ? '2px solid var(--color-accent)' : undefined,
        overflow: 'auto',
        maxHeight: 'calc(100vh - 280px)',
      }}>
        {isSpark ? (
          <div className="prose-hero" style={{ maxWidth: 640, margin: '0 auto' }}>
            <SlideContent slide={slide} />
          </div>
        ) : (
          <SlideContent slide={slide} />
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface)',
      }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={prev}
          disabled={!canPrev}
          style={{ opacity: canPrev ? 1 : 0.3, fontSize: 13, gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Previous
        </button>

        {/* Slide dots */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 20 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: i === current
                  ? 'var(--color-accent)'
                  : i < current
                    ? 'var(--color-text-muted)'
                    : 'var(--color-border)',
                transition: 'all 0.2s ease',
              }}
              title={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="btn btn-sm"
          onClick={next}
          disabled={!canNext}
          style={{
            opacity: canNext ? 1 : 0.3,
            fontSize: 13, gap: 6,
            background: canNext ? 'var(--color-accent)' : undefined,
            color: canNext ? 'white' : undefined,
            border: 'none',
          }}
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Keyboard hint */}
      <div style={{
        textAlign: 'center',
        padding: '4px 0 8px',
        fontSize: 10,
        color: 'var(--color-text-muted)',
        opacity: 0.4,
      }}>
        Use arrow keys or spacebar to navigate
      </div>
    </div>
  )
}

function SlideTypeIcon({ type, color }: { type: string; color: string }) {
  const style = {
    width: 20, height: 20, borderRadius: 5,
    background: `${color}15`,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  }

  if (type === 'code') return (
    <div style={style}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
      </svg>
    </div>
  )
  if (type === 'quiz') return (
    <div style={style}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><path d="M12 17h.01"/>
      </svg>
    </div>
  )
  if (type === 'misconceptions') return (
    <div style={style}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-intermediate)" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
      </svg>
    </div>
  )
  return (
    <div style={style}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    </div>
  )
}

function SlideContent({ slide }: { slide: Slide }) {
  if (slide.type === 'misconceptions' && slide.misconceptions) {
    return (
      <div>
        <h3 style={{
          fontSize: 18, fontWeight: 700, marginBottom: 20,
          color: 'var(--color-intermediate)',
        }}>
          Common Misconceptions
        </h3>
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
        <div className="prose" style={{ fontSize: 15, lineHeight: 1.8 }}>
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
      <div className="prose" style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>
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
            width: '100%', minHeight: 60, padding: '10px 12px',
            borderRadius: 'var(--radius)', border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg)', color: 'var(--color-text)',
            fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5,
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
          marginTop: 12, padding: 12, borderRadius: 'var(--radius)',
          background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
          fontSize: 13,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-intermediate)', marginBottom: 6, textTransform: 'uppercase' }}>Hint</div>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{block.hint}</ReactMarkdown>
        </div>
      )}

      {showSolution && block.solution && (
        <div className="animate-fade-in" style={{
          marginTop: 12, padding: 14, borderRadius: 'var(--radius)',
          background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
          fontSize: 13, lineHeight: 1.7,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-intro)', marginBottom: 8, textTransform: 'uppercase' }}>Solution</div>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{block.solution}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

function SlideMisconception({ misconception }: { misconception: Misconception }) {
  return (
    <div style={{
      padding: 16, borderRadius: 'var(--radius)',
      border: '1px solid var(--color-border)',
      background: 'var(--color-bg)',
      marginBottom: 16,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, 
        background: 'var(--color-intermediate)'
      }} />
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>
        "{misconception.title}"
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>
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
