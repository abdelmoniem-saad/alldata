/**
 * FlagModal, D5. The lightweight correction door.
 *
 * A reader spots an error mid-lesson and files a note in ten seconds, no
 * account required (signed-in reporters get their identity attached
 * server-side). Portal-rendered like the auth modal so it escapes the
 * topic navbar's transform. Points bigger corrections at the fork flow
 * and the curious at the methodology page.
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

interface Props {
  topicSlug: string
  topicTitle: string
  onClose: () => void
}

export default function FlagModal({ topicSlug, topicTitle, onClose }: Props) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.flagProblem({ topic_slug: topicSlug, note })
      setDone(true)
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : 'Could not send the report')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-overlay)',
        backdropFilter: 'blur(4px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 120,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-in-up"
        style={{
          width: 'min(460px, calc(100vw - 32px))',
          padding: 24,
          borderRadius: 14,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        }}
      >
        {done ? <DoneBody onClose={onClose} /> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Flag a problem
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                  fontSize: 20, lineHeight: 1, padding: 4,
                }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 4px' }}>
              Something wrong or confusing in <strong>{topicTitle}</strong>?
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
              For larger rewrites, fork the topic instead: it becomes a
              suggestion a reviewer can merge.
            </p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={5}
                placeholder="Describe the problem: what is wrong, and where (e.g. the p-value formula in the formal section)."
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
              {err && (
                <div style={{
                  padding: '8px 10px', borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-advanced, #ef4444)', fontSize: 12,
                }}>
                  {err}
                </div>
              )}
              <button
                type="submit"
                disabled={busy || note.trim().length < 10}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  background: 'var(--color-accent)',
                  border: 'none',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy || note.trim().length < 10 ? 0.6 : 1,
                }}
              >
                {busy ? 'Sending…' : 'Send report'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function DoneBody({ onClose }: { onClose: () => void }) {
  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 10px' }}>
        Thank you
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
        Your note is in the review queue for this topic. A maintainer will
        look at it; fixes land through the content pipeline.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link to="/methodology" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
          How this content is made
        </Link>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </>
  )
}
