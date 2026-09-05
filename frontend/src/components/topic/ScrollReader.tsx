/**
 * ScrollReader, I3 / I4 / I5
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
import { ContentBlock, Misconception } from '../../api/client'
import ErrorBoundary from '../ErrorBoundary'
import PlotBlock from './blocks/PlotBlock'
import GraphFlythrough from './blocks/GraphFlythrough'
import ConfusionFlag from './blocks/ConfusionFlag'
import BlockRenderer from './blocks/BlockRenderer'
import { groupCodePairs, isCodePair } from './blocks/codePairs'
import CodePairRenderer from './blocks/CodePairRenderer'
import { applyBranchFilter, parseMeta } from './blocks/branchFilter'
import {
  useTopicStateStore,
  StateValue,
} from '../../stores/topicState'
import { useProgressStore } from '../../stores/progressStore'
import { useSearchParams } from 'react-router-dom'

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
  // J6: sentinels are pure layout markers, never focus targets, never read
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

// K2: `graph_view` shares the pinned-pane treatment with `plot`, it owns
// the right column when its anchor is active. The pinned plot becomes a
// pinned graph for "Shape of Statistics" and any future tour topic.
const PINNED_BLOCK_TYPES = new Set(['plot', 'graph_view'])

// K4: block types eligible for the "I want to revisit this" confusion flag.
// Excludes purely structural / metadata blocks (state, state_reset, gear,
// graph_view), flagging those carries no signal an author can act on.
// `plot` is also excluded since it renders inline-only on mobile and pinned
// elsewhere on desktop, so the flag would attach to the wrong surface.
const CONFUSION_FLAGGABLE_TYPES = new Set([
  'markdown', 'code_python', 'code_r', 'simulation', 'callout',
  'derivation', 'step_through', 'misconception_inline',
  'decision', 'playground', 'quiz', 'fill_in',
])

/** Stable reference for "no decisions for this topic", see selector below. */
const EMPTY_EVENTS: Record<string, import('../../stores/progressStore').DecisionEvent> = {}
// Y: stable empty for the per-topic confusion-flag map (selector identity).
const EMPTY_FLAGS: Record<string, number> = {}

/**
 * BlockShell, K4. Wraps a single block in the prose column. Adds:
 *   - A hairline left-border + tint when flagged for revisit.
 *   - A `ConfusionFlag` button at the bottom (when the block type warrants).
 *   - `?debug=confusion` heatmap tint scaled to the flag count.
 *
 * Reads the flag state via Zustand selectors keyed by (slug, blockId), so
 * a flag toggle on one block doesn't re-render unrelated ones.
 */
function BlockShell({
  slug, block, showConfusionFlag, children,
}: {
  slug: string
  block: ContentBlock
  showConfusionFlag: boolean
  children: ReactNode
}) {
  // L5: collapse two parallel selectors into one, both used to subscribe
  // to the same `(slug, blockId)` cell. The primitive `Object.is` equality
  // Zustand uses already prevents re-renders when an unrelated cell
  // changes, but the duplicate subscription was wasteful in dev tools.
  const flagCount = useProgressStore(
    s => s.confusionFlags?.[slug]?.[block.id] ?? 0,
  )
  const flagged = flagCount > 0
  const debug = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debug') === 'confusion'

  return (
    <div
      id={`block-${block.id}`}
      style={{
        marginBottom: 24,
        position: 'relative',
        paddingLeft: flagged ? 12 : 0,
        borderLeft: flagged ? '1px solid var(--color-text-muted)' : 'none',
        background: debug && flagCount > 0
          ? `rgba(20, 184, 166, ${Math.min(0.04 + flagCount * 0.05, 0.25)})`
          : undefined,
        transition: 'all var(--transition-fast)',
      }}
    >
      {children}
      {showConfusionFlag && slug && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ConfusionFlag slug={slug} blockId={block.id} />
        </div>
      )}
    </div>
  )
}

// #2: a collapsible run of formal-layer blocks. "Show the formal version" in
// Intuition mode (collapsed), an open "Hide" affordance in All / Formal. The
// open state re-syncs when the layer toggle flips the default, so switching to
// Intuition folds rigor away and All unfolds it — progressive disclosure
// without losing the reader's place.
function FormalSection({ defaultOpen, count, children }: {
  defaultOpen: boolean; count: number; children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])
  return (
    <div className="formal-section" data-open={open}>
      <button
        type="button"
        className="formal-section__toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="formal-section__chev" aria-hidden>{open ? '▾' : '▸'}</span>
        {open ? 'Hide the formal version' : 'Show the formal version'}
        {!open && <span className="formal-section__count">{count} block{count === 1 ? '' : 's'}</span>}
      </button>
      {open && <div className="formal-section__body">{children}</div>}
    </div>
  )
}

