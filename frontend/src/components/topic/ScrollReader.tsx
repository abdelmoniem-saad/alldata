/**
 * ScrollReader — I3 / I4 / I5
 *
 * The default reading surface for topic pages. Two-column scrollytelling on
 * desktop (≥1024px), linear on mobile.
 *
 *   ┌── prose column (scrolls) ───┐  ┌── viz pane (sticky) ──┐
 *   │ §1 paragraphs...            │  │                       │
 *   │ <Anchor id="bell-curve" />  │  │  pinned to most recent│
 *   │ §2 paragraphs...            │  │  plot block whose     │
 *   │ <Anchor id="bayes-walk" />  │  │  anchor is "active"   │
 *   └─────────────────────────────┘  └───────────────────────┘
 *
 * Active anchor = the last anchor sentinel whose top passed ~35% of viewport.
 *
 * On viewports < 1024px the pane collapses; plot blocks render inline at their
 * natural sort_order so reading stays linear.
 *
 * I5 wiring:
 *   - On mount, blocks of type `state` seed `useTopicState` defaults.
 *   - Decision selections persist in the same store; downstream blocks tagged
 *     `depends_on: <anchor>, branch: <id>` filter by the persisted choice.
 *   - When a `playground` is the active anchor, its `goal.target` flows into
 *     the pinned PlotBlock as a ghost overlay.
 *   - `state_reset` blocks restore defaults when scrolled into view (one-shot).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { ContentBlock, Misconception } from '../../api/client'
import CodeRunner from './CodeRunner'
import PlotBlock from './blocks/PlotBlock'
import DecisionBlock from './blocks/DecisionBlock'
import PlaygroundBlock from './blocks/PlaygroundBlock'
import {
  useTopicStateStore,
  StateValue,
} from '../../stores/topicState'
import { useProgressStore } from '../../stores/progressStore'

// ─── Context ────────────────────────────────────────────────────────────────

interface ScrollReaderContextValue {
  activeAnchor: string | null
  isWide: boolean
  slug: string
}

const ScrollReaderContext = createContext<ScrollReaderContextValue>({
  activeAnchor: null,
  isWide: false,
  slug: '',
})

export function useScrollReader() {
  return useContext(ScrollReaderContext)
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useIsWide(breakpointPx = 1024): boolean {
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${breakpointPx}px)`).matches
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpointPx])
  return isWide
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

// ─── Anchor sentinel ────────────────────────────────────────────────────────

interface AnchorProps {
  id: string
  onActive: (id: string) => void
  rootRef: React.RefObject<HTMLElement | null>
}

function Anchor({ id, onActive, rootRef }: AnchorProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    const root = rootRef.current
    if (!el || !root) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onActive(id)
        }
      },
      {
        root,
        rootMargin: '-35% 0px -64% 0px',
        threshold: 0,
      },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [id, onActive, rootRef])
  // J6: sentinels are pure layout markers — never focus targets, never read
  // by screen readers. `tabIndex={-1}` keeps them out of the keyboard tab
  // order; `aria-hidden` and `role="presentation"` keep them out of the AT
  // tree.
  return (
    <div
      ref={ref}
      data-anchor={id}
      aria-hidden
      role="presentation"
      tabIndex={-1}
      style={{ height: 1 }}
    />
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const PINNED_BLOCK_TYPES = new Set(['plot'])

/** Stable reference for "no decisions for this topic" — see selector below. */
const EMPTY_EVENTS: Record<string, import('../../stores/progressStore').DecisionEvent> = {}

