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
 */

import { defineConfig } from '@playwright/test'

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
    },
  },
})