// `parseMeta` and `applyBranchFilter` live in `./blocks/branchFilter.ts` so
// SlideView (and any future reading surface) can reuse them without
// re-implementing branch gating.

// ─── Block dispatch ─────────────────────────────────────────────────────────
//
// L2: this used to be a 200-line inline switch over `block.block_type`.
// SlideView grew its own (out-of-date) version, which is why every K-cycle
// block type rendered as a black slide in `?mode=slides`. We extracted the
// switch into `./blocks/BlockRenderer.tsx` and both surfaces now route
// through it. The wrapper below preserves the ScrollReader-specific
// `inlinePlots` mobile-fallback flag while delegating the actual rendering.

interface BlockProps {
  block: ContentBlock
  meta: Record<string, unknown>
  slug: string
  /** When true, plot blocks render inline (mobile fallback). */
  inlinePlots: boolean
}

function BlockSwitch({ block, meta, slug, inlinePlots }: BlockProps) {
  return (
    <BlockRenderer
      block={block}
      meta={meta}
      slug={slug}
      mode="scroll"
      inlinePlots={inlinePlots}
    />
  )
}

// ─── Branch filter ──────────────────────────────────────────────────────────

// ─── ScrollReader ───────────────────────────────────────────────────────────

interface ScrollReaderProps {
  blocks: ContentBlock[]
  misconceptions: Misconception[]
  activeLayer: 'intuition' | 'formal' | 'both'
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Topic slug, drives `useTopicState` namespace for I5 reactive plots. */
  slug: string
  header?: ReactNode
  /**
   * O2: collapse to single-column linear flow regardless of viewport
   * width. The fork editor's right preview pane is ~640px wide on a
   * 1280px window, which is too narrow for the desktop two-column
   * pinned-viz layout, prose wraps to a few words per line and plots
   * are unreadable. Forcing linear here mirrors the natural mobile
   * fallback. Master topic pages and `ForkView` leave it false.
   */
  forceLinear?: boolean
}

