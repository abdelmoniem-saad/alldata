/**
 * AuthMenu — M1.
 *
 * Navbar account chip. Two states:
 *
 *   - Anonymous: a small "Sign in" button that opens a modal with a
 *     toggleable login/register form.
 *   - Authenticated: shows the display name + a popover with "Sign out"
 *     and a link to `/u/{display_name}` (the public snapshot view).
 *
 * The modal lives here (not in Layout.tsx) so the chrome surface stays
 * skim-able. Both forms wire into `useAuthStore`; the sync orchestrator
 * subscribes to the same store, so logging in automatically triggers the
 * initial push + pull.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuthStore } from '../stores/authStore'

export default function AuthMenu() {
  const { token, user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // Close popover on outside-click.
  useEffect(() => {
    if (!popoverOpen) return
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [popoverOpen])

  if (token && user) {
    const initials =
      user.display_name
        ?.split(/\s+/)
        .map(s => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'
    return (
      <div ref={popoverRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setPopoverOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-accent)',
            fontWeight: 600,
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          aria-label={`Account: ${user.display_name}`}
          title={user.display_name}
        >
          {initials}
        </button>
        {popoverOpen && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              right: 0,
              top: 38,
              minWidth: 200,
              padding: 8,
              borderRadius: 10,
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              zIndex: 200,
            }}
          >
            <div style={{
              padding: '8px 10px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text)',
            }}>
              {user.display_name}
            </div>
            <div style={{
              padding: '0 10px 8px',
              fontSize: 11,
              color: 'var(--color-text-muted)',
            }}>
              {user.email}
            </div>
            <Link
              to={`/u/${encodeURIComponent(user.display_name)}`}
              onClick={() => setPopoverOpen(false)}
              style={{
                display: 'block',
                padding: '8px 10px',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                borderRadius: 6,
              }}
            >
              View my snapshot
            </Link>
            <button
              onClick={() => {
                setPopoverOpen(false)
                logout()
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 6,
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '5px 12px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-accent)',
          background: 'var(--color-accent-subtle)',
          border: '1px solid transparent',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        Sign in
      </button>
      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  )
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, displayName || email.split('@')[0], password)
      }
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
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
          width: 'min(420px, calc(100vw - 32px))',
          padding: 24,
          borderRadius: 14,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--color-text)',
            margin: 0,
          }}>
            {mode === 'login' ? 'Sign in' : 'Create an account'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p style={{
          margin: '0 0 16px',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}>
          Sign in to sync your progress across devices. Your local progress
          merges into your account on first sign-in.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (
            <Field
              label="Display name"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              autoComplete="username"
              required
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />
          {err && (
            <div style={{
              padding: '8px 10px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-advanced, #ef4444)',
              fontSize: 12,
            }}>
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !email || !password || (mode === 'register' && !displayName)}
            style={{
              marginTop: 4,
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              background: 'var(--color-accent)',
              border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(m => (m === 'login' ? 'register' : 'login'))
              setErr(null)
            }}
            style={{
              marginTop: 4,
              padding: '6px 10px',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {mode === 'login'
              ? "Don't have an account? Create one."
              : 'Already have an account? Sign in.'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        style={{
          padding: '8px 10px',
          borderRadius: 6,
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      />
    </label>
  )
}
