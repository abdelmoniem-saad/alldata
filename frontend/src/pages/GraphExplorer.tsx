import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ForceGraph from '../components/graph/ForceGraph'
import GraphSidebar from '../components/graph/GraphSidebar'
import { useGraphStore } from '../stores/graphStore'
import { api, GraphNode } from '../api/client'
import {
  DOMAIN_SLUGS, DOMAIN_DASH, DOMAIN_STROKE_WIDTH,
  domainVar, domainLabel,
} from '../lib/domain'

export default function GraphExplorer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { nodes, edges, loading, error, fetchGraph, selectNode, selectedNode } = useGraphStore()
  const [prerequisites, setPrerequisites] = useState<GraphNode[]>([])
  const [leadsTo, setLeadsTo] = useState<GraphNode[]>([])
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 })
  const [activeDomain, setActiveDomain] = useState<string | null>(searchParams.get('domain'))
  const [showHelp, setShowHelp] = useState(true)

  useEffect(() => { fetchGraph() }, [fetchGraph])

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.max(600, window.innerWidth - 360),
        height: window.innerHeight - 56,
      })
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Hide help after first node click
  useEffect(() => {
    if (selectedNode) setShowHelp(false)
  }, [selectedNode])

  // Filter nodes by domain
  const filteredNodes = activeDomain
    ? nodes.filter(n => n.domain === activeDomain || n.depth === 0)
    : nodes
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredEdges = activeDomain
    ? edges.filter(e => filteredNodeIds.has(e.source_id) && filteredNodeIds.has(e.target_id))
    : edges

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    selectNode(node)
    if (node.depth > 0) {
      try {
        const [prereqs, leads] = await Promise.all([
          api.getPrerequisites(node.slug),
          api.getLeadsTo(node.slug),
        ])
        // G8: endpoints now return PrerequisiteEntry[]. The sidebar here
        // derives reasons from the already-loaded `edges` array (see
        // prereqReasons/leadsToReasons memos), so we just unwrap .node for
        // the flat chip list.
        setPrerequisites(prereqs.map(p => p.node))
        setLeadsTo(leads.map(p => p.node))
      } catch {
        setPrerequisites([])
        setLeadsTo([])
      }
    }
  }, [selectNode])

  // G5: reason maps derived from the already-loaded edges. Only direct edges
  // have a "why" description; transitive prereqs from the API show up in the
  // chip list without a reason line, which is the right behavior — only the
  // direct dependency has a documented rationale.
  const prereqReasons = useMemo(() => {
    const map: Record<string, string | null> = {}
    if (!selectedNode) return map
    for (const e of edges) {
      if (e.edge_type === 'prerequisite' && e.target_id === selectedNode.id) {
        map[e.source_id] = e.description
      }
    }
    return map
  }, [edges, selectedNode])

  const leadsToReasons = useMemo(() => {
    const map: Record<string, string | null> = {}
    if (!selectedNode) return map
    for (const e of edges) {
      if (e.edge_type === 'prerequisite' && e.source_id === selectedNode.id) {
        map[e.target_id] = e.description
      }
    }
    return map
  }, [edges, selectedNode])

  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    if (node.depth > 0) navigate(`/topic/${node.slug}`)
  }, [navigate])

  if (loading && nodes.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--color-text-secondary)',
        flexDirection: 'column', gap: 16,
      }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
        <div className="skeleton" style={{ width: 150, height: 14 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', flexDirection: 'column', gap: 16,
      }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Could not load graph</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchGraph}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Graph canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ForceGraph
          nodes={filteredNodes}
          edges={filteredEdges}
          width={dimensions.width}
          height={dimensions.height}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          highlightedNode={selectedNode?.slug}
        />

        {/* Floating help tooltip */}
        {showHelp && (
          <div className="glass animate-fade-in" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 24px',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--color-text)' }}>
              Grab a node and drag it
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Scroll to zoom &middot; Click to select &middot; Double-click to open &middot; Hover an edge for the reason
            </p>
          </div>
        )}

        {/* Domain filter bar */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          <button
            className={`btn btn-sm ${!activeDomain ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveDomain(null)}
            style={{ fontSize: 11 }}
          >
            All
          </button>
          {DOMAIN_SLUGS.map(domain => {
            const dColor = domainVar(domain)
            return (
              <button
                key={domain}
                className={`btn btn-sm ${activeDomain === domain ? '' : 'btn-ghost'}`}
                onClick={() => setActiveDomain(activeDomain === domain ? null : domain)}
                style={{
                  fontSize: 11,
                  borderColor: activeDomain === domain ? dColor : undefined,
                  background: activeDomain === domain ? `var(--color-accent-subtle)` : undefined,
                  color: activeDomain === domain ? 'var(--color-text)' : undefined,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: dColor, display: 'inline-block',
                  boxShadow: `0 0 6px rgba(255,255,255,0.1)`,
                }} />
                {domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Foundations', '').trim()}
              </button>
            )
          })}
        </div>

        {/* G10: collapsible stroke-pattern legend. Pairs with the stats bar
            at the bottom-left. Collapsed by default; state remembered in
            localStorage so a user who cares about pattern language keeps it
            open, and a user who doesn't never sees it twice. */}
        <GraphLegend />

        {/* Stats bar */}
        <div className="glass" style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          padding: '8px 14px',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          display: 'flex',
          gap: 12,
        }}>
          <span>{filteredNodes.length} topics</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span>{filteredEdges.length} connections</span>
          {activeDomain && (
            <>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <span style={{ color: 'var(--color-text)' }}>
                {activeDomain.replace(/-/g, ' ')}
              </span>
            </>
          )}
        </div>

        {/* Keyboard shortcut hint */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 376,
          fontSize: 10,
          color: 'var(--color-text-muted)',
          opacity: 0.5,
        }}>
          Scroll: zoom &middot; Drag background: pan &middot; Drag node: move
        </div>
      </div>

      {/* Sidebar */}
      <div style={{
        width: 360,
        borderLeft: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        overflow: 'auto',
        flexShrink: 0,
      }}>
        <GraphSidebar
          node={selectedNode}
          prerequisites={prerequisites}
          leadsTo={leadsTo}
          prereqReasons={prereqReasons}
          leadsToReasons={leadsToReasons}
        />
      </div>
    </div>
  )
}

// G10: Stroke-pattern legend. Each row renders a mini SVG sample using the
// same dash-array + width the ForceGraph ring uses on canvas, so the key
// reads as the literal vocabulary of what's on screen. Collapsed default —
// this is for curious users, not a cognitive tax on everyone.
function GraphLegend() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('graph-legend-open') === '1' } catch { return false }
  })
  const toggle = () => setOpen(o => {
    const next = !o
    try { localStorage.setItem('graph-legend-open', next ? '1' : '0') } catch {
      // intentional: localStorage may be unavailable in sandboxed iframes
    }
    return next
  })

  return (
    <div className="glass" style={{
      position: 'absolute',
      bottom: 52,
      left: 16,
      padding: open ? '10px 14px 10px' : '6px 12px',
      fontSize: 11,
      color: 'var(--color-text-muted)',
      minWidth: open ? 220 : undefined,
    }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls="graph-legend-body"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none',
          padding: 0, margin: 0,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <span>Legend</span>
        <span style={{ fontSize: 12, opacity: 0.7 }} aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div id="graph-legend-body" role="list" style={{
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {DOMAIN_SLUGS.map(slug => {
            const dash = DOMAIN_DASH[slug]
            const width = DOMAIN_STROKE_WIDTH[slug]
            return (
              <div
                key={slug}
                role="listitem"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <svg width="36" height="10" viewBox="0 0 36 10" aria-hidden="true">
                  <line
                    x1={2} y1={5} x2={34} y2={5}
                    stroke={domainVar(slug)}
                    strokeWidth={width}
                    strokeDasharray={dash.length ? dash.join(' ') : undefined}
                    strokeLinecap="round"
                  />
                </svg>
                <span style={{ color: 'var(--color-text)', fontSize: 11 }}>
                  {domainLabel(slug)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
