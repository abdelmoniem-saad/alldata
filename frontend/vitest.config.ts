/**
 * C6c: vitest config for the pure-logic unit tests. Separate from
 * `vite.config.ts` so the app build never sees the test globs, and the
 * default `node` environment stays fast — these tests cover pure modules
 * (`lib/sm2.ts`, `lib/lineDiff.ts`), no DOM, no React rendering (that's
 * Playwright's job, see `playwright.config.ts`).
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
