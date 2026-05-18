/**
 * authStore — M1.
 *
 * One place for "am I logged in, and as whom?" Persisted to localStorage
 * (key `alldata-auth`) so the token survives a refresh. The `request()`
 * wrapper in `api/client.ts` reads from `localStorage.getItem('token')` —
 * we keep that key in sync via the persist middleware so the wrapper
 * stays untouched.
 *
 * Login + register both round-trip through `api.login` / `api.register`
 * and set `{ token, user }` on success. Logout clears them. The
 * `syncOrchestrator` subscribes to this store to drive boot-pull on
 * login, push-on-mutation while authenticated, and stop-on-logout.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { api } from '../api/client'

export interface AuthUser {
  id: string
  email: string
  display_name: string
  role?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, display_name: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const r = await api.login(email, password)
        // Keep the legacy `token` localStorage key in sync — request()
        // reads from it directly without going through the store.
        localStorage.setItem('token', r.access_token)
        set({ token: r.access_token, user: r.user })
      },

      register: async (email, display_name, password) => {
        const r = await api.register(email, display_name, password)
        localStorage.setItem('token', r.access_token)
        set({ token: r.access_token, user: r.user })
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null })
      },
    }),
    {
      name: 'alldata-auth',
      // On rehydrate, mirror the persisted token back into the legacy
      // `token` localStorage key. Belt-and-suspenders: the persist
      // middleware writes `alldata-auth`, but `request()` reads `token`.
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('token', state.token)
        }
      },
    }
  )
)