function parseMeta(block: ContentBlock): Record<string, unknown> {
  if (!block.meta) return {}
  try {
    const parsed = JSON.parse(block.meta)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// ─── Block dispatch ─────────────────────────────────────────────────────────

interface BlockProps {
  block: ContentBlock
  meta: Record<string, unknown>
  slug: string
  /** When true, plot blocks render inline (mobile fallback). */
  inlinePlots: boolean
}

function BlockSwitch({ block, meta, slug, inlinePlots }: BlockProps) {
  switch (block.block_type) {
    case 'markdown':
      return (
        <div className="prose">
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
          autoRun={meta.auto_run === true}
        />
      )

    case 'plot':
      // Desktop: pinned in the right column, hidden inline. Mobile: render in flow.
      if (!inlinePlots) return null
      return <PlotBlock slug={slug} meta={meta} />

    case 'callout': {
      const kind = String(meta.kind ?? 'insight')
      const accent =
        kind === 'warning' ? 'var(--color-advanced)' :
        kind === 'aside' ? 'var(--color-text-muted)' :
        'var(--color-accent)'
      const label =
        kind === 'warning' ? 'Note' :
        kind === 'aside' ? 'Aside' :
        'Insight'
      return (
        <div style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg-secondary)',
          borderLeft: `3px solid ${accent}`,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: accent, marginBottom: 6,
          }}>{label}</div>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {block.content}
            </ReactMarkdown>
          </div>
        </div>
      )
    }

    case 'derivation': {
      const title = String(meta.title ?? 'Derivation')
      const collapsed = meta.collapsed !== false
      return (
        <details open={!collapsed} style={{
          padding: 14,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
        }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text)',
            listStyle: 'none',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>›</span>
            {title}
          </summary>
          <div className="prose" style={{ marginTop: 12 }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {block.content}
            </ReactMarkdown>
          </div>
        </details>
      )
    }

    case 'step_through': {
      const steps = Array.isArray(meta.steps) ? (meta.steps as string[]) : []
      return <StepThrough steps={steps} />
    }

    case 'misconception_inline':
      return (
        <div style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg-secondary)',
          borderLeft: '3px solid var(--color-advanced)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: 'var(--color-advanced)', marginBottom: 6,
          }}>Misconception</div>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {block.content}
            </ReactMarkdown>
          </div>
        </div>
      )

    case 'decision':
      return <DecisionBlock slug={slug} anchor={block.anchor} meta={meta as any} />

    case 'playground':
      return <PlaygroundBlock slug={slug} anchor={block.anchor} meta={meta as any} />

    case 'state':
    case 'state_reset':
      // Authoring-only — wired in via effects, no rendered output.
      return null

    default:
      return (
        <div className="prose">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      )
  }
}

// ─── StepThrough ────────────────────────────────────────────────────────────

/**
 * Reveals steps with a 300ms stagger once the list scrolls into view. Under
 * `prefers-reduced-motion` all steps are visible immediately.
 */
