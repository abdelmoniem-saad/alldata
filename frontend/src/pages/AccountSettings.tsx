/**
 * AccountSettings, A2.
 *
 * Profile + security, self-gating (redirects anonymous visitors into the
 * sign-in flow via a plain notice). Three sections:
 *
 *  - Profile: display name, bio, institution → PATCH /users/me.
 *  - Password: change, requires the current password.
 *  - Recovery code: generate/rotate the single-use code; shown exactly
 *    once with a copy button, then never again (only the hash lives on
 *    the server).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'

const card: React.CSSProperties = {
  padding: 20,
  borderRadius: 12,
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontFamily: 'inherit',
}

const button: React.CSSProperties = {
  padding: '9px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  color: 'white',
  background: 'var(--color-accent)',
  border: 'none',
  cursor: 'pointer',
}

function Notice({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  const color = kind === 'ok' ? '#22c55e' : 'var(--color-advanced, #ef4444)'
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 6,
      background: kind === 'ok' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      border: `1px solid ${color}44`,
      color,
      fontSize: 12,
    }}>
      {children}
    </div>
  )
}

export default function AccountSettings() {
  const { token, user, refreshUser } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [bio, setBio] = useState('')
  const [institution, setInstitution] = useState('')
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!token || !user) {
    return (
      <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
        <div style={card}>
          <h1 style={{ fontSize: 18, margin: '0 0 8px', color: 'var(--color-text)' }}>Account settings</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            Sign in to manage your account.
          </p>
        </div>
      </div>
    )
  }

  const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

  const saveProfile = async () => {
    setProfileMsg(null)
    try {
      await api.updateMe({
        display_name: displayName,
        bio: bio || undefined,
        institution: institution || undefined,
      })
      await refreshUser()
      setProfileMsg({ kind: 'ok', text: 'Profile saved.' })
    } catch (e) {
      setProfileMsg({ kind: 'err', text: errText(e) })
    }
  }

  const savePassword = async () => {
    setPwMsg(null)
    try {
      await api.changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setPwMsg({ kind: 'ok', text: 'Password changed. Any recovery code was invalidated.' })
    } catch (e) {
      setPwMsg({ kind: 'err', text: errText(e) })
    }
  }

  const newRecoveryCode = async () => {
    try {
      const r = await api.generateRecoveryCode()
      setRecoveryCode(r.recovery_code)
      setCopied(false)
    } catch (e) {
      setPwMsg({ kind: 'err', text: errText(e) })
    }
  }

  const copyCode = async () => {
    if (recoveryCode) {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 22, margin: 0, color: 'var(--color-text)' }}>Account settings</h1>

      <section style={card}>
        <h2 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-text)' }}>Profile</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Display name
            <input style={{ ...input, marginTop: 4 }} value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Bio
            <textarea rows={2} style={{ ...input, marginTop: 4, resize: 'vertical' }} value={bio} onChange={e => setBio(e.target.value)} placeholder={user.bio ? undefined : 'Optional'} />
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Institution
            <input style={{ ...input, marginTop: 4 }} value={institution} onChange={e => setInstitution(e.target.value)} placeholder={user.institution ? undefined : 'Optional'} />
          </label>
          {profileMsg && <Notice kind={profileMsg.kind}>{profileMsg.text}</Notice>}
          <button style={button} onClick={saveProfile}>Save profile</button>
        </div>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-text)' }}>Password</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Current password
            <input type="password" style={{ ...input, marginTop: 4 }} value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            New password
            <input type="password" style={{ ...input, marginTop: 4 }} value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} />
          </label>
          {pwMsg && <Notice kind={pwMsg.kind}>{pwMsg.text}</Notice>}
          <button style={button} onClick={savePassword} disabled={!currentPw || newPw.length < 8}>
            Change password
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--color-text)' }}>Recovery code</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
          AllData has no email service, so this code is your password-reset
          path: generate it, store it somewhere safe (a password manager), and
          sign in with it if you ever lose your password. Each code works once
          and is replaced when you generate a new one.
        </p>
        {recoveryCode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <code style={{
              padding: '10px 12px',
              borderRadius: 6,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              fontSize: 15,
              letterSpacing: 1,
              textAlign: 'center',
              color: 'var(--color-text)',
            }}>
              {recoveryCode}
            </code>
            <Notice kind="ok">
              {copied ? 'Copied. Store it now — this code is never shown again.' : 'Store this somewhere safe now — it will never be shown again.'}
            </Notice>
            <button style={button} onClick={copyCode}>{copied ? 'Copied' : 'Copy code'}</button>
          </div>
        ) : (
          <button style={button} onClick={newRecoveryCode}>Generate recovery code</button>
        )}
      </section>

      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        Public snapshot: <Link to={`/u/${encodeURIComponent(user.display_name)}`} style={{ color: 'var(--color-accent)' }}>/u/{user.display_name}</Link>
      </p>
    </div>
  )
}
