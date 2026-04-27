/**
 * progressStore — completion tracking + decision-event log.
 *
 * J4 split with `useTopicState`:
 *   - `useTopicState` owns the *world state* — the values plots react to
 *     (mu, sigma, prior, treatment_strategy, ...). Decision option `writes:`
 *     dispatch into this store; plots subscribe.
 *   - `progressStore` owns the *event log* — completions, in-progress slugs,
 *     and "which option did the user pick on this decision, when." Branch
 *     filtering (`depends_on`/`branch`) reads from here so the source of
 *     truth for "have they answered this decision?" is unambiguous.
 *
 * Both stores persist to localStorage. They never write each other; the
 * DecisionBlock dispatches to both at selection time and that's the only
 * cross-store coupling.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DecisionEvent {
  optionId: string
  /** Epoch ms — the moment the user picked. */
  pickedAt: number
}

interface ProgressState {
  completedSlugs: string[]
  inProgressSlugs: string[]
  /**
   * Per-topic, per-anchor record of the user's decision pick. The shape is
   * flat enough that selectors can subscribe to a single anchor's event
   * without dragging in unrelated topics.
   */
  decisionEvents: Record<string, Record<string, DecisionEvent>>

  markCompleted: (slug: string) => void
  markInProgress: (slug: string) => void
  unmarkCompleted: (slug: string) => void
  isCompleted: (slug: string) => boolean
  isInProgress: (slug: string) => boolean
  getCompletedSet: () => Set<string>

  /** Record the user's pick on a decision. Overwrites any prior pick. */
  recordDecision: (slug: string, anchor: string, optionId: string) => void
  /** Read the most recent pick for a (slug, anchor). Returns null if none. */
  getDecisionEvent: (slug: string, anchor: string) => DecisionEvent | null
  /** Clear a decision — used by "change my answer" affordances. */
  clearDecision: (slug: string, anchor: string) => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedSlugs: [],
      inProgressSlugs: [],
      decisionEvents: {},

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

      recordDecision: (slug, anchor, optionId) =>
        set(state => {
          const events = state.decisionEvents ?? {}
          return {
            decisionEvents: {
              ...events,
              [slug]: {
                ...(events[slug] ?? {}),
                [anchor]: { optionId, pickedAt: Date.now() },
              },
            },
          }
        }),

      getDecisionEvent: (slug, anchor) =>
        get().decisionEvents?.[slug]?.[anchor] ?? null,

      clearDecision: (slug, anchor) =>
        set(state => {
          const events = state.decisionEvents ?? {}
          const topicEvents = events[slug]
          if (!topicEvents || !(anchor in topicEvents)) return state
          const { [anchor]: _dropped, ...rest } = topicEvents
          return {
            decisionEvents: { ...events, [slug]: rest },
          }
        }),
    }),
    {
      name: 'alldata-progress',
      version: 2,
      // J4: progressStore gained `decisionEvents` in the J cycle. Old
      // localStorage from before this cycle lacks the field; without a
      // migrate, the rehydrated state is missing it and any read of
      // `s.decisionEvents[slug]` throws synchronously. Force the field to
      // exist on rehydrate.
      migrate: (persisted: unknown, _version: number) => {
        const p = (persisted as Partial<ProgressState>) ?? {}
        return {
          completedSlugs: p.completedSlugs ?? [],
          inProgressSlugs: p.inProgressSlugs ?? [],
          decisionEvents: p.decisionEvents ?? {},
        } as ProgressState
      },
    }
  )
)
