/**
 * Playwright config, B2.
 *
 * The e2e suite runs against the *production-shaped* stack: the built SPA
 * served by uvicorn on :8000 with a throwaway SQLite database (e2e.db,
 * seeded by e2e/global-setup.ts before the server starts). That exercises
 * the exact surface a Hugging Face visitor hits — FastAPI static serving,
 * SPA fallback, same-origin /api — not the dev-server proxy.
 *
 * Run:  npm run e2e        (builds the frontend, seeds, boots, tests)
 * Headed debug:  npx playwright test --headed
 *
 * Browsers are needed once:  npx playwright install chromium
 *
 * C6, hermeticity: accepting a merge-back suggestion writes the merged
 * content back to the seed tree (`settings.seed_dir`). Tests must never
 * touch the repo's working tree, so the config snapshots `seed/` into a
 * temp directory once at load and points SEED_DIR at it — for the seed
 * importer (global-setup), the web server, and every write-back.
 */

import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { cpSync, mkdtempSync } from 'fs'

import { defineConfig } from '@playwright/test'

// Throwaway copy of the seed tree for this run. `cpSync` copies the ~50
// content.md files cheaply; the run's write-backs land here and vanish
// with the machine's temp dir.
const throwawaySeed = mkdtempSync(path.join(os.tmpdir(), 'alldata-e2e-seed-'))
// ESM: no __dirname — derive the config's directory from import.meta.url.
const configDir = path.dirname(fileURLToPath(import.meta.url))
cpSync(path.resolve(configDir, '../seed'), throwawaySeed, { recursive: true })
process.env.SEED_DIR = throwawaySeed

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false, // the seeded DB is shared; keep runs serial
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
  },
  globalSetup: './e2e/global-setup.ts',
  webServer: {
    command: 'python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000',
    port: 8000,
    timeout: 60_000,
    reuseExistingServer: false,
    cwd: '..',
    env: {
      DATABASE_URL: 'sqlite+aiosqlite:///./e2e.db',
      SECRET_KEY: 'e2e-secret-key-not-for-production',
      SANDBOX_ALLOW_LOCAL_FALLBACK: 'true',
      SEED_DIR: process.env.SEED_DIR!,
      // Every spec registers from 127.0.0.1 against one server process; the
      // production per-IP dams (5 registrations/min) trip across specs.
      AUTH_RATE_LIMIT_LOGIN: '100',
      AUTH_RATE_LIMIT_REGISTER: '100',
    },
  },
})
