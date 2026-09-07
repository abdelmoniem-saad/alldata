/**
 * C6c: unit tests for the SM-2 scheduling step (`lib/sm2.ts`).
 *
 * The expectations come straight from the SM-2 paper's update rules as the
 * store implements them (K3): ease adjusts on non-failure qualities with
 * the 0.1/0.08/0.02 constants and a 1.3 floor; interval follows the
 * 1 → 6 → round(prev × ease) ladder; quality < 3 resets to 1 day.
 * `now` is always pinned so the timeline is deterministic.
 */

import { describe, expect, it } from 'vitest'
import { SM2_DAY_MS, sm2Step, type ReviewRecord } from './sm2'

const DAY = SM2_DAY_MS

function record(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return { ease: 2.5, interval: 0, lastReviewedAt: 0, dueAt: 0, ...overrides }
}

describe('sm2Step', () => {
  it('first successful review: interval 0 → 1 day', () => {
    const next = sm2Step(record({ interval: 0 }), 5, 1_000)
    expect(next.interval).toBe(1)
    expect(next.dueAt).toBe(1_000 + DAY)
  })

  it('second successful review: interval 1 → 6 days', () => {
    const next = sm2Step(record({ interval: 1 }), 5, 1_000)
    expect(next.interval).toBe(6)
    expect(next.dueAt).toBe(1_000 + 6 * DAY)
  })

  it('subsequent reviews grow the interval by the updated ease', () => {
    // A perfect review first bumps ease 2.5 → 2.6, then the interval ladder
    // uses the *updated* ease: round(6 × 2.6) = 16.
    const next = sm2Step(record({ ease: 2.5, interval: 6 }), 5, 1_000)
    expect(next.ease).toBeCloseTo(2.6)
    expect(next.interval).toBe(16)
    expect(next.dueAt).toBe(1_000 + 16 * DAY)
  })

  it('quality 5 raises ease by 0.1', () => {
    const next = sm2Step(record({ ease: 2.5, interval: 6 }), 5, 0)
    expect(next.ease).toBeCloseTo(2.6)
  })

  it('quality 4 leaves ease unchanged but still grows the interval', () => {
    const next = sm2Step(record({ ease: 2.5, interval: 6 }), 4, 0)
    // 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02)) = 2.5
    expect(next.ease).toBeCloseTo(2.5)
    expect(next.interval).toBe(15) // round(6 * 2.5)
  })

  it('quality 3 lowers ease but still grows the interval', () => {
    const next = sm2Step(record({ ease: 2.5, interval: 6 }), 3, 0)
    // 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.36
    expect(next.ease).toBeCloseTo(2.36)
    expect(next.interval).toBe(Math.round(6 * 2.36))
  })

  it('a failed review (quality < 3) resets the interval to 1 day', () => {
    const next = sm2Step(record({ ease: 2.5, interval: 44 }), 1, 1_000)
    expect(next.interval).toBe(1)
    expect(next.dueAt).toBe(1_000 + DAY)
  })

  it('a failed review keeps the ease factor unchanged', () => {
    const next = sm2Step(record({ ease: 2.2, interval: 44 }), 0, 0)
    expect(next.ease).toBeCloseTo(2.2)
  })

  it('ease never drops below the 1.3 floor', () => {
    let r = record({ ease: 1.4, interval: 6 })
    for (let i = 0; i < 10; i++) {
      r = sm2Step(r, 3, 0)
    }
    expect(r.ease).toBeGreaterThanOrEqual(1.3)
    expect(r.ease).toBeCloseTo(1.3)
  })

  it('quality values are clamped to the 0–5 range and rounded', () => {
    const low = sm2Step(record({ interval: 6 }), -7, 0)
    expect(low.interval).toBe(1) // treated as a failure
    const high = sm2Step(record({ ease: 2.5, interval: 6 }), 99, 0)
    // Clamped to 5: ease bumps to 2.6, interval = round(6 × 2.6).
    expect(high.ease).toBeCloseTo(2.6)
    expect(high.interval).toBe(16)
  })

  it('fractional quality is rounded before use (3.6 → 4)', () => {
    const next = sm2Step(record({ ease: 2.5, interval: 6 }), 3.6, 0)
    // q=4: ease adjustment is exactly 0, interval grows by ease.
    expect(next.ease).toBeCloseTo(2.5)
    expect(next.interval).toBe(15)
  })

  it('stamps lastReviewedAt with the passed now', () => {
    const next = sm2Step(record({ lastReviewedAt: 0 }), 5, 42_000)
    expect(next.lastReviewedAt).toBe(42_000)
  })

  it('is pure: the input record is not mutated', () => {
    const prev = record({ ease: 2.5, interval: 6 })
    const snapshot = { ...prev }
    sm2Step(prev, 5, 0)
    expect(prev).toEqual(snapshot)
  })
})
