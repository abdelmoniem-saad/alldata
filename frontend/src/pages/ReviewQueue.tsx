/**
 * ReviewQueue — O1 (`/review`).
 *
 * The merge-back review surface. ADMIN/EDITOR only.
 *
 * Layout: two panes. The left lists every suggestion (pending grouped
 * first), the right shows the selected suggestion's diff + accept/reject
 * controls. The component reads role from `authStore` and short-circuits
 * to a "not authorized" state for everyone else.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { api, ApiError, type MergeBackDetail, type MergeBackSummary } from '../api/client'
import MergeDiff from '../components/MergeDiff'
import { useAuthStore } from '../stores/authStore'

export default function ReviewQueue() {
  const { user, token } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('id')

  const [list, setList] = useState<MergeBackSummary[] | null>(null)
  const [detail, setDetail] = useState<MergeBackDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  // Role gate. The route is registered without a guard so an anonymous
  // visitor still gets a clear "sign in" message instead of a redirect
  // loop; signed-in non-reviewers get a clear "not authorized" message.
  const canReview = useMemo(
    () => Boolean(user && (user.role === 'admin' || user.role === 'editor')),
    [user],
  )

  // Load the queue when we mount + when the role check passes.
  useEffect(() => {
    if (!canReview) return
    let cancelled = false
    setError(null)
    api.listMergeBacks()
      .then(rows => { if (!cancelled) setList(rows) })
      .catch((e: unknown) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 403) {
          setError('Only admins and editors can review merge-back suggestions.')
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load review queue.')
        }
      })
    return () => { cancelled = true }
  }, [canReview])

  // Load the selected suggestion's detail.
  useEffect(() => {
    if (!canReview || !selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    api.getMergeBack(selectedId)
      .then(d => { if (!cancelled) setDetail(d) })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load suggestion.')
      })
    return () => { cancelled = true }
  }, [canReview, selectedId])

  const refresh = useCallback(async () => {
    if (!canReview) return
    try {
      const rows = await api.listMergeBacks()
      setList(rows)
      if (selectedId) {
        const updated = await api.getMergeBack(selectedId)
        setDetail(updated)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed.')
    }
  }, [canReview, selectedId])

  const onAccept = useCallback(async () => {
    if (!detail || busy) return
    setBusy(true)
    setError(null)
    try {
      await api.acceptMergeBack(detail.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Accept failed.')
    } finally {
      setBusy(false)
    }
  }, [detail, busy, refresh])

  const onReject = useCallback(async () => {
    if (!detail || busy) return
    setBusy(true)
    setError(null)
    try {
      await api.rejectMergeBack(detail.id, rejectNote.trim() || null)
      setRejectNote('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed.')
    } finally {
      setBusy(false)
    }
  }, [detail, busy, rejectNote, refresh])

  // ─── render ──────────────────────────────────────────────────────────

  if (!token) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Review queue</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Sign in as an admin or editor to access the merge-back review queue.
        </p>
        <Link to="/" style={{ color: 'var(--color-accent)' }}>← Home</Link>
      </div>
    )
  }

  if (!canReview) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Not authorized</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Only admins and editors can review merge-back suggestions.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(260px, 320px) 1fr',
      gap: 24,
      padding: '24px clamp(16px, 4vw, 48px)',
      minHeight: 'calc(100vh - 52px)',
    }}>
      {/* ─── left pane — list ──────────────────────────────────────── */}
      <aside style={{ minWidth: 0 }}>
        <h2 style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}>
          Review queue
        </h2>
        {list == null ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</p>
        ) : list.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            Nothing pending. Forks the team suggests for the master will show up here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {list.map(row => (
              <button
                key={row.id}
                onClick={() => setSearchParams({ id: row.id })}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid ' + (selectedId === row.id
                    ? 'var(--color-accent)'
                    : 'var(--color-border-subtle)'),
                  background: selectedId === row.id
                    ? 'var(--color-accent-subtle)'
                    : 'var(--color-bg-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusPill status={row.status} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{row.topic_title}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  by {row.suggester_display_name} · {new Date(row.updated_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
        {error && (
          <p style={{ color: 'var(--color-advanced, #ef4444)', fontSize: 12, marginTop: 12 }}>
            {error}
          </p>
        )}
      </aside>

      {/* ─── right pane — detail ────────────────────────────────────── */}
      <main style={{ minWidth: 0 }}>
        {detail == null ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            Select a suggestion from the queue.
          </p>
        ) : (
          <div>
            <header style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                  {detail.topic_title}
                </h1>
                <StatusPill status={detail.status} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                Suggested by <strong>{detail.suggester_display_name}</strong>
                {' · '}
                <Link to={`/topic/${detail.topic_slug}`}>master topic</Link>
                {detail.reviewed_at && (
                  <>
                    {' · '}
                    {detail.status === 'accepted' ? 'Accepted' : 'Rejected'} by
                    {' '}<strong>{detail.reviewer_display_name}</strong>
                    {' '}on {new Date(detail.reviewed_at).toLocaleString()}
                  </>
                )}
              </p>
              {detail.review_note && (
                <p style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-secondary)',
                  fontSize: 13,
                }}>
                  <strong>Reviewer note:</strong> {detail.review_note}
                </p>
              )}
            </header>

            <MergeDiff master={detail.master_markdown} suggested={detail.suggested_markdown} />

            {detail.status === 'pending' && (
              <div style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                marginTop: 16,
                padding: 12,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}>
                <button
                  onClick={onAccept}
                  disabled={busy}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'white',
                    background: 'var(--color-intro, #22c55e)',
                    border: 'none',
                    cursor: busy ? 'wait' : 'pointer',
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? 'Working…' : 'Accept — apply to master'}
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="text"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="Optional reject note (visible to the suggester)"
                    style={{
                      padding: '7px 10px',
                      fontSize: 12,
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={onReject}
                    disabled={busy}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-advanced, #ef4444)',
                      background: 'transparent',
                      border: '1px solid var(--color-advanced, #ef4444)',
                      cursor: busy ? 'wait' : 'pointer',
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusPill({ status }: { status: 'pending' | 'accepted' | 'rejected' }) {
  const { bg, color, text } = (() => {
    if (status === 'accepted') {
      return {
        bg: 'rgba(34,197,94,0.15)',
        color: 'var(--color-intro, #22c55e)',
        text: 'Accepted',
      }
    }
    if (status === 'rejected') {
      return {
        bg: 'rgba(239,68,68,0.12)',
        color: 'var(--color-advanced, #ef4444)',
        text: 'Rejected',
      }
    }
    return {
      bg: 'var(--color-accent-subtle)',
      color: 'var(--color-accent)',
      text: 'Pending',
    }
  })()
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.4px',
      textTransform: 'uppercase',
      background: bg,
      color,
    }}>
      {text}
    </span>
  )
}
