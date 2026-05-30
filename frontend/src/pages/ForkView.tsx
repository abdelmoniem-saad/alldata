/**
 * ForkView — N (fork model).
 *
 * Reads one user's fork of a topic at `/u/:username/topic/:slug`. Renders
 * through the same `ScrollReader` the master topic page uses — the fork's
 * `content_blocks` come back already parsed from the server.
 *
 * Differences from `TopicView`:
 *   - A lineage banner ("Fork of {master} by {username}") above the header.
 *   - No "Mark Learned" — fork engagement is namespaced separately and
 *     doesn't touch the reader's master-topic completion.
 *   - An "Edit" affordance, owner-only, routing to the fork editor.
 *   - A lightweight bespoke chrome (layer toggle + back link) rather than
 *     the full `ZenChrome` — a fork is a distinct surface.
 *
 * Progress namespace: `ScrollReader` is handed `slug = "fork:{username}:
 * {slug}"` so decision events / topic state for a fork don't collide with
 * the master topic's.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'

import { api, ForkDetail } from '../api/client'
import ScrollReader from '../components/topic/ScrollReader'
import { useAuthStore } from '../stores/authStore'

type Layer = 'intuition' | 'formal' | 'both'

export default function ForkView() {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [fork, setFork] = useState<ForkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeLayer, setActiveLayer] = useState<Layer>('intuition')
  const [readProgress, setReadProgress] = useState(0)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  // O0: resolve the `me` alias. `/u/me/topic/:slug` is what "Open my fork"
  // and the editor's back-link both navigate to, but `me` is not a real
  // username — the backend's fuzzy lookup would 404. Redirect (replace)
  // to the canonical `/u/{display_name}/topic/{slug}` so the address bar
  // carries a real, shareable URL. Anonymous viewers have no "my fork";
  // bounce them to the master topic.
  const isMeAlias = username === 'me'
  useEffect(() => {
    if (!isMeAlias || !slug) return
    if (user?.display_name) {
      navigate(`/u/${encodeURIComponent(user.display_name)}/topic/${slug}`, { replace: true })
    } else {
      navigate(`/topic/${slug}`, { replace: true })
    }
  }, [isMeAlias, slug, user, navigate])

  useEffect(() => {
    // Skip the fetch while the `me` redirect resolves — `username` is
    // still the literal alias and the API call would 404.
    if (!username || !slug || isMeAlias) return
    setLoading(true)
    setError(null)
    api.getFork(username, slug)
      .then(setFork)
      .catch(err => setError(err instanceof Error ? err.message : 'Fork not found'))
      .finally(() => setLoading(false))
  }, [username, slug, isMeAlias])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollHeight = el.scrollHeight - el.clientHeight
    setReadProgress(scrollHeight > 0 ? Math.min(el.scrollTop / scrollHeight, 1) : 0)
  }, [])

  // Whether the viewer owns this fork — drives the Edit affordance.
  const isOwner = useMemo(
    () => Boolean(user && fork && user.id && fork.owner_display_name === user.display_name),
    [user, fork],
  )

  // Fork progress is namespaced so reading a fork never mutates master-topic
  // completion / decision state.
  const forkSlug = username && slug ? `fork:${username}:${slug}` : ''

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <div className="skeleton" style={{ width: '55%', height: 32, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '80%', height: 16, marginBottom: 32 }} />
        <div className="skeleton" style={{ width: '100%', height: 200 }} />
      </div>
    )
  }

  if (error || !fork) {
    return (
      <div className="animate-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: 16,
      }}>
        <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          Fork not found
        </p>
        <Link to="/explore" className="btn">Back to Graph</Link>
      </div>
    )
  }

  const master = fork.original_topic

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="animate-fade-in"
        style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', overflow: 'auto' }}
      >
        <ScrollReader
          blocks={fork.content_blocks}
          misconceptions={fork.misconceptions}
          activeLayer={activeLayer}
          scrollRef={scrollRef}
          slug={forkSlug}
          header={
            <div style={{ marginBottom: 48, maxWidth: 760, margin: '0 auto 48px' }}>
              {/* Lineage banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                marginBottom: 20,
                borderLeft: '3px solid var(--color-accent)',
                background: 'var(--color-accent-subtle)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
              }}>
                <span>
                  Fork of{' '}
                  <Link to={`/topic/${master.slug}`} style={{
                    color: 'var(--color-accent)', fontWeight: 600,
                  }}>
                    {master.title}
                  </Link>
                  {' '}by{' '}
                  <Link to={`/u/${encodeURIComponent(fork.username)}`} style={{
                    color: 'var(--color-text)', fontWeight: 600,
                  }}>
                    {fork.owner_display_name}
                  </Link>
                </span>
                {/* O1: merge-back status of this fork, when present. */}
                {fork.suggestion_status && <ForkStatusChip status={fork.suggestion_status} />}
              </div>
              <h1 style={{
                fontSize: 'clamp(32px, 5vw, 56px)',
                fontWeight: 700,
                fontFamily: 'var(--font-serif)',
                letterSpacing: '-1.5px',
                lineHeight: 1.05,
                color: 'var(--color-text)',
                marginBottom: 16,
              }}>
                {fork.topic_title}
              </h1>
            </div>
          }
        />
      </div>

      {/* Read-progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 98,
        pointerEvents: 'none',
      }}>
        <div style={{
          height: '100%',
          width: `${readProgress * 100}%`,
          background: 'var(--color-accent)',
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Bespoke fork chrome — layer toggle + back link + (owner) edit */}
      <div className="zen-bottom-bar">
        <Link
          to={`/topic/${master.slug}`}
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.3px',
            color: 'var(--color-text-muted)',
            padding: '5px 10px',
          }}
        >
          ← {master.title}
        </Link>

        <div style={{
          display: 'inline-flex', gap: 2, padding: 2,
          borderRadius: 8,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
        }}>
          {(['intuition', 'formal', 'both'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: activeLayer === layer ? 'var(--color-accent)' : 'transparent',
                color: activeLayer === layer ? 'white' : 'var(--color-text-muted)',
                fontSize: 11,
                fontWeight: activeLayer === layer ? 600 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.3px',
              }}
            >
              {layer === 'both' ? 'All' : layer}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {isOwner && (
            <Link
              to={`/u/me/topic/${master.slug}/edit`}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: 'white',
                background: 'var(--color-accent)',
                textDecoration: 'none',
              }}
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

// O1: merge-back status chip surfaced in the lineage banner.
function ForkStatusChip({ status }: { status: 'pending' | 'accepted' | 'rejected' }) {
  const { bg, color, text, title } = (() => {
    if (status === 'accepted') return {
      bg: 'rgba(34,197,94,0.15)', color: 'var(--color-intro, #22c55e)',
      text: 'Merged', title: 'This fork has been merged into the master topic.',
    }
    if (status === 'rejected') return {
      bg: 'rgba(239,68,68,0.12)', color: 'var(--color-advanced, #ef4444)',
      text: 'Declined', title: 'A reviewer declined a previous suggestion.',
    }
    return {
      bg: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
      text: 'In review', title: 'A reviewer is considering this suggestion.',
    }
  })()
  return (
    <span title={title} style={{
      marginLeft: 8,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.4px', textTransform: 'uppercase',
      background: bg, color,
    }}>
      {text}
    </span>
  )
}
