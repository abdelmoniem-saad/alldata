/**
 * B2 global setup: seed the throwaway e2e database before uvicorn boots.
 *
 * Runs `seed.import_seed` against the same DATABASE_URL the webServer env
 * sets (sqlite e2e.db, created fresh). The importer creates the system
 * user + all tables, so the specs can register accounts and search real
 * content immediately.
 */

import { execSync } from 'child_process'
import { existsSync, rmSync } from 'fs'
import path from 'path'

export default function globalSetup() {
  // Playwright runs with cwd = frontend/, the repo root is one level up.
  const root = path.resolve(process.cwd(), '..')
  const dbFile = path.join(root, 'e2e.db')
  if (existsSync(dbFile)) rmSync(dbFile)

  execSync('python -m seed.import_seed', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: 'sqlite+aiosqlite:///./e2e.db',
      SECRET_KEY: 'e2e-secret-key-not-for-production',
    },
  })
}
