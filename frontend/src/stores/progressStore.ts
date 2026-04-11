import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProgressState {
  completedSlugs: string[]
  inProgressSlugs: string[]

  markCompleted: (slug: string) => void
  markInProgress: (slug: string) => void
  unmarkCompleted: (slug: string) => void
  isCompleted: (slug: string) => boolean
  isInProgress: (slug: string) => boolean
  getCompletedSet: () => Set<string>
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedSlugs: [],
      inProgressSlugs: [],

      markCompleted: (slug: string) =>
        set(state => ({
          completedSlugs: state.completedSlugs.includes(slug)
            ? state.completedSlugs
            : [...state.completedSlugs, slug],
          inProgressSlugs: state.inProgressSlugs.filter(s => s !== slug),
        })),

      markInProgress: (slug: string) =>
        set(state => ({
          inProgressSlugs: state.inProgressSlugs.includes(slug) || state.completedSlugs.includes(slug)
            ? state.inProgressSlugs
            : [...state.inProgressSlugs, slug],
        })),

      unmarkCompleted: (slug: string) =>
        set(state => ({
          completedSlugs: state.completedSlugs.filter(s => s !== slug),
        })),

      isCompleted: (slug: string) => get().completedSlugs.includes(slug),
      isInProgress: (slug: string) => get().inProgressSlugs.includes(slug),
      getCompletedSet: () => new Set(get().completedSlugs),
    }),
    {
      name: 'alldata-progress',
    }
  )
)
