/**
 * TourView — M (immersive tour) — a special reading surface for topics
 * flagged `tour: true` in `meta.yaml`. Today only the "Shape of Statistics"
 * intro uses it; future onboarding tours can opt in the same way.
 *
 * The layout differs from `ScrollReader`'s two-column scrollytelling:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  full-viewport graph as the background (dimmed)              │
 *   │                                                              │
 *   │           ┌────── floating prose column ──────┐              │
 *   │           │ §1 …                              │              │
 *   │           │ §2 …                              │              │
 *   │           └───────────────────────────────────┘              │
 *   │                                                              │
 *   │  graph zooms + dims as the reader scrolls so the cluster     │
 *   │  currently being discussed reads as the foreground while     │
 *   │  the rest of the field stays visible as context              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * The graph reacts to the active scroll anchor — same IntersectionObserver
 * pattern as ScrollReader, but the resulting "active anchor" is mapped
 * onto a `graph_view` directive's `target`, which drives:
 *   - `target: all`        → fit every node, no focus dim
 *   - `target: <domain>`   → fit the domain's cluster, dim others
 *   - `target: <topic>`    → center on the single node
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ForceGraph, { ForceGraphHandle } from '../graph/ForceGraph'
import { api, ContentBlock, GraphEdge, GraphNode, Misconception } from '../../api/client'
import BlockRenderer from './blocks/BlockRenderer'
import { applyBranchFilter, parseMeta } from './blocks/branchFilter'
import { useProgressStore } from '../../stores/progressStore'
import { DOMAIN_SLUGS } from '../../lib/domain'

interface Props {
  blocks: ContentBlock[]
  misconceptions: Misconception[]
  activeLayer: 'intuition' | 'formal' | 'both'
  scrollRef: React.RefObject<HTMLDivElement | null>
  slug: string
  header?: React.ReactNode
}

// Stable refs to keep React 18's getSnapshot infinite-loop guard happy.
const EMPTY_EVENTS: Record<string, import('../../stores/progressStore').DecisionEvent> = {}
const DOMAIN_SLUG_SET = new Set<string>(DOMAIN_SLUGS as readonly string[])

interface TourTarget {
  /** 'all' fits the whole graph; 'domain' fits a cluster; 'node' centers on one. */
  kind: 'all' | 'domain' | 'node'
  /** The domain slug (for kind='domain') or node slug (for kind='node'). */
  slug?: string
}

function resolveTarget(rawTarget: string): TourTarget {
  const t = rawTarget.trim().toLowerCase()
  if (!t || t === 'all' || t === '*') return { kind: 'all' }
  if (DOMAIN_SLUG_SET.has(t)) return { kind: 'domain', slug: t }
  return { kind: 'node', slug: t }
}

/**
 * IntersectionObserver sentinel — same shape as ScrollReader's. Fires
 * `onActive(id)` when its top crosses ~35% from the top of the scroll root.
 */
