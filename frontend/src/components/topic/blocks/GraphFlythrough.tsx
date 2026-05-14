/**
 * GraphFlythrough — K2.
 *
 * Mounts a small ForceGraph in the right column of ScrollReader and
 * imperatively pans+zooms it to the `target` slug as the reader scrolls.
 * Used by the "Shape of Statistics" intro topic and any future tour topic
 * that wants the graph itself to be the visual.
 *
 * Reuses everything ForceGraph exposes:
 *   - the existing canvas-based render pipeline
 *   - `centerOnSlug` from `ForceGraphHandle` (H6)
 *   - the same domain palette + difficulty patterns + completion glow
 *
 * What's deliberately small:
 *   - No interactive node selection (no `onNodeClick` wiring) — the
 *     flythrough is the lesson; clicks would steal it.
 *   - Reduced-motion: `centerOnSlug` is the same path the search chip uses,
 *     which already honors the reduced-motion gate.
 *   - Data fetched once on mount, kept for the lifetime of the topic page.
 */

import { useEffect, useRef, useState } from 'react'
import ForceGraph, { ForceGraphHandle } from '../../graph/ForceGraph'
import { api, GraphNode, GraphEdge } from '../../../api/client'

interface Props {
  /** Slug of the node (or domain root) to center on. */
  target: string
  width?: number
  height?: number
}

// L5: session-scoped cache for the graph payload. A tour topic that uses
// multiple `graph_view` directives mounts a fresh `GraphFlythrough` per
// section, and without this cache every section re-fetched `/api/graph`.
// The graph is theme-independent and stable for a session; we keep the
// payload + the in-flight promise so concurrent mounts share one fetch.
type GraphPayload = { nodes: GraphNode[]; edges: GraphEdge[] }
let _graphCache: GraphPayload | null = null
let _graphInflight: Promise<GraphPayload> | null = null

async function fetchGraphCached(): Promise<GraphPayload> {
  if (_graphCache) return _graphCache
  if (_graphInflight) return _graphInflight
  _graphInflight = api.getGraph().then(g => {
    _graphCache = { nodes: g.nodes, edges: g.edges }
    _graphInflight = null
    return _graphCache
  }).catch(err => {
    _graphInflight = null
    throw err
  })
  return _graphInflight
}

export default function GraphFlythrough({ target, width = 420, height = 360 }: Props) {
  const handleRef = useRef<ForceGraphHandle>(null)
  const [nodes, setNodes] = useState<GraphNode[]>(_graphCache?.nodes ?? [])
  const [edges, setEdges] = useState<GraphEdge[]>(_graphCache?.edges ?? [])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (_graphCache) return
    let cancelled = false
    fetchGraphCached()
      .then(g => {
        if (cancelled) return
        setNodes(g.nodes)
        setEdges(g.edges)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message ?? 'Failed to load graph')
      })
    return () => { cancelled = true }
  }, [])

  // Pan + zoom whenever the target changes. The handle is set on first
  // ForceGraph mount; we wait for it via a microtask in case state updates
  // arrive in the same render as the mount.
  useEffect(() => {
    if (!target || nodes.length === 0) return
    const tick = () => handleRef.current?.centerOnSlug(target)
    // Two RAF-style attempts cover the case where ForceGraph's effect that
    // installs the imperative handle hasn't fired yet on first paint.
    const t1 = setTimeout(tick, 0)
    const t2 = setTimeout(tick, 80)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [target, nodes.length])

  if (error) {
    return (
      <div style={{
        padding: 12,
        borderRadius: 'var(--radius)',
        border: '1px dashed var(--color-border-subtle)',
        color: 'var(--color-text-muted)',
        fontSize: 12,
      }}>
        Couldn't load the graph: {error}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div
        aria-busy="true"
        style={{
          width, height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-muted)', fontSize: 12,
        }}
      >
        Loading the graph…
      </div>
    )
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      <ForceGraph
        ref={handleRef}
        nodes={nodes}
        edges={edges}
        width={width}
        height={height}
        highlightedNode={target}
      />
    </div>
  )
}
