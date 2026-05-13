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

/**
 * SM-2 review record for a topic. K3.
 *
 * `ease` is the ease factor (clamped to ≥ 1.3). `interval` is the gap in days
 * since the last review; the next review is due at `lastReviewedAt + interval`.
 * `quality` (passed to `recordReview`) is the SM-2 0–5 self-rating; we only
 * surface three values via the UI: 1 ("show me again"), 3 ("coming back"), 5
 * ("I remember").
 */
export interface ReviewRecord {
  ease: number
  /** Days. */
  interval: number
  /** Epoch ms — last reviewed; on first completion, this is set so the first
   *  review fires after `interval` days. */
  lastReviewedAt: number
  /** Epoch ms — when the next review becomes due. Materialized for cheap
   *  selector reads. */
  dueAt: number
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

  /** K3: SM-2 schedule per completed topic. */
  reviewSchedule: Record<string, ReviewRecord>

  /**
   * K4: per-(slug, blockId) "I want to revisit this" flag count. Stored as
   * a count not a boolean so a future server-aggregation pass can sum
   * across users; for now, the count is just 0/1 since one local browser
   * session toggles a single flag.
   */
  confusionFlags: Record<string, Record<string, number>>

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

  /** K3: dispatch one SM-2 review step. `quality` is 0–5 (we only emit 1/3/5). */
  recordReview: (slug: string, quality: number) => void
  /** K3: slugs whose `dueAt` is in the past. */
  getDueSlugs: (now?: number) => string[]
  /** K3: read a review record for the graph dimming pass. */
  getReviewRecord: (slug: string) => ReviewRecord | null

  /** K4: toggle the confusion flag for a (slug, blockId). Idempotent on tag. */
  flagConfusion: (slug: string, blockId: string) => void
  /** K4: clear the confusion flag for a (slug, blockId). */
  unflagConfusion: (slug: string, blockId: string) => void
  /** K4: read flag count (0 if untagged) — drives the heatmap overlay. */
  getConfusionCount: (slug: string, blockId: string) => number
}

/**
 * SM-2 step. Returns the next review record given the current one and a
 * 0–5 quality rating. Standard SM-2:
 *   - quality < 3 → reset interval, keep ease
 *   - quality ≥ 3 → grow interval (1, 6, prev * ease, ...) and adjust ease
 *
 * `lastReviewedAt` is set to `now` so `dueAt` materializes off the new step.
 */
function sm2Step(prev: ReviewRecord, quality: number, now: number): ReviewRecord {
  const q = Math.max(0, Math.min(5, Math.round(quality)))
  let { ease, interval } = prev

  // Ease update — applied for any non-failure quality. The 0.1/0.08/0.02
  // constants are the original SM-2 paper values.
  if (q >= 3) {
    ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if (ease < 1.3) ease = 1.3
  }

  if (q < 3) {
    interval = 1
  } else if (interval === 0) {
    interval = 1
  } else if (interval === 1) {
    interval = 6
  } else {
    interval = Math.round(interval * ease)
  }

  const dayMs = 24 * 60 * 60 * 1000
  return {
    ease,
    interval,
    lastReviewedAt: now,
    dueAt: now + interval * dayMs,
  }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedSlugs: [],
      inProgressSlugs: [],
      decisionEvents: {},
      reviewSchedule: {},
      confusionFlags: {},

      markCompleted: (slug: string) =>
        set(state => {
          const alreadyCompleted = state.completedSlugs.includes(slug)
          const completedSlugs = alreadyCompleted
            ? state.completedSlugs
            : [...state.completedSlugs, slug]
          const inProgressSlugs = state.inProgressSlugs.filter(s => s !== slug)
          // K3: schedule the first review on first completion. Don't reset an
          // existing schedule — re-marking a completed topic shouldn't break
          // the SM-2 cadence the user has accumulated.
          const schedule = state.reviewSchedule ?? {}
          let reviewSchedule = schedule
          if (!alreadyCompleted) {
            const now = Date.now()
            const dayMs = 24 * 60 * 60 * 1000
            reviewSchedule = {
              ...schedule,
              [slug]: {
                ease: 2.5,
                interval: 1,
                lastReviewedAt: now,
                dueAt: now + dayMs,
              },
            }
          }
          return { completedSlugs, inProgressSlugs, reviewSchedule }
        }),

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

      recordReview: (slug, quality) =>
        set(state => {
          const schedule = state.reviewSchedule ?? {}
          const cur = schedule[slug] ?? {
            ease: 2.5,
            interval: 0,
            lastReviewedAt: 0,
            dueAt: 0,
          }
          const next = sm2Step(cur, quality, Date.now())
          return {
            reviewSchedule: { ...schedule, [slug]: next },
          }
        }),

      getDueSlugs: (now = Date.now()) => {
        const schedule = get().reviewSchedule ?? {}
        return Object.entries(schedule)
          .filter(([, r]) => r.dueAt <= now)
          .map(([slug]) => slug)
      },

      getReviewRecord: (slug) => get().reviewSchedule?.[slug] ?? null,

      flagConfusion: (slug, blockId) =>
        set(state => {
          const flags = state.confusionFlags ?? {}
          const topicFlags = flags[slug] ?? {}
          const cur = topicFlags[blockId] ?? 0
          return {
            confusionFlags: {
              ...flags,
              [slug]: { ...topicFlags, [blockId]: cur + 1 },
            },
          }
        }),

      unflagConfusion: (slug, blockId) =>
        set(state => {
          const flags = state.confusionFlags ?? {}
          const topicFlags = flags[slug]
          if (!topicFlags || !(blockId in topicFlags)) return state
          const { [blockId]: _dropped, ...rest } = topicFlags
          return {
            confusionFlags: { ...flags, [slug]: rest },
          }
        }),

      getConfusionCount: (slug, blockId) =>
        get().confusionFlags?.[slug]?.[blockId] ?? 0,
    }),
    {
      name: 'alldata-progress',
      version: 4,
      // J4 added `decisionEvents`; K3 added `reviewSchedule`; K4 added
      // `confusionFlags`. Every version's shape is accepted; missing fields
      // get seeded with defaults so a legacy localStorage can't crash the
      // page on rehydrate.
      migrate: (persisted: unknown, _version: number) => {
        const p = (persisted as Partial<ProgressState>) ?? {}
        return {
          completedSlugs: p.completedSlugs ?? [],
          inProgressSlugs: p.inProgressSlugs ?? [],
          decisionEvents: p.decisionEvents ?? {},
          reviewSchedule: p.reviewSchedule ?? {},
          confusionFlags: p.confusionFlags ?? {},
        } as ProgressState
      },
    }
  )
)
