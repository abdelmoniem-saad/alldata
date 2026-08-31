/**
 * AdminUsers, A3.
 *
 * ADMIN-only user management: role assignment + account activation, backed
 * by /api/admin/users. Self-gates like /review — the route is registered
 * open and renders a "not authorized" state for non-admins, so there's no
 * separate server-side redirect dance to maintain.
 */

import { useCallback, useEffect, useState } from 'react'

import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'

const ROLES = ['learner', 'contributor', 'professor', 'editor', 'admin'] as const

interface AdminUserRow {
  id: string
  email: string
  display_name: string
  role: string
  is_active?: boolean
  created_at: string
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  borderBottom: '1px solid var(--color-border)',
}

const td: React.CSSProperties = {
  padding: '10px 10px',
  fontSize: 13,
  color: 'var(--color-text)',
  borderBottom: '1px solid var(--color-border-subtle)',
}

export default function AdminUsers() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      setUsers(await api.adminListUsers())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void load()
    else setLoading(false)
  }, [isAdmin, load])

  const setRole = async (u: AdminUserRow, role: string) => {
    setMsg(null)
    try {
      await api.adminSetRole(u.id, role)
      setMsg(`${u.display_name} is now a ${role}.`)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Role change failed')
    }
  }

  const setActive = async (u: AdminUserRow, active: boolean) => {
    setMsg(null)
    setErr(null)
    try {
      await api.adminSetActive(u.id, active)
      setMsg(`${u.display_name} ${active ? 'reactivated' : 'deactivated'}.`)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Change failed')
    }
  }

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
        <div style={{
          padding: 20,
          borderRadius: 12,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}>
          <h1 style={{ fontSize: 18, margin: '0 0 8px', color: 'var(--color-text)' }}>Not authorized</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            This surface requires the admin role.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--color-text)' }}>Users</h1>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
        Role assignment and account activation. You cannot demote or deactivate
        the last active admin.
      </p>

      {msg && (
        <div style={{
          marginBottom: 12, padding: '8px 10px', borderRadius: 6, fontSize: 12,
          background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#22c55e',
        }}>{msg}</div>
      )}
      {err && (
        <div style={{
          marginBottom: 12, padding: '8px 10px', borderRadius: 6, fontSize: 12,
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--color-advanced, #ef4444)',
        }}>{err}</div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : (
        <div style={{
          borderRadius: 12, overflowX: 'auto',
          border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>User</th>
                <th style={th}>Role</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{u.display_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.email}</div>
                  </td>
                  <td style={td}>
                    <select
                      value={u.role}
                      onChange={e => void setRole(u, e.target.value)}
                      style={{
                        padding: '6px 8px', borderRadius: 6, fontSize: 12,
                        background: 'var(--color-bg)', color: 'var(--color-text)',
                        border: '1px solid var(--color-border)', cursor: 'pointer',
                      }}
                      aria-label={`Role for ${u.display_name}`}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: u.is_active === false ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                      color: u.is_active === false ? 'var(--color-advanced, #ef4444)' : '#22c55e',
                    }}>
                      {u.is_active === false ? 'deactivated' : 'active'}
                    </span>
                  </td>
                  <td style={td}>
                    {u.is_active === false ? (
                      <button onClick={() => void setActive(u, true)} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        background: 'transparent', border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}>Reactivate</button>
                    ) : (
                      <button onClick={() => void setActive(u, false)} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        background: 'transparent', border: '1px solid var(--color-border)',
                        color: 'var(--color-advanced, #ef4444)',
                      }}>Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
