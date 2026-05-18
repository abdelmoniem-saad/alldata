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
 *
 * M1: extended for server-side sync. Every mutating setter now also bumps
 * `topicUpdatedAt[slug] = Date.now()`. The `syncOrchestrator` (a separate
 * module that subscribes to this store) debounces and pushes the touched
 * topics to `/api/users/me/progress/{slug}`. `syncFromServer` adopts a
 * server bundle into the local store with per-topic last-write-wins (the
 * topic with the higher updated-at clock wins).
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProgressBundle, TopicProgressUpsert } from '../api/client'

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

  /**
   * M5: global preference for which language renders inside paired code
   * blocks (`pair_id` directives). Defaults to Python; flips on tab click.
   * One global preference rather than per-topic — a reader who reads in
   * R wants R everywhere. Synced to the server alongside the rest of
   * progress in a later cycle; today it's local-only.
   */
  preferredCodeLang: 'python' | 'r'

  /**
   * M1: per-topic wall-clock of the last local mutation. Used by the
   * `syncOrchestrator` to detect which topics need to push, and sent as
   * `client_updated_at` so the server can resolve conflicts.
   */
  topicUpdatedAt: Record<string, number>

  /**
   * M1: true while the sync orchestrator is hydrating from the server.
   * Setters check this and skip the `topicUpdatedAt` bump so applying a
   * server bundle doesn't immediately trigger a push of what we just
   * pulled. Toggled by `syncFromServer`.
   */
  isHydrating: boolean

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

  /**
   * M1: build a wire-shape upsert for one topic. Used by the
   * `syncOrchestrator` when pushing.
   */
  buildTopicUpsert: (slug: string) => TopicProgressUpsert | null

  /**
   * M1: adopt a server bundle. Per-topic last-write-wins (server vs local
   * `topicUpdatedAt`). Sets `isHydrating` to true for the duration so
   * setter-bumps don't poison the timestamps with `Date.now()`.
   */
  syncFromServer: (bundle: ProgressBundle) => void

  /** M5: flip the global code-pair preferred language. */
  setPreferredCodeLang: (lang: 'python' | 'r') => void
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

/**
 * M1 helper: stamp a topic's local wall-clock when a mutation lands. Used
 * by every setter inside the store. No-op while hydrating from the server
 * so a server-driven write doesn't bump the timestamp into "I just wrote
 * this locally and need to push" territory.
 */
