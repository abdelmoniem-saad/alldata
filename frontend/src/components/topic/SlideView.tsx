import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { ContentBlock, Misconception } from '../../api/client'
import BlockRenderer from './blocks/BlockRenderer'
import PlotBlock from './blocks/PlotBlock'
import GraphFlythrough from './blocks/GraphFlythrough'
import ErrorBoundary from '../ErrorBoundary'
import { applyBranchFilter, parseMeta } from './blocks/branchFilter'
import { useProgressStore } from '../../stores/progressStore'

interface Props {
  blocks: ContentBlock[]
  misconceptions: Misconception[]
  activeLayer: 'intuition' | 'formal' | 'both'
  topicTitle: string
  domainColor: string
  /** L2: slug is required so decision / playground blocks can dispatch
   *  state writes against the topic's `useTopicState` namespace. */
  slug: string
  current: number
  onChange: (i: number) => void
  onSlidesCount?: (n: number) => void
}

interface Slide {
  type: 'content' | 'code' | 'quiz' | 'misconceptions'
  block?: ContentBlock
  misconceptions?: Misconception[]
  /** Z: the reactive viz pinned beside this slide (plot / graph_view), or null.
   *  Persists across the slides in a section so a graph the reader manipulates
   *  doesn't collapse into a single disconnected slide. */
  pinned: ContentBlock | null
}

// L2: block types that should not get their own slide. `state` / `state_reset`
// are invisible authoring directives; `dataset` is metadata for the next code
// block. Z: `plot` / `graph_view` are pulled out as the *pinned* viz instead of
// standalone slides (see below), so they're not skipped here — handled in the
// slide builder.
const SKIP_AS_SLIDE = new Set(['state', 'state_reset', 'dataset', 'parse_error'])
const PINNED_BLOCK_TYPES = new Set(['plot', 'graph_view'])

// Stable empty-events reference so the Zustand selector doesn't return a fresh
// `{}` each render (React 18 getSnapshot guard). Same pattern as ScrollReader.
const EMPTY_EVENTS: Record<string, import('../../stores/progressStore').DecisionEvent> = {}