function Anchor({
  id,
  onActive,
  rootRef,
}: {
  id: string
  onActive: (id: string) => void
  rootRef: React.RefObject<HTMLElement | null>
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    const root = rootRef.current
    if (!el || !root) return
    // M: narrow band placed near the *top* of the viewport — the active
    // section is whichever anchor most recently crossed an "I'm now near
    // the top" line. The narrow band keeps only one anchor firing at a
    // time (a wide band would over-advance the camera if the reader
    // scrolls fast through a short section).
    //
    // The band is 22%-24% from the top: as the user scrolls into a
    // section, the sentinel crosses this band on the way up and
    // setActiveTarget runs. The bottom spacer below the last block
    // ensures every anchor can reach this band even though the last
    // section has no content after it to push its sentinel through.
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onActive(id)
        }
      },
      { root, rootMargin: '-22% 0px -76% 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [id, onActive, rootRef])
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

export default function TourView({
  blocks,
  misconceptions: _misconceptions,
  activeLayer,
  scrollRef,
  slug,
  header,
}: Props) {
  const graphRef = useRef<ForceGraphHandle>(null)

  // Viewport tracking — the graph fills the whole scroll surface.
  const [dim, setDim] = useState({ width: 800, height: 600 })
  useEffect(() => {
    const update = () => setDim({
      width: window.innerWidth,
      height: window.innerHeight,
    })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Graph data — fetched once on mount.
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  useEffect(() => {
    let cancelled = false
    api.getGraph()
      .then(g => {
        if (cancelled) return
        setNodes(g.nodes)
        setEdges(g.edges)
      })
      .catch(() => { /* silently fail — the prose still works without the graph */ })
    return () => { cancelled = true }
  }, [])

  // Layer + branch filter — same logic as ScrollReader / SlideView.
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
    for (const [a, ev] of Object.entries(decisionEvents)) out[a] = ev.optionId
    return out
  }, [decisionEvents])

  const visibleBlocks = useMemo(
    () => applyBranchFilter(layeredBlocks, metaCache, decisions),
    [layeredBlocks, metaCache, decisions],
  )

  // Anchor → graph-target map. Built from `graph_view` directives in the
  // block stream. Active anchor → look up target → tell the graph to frame
  // it.
  const targetByAnchor = useMemo(() => {
    const out = new Map<string, TourTarget>()
    for (const b of visibleBlocks) {
      if (b.block_type !== 'graph_view' || !b.anchor) continue
      const meta = metaCache.get(b.id)
      const raw = String(meta?.target ?? '')
      out.set(b.anchor, resolveTarget(raw))
    }
    return out
  }, [visibleBlocks, metaCache])

  // Sentinel ids — every block with an anchor gets one. Anchors without an
  // associated graph_view directive leave the previous framing in place
  // (no flicker between sections that don't change the camera).
  const anchorBlocks = useMemo(
    () => visibleBlocks.filter(b => b.anchor),
    [visibleBlocks],
  )

  const [activeTarget, setActiveTarget] = useState<TourTarget>({ kind: 'all' })

  const handleAnchorActive = useCallback((anchorId: string) => {
    const t = targetByAnchor.get(anchorId)
    if (!t) return // anchor with no graph_view — keep the current frame
    setActiveTarget(t)
  }, [targetByAnchor])

  // When the target or the graph data changes, frame the camera.
  useEffect(() => {
    if (nodes.length === 0) return
    const t = activeTarget
    const handle = graphRef.current
    if (!handle) return
    const tick = () => {
      if (t.kind === 'all') {
        handle.fitNodes()
        return
      }
      if (t.kind === 'domain' && t.slug) {
        const slugs = nodes
          .filter(n => n.domain === t.slug && n.depth !== 0)
          .map(n => n.slug)
        if (slugs.length > 0) handle.fitNodes(slugs)
        else handle.centerOnSlug(t.slug)
        return
      }
      if (t.kind === 'node' && t.slug) {
        handle.centerOnSlug(t.slug)
        return
      }
    }
    // ForceGraph's imperative handle is set during commit; defer one tick
    // so the first call (immediately after first paint) hits a real handle.
    const t1 = window.setTimeout(tick, 0)
    const t2 = window.setTimeout(tick, 80)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [activeTarget, nodes])

  const focusDomain = activeTarget.kind === 'domain' ? activeTarget.slug ?? null : null

  return (
    <>
      {/* Background graph — fixed to the viewport. The whole topic surface
          scrolls *over* this layer (the scrollRef parent owns the scroll).
          ambientAlpha 0.55 makes the graph read as quiet context behind the
          prose; focusDomain dims everything outside the active cluster. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {nodes.length > 0 && (
          <ForceGraph
            ref={graphRef}
            nodes={nodes}
            edges={edges}
            width={dim.width}
            height={dim.height}
            focusDomain={focusDomain}
            // M: 0.85 keeps the graph readable as a background reference
            // — at 0.55 the nodes shrank into near-invisible specks in the
            // "fit all" view. Combined with the radial vignette below this
            // layer, the graph reads as visible-but-quiet behind the prose.
            ambientAlpha={0.85}
          />
        )}
      </div>

      {/* Subtle radial vignette so the prose reads on top of the graph
          without competing for attention. Positioned between the graph
          layer and the prose layer. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, rgba(5,5,5,0) 0%, rgba(5,5,5,0.35) 60%, rgba(5,5,5,0.6) 100%)',
        }}
      />

      {/* Floating prose. Anchored at z-index 2 so it sits above the graph
          + vignette but inside the same scroll container TopicView owns. */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: 'clamp(96px, 18vh, 220px) clamp(20px, 6vw, 80px) clamp(120px, 16vh, 200px)',
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {header}
          {anchorBlocks.length > 0 && (
            <Anchor
              id={anchorBlocks[0].anchor!}
              onActive={handleAnchorActive}
              rootRef={scrollRef}
            />
          )}
          {visibleBlocks.map(block => {
            const meta = metaCache.get(block.id) ?? {}
            const isAnchorBearing = Boolean(block.anchor) && block !== anchorBlocks[0]
            return (
              <div
                key={block.id}
                style={{
                  marginBottom: 24,
                  position: 'relative',
                }}
              >
                {isAnchorBearing && block.anchor && (
                  <Anchor
                    id={block.anchor}
                    onActive={handleAnchorActive}
                    rootRef={scrollRef}
                  />
                )}
                {/* graph_view blocks render nothing in prose flow — they're
                    pure metadata for the background graph in tour mode. */}
                {block.block_type === 'graph_view' ? null : (
                  <div
                    style={{
                      // Quiet zinc panel behind each prose block so the
                      // graph behind doesn't fight the text for contrast.
                      // Hairline rule + soft background; not a heavy card.
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'rgba(13, 13, 13, 0.72)',
                      border: '1px solid var(--color-border-subtle)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <BlockRenderer
                      block={block}
                      meta={meta}
                      slug={slug}
                      mode="scroll"
                      inlinePlots={true}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {/* M: a tall bottom spacer so the LAST anchor can still scroll
              through the active band. Without it, no content sits below
              the final `graph_view` sentinel and the reader can't scroll
              past 22% from top — so the last section's camera frame
              would never activate. */}
          <div aria-hidden style={{ height: '80vh' }} />
        </div>
      </div>
    </>
  )
}