function bumpTopic(state: ProgressState, slug: string): Record<string, number> {
  if (state.isHydrating) return state.topicUpdatedAt
  return { ...state.topicUpdatedAt, [slug]: Date.now() }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedSlugs: [],
      inProgressSlugs: [],
      decisionEvents: {},
      reviewSchedule: {},
      confusionFlags: {},
      topicUpdatedAt: {},
      preferredCodeLang: 'python',
      isHydrating: false,

      setPreferredCodeLang: (lang) => set({ preferredCodeLang: lang }),

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
          return {
            completedSlugs,
            inProgressSlugs,
            reviewSchedule,
            topicUpdatedAt: bumpTopic(state, slug),
          }
        }),

      markInProgress: (slug: string) =>
        set(state => {
          const already = state.inProgressSlugs.includes(slug) || state.completedSlugs.includes(slug)
          if (already) return state
          return {
            inProgressSlugs: [...state.inProgressSlugs, slug],
            topicUpdatedAt: bumpTopic(state, slug),
          }
        }),

      unmarkCompleted: (slug: string) =>
        set(state => ({
          completedSlugs: state.completedSlugs.filter(s => s !== slug),
          topicUpdatedAt: bumpTopic(state, slug),
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
            topicUpdatedAt: bumpTopic(state, slug),
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
            topicUpdatedAt: bumpTopic(state, slug),
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
            topicUpdatedAt: bumpTopic(state, slug),
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
            topicUpdatedAt: bumpTopic(state, slug),
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
            topicUpdatedAt: bumpTopic(state, slug),
          }
        }),

      getConfusionCount: (slug, blockId) =>
        get().confusionFlags?.[slug]?.[blockId] ?? 0,

      buildTopicUpsert: (slug) => {
        const s = get()
        const status: TopicProgressUpsert['status'] = s.completedSlugs.includes(slug)
          ? 'completed'
          : s.inProgressSlugs.includes(slug)
            ? 'in_progress'
            : 'not_started'
        // Status-less topics with no review or decision data shouldn't be
        // synced — they're noise that just bloats the bundle.
        const hasContent =
          status !== 'not_started'
          || (s.decisionEvents?.[slug] && Object.keys(s.decisionEvents[slug]).length > 0)
          || s.reviewSchedule?.[slug] != null
          || (s.confusionFlags?.[slug] && Object.keys(s.confusionFlags[slug]).length > 0)
        if (!hasContent) return null
        return {
          topic_slug: slug,
          status,
          comfort_level: 0,
          decision_events: s.decisionEvents?.[slug] ?? {},
          review_schedule: s.reviewSchedule?.[slug] ?? null,
          confusion_flags: s.confusionFlags?.[slug] ?? {},
          client_updated_at: s.topicUpdatedAt?.[slug] ?? Date.now(),
        }
      },

      syncFromServer: (bundle) =>
        set(state => {
          // Per-topic last-write-wins. For each server topic: if local
          // doesn't know about it, adopt; if local has newer `topicUpdatedAt`,
          // keep local (the orchestrator's next push will overwrite the
          // server). Otherwise adopt the server's payload.
          const completedSlugs = new Set(state.completedSlugs)
          const inProgressSlugs = new Set(state.inProgressSlugs)
          const decisionEvents = { ...(state.decisionEvents ?? {}) }
          const reviewSchedule = { ...(state.reviewSchedule ?? {}) }
          const confusionFlags = { ...(state.confusionFlags ?? {}) }
          const topicUpdatedAt = { ...(state.topicUpdatedAt ?? {}) }

          for (const t of bundle.topics) {
            const localTs = topicUpdatedAt[t.topic_slug] ?? 0
            if (localTs > t.server_updated_at) continue // local wins; keep
            // Server wins — adopt its slice.
            if (t.status === 'completed') {
              completedSlugs.add(t.topic_slug)
              inProgressSlugs.delete(t.topic_slug)
            } else if (t.status === 'in_progress') {
              inProgressSlugs.add(t.topic_slug)
              completedSlugs.delete(t.topic_slug)
            } else {
              completedSlugs.delete(t.topic_slug)
              inProgressSlugs.delete(t.topic_slug)
            }
            if (t.decision_events && Object.keys(t.decision_events).length > 0) {
              decisionEvents[t.topic_slug] = t.decision_events
            } else {
              delete decisionEvents[t.topic_slug]
            }
            if (t.review_schedule) {
              reviewSchedule[t.topic_slug] = t.review_schedule
            } else {
              delete reviewSchedule[t.topic_slug]
            }
            if (t.confusion_flags && Object.keys(t.confusion_flags).length > 0) {
              confusionFlags[t.topic_slug] = t.confusion_flags
            } else {
              delete confusionFlags[t.topic_slug]
            }
            topicUpdatedAt[t.topic_slug] = t.server_updated_at
          }

          return {
            completedSlugs: Array.from(completedSlugs),
            inProgressSlugs: Array.from(inProgressSlugs),
            decisionEvents,
            reviewSchedule,
            confusionFlags,
            topicUpdatedAt,
            // Clear the hydrating flag last so any subscriber's reaction to
            // the merged state sees a consistent "not hydrating" view.
            isHydrating: false,
          }
        }),
    }),
    {
      name: 'alldata-progress',
      version: 5,
      // J4 added `decisionEvents`; K3 added `reviewSchedule`; K4 added
      // `confusionFlags`; M1 (v5) added `topicUpdatedAt`. Every version's
      // shape is accepted; missing fields get seeded with defaults so a
      // legacy localStorage can't crash the page on rehydrate. On v4→v5
      // bump, the topicUpdatedAt map is seeded with `Date.now()` for every
      // known topic so the first sync-after-upgrade pushes everything we
      // already know (server has no record yet for these users; safe).
      migrate: (persisted: unknown, version: number) => {
        const p = (persisted as Partial<ProgressState>) ?? {}
        const now = Date.now()
        const knownSlugs = new Set([
          ...(p.completedSlugs ?? []),
          ...(p.inProgressSlugs ?? []),
          ...Object.keys(p.decisionEvents ?? {}),
          ...Object.keys(p.reviewSchedule ?? {}),
          ...Object.keys(p.confusionFlags ?? {}),
        ])
        let topicUpdatedAt = p.topicUpdatedAt ?? {}
        if (version < 5 || Object.keys(topicUpdatedAt).length === 0) {
          // Seed every known topic so the first sync push has timestamps.
          topicUpdatedAt = Object.fromEntries(
            Array.from(knownSlugs).map(slug => [slug, now]),
          )
        }
        return {
          completedSlugs: p.completedSlugs ?? [],
          inProgressSlugs: p.inProgressSlugs ?? [],
          decisionEvents: p.decisionEvents ?? {},
          reviewSchedule: p.reviewSchedule ?? {},
          confusionFlags: p.confusionFlags ?? {},
          topicUpdatedAt,
          preferredCodeLang: p.preferredCodeLang ?? 'python',
          isHydrating: false,
        } as ProgressState
      },
    }
  )
)
