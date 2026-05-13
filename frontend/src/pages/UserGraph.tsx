/**
 * /u/:username — K7.
 *
 * Public, read-only graph snapshot. Renders the full graph using the named
 * user's progress instead of the viewer's, plus a per-cluster depth indicator
 * showing what fraction of each domain they've completed.
 *
 * Two paths:
 *   - `/u/me` — reads the viewer's local `progressStore`. The shareable
 *     "look at my graph" surface for someone using one browser.
 *   - `/u/:other` — fetches `/api/users/{other}/snapshot`. Server-side sync
 *     isn't yet wired (H10 backlog), so for now this returns an empty set
 *     and the graph renders as "this user hasn't synced yet."
 *
 * The cluster-depth bars never show numbers — only proportional fill. The
 * vision doc's framing: "depth signal, not a grade."
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import ForceGraph, { ForceGraphHandle } from '../components/graph/ForceGraph'
import { api, GraphNode, GraphEdge } from '../api/client'
import { useProgressStore } from '../stores/progressStore'
import { DOMAIN_SLUGS, domainVar, domainLabel } from '../lib/domain'

interface Snapshot {
  username: string
  display_name: string
  completed_slugs: string[]
  in_progress_slugs: string[]
  synced: boolean
}

export default function UserGraph() {
  const { username = '' } = useParams<{ username: string }>()
  const isMe = username === 'me'

  // Local progress (for /u/me) — always read so hook order is stable; only
  // used when isMe.
  const localCompleted = useProgressStore(s => s.completedSlugs)
  const localInProgress = useProgressStore(s => s.inProgressSlugs)

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dim, setDim] = useState({ width: 800, height: 520 })

  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphHandle>(null)

  // Resize observer — keep the canvas filling its container as the window
  // changes width.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      setDim({
        width: Math.floor(r.width),
        height: Math.floor(Math.max(420, r.width * 0.6)),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fetch graph + snapshot.
  useEffect(() => {
    let cancelled = false
    api.getGraph()
      .then(g => {
        if (cancelled) return
        setNodes(g.nodes)
        setEdges(g.edges)
      })
      .catch(err => !cancelled && setError(err.message))

    if (isMe) {
      // Synthesize a snapshot from local progress.
      setSnapshot({
        username: 'me',
        display_name: 'You',
        completed_slugs: localCompleted,
        in_progress_slugs: localInProgress,
        synced: true,
      })
    } else {
      fetch(`/api/users/${encodeURIComponent(username)}/snapshot`)
        .then(r => {
          if (r.status === 404) {
            setError(`No public snapshot for "${username}".`)
            return null
          }
          if (!r.ok) {
            setError(`HTTP ${r.status}`)
            return null
          }
          return r.json()
        })
        .then(s => !cancelled && s && setSnapshot(s))
        .catch(err => !cancelled && setError(err.message))
    }
    return () => { cancelled = true }
    // localCompleted / localInProgress intentionally omitted — only run on
    // username change. The /u/me snapshot stays in sync via the store
    // selector reads above (see useMemo for `progressOverride` below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, isMe])

  // Per-cluster depth: completed-with-content over total-with-content per domain.
  const depthByDomain = useMemo(() => {
    const completed = new Set(snapshot?.completed_slugs ?? [])
    const out: Record<string, { completed: number; total: number }> = {}
    for (const d of DOMAIN_SLUGS) out[d] = { completed: 0, total: 0 }
    for (const n of nodes) {
      if (!n.domain || !out[n.domain]) continue
      if (n.depth === 0) continue          // skip domain root nodes
      if (!n.has_content) continue          // empty shells don't count toward total
      out[n.domain].total++
      if (completed.has(n.slug)) out[n.domain].completed++
    }
    return out
  }, [nodes, snapshot])

  const progressOverride = useMemo(() => {
    if (!snapshot) return null
    if (isMe) {
      // Live-tracking the viewer's store — reuse the latest values.
      return {
        completedSlugs: localCompleted,
        inProgressSlugs: localInProgress,
      }
    }
    return {
      completedSlugs: snapshot.completed_slugs,
      inProgressSlugs: snapshot.in_progress_slugs,
    }
  }, [snapshot, isMe, localCompleted, localInProgress])

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-12)' }}>
        <h1 style={{
          fontSize: 'var(--text-h1-size)',
          fontFamily: 'var(--font-serif)',
          marginBottom: 'var(--space-3)',
        }}>
          Snapshot not found
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-10) var(--space-6)' }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-2)',
        }}>
          Public snapshot
        </div>
        <h1 style={{
          fontSize: 'var(--text-h1-size)',
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          letterSpacing: 'var(--text-h1-tracking)',
          marginBottom: 'var(--space-2)',
        }}>
          {snapshot?.display_name ?? username}
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-body-size)',
          lineHeight: 'var(--text-body-line)',
        }}>
          The graph below is what {isMe ? 'you have' : `${snapshot?.display_name ?? 'this user'} has`} visited. Completed nodes glow domain-hued; gaps are honest.
          {!isMe && snapshot && !snapshot.synced && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              {' '}This account hasn't synced progress yet — the platform's progress sync arrives in a future cycle.
            </span>
          )}
        </p>
      </header>

      <div ref={containerRef} style={{
        width: '100%',
        marginBottom: 'var(--space-8)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-secondary)',
        overflow: 'hidden',
      }}>
        {nodes.length > 0 && (
          <ForceGraph
            ref={graphRef}
            nodes={nodes}
            edges={edges}
            width={dim.width}
            height={dim.height}
            progressOverride={progressOverride}
          />
        )}
      </div>

      {/* Cluster-depth bars — proportional fill, no numbers. */}
      <section>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-3)',
        }}>
          Depth by cluster
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {DOMAIN_SLUGS.map(d => {
            const { completed, total } = depthByDomain[d] ?? { completed: 0, total: 0 }
            const pct = total === 0 ? 0 : completed / total
            return (
              <div key={d}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 6,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: domainVar(d),
                  }} />
                  {domainLabel(d)}
                </div>
                <div style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--color-border-subtle)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.round(pct * 100)}%`,
                    height: '100%',
                    background: domainVar(d),
                    transition: 'width var(--transition-smooth)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