function StepThrough({ steps }: { steps: string[] }) {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(reduced ? steps.length : 0)
  const ref = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    if (reduced) {
      setVisible(steps.length)
      return
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          obs.disconnect()
          let i = 0
          const tick = () => {
            i++
            setVisible(i)
            if (i < steps.length) setTimeout(tick, 300)
          }
          tick()
          break
        }
      }
    }, { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [steps.length, reduced])

  return (
    <ol
      ref={ref}
      style={{
        paddingLeft: 24,
        borderLeft: '2px solid var(--color-accent)',
        margin: 0,
        listStyle: 'decimal',
      }}
    >
      {steps.map((s, i) => (
        <li
          key={i}
          style={{
            marginBottom: 12,
            paddingLeft: 4,
            lineHeight: 1.7,
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 280ms ease, transform 280ms ease',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {s}
          </ReactMarkdown>
        </li>
      ))}
    </ol>
  )
}

// ─── Branch filter ──────────────────────────────────────────────────────────

/**
 * Drop blocks tagged `depends_on: <anchor>, branch: <id>` whose decision the
 * user didn't pick. Untagged blocks always render — branching is opt-in.
 *
 * `branch` may be a single id or `|`-separated ids ("a|c") for "show if any".
 */
function applyBranchFilter(
  blocks: ContentBlock[],
  metaCache: Map<string, Record<string, unknown>>,
  decisions: Record<string, string>,
): ContentBlock[] {
  return blocks.filter(b => {
    const meta = metaCache.get(b.id)
    if (!meta) return true
    const dep = meta.depends_on
    const branch = meta.branch
    if (typeof dep !== 'string' || typeof branch !== 'string') return true
    const picked = decisions[dep]
    if (!picked) return false
    const allowed = branch.split('|').map(s => s.trim()).filter(Boolean)
    return allowed.includes(picked)
  })
}

// ─── ScrollReader ───────────────────────────────────────────────────────────

interface ScrollReaderProps {
  blocks: ContentBlock[]
  misconceptions: Misconception[]
  activeLayer: 'intuition' | 'formal' | 'both'
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Topic slug — drives `useTopicState` namespace for I5 reactive plots. */
  slug: string
  header?: ReactNode
}

export default function ScrollReader({
  blocks,
  misconceptions,
  activeLayer,
  scrollRef,
  slug,
  header,
}: ScrollReaderProps) {
  const isWide = useIsWide(1024)
  const reducedMotion = usePrefersReducedMotion()

  // Pre-parse meta once per block. Several effects + branch filter want it.
  const metaCache = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>()
    for (const b of blocks) m.set(b.id, parseMeta(b))
    return m
  }, [blocks])

  // ─── State seeding (I5) ────────────────────────────────────────────────────
  // The topic's `<!-- block: state -->` directive supplies defaults. We merge
  // any per-plot `params` into those defaults too — that way a topic without
  // an explicit state block still gets sane initial values for its plots.
  const initTopic = useTopicStateStore(s => s.initTopic)
  useEffect(() => {
    if (!slug) return
    const defaults: Record<string, StateValue> = {}
    for (const b of blocks) {
      const meta = metaCache.get(b.id) ?? {}
      if (b.block_type === 'state' && meta.values && typeof meta.values === 'object') {
        Object.assign(defaults, meta.values)
      }
      if (b.block_type === 'plot' && meta.params && typeof meta.params === 'object') {
        for (const [k, v] of Object.entries(meta.params as Record<string, unknown>)) {
          if (!(k in defaults)) defaults[k] = v as StateValue
        }
      }
    }
    initTopic(slug, defaults)
  }, [slug, blocks, metaCache, initTopic])

  // J4: branch filter reads decision *events* from progressStore — the
  // single source of truth for "which option did the user pick on this
  // anchor?" `useTopicState.decisions` is still updated by DecisionBlock
  // (legacy reads), but new code routes through progressStore.
  // Stable empty object so the selector returns a referentially-equal value
  // when there are no events for this topic. Returning `{}` inline triggers
  // React 18's getSnapshot-cache check ("infinite loop") because each render
  // produces a new object reference.
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

  const visibleBlocks = useMemo(() => {
    const layered = blocks.filter(
      b => activeLayer === 'both' || b.layer === 'both' || b.layer === activeLayer,
    )
    const filtered = applyBranchFilter(layered, metaCache, decisions)
    // J6: on mobile (<1024px), respect `meta.mobile_order` on plot blocks so
    // a topic curated for desktop pinning can re-sequence its plots when
    // they fall back to inline rendering. Stable sort: blocks without a
    // mobile_order keep their natural sort_order.
    if (isWide) return filtered
    return [...filtered].sort((a, b) => {
      const aMeta = metaCache.get(a.id)
      const bMeta = metaCache.get(b.id)
      const aOrder = typeof aMeta?.mobile_order === 'number' ? aMeta.mobile_order : a.sort_order
      const bOrder = typeof bMeta?.mobile_order === 'number' ? bMeta.mobile_order : b.sort_order
      return aOrder - bOrder
    })
  }, [blocks, activeLayer, decisions, metaCache, isWide])

  // Plot-by-anchor map for the pinned pane.
  const plotByAnchor = useMemo(() => {
    const map = new Map<string, ContentBlock>()
    for (const b of visibleBlocks) {
      if (PINNED_BLOCK_TYPES.has(b.block_type) && b.anchor) {
        map.set(b.anchor, b)
      }
    }
    return map
  }, [visibleBlocks])

  // Playground-by-anchor — tracks ghost overlays for the active anchor.
  const playgroundByAnchor = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>()
    for (const b of visibleBlocks) {
      if (b.block_type === 'playground' && b.anchor) {
        map.set(b.anchor, metaCache.get(b.id) ?? {})
      }
    }
    return map
  }, [visibleBlocks, metaCache])

  const anchoredBlockIds = useMemo(() => {
    const ids = new Set<string>()
    for (const b of visibleBlocks) {
      if (b.anchor) ids.add(b.id)
    }
    return ids
  }, [visibleBlocks])

  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [pinnedAnchor, setPinnedAnchor] = useState<string | null>(null)

  const handleAnchorActive = useCallback((id: string) => {
    setActiveAnchor(id)
  }, [])

  // Pin the latest plot anchor — but if the active anchor is a *playground*
  // we leave the pinned plot as-is. The playground reads the same state so
  // the same plot is the right viz to keep showing.
  useEffect(() => {
    if (activeAnchor && plotByAnchor.has(activeAnchor)) {
      setPinnedAnchor(activeAnchor)
    }
  }, [activeAnchor, plotByAnchor])

  // Seed initial pinned plot on mount.
  useEffect(() => {
    if (pinnedAnchor) return
    const first = visibleBlocks.find(
      b => PINNED_BLOCK_TYPES.has(b.block_type) && b.anchor,
    )
    if (first?.anchor) setPinnedAnchor(first.anchor)
  }, [visibleBlocks, pinnedAnchor])

  // ─── state_reset (I5) ──────────────────────────────────────────────────────
  // When a state_reset anchor becomes active for the first time, snap the
  // bound state keys back to defaults. Tracked per-anchor so a back-scroll
  // doesn't keep firing.
  const resetState = useTopicStateStore(s => s.resetState)
  const resetFiredRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!activeAnchor || !slug) return
    const block = visibleBlocks.find(
      b => b.block_type === 'state_reset' && b.anchor === activeAnchor,
    )
    if (!block) return
    if (resetFiredRef.current.has(block.id)) return
    resetFiredRef.current.add(block.id)
    resetState(slug)
  }, [activeAnchor, slug, visibleBlocks, resetState])

  // Ghost overlay — when the active anchor is a playground with goal.target,
  // pass that to the pinned plot so it draws a dashed target curve.
  const ghostOverride = useMemo<Record<string, StateValue> | null>(() => {
    if (!activeAnchor) return null
    const pgMeta = playgroundByAnchor.get(activeAnchor)
    if (!pgMeta) return null
    const goal = pgMeta.goal as { target?: Record<string, StateValue> } | undefined
    return goal?.target ?? null
  }, [activeAnchor, playgroundByAnchor])

  const ctxValue = useMemo<ScrollReaderContextValue>(
    () => ({ activeAnchor, isWide, slug }),
    [activeAnchor, isWide, slug],
  )

  const pinnedPlot = pinnedAnchor ? plotByAnchor.get(pinnedAnchor) ?? null : null
  const pinnedMeta = pinnedPlot ? metaCache.get(pinnedPlot.id) ?? {} : {}

  // J4: keep the aside mounted across the 1024px breakpoint flip. Toggling
  // grid participation via CSS instead of conditionally rendering the
  // element preserves the IntersectionObserver state on resize and avoids a
  // flash where the aside re-mounts and re-acquires its anchor.
  const grid: React.CSSProperties = isWide
    ? {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 460px)',
        gap: 'clamp(32px, 4vw, 64px)',
        maxWidth: 1280,
        margin: '0 auto',
        minHeight: 0,
      }
    : { maxWidth: 760, margin: '0 auto', minHeight: 0 }

  return (
    <ScrollReaderContext.Provider value={ctxValue}>
      <div style={{
        padding: 'clamp(88px, 12vh, 160px) clamp(32px, 8vw, 120px) clamp(120px, 16vh, 200px)',
      }}>
        {header}
        <div style={grid}>
          {/* Prose column */}
          <div style={{ minWidth: 0 }}>
            {visibleBlocks.map(block => {
              const isAnchorBearing = anchoredBlockIds.has(block.id)
              const meta = metaCache.get(block.id) ?? {}
              return (
                <div key={block.id} style={{ marginBottom: 24, position: 'relative' }}>
                  {isAnchorBearing && block.anchor && (
                    <Anchor id={block.anchor} onActive={handleAnchorActive} rootRef={scrollRef} />
                  )}
                  <BlockSwitch
                    block={block}
                    meta={meta}
                    slug={slug}
                    inlinePlots={!isWide}
                  />
                </div>
              )
            })}

            {misconceptions.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h3 style={{
                  fontSize: 16, fontWeight: 700, marginBottom: 16,
                  color: 'var(--color-intermediate)',
                }}>
                  Common Misconceptions
                </h3>
                {misconceptions.map(m => (
                  <div key={m.id} style={{
                    padding: 16,
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-intermediate)',
                    background: 'var(--color-accent-subtle)',
                    marginBottom: 12,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>"{m.title}"</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                      <p style={{ color: 'var(--color-advanced)', marginBottom: 6 }}>
                        <strong>Wrong:</strong> {m.wrong_belief}
                      </p>
                      <p style={{ color: 'var(--color-intro)' }}>
                        <strong>Correct:</strong> {m.correction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pinned viz pane. Mounted regardless of viewport — display
              flips via CSS so the breakpoint flip doesn't unmount the
              IntersectionObserver state. */}
          <aside
            style={{
              position: 'sticky',
              // `--header-h` (tokens.css) + a small breathing offset replaces
              // the prior viewport-relative clamp, which produced a near-zero
              // sticky region on iOS Safari at small heights.
              top: 'calc(var(--header-h) + 32px)',
              alignSelf: 'start',
              height: 'fit-content',
              display: isWide ? 'block' : 'none',
            }}
          >
            <div
              key={pinnedAnchor ?? 'empty'}
              className={reducedMotion ? undefined : 'animate-fade-in'}
              style={{
                minHeight: 360,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-bg-secondary)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {pinnedPlot ? (
                <PlotBlock
                  slug={slug}
                  meta={pinnedMeta}
                  ghostOverride={ghostOverride}
                />
              ) : (
                <div style={{
                  color: 'var(--color-text-muted)', fontSize: 13,
                }}>
                  No pinned visual for this section.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </ScrollReaderContext.Provider>
  )
}
