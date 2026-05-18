/**
 * syncOrchestrator — M1.
 *
 * One module owns the sync rhythm so `progressStore` stays a pure data
 * store. The orchestrator is bootstrapped once at `App` level via
 * `startSyncOrchestrator()` and subscribes to:
 *
 *   1. `authStore` — token presence drives pull / push enablement.
 *      - login (token appears) → pull `/me/progress` + push every local
 *        topic that has a non-trivial slice.
 *      - logout (token disappears) → cancel any pending debounced push;
 *        keep local state intact (offline mode resumes).
 *
 *   2. `progressStore.topicUpdatedAt` — a per-topic wall-clock of the most
 *      recent local mutation. When a topic's timestamp ticks, queue it for
 *      a debounced push. Multiple topics touched in the same window all
 *      go out together when the debounce fires.
 *
 *   3. `window.focus` — pull `/me/progress` to catch other-device updates.
 *      Skipped if last pull was <30s ago (cheap reconciliation, not a
 *      poll).
 *
 * Anonymous mode (no token): the orchestrator is a no-op. `progressStore`
 * keeps writing to localStorage; nothing reaches the network.
 */

import { api } from '../api/client'
import { useAuthStore } from './authStore'
import { useProgressStore } from './progressStore'

const PUSH_DEBOUNCE_MS = 1500
const FOCUS_PULL_COOLDOWN_MS = 30_000

let pushTimer: number | null = null
const dirtySlugs = new Set<string>()
let lastPullAt = 0
// Holds the unsub callbacks so we can tear down on hot-module reload in dev.
let unsubs: Array<() => void> = []
// Track per-topic snapshot of `topicUpdatedAt` to detect deltas.
let lastTopicUpdatedAt: Record<string, number> = {}

/** Initialize the orchestrator. Idempotent — calling twice tears down the
 *  first set of subscriptions before installing the second. */
export function startSyncOrchestrator() {
  stopSyncOrchestrator()

  // 1. Auth subscription — token presence drives pull + initial push.
  const unsubAuth = useAuthStore.subscribe((state, prev) => {
    const tokenAppeared = !prev.token && state.token
    const tokenDisappeared = prev.token && !state.token
    if (tokenAppeared) {
      void onLogin()
    }
    if (tokenDisappeared) {
      cancelPendingPush()
    }
  })
  unsubs.push(unsubAuth)

  // 2. Progress subscription — detect which topics ticked since last call.
  const unsubProgress = useProgressStore.subscribe((state) => {
    const cur = state.topicUpdatedAt ?? {}
    for (const slug in cur) {
      if ((lastTopicUpdatedAt[slug] ?? 0) !== cur[slug]) {
        dirtySlugs.add(slug)
      }
    }
    lastTopicUpdatedAt = { ...cur }
    if (dirtySlugs.size > 0 && useAuthStore.getState().token) {
      schedulePush()
    }
  })
  unsubs.push(unsubProgress)
  // Seed the snapshot so the first subscription tick isn't treated as N
  // brand-new mutations.
  lastTopicUpdatedAt = { ...(useProgressStore.getState().topicUpdatedAt ?? {}) }

  // 3. Focus subscription — cheap reconciliation.
  const onFocus = () => {
    if (!useAuthStore.getState().token) return
    if (Date.now() - lastPullAt < FOCUS_PULL_COOLDOWN_MS) return
    void pullProgress()
  }
  window.addEventListener('focus', onFocus)
  unsubs.push(() => window.removeEventListener('focus', onFocus))

  // 4. Boot-time pull if a token is already present (e.g., page refresh).
  if (useAuthStore.getState().token) {
    void pullProgress()
  }
}

export function stopSyncOrchestrator() {
  for (const u of unsubs) u()
  unsubs = []
  cancelPendingPush()
  dirtySlugs.clear()
}

function cancelPendingPush() {
  if (pushTimer != null) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
}

function schedulePush() {
  cancelPendingPush()
  pushTimer = window.setTimeout(() => {
    pushTimer = null
    void flushPush()
  }, PUSH_DEBOUNCE_MS)
}

async function flushPush() {
  if (!useAuthStore.getState().token) return
  const slugs = Array.from(dirtySlugs)
  dirtySlugs.clear()
  if (slugs.length === 0) return
  const store = useProgressStore.getState()
  for (const slug of slugs) {
    const payload = store.buildTopicUpsert(slug)
    if (!payload) continue
    try {
      await api.putTopicProgress(payload)
    } catch (err) {
      // Network or auth failure — re-queue the topic so the next push
      // attempt picks it up. Don't log a stack trace for the common case
      // (offline, token expired).
      dirtySlugs.add(slug)
      // eslint-disable-next-line no-console
      console.warn('[sync] push failed for', slug, err)
    }
  }
}

async function pullProgress() {
  if (!useAuthStore.getState().token) return
  try {
    lastPullAt = Date.now()
    const bundle = await api.getProgress()
    // Toggle hydrating so the merge doesn't trip topicUpdatedAt bumps.
    useProgressStore.setState({ isHydrating: true })
    useProgressStore.getState().syncFromServer(bundle)
    // Re-snapshot so the just-merged topics aren't immediately re-pushed.
    lastTopicUpdatedAt = { ...(useProgressStore.getState().topicUpdatedAt ?? {}) }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sync] pull failed', err)
  }
}

async function onLogin() {
  // On login: first push every local topic that has a non-trivial slice
  // (so a returning user's prior local work makes it onto the server),
  // then pull the merged bundle (last-write-wins resolves any device-vs-
  // server conflicts).
  const store = useProgressStore.getState()
  const localSlugs = new Set([
    ...store.completedSlugs,
    ...store.inProgressSlugs,
    ...Object.keys(store.decisionEvents ?? {}),
    ...Object.keys(store.reviewSchedule ?? {}),
    ...Object.keys(store.confusionFlags ?? {}),
  ])
  const payloads = Array.from(localSlugs)
    .map(slug => store.buildTopicUpsert(slug))
    .filter((p): p is NonNullable<typeof p> => p != null)
  if (payloads.length > 0) {
    try {
      const merged = await api.batchProgress(payloads)
      useProgressStore.setState({ isHydrating: true })
      useProgressStore.getState().syncFromServer(merged)
      lastTopicUpdatedAt = { ...(useProgressStore.getState().topicUpdatedAt ?? {}) }
      lastPullAt = Date.now()
      return
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[sync] login batch push failed; falling back to pull', err)
    }
  }
  // No local state to push (or push failed) → plain pull.
  await pullProgress()
}
