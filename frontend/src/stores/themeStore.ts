import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// V2: a third, user-selectable high-contrast theme alongside dark/light.
// `toggleTheme` now cycles dark → light → high-contrast → dark.
export type Theme = 'dark' | 'light' | 'high-contrast'
const THEME_ORDER: Theme[] = ['dark', 'light', 'high-contrast']

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
      toggleTheme: () => set((state) => {
        const next = THEME_ORDER[(THEME_ORDER.indexOf(state.theme) + 1) % THEME_ORDER.length]
        document.documentElement.setAttribute('data-theme', next)
        return { theme: next }
      }),
    }),
    {
      name: 'alldata-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme)
        }
      },
    }
  )
)
