/**
 * AdminReports, D5. Triage for reader-flagged content problems.
 *
 * Self-gating like the other admin pages: non-admins see the
 * not-authorized state. Each report shows the topic (deep-linked), the
 * note, the reporter, and Resolve/Dismiss with an optional closure note
 * (the reviewer-notes pattern: the reason is recorded, not just the
 * state).
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, AdminReport } from '../api/client'
import { useAuthStore } from '../stores/authStore'

type Filter = 'open' | 'resolved' | 'dismissed' | 'all'

export default function AdminReports() {
  const { token, user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'editor'
  const [filter, setFilter] = useState<Filter>('open')
  const [reports, setReports] = useState<AdminReport[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    if (!isAdmin) return
    setErr(null)
    api.adminListReports(filter)
      .then(setReports)
      .catch(e => setErr(e instanceof Error ? e.message : 'Failed to load'))
  }, [filter, isAdmin])

  useEffect(() => { load() }, [load])

  const act = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.adminResolveReport(id, status, noteFor === id ? note : undefined)
      setNoteFor(null)
      setNote('')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!token || !isAdmin) {
    return (
      <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 22, color: 'var(--color-text)' }}>Reports</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          You are not authorized. This surface is for admins and editors.
        </p>
        <Link to="/explore" style={{ color: 'var(--color-accent)', fontSize: 13 }}>← Back to Graph</Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, margin: 0, color: 'var(--color-text)' }}>Content reports</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['open', 'resolved', 'dismissed', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 11,
                fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                border: '1px solid ' + (filter === f ? 'var(--color-accent)' : 'var(--color-border-subtle)'),
                background: filter === f ? 'var(--color-accent-subtle)' : 'transparent',
                color: filter === f ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {err && <p style={{ color: 'var(--color-advanced, #ef4444)', fontSize: 13 }}>{err}</p>}
      {reports === null && !err && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
      {reports && reports.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          No {filter === 'all' ? '' : filter + ' '}reports. Silence is the good state.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reports?.map(r => <ReportRow key={r.id} r={r} onAct={act} noteFor={noteFor} setNoteFor={setNoteFor} note={note} setNote={setNote} />)}
      </div>
    </div>
  )
}

interface ReportRowProps {
  r: AdminReport
  onAct: (id: string, status: 'resolved' | 'dismissed') => Promise<void>
  noteFor: string | null
  setNoteFor: (id: string | null) => void
  note: string
  setNote: (v: string) => void
}

function ReportRow({ r, onAct, noteFor, setNoteFor, note, setNote }: ReportRowProps) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        borderLeft: `3px solid ${r.status === 'open' ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <Link
          to={`/topic/${r.topic_slug}`}
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}
        >
          {r.topic_slug}
        </Link>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          color: r.status === 'open' ? 'var(--color-accent)' : 'var(--color-text-muted)',
        }}>
          {r.status}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
          {new Date(r.created_at).toLocaleDateString()} · {r.reporter_name ?? 'anonymous'}
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>
        {r.note}
      </p>
      {r.resolution_note && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
          Resolution: {r.resolution_note}
        </p>
      )}
      {r.status === 'open' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {noteFor === r.id && (
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="optional closure note"
              style={{
                flex: 1, padding: '6px 10px', fontSize: 12,
                borderRadius: 6, border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-bg)', color: 'var(--color-text)',
              }}
            />
          )}
          <button
            onClick={() => (noteFor === r.id ? void onAct(r.id, 'resolved') : setNoteFor(r.id))}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: '1px solid var(--color-accent)', background: 'transparent',
              color: 'var(--color-accent)', fontWeight: 600,
            }}
          >
            {noteFor === r.id ? 'Confirm resolve' : 'Resolve'}
          </button>
          <button
            onClick={() => { setNoteFor(null); setNote(''); void onAct(r.id, 'dismissed') }}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: '1px solid var(--color-border-subtle)', background: 'transparent',
              color: 'var(--color-text-muted)',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
