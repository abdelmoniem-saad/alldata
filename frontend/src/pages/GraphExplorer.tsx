import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ForceGraph from '../components/graph/ForceGraph'
import GraphSidebar from '../components/graph/GraphSidebar'
import { useGraphStore } from '../stores/graphStore'
import { api, GraphNode } from '../api/client'
import { DOMAIN_SLUGS, domainVar } from '../lib/domain'

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
        setPrerequisites(prereqs)
        setLeadsTo(leads)
      } catch {
        setPrerequisites([])
        setLeadsTo([])
      }
    }
  }, [selectNode])

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
              Scroll to zoom &middot; Click to select &middot; Double-click to open
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
        />
      </div>
    </div>
  )
}