/** Z: track the desktop breakpoint for the two-pane slide layout. */
function useIsWide(breakpointPx = 1024): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= breakpointPx,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const onChange = () => setWide(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpointPx])
  return wide
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export default function SlideView({
  blocks, misconceptions, activeLayer, slug, current, onChange, onSlidesCount,
}: Props) {
  const isWide = useIsWide(1024)
  const reducedMotion = usePrefersReducedMotion()

  const layeredBlocks = useMemo(
    () => blocks.filter(b =>
      activeLayer === 'both' || b.layer === 'both' || b.layer === activeLayer
    ),
    [blocks, activeLayer],
  )

  const metaCache = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>()
    for (const b of layeredBlocks) m.set(b.id, parseMeta(b))
    return m
  }, [layeredBlocks])

  const decisionEvents = useProgressStore(
    s => (slug ? s.decisionEvents?.[slug] : undefined) ?? EMPTY_EVENTS,
  )
  const decisions = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [anchor, ev] of Object.entries(decisionEvents)) {
      out[anchor] = ev.optionId
    }
    return out
  }, [decisionEvents])

  const visibleBlocks = useMemo(
    () => applyBranchFilter(layeredBlocks, metaCache, decisions),
    [layeredBlocks, metaCache, decisions],
  )

  // Z: build slides from the *flow* blocks, carrying the most recent pinned
  // viz (plot / graph_view) so it persists beside the prose that discusses it.
  // Plots no longer become lone slides — they become the reactive right pane.
  const slides: Slide[] = useMemo(() => {
    const out: Slide[] = []
    let lastPinned: ContentBlock | null = null
    for (const b of visibleBlocks) {
      if (PINNED_BLOCK_TYPES.has(b.block_type)) { lastPinned = b; continue }
      if (SKIP_AS_SLIDE.has(b.block_type)) continue
      out.push({
        type:
          b.block_type === 'quiz' ? 'quiz' :
          (b.block_type.startsWith('code') || b.block_type === 'simulation') ? 'code' :
          'content',
        block: b,
        pinned: lastPinned,
      })
    }
    if (misconceptions.length > 0) {
      out.push({ type: 'misconceptions', misconceptions, pinned: lastPinned })
    }
    // Edge: a topic that is *only* plots (no prose) still deserves to show
    // them — fall back to one slide per pinned block.
    if (out.length === 0 && visibleBlocks.some(b => PINNED_BLOCK_TYPES.has(b.block_type))) {
      for (const b of visibleBlocks) {
        if (PINNED_BLOCK_TYPES.has(b.block_type)) out.push({ type: 'content', block: b, pinned: null })
      }
    }
    return out
  }, [visibleBlocks, misconceptions])

  const total = slides.length

  useEffect(() => { onSlidesCount?.(total) }, [total, onSlidesCount])

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

  // Clamp current when the slide count changes (e.g. layer toggle shrinks it).
  useEffect(() => {
    if (current >= total && total > 0) onChange(total - 1)
  }, [total, current, onChange])

  if (total === 0) return null

  const idx = Math.min(current, total - 1)
  const slide = slides[idx]
  const activePinned = slide?.pinned ?? null
  const hasViz = !!activePinned && slide.type !== 'misconceptions'
  const isSpark = idx === 0 && slide.type === 'content'

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex',
        flexDirection: isWide ? 'row' : 'column',
      }}>
        {/* Z: persistent reactive viz pane. Keyed by the pinned block so it
            only remounts when the section's viz actually changes — it stays
            put (and live) while the reader steps through the section's slides,
            updating as decisions / playground sliders write state. */}
        {hasViz && (
          <div style={{
            order: isWide ? 2 : 0,
            flex: isWide ? '0 0 44%' : '0 0 auto',
            minWidth: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg-secondary)',
            borderLeft: isWide ? '1px solid var(--color-border-subtle)' : 'none',
            borderBottom: isWide ? 'none' : '1px solid var(--color-border-subtle)',
            padding: isWide ? 'clamp(80px, 10vh, 140px) 24px' : '74px 16px 16px',
          }}>
            <div
              key={activePinned!.anchor ?? activePinned!.id}
              className={reducedMotion ? undefined : 'animate-fade-in'}
              style={{ width: '100%', maxWidth: 520 }}
            >
              <ErrorBoundary variant="block" resetKey={activePinned!.anchor ?? String(activePinned!.id)}>
                {activePinned!.block_type === 'graph_view' ? (
                  <GraphFlythrough target={String(parseMeta(activePinned!).target ?? '')} />
                ) : (
                  <PlotBlock slug={slug} meta={parseMeta(activePinned!)} />
                )}
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Content pane — the active slide, fading in on change. */}
        <div style={{
          order: 1,
          flex: 1, minWidth: 0,
          overflowY: 'auto',
          padding: hasViz && isWide
            ? 'clamp(80px, 10vh, 140px) clamp(28px, 4vw, 72px) clamp(96px, 12vh, 140px)'
            : 'clamp(88px, 12vh, 160px) clamp(32px, 8vw, 180px) clamp(104px, 14vh, 160px)',
        }}>
          <div
            key={idx}
            className={reducedMotion ? undefined : 'animate-fade-in'}
            style={{ maxWidth: hasViz ? 'none' : 760, margin: '0 auto' }}
          >
            <div className={isSpark ? 'prose-hero' : undefined}>
              <SlideContent slide={slide} slug={slug} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SlideContent({ slide, slug }: { slide: Slide; slug: string }) {
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

  // L2: SlideView's quiz block is a legacy SlideView-only renderer with its
  // own answer field + hint/solution toggles.
  if (block.block_type === 'quiz') {
    return <SlideQuiz block={block} />
  }

  // L2: every other block type routes through the shared renderer, which gives
  // slides parity with scroll mode. Z: pinned viz is handled by the pane, so a
  // plot only reaches here in the "only plots" fallback — render it inline.
  const meta = parseMeta(block)
  return (
    <BlockRenderer
      block={block}
      meta={meta}
      slug={slug}
      mode="slides"
      inlinePlots={true}
    />
  )
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
