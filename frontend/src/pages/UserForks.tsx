/**
 * UserForks — N (fork model).
 *
 * Card grid of a user's forks at `/u/:username/forks`. The `:username`
 * segment may be the literal `me` — resolved to the signed-in user, who
 * then gets edit/delete affordances. Anyone else's listing is read-only.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api, ForkSummary } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { domainVar, domainLabel, domainTick } from '../lib/domain'

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? 'a month ago' : `${months} months ago`
}

export default function UserForks() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const viewingSelf = username === 'me' || username === user?.display_name
  const effectiveUsername = useMemo(
    () => (username === 'me' ? user?.display_name ?? '' : username ?? ''),
    [username, user],
  )

  const [forks, setForks] = useState<ForkSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useMemo(
    () => () => {
      if (!effectiveUsername) {
        setError('Sign in to see your forks.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      const fetcher = viewingSelf ? api.listMyForks() : api.listForks(effectiveUsername)
      fetcher
        .then(setForks)
        .catch(err => setError(err instanceof Error ? err.message : 'Could not load forks'))
        .finally(() => setLoading(false))
    },
    [effectiveUsername, viewingSelf],
  )

  useEffect(load, [load])

  const handleDelete = async (fork: ForkSummary) => {
    if (!window.confirm(`Delete your fork of "${fork.topic_title}"?`)) return
    try {
      await api.deleteFork(effectiveUsername, fork.topic_slug)
      setForks(prev => prev.filter(f => f.id !== fork.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{
        fontSize: 'clamp(26px, 4vw, 38px)',
        fontFamily: 'var(--font-serif)',
        fontWeight: 700,
        letterSpacing: '-1px',
        color: 'var(--color-text)',
        marginBottom: 8,
      }}>
        {viewingSelf ? 'My forks' : `${effectiveUsername}'s forks`}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 32 }}>
        {viewingSelf
          ? 'Your editable copies of topics. Edits never touch the master content.'
          : `Forks ${effectiveUsername} has made.`}
      </p>

      {loading && (
        <div className="skeleton" style={{ width: '100%', height: 120 }} />
      )}

      {error && (
        <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
      )}

      {!loading && !error && forks.length === 0 && (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          {viewingSelf
            ? 'No forks yet. Open any topic and use "Fork this topic" to make one.'
            : 'This user has no forks yet.'}
        </div>
      )}

      {!loading && forks.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {forks.map(fork => (
            <div
              key={fork.id}
              style={{
                padding: 18,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
              }}>
                <span style={{ color: domainVar(fork.topic_domain) }}>
                  {domainTick(fork.topic_domain)}
                </span>
                {domainLabel(fork.topic_domain)}
                {fork.topic_difficulty && <span>· {fork.topic_difficulty}</span>}
              </div>
              <h3 style={{
                fontSize: 17, fontWeight: 700, color: 'var(--color-text)',
                lineHeight: 1.25,
              }}>
                {fork.topic_title}
              </h3>
              <Link
                to={`/topic/${fork.topic_slug}`}
                style={{ fontSize: 12, color: 'var(--color-accent)' }}
              >
                Fork of {fork.topic_title} (master)
              </Link>
              <div style={{
                fontSize: 11, color: 'var(--color-text-muted)',
                marginTop: 2,
              }}>
                Last edited {timeAgo(fork.updated_at)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Link
                  to={`/u/${encodeURIComponent(fork.username)}/topic/${fork.topic_slug}`}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 12,
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  Read
                </Link>
                {viewingSelf && (
                  <>
                    <button
                      onClick={() => navigate(`/u/me/topic/${fork.topic_slug}/edit`)}
                      style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        fontWeight: 600, border: 'none',
                        background: 'var(--color-accent)', color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(fork)}
                      style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        border: '1px solid var(--color-border)',
                        background: 'transparent', color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
