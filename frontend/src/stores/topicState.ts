/**
 * topicState — I5 reactive state bag, per topic.
 *
 * The plan's collapsing insight: there is no separate sim engine. Plot blocks
 * subscribe to named state keys; decision blocks WRITE state on selection;
 * playground sliders are TWO-WAY bound to state. The "consequence" the user
 * feels after a decision is the same plot they're looking at, redrawn from
 * mutated state.
 *
 * One Zustand store holds a `Record<topicSlug, TopicState>` with the user's
 * answers, slider positions, decision selections, and playground success
 * flags. localStorage-persisted so a returning reader keeps their context.
 *
 * Decision-selection and playground-success are kept in `meta.decisions` and
 * `meta.successes` rather than mixed into `state` so resetting state values
 * (slider Reset) doesn't accidentally re-prompt a previously answered
 * decision.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StateValue = number | string | boolean | null

export interface TopicStateRecord {
  /** User-mutable parameters bound to plots / playgrounds. */
  state: Record<string, StateValue>
  /** Author-supplied defaults — restored by `state_reset`. */
  defaults: Record<string, StateValue>
  /** anchor → selected option id, for `decision` blocks. */
  decisions: Record<string, string>
  /** anchor → true once the playground's success_when has fired. */
  successes: Record<string, boolean>
}

interface Store {
  byTopic: Record<string, TopicStateRecord>

  /** Initialize a topic with author defaults (idempotent — won't clobber existing). */
  initTopic: (slug: string, defaults: Record<string, StateValue>) => void
  /** Apply a partial state mutation (e.g. from a decision's `writes`). */
  patchState: (slug: string, patch: Record<string, StateValue>) => void
  /** Reset the state record back to defaults (state_reset directive). */
  resetState: (slug: string) => void

  /** Read state for a topic. Empty record if uninitialized. */
  getState: (slug: string) => Record<string, StateValue>

  /** Decision tracking. */
  selectDecision: (slug: string, anchor: string, optionId: string) => void
  getDecision: (slug: string, anchor: string) => string | null

  /** Playground tracking. */
  markSuccess: (slug: string, anchor: string) => void
  hasSucceeded: (slug: string, anchor: string) => boolean
  /** J4: clear a success flag so the user can re-attempt the goal. */
  clearSuccess: (slug: string, anchor: string) => void
}

const empty = (defaults: Record<string, StateValue> = {}): TopicStateRecord => ({
  state: { ...defaults },
  defaults: { ...defaults },
  decisions: {},
  successes: {},
})

export const useTopicStateStore = create<Store>()(
  persist(
    (set, get) => ({
      byTopic: {},

      initTopic: (slug, defaults) =>
        set(s => {
          const existing = s.byTopic[slug]
          if (existing) {
            // Merge new author-defined defaults without clobbering live state.
            // If author adds a new key in a content edit, seed it; if the user
            // already has a value for an existing key, keep it.
            const mergedState = { ...defaults, ...existing.state }
            return {
              byTopic: {
                ...s.byTopic,
                [slug]: { ...existing, state: mergedState, defaults: { ...defaults } },
              },
            }
          }
          return { byTopic: { ...s.byTopic, [slug]: empty(defaults) } }
        }),

      patchState: (slug, patch) =>
        set(s => {
          const cur = s.byTopic[slug] ?? empty()
          return {
            byTopic: {
              ...s.byTopic,
              [slug]: { ...cur, state: { ...cur.state, ...patch } },
            },
          }
        }),

      resetState: slug =>
        set(s => {
          const cur = s.byTopic[slug]
          if (!cur) return s
          return {
            byTopic: {
              ...s.byTopic,
              [slug]: { ...cur, state: { ...cur.defaults } },
            },
          }
        }),

      getState: slug => get().byTopic[slug]?.state ?? {},

      selectDecision: (slug, anchor, optionId) =>
        set(s => {
          const cur = s.byTopic[slug] ?? empty()
          return {
            byTopic: {
              ...s.byTopic,
              [slug]: { ...cur, decisions: { ...cur.decisions, [anchor]: optionId } },
            },
          }
        }),

      getDecision: (slug, anchor) => get().byTopic[slug]?.decisions?.[anchor] ?? null,

      markSuccess: (slug, anchor) =>
        set(s => {
          const cur = s.byTopic[slug] ?? empty()
          if (cur.successes[anchor]) return s
          return {
            byTopic: {
              ...s.byTopic,
              [slug]: { ...cur, successes: { ...cur.successes, [anchor]: true } },
            },
          }
        }),

      hasSucceeded: (slug, anchor) => Boolean(get().byTopic[slug]?.successes?.[anchor]),

      clearSuccess: (slug, anchor) =>
        set(s => {
          const cur = s.byTopic[slug]
          if (!cur || !cur.successes[anchor]) return s
          const { [anchor]: _dropped, ...rest } = cur.successes
          return {
            byTopic: {
              ...s.byTopic,
              [slug]: { ...cur, successes: rest },
            },
          }
        }),
    }),
    { name: 'alldata-topic-state' },
  ),
)

/**
 * Hook: subscribe to one topic's `state` slice.
 *
 * Returns a stable `[state, patch]` tuple. Plots use `state` keys directly
 * via destructuring; playgrounds use `patch({ mu: 0.5 })`.
 */
export function useTopicState(slug: string): [
  Record<string, StateValue>,
  (patch: Record<string, StateValue>) => void,
] {
  const state = useTopicStateStore(s => s.byTopic[slug]?.state ?? {})
  const patch = useTopicStateStore(s => s.patchState)
  return [state, (p) => patch(slug, p)]
}
