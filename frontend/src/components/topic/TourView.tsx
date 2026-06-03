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
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ForceGraph, { ForceGraphHandle } from '../graph/ForceGraph'
import { api, ContentBlock, GraphEdge, GraphNode, Misconception } from '../../api/client'
import BlockRenderer from './blocks/BlockRenderer'
import { groupCodePairs, isCodePair } from './blocks/codePairs'
import CodePairRenderer from './blocks/CodePairRenderer'
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
 * Anchor — a 1px positional sentinel. The active anchor is picked by
 * `TourView`'s scroll listener (a single listener on the scroll root) so
 * the algorithm is deterministic across fast scrolls, programmatic jumps,
 * and the bottom-of-the-document edge case where the last anchor can
 * never cross a narrow IO band. See `pickActiveAnchor` below.
 */
function Anchor({ id }: { id: string }) {
  return (
    <div
      data-anchor={id}
      aria-hidden
      role="presentation"
      tabIndex={-1}
      style={{ height: 1 }}
    />
  )
}

/**
 * Read every `[data-anchor]` in the scroll root and return the id of the
 * anchor whose top is closest-to-but-not-past the activation line. This
 * is the "topmost anchor above the line" — the section the reader has
 * most recently scrolled into.
 *
 * Why not IntersectionObserver: a per-anchor IO with a narrow band misses
 * transitions when the reader scrolls fast (the anchor jumps past the
 * band between frames). A scroll-listener picks the right anchor on every
 * frame regardless of how the scroll position got there.
 */
function pickActiveAnchor(root: HTMLElement, activationY: number): string | null {
  const rootTop = root.getBoundingClientRect().top
  const anchors = root.querySelectorAll<HTMLElement>('[data-anchor]')
  let best: { id: string; top: number } | null = null
  for (const el of Array.from(anchors)) {
    const top = el.getBoundingClientRect().top - rootTop
    if (top > activationY) continue // not yet reached the line
    if (!best || top > best.top) {
      best = { id: el.getAttribute('data-anchor') || '', top }
    }
  }
  // If nothing is above the line yet (user is above the first anchor),
  // fall back to the first anchor so the camera starts in a known state.
  if (!best && anchors.length > 0) {
    return anchors[0].getAttribute('data-anchor')
  }
  return best?.id ?? null
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

  // M: single scroll listener on the scroll root — runs `pickActiveAnchor`
  // on every scroll, then maps the picked anchor to its `graph_view` target.
  // Anchors without a target keep the previous frame (no flicker). The
  // activation line is 30% from the top of the scroll root, which is a
  // forgiving "I'm reading this section now" position that fires reliably
  // for both slow reads and fast scrolls. Also runs once on mount + when
  // the anchor list changes so the initial frame matches the entry anchor.
  useEffect(() => {
    const root = scrollRef.current
    if (!root || anchorBlocks.length === 0) return
    let lastId: string | null = null
    const update = () => {
      const id = pickActiveAnchor(root, root.clientHeight * 0.30)
      if (!id || id === lastId) return
      lastId = id
      const t = targetByAnchor.get(id)
      if (!t) return // anchor with no graph_view directive — keep the frame
      setActiveTarget(t)
    }
    update()
    root.addEventListener('scroll', update, { passive: true })
    return () => root.removeEventListener('scroll', update)
  }, [scrollRef, anchorBlocks, targetByAnchor])

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

  // Q1: which domain the background filters to. A `domain` target filters to
  // that cluster; a `node` target filters to *that node's* domain so a family
  // overview keeps its cluster on screen while the camera spotlights one
  // member (rather than revealing the whole graph). `all` → no filter. The
  // Shape-of-Statistics intro only uses `all`/`domain` targets, so it's
  // unaffected.
  const visibleDomain = useMemo(() => {
    if (activeTarget.kind === 'domain') return activeTarget.slug ?? null
    if (activeTarget.kind === 'node' && activeTarget.slug) {
      return nodes.find(n => n.slug === activeTarget.slug)?.domain ?? null
    }
    return null
  }, [activeTarget, nodes])

  return (
    <>
      {/* Background graph — fixed to the viewport. The whole topic surface
          scrolls *over* this layer (the scrollRef parent owns the scroll).
          `visibleDomain` filters the cluster currently in focus (same
          semantics as the /explore domain legend); ambientAlpha keeps
          everything readable-but-quiet behind the prose. */}
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
            visibleDomain={visibleDomain}
            // M: 0.85 keeps the graph readable as a background reference.
            // Lower values rendered nodes as near-invisible specks.
            ambientAlpha={0.85}
          />
        )}
      </div>

      {/* Side-vignette: darkens (or lightens, on light theme) the *left*
          side of the viewport where the prose lives, so text reads cleanly
          while the right half of the canvas shows the graph at its native
          brightness. Themed via CSS vars so light mode doesn't end up
          painting a black gradient over a white page. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'linear-gradient(to right, var(--color-bg) 0%, '
            + 'color-mix(in srgb, var(--color-bg) 85%, transparent) 40%, '
            + 'color-mix(in srgb, var(--color-bg) 50%, transparent) 60%, '
            + 'transparent 75%)',
        }}
      />

      {/* Floating prose. Left-aligned column so the right half of the
          viewport shows the graph clearly. z-index 2 puts the prose above
          the graph + vignette layers. */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: 'clamp(96px, 18vh, 220px) clamp(20px, 6vw, 80px) clamp(120px, 16vh, 200px)',
        }}
      >
        <div style={{ maxWidth: 560, marginLeft: 0, marginRight: 'auto' }}>
          {header}
          {anchorBlocks.length > 0 && (
            <Anchor id={anchorBlocks[0].anchor!} />
          )}
          {groupCodePairs(visibleBlocks, metaCache).map(item => {
            if (isCodePair(item)) {
              return (
                <div
                  key={`pair:${item.pairId}`}
                  style={{
                    marginBottom: 24,
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'color-mix(in srgb, var(--color-bg-secondary) 82%, transparent)',
                    border: '1px solid var(--color-border-subtle)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <CodePairRenderer pair={item} metaCache={metaCache} />
                </div>
              )
            }
            const block = item
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
                  <Anchor id={block.anchor} />
                )}
                {/* graph_view blocks render nothing in prose flow — they're
                    pure metadata for the background graph in tour mode. */}
                {block.block_type === 'graph_view' ? null : (
                  <div
                    style={{
                      // Quiet panel behind each prose block. Theme-aware:
                      // `--color-bg-secondary` is dark zinc in dark mode,
                      // light zinc in light mode. `color-mix` gives the
                      // panel translucency so the graph stays slightly
                      // visible through it.
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-lg)',
                      background:
                        'color-mix(in srgb, var(--color-bg-secondary) 82%, transparent)',
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

          {/* M: bottom spacer so the last block is comfortable to read
              instead of pinned to the viewport edge. The activation
              algorithm picks the topmost anchor above the 30% line, so
              this spacer is purely about *reading comfort* now — it
              doesn't affect which anchor is active. */}
          <div aria-hidden style={{ height: '60vh' }} />
        </div>
      </div>
    </>
  )
}
