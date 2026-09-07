/**
 * sm2Step, the pure SM-2 scheduling step. K3.
 *
 * Extracted from `progressStore` (C6c) so the algorithm can be unit-tested
 * without instantiating the zustand store (which binds to localStorage).
 * `progressStore.recordReview` and the K3 first-completion schedule in
 * `markCompleted` are the only callers.
 *
 * SM-2, the original paper's update rules:
 *   - quality ≥ 3 → grow interval (1, 6, prev * ease, ...) and adjust ease
 *   - quality < 3 → the card was failed; reset the interval to 1 day
 *
 * `lastReviewedAt` is set to `now` so `dueAt` materializes off the new step.
 */

export interface ReviewRecord {
  ease: number
  /** Days. */
  interval: number
  /** Epoch ms, last reviewed; on first completion, this is set so the first
   *  review fires after `interval` days. */
  lastReviewedAt: number
  /** Epoch ms, when the next review becomes due. Materialized for cheap
   *  selector reads. */
  dueAt: number
}

/** The SM-2 constant schedule from the paper. */
export const SM2_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Advance one review step. Pure: no clock reads, no store access — the
 * caller supplies `now` (epoch ms) so tests can pin the timeline.
 */
export function sm2Step(prev: ReviewRecord, quality: number, now: number): ReviewRecord {
  const q = Math.max(0, Math.min(5, Math.round(quality)))
  let { ease, interval } = prev

  // Ease update, applied for any non-failure quality. The 0.1/0.08/0.02
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

  return {
    ease,
    interval,
    lastReviewedAt: now,
    dueAt: now + interval * SM2_DAY_MS,
  }
}