export default function ScrollReader({
  blocks,
  misconceptions,
  activeLayer,
  scrollRef,
  slug,
  header,
  forceLinear = false,
}: ScrollReaderProps) {
  const viewportIsWide = useIsWide(1024)
  // O2: `isWide` drives the two-column pinned layout. If the caller forces
  // linear we treat the surface as narrow even on a wide viewport.
  const isWide = forceLinear ? false : viewportIsWide
  const reducedMotion = usePrefersReducedMotion()

  // Pre-parse meta once per block. Several effects + branch filter want it.
  const metaCache = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>()
    for (const b of blocks) m.set(b.id, parseMeta(b))
    return m
  }, [blocks])

  // ─── State seeding (I5) ────────────────────────────────────────────────────
  // The topic's `<!-- block: state -->` directive supplies defaults. We merge
  // any per-plot `params` into those defaults too, that way a topic without
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

  // J4: branch filter reads decision *events* from progressStore, the
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
    // #2: layer policy. "All" (both) shows everything; "Intuition" keeps
    // formal blocks but they render *collapsed* behind an inline expander
    // (progressive disclosure, see FormalSection) rather than vanishing;
    // "Formal" hides intuition-only blocks and shows the rigorous slice.
    const layered = blocks.filter(b => {
      if (activeLayer === 'formal') return b.layer !== 'intuition'
      return true
    })
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

  // Y: "jump to revisit". Arriving with `?revisit` (from the graph sidebar
  // or the in-topic chip) scrolls to the first block this reader flagged and
  // flashes it, so a mark is no longer a dead end. `flaggedIds` also feeds the
  // in-topic count chip below.
  const [searchParams] = useSearchParams()
  const flaggedMap = useProgressStore(
    s => (slug ? s.confusionFlags?.[slug] : undefined) ?? EMPTY_FLAGS,
  )
  const flaggedFirst = useMemo(() => {
    const ids = new Set(Object.keys(flaggedMap))
    return ids.size ? visibleBlocks.find(b => ids.has(b.id)) ?? null : null
  }, [flaggedMap, visibleBlocks])
  const flaggedCount = Object.keys(flaggedMap).length

  const jumpToRevisit = useCallback(() => {
    if (!flaggedFirst) return
    const el = document.getElementById(`block-${flaggedFirst.id}`)
    if (!el) return
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    el.classList.add('block-flash')
    window.setTimeout(() => el.classList.remove('block-flash'), 1700)
  }, [flaggedFirst, reducedMotion])

  useEffect(() => {
    if (searchParams.get('revisit') == null) return
    const t = window.setTimeout(jumpToRevisit, 350) // let blocks paint first
    return () => window.clearTimeout(t)
  }, [searchParams, jumpToRevisit])

  // Playground-by-anchor, tracks ghost overlays for the active anchor.
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

  // Pin the latest plot anchor, but if the active anchor is a *playground*
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

  // Ghost overlay, when the active anchor is a playground with goal.target,
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
        {/* Y: in-topic revisit jump. Shown when this reader flagged ≥1 block
            here, so a mark made earlier is reachable without the graph. */}
        {!forceLinear && flaggedCount > 0 && (
          <button
            type="button"
            onClick={jumpToRevisit}
            title="Jump to a block you marked to revisit"
            style={{
              position: 'fixed', left: 20, bottom: 20, zIndex: 40,
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 12px', borderRadius: 999,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }} aria-hidden>●</span>
            {flaggedCount} to revisit
          </button>
        )}
        {header}
        <div style={grid}>
          {/* Prose column. M5: pre-group adjacent code blocks that share a
              `pair_id` directive field so the two language variants render
              as one tabbed surface instead of two separate blocks. */}
          <div style={{ minWidth: 0 }}>
            {(() => {
              const items = groupCodePairs(visibleBlocks, metaCache)
              const renderItem = (item: typeof items[number]): ReactNode => {
                if (isCodePair(item)) {
                  // Pairs don't carry confusion flags or anchors today.
                  return (
                    <div key={`pair:${item.pairId}`} style={{ marginBottom: 24 }}>
                      <CodePairRenderer pair={item} metaCache={metaCache} />
                    </div>
                  )
                }
                const block = item
                const isAnchorBearing = anchoredBlockIds.has(block.id)
                const meta = metaCache.get(block.id) ?? {}
                return (
                  <BlockShell
                    key={block.id}
                    slug={slug}
                    block={block}
                    showConfusionFlag={CONFUSION_FLAGGABLE_TYPES.has(block.block_type)}
                  >
                    {isAnchorBearing && block.anchor && (
                      <Anchor id={block.anchor} onActive={handleAnchorActive} rootRef={scrollRef} />
                    )}
                    <BlockSwitch block={block} meta={meta} slug={slug} inlinePlots={!isWide} />
                  </BlockShell>
                )
              }
              // #2: group consecutive formal-layer blocks into a collapsible
              // run (progressive disclosure). Open by default in All/Formal,
              // collapsed in Intuition. Code pairs are treated as non-formal.
              const itemLayer = (item: typeof items[number]) =>
                isCodePair(item) ? 'both' : item.layer
              const out: ReactNode[] = []
              let run: typeof items = []
              const flush = () => {
                if (run.length === 0) return
                const r = run
                run = []
                const key = isCodePair(r[0]) ? `formal:${r[0].pairId}` : `formal:${r[0].id}`
                out.push(
                  <FormalSection key={key} defaultOpen={activeLayer !== 'intuition'} count={r.length}>
                    {r.map(renderItem)}
                  </FormalSection>,
                )
              }
              for (const item of items) {
                if (itemLayer(item) === 'formal') run.push(item)
                else { flush(); out.push(renderItem(item)) }
              }
              flush()
              return out
            })()}

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

          {/* Pinned viz pane. Mounted regardless of viewport, display
              flips via CSS so the breakpoint flip doesn't unmount the
              IntersectionObserver state. */}
          <aside
            style={{
              position: 'sticky',
              // V0: rest the pinned visual lower, between the top and the
              // vertical center, rather than hugging the header. `--header-h`
              // keeps it clear of the navbar; the `vh` term drops it into the
              // upper-middle of the viewport.
              top: 'calc(var(--header-h) + 14vh)',
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
                // S2: a throwing spec degrades to a panel; resetKey gives the
                // next pinned visual (different anchor) a fresh mount.
                <ErrorBoundary variant="block" resetKey={pinnedPlot.anchor ?? String(pinnedPlot.id)}>
                  {pinnedPlot.block_type === 'graph_view' ? (
                    <GraphFlythrough
                      target={String(pinnedMeta.target ?? '')}
                    />
                  ) : (
                    <PlotBlock
                      slug={slug}
                      meta={pinnedMeta}
                      ghostOverride={ghostOverride}
                    />
                  )}
                </ErrorBoundary>
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
