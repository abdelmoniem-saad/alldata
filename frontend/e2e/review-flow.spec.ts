/**
 * C6e, spec 2: the full contribution loop, fork → suggest → review → note.
 *
 * Three serial tests share one seeded database:
 *   1. a contributor forks Correlation, edits the markdown in Source mode,
 *      saves, and suggests the fork to master;
 *   2. an admin opens the review queue, accepts the suggestion with a
 *      note, and sees the accepted pill + note in the detail pane;
 *   3. the contributor opens their fork and reads the reviewer note.
 *
 * Serial because each test builds on the previous one's database state.
 * The admin's role is bumped directly in the e2e SQLite file: the
 * promote-on-boot path (ADMIN_EMAIL) can't see accounts created after
 * boot, and creating the account through the UI is exactly what we want
 * to exercise. A reload re-reads /auth/me, which picks up the promotion.
 */

import { execSync } from 'child_process'
import path from 'path'
import { expect, test } from '@playwright/test'

import { registerUser } from './helpers'

test.describe.configure({ mode: 'serial' })

const CONTRIBUTOR = {
  email: 'c6-contributor@example.com',
  name: 'C6 Contributor',
  password: 'contrib-pass-123',
}
const ADMIN = {
  email: 'c6-admin@example.com',
  name: 'C6 Admin',
  password: 'admin-pass-123456',
}
const SENTINEL = 'C6 e2e sentinel: this paragraph came from the review-flow spec.'
const NOTE = 'Merged — the sentinel paragraph sharpens the ending. Thanks!'

/** Bump the admin's role straight in the e2e database (see file header). */
function promoteAdminInDb(): void {
  const root = path.resolve(process.cwd(), '..')
  execSync(
    `python -c "import sqlite3; con = sqlite3.connect('e2e.db'); ` +
      `con.execute(\\"UPDATE users SET role = 'admin' WHERE email = '${ADMIN.email}'\\"); ` +
      `con.commit(); con.close()"`,
    { cwd: root, stdio: 'inherit' },
  )
}

test('contributor forks a topic, edits it, and suggests it to master', async ({ page }) => {
  await registerUser(page, CONTRIBUTOR.email, CONTRIBUTOR.name, CONTRIBUTOR.password)

  // Fork via the topic-page chrome chip; it creates the fork and lands in
  // the fork editor.
  await page.goto('/topic/correlation')
  await page.getByRole('button', { name: 'Fork this topic' }).click()
  await expect(page).toHaveURL(/\/u\/me\/topic\/correlation\/edit/)

  // Edit in Source mode: switch, append a plain-markdown sentinel (no
  // directives, so the parse stays warning-free and Suggest stays enabled).
  await page.getByRole('button', { name: 'Source' }).click()
  const source = page.getByLabel('Fork markdown source')
  await expect(source).toBeVisible()
  const current = await source.inputValue()
  await source.fill(`${current}\n\n${SENTINEL}\n`)

  // Save (the Suggest button refuses while the fork is dirty), then
  // suggest. The status chip flips to "In review".
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('unsaved changes')).toHaveCount(0)
  await page.getByRole('button', { name: 'Suggest to master' }).click()
  await expect(page.getByText('In review')).toBeVisible()
})

test('admin accepts the suggestion with a note in the review queue', async ({ page }) => {
  await registerUser(page, ADMIN.email, ADMIN.name, ADMIN.password)
  promoteAdminInDb()
  // Re-read /auth/me so the promoted role reaches the client store.
  await page.reload()
  await page.goto('/review')

  // The contributor's suggestion is pending in the queue; open it.
  const row = page.getByRole('button').filter({ hasText: 'C6 Contributor' }).first()
  await expect(row).toBeVisible()
  await row.click()
  await expect(page.getByRole('heading', { name: 'Correlation' })).toBeVisible()

  // Leave a note, then accept. The detail pane flips to Accepted and
  // shows the note back to the reviewer.
  await page
    .getByPlaceholder('Optional note to the author (they see it on accept or reject)')
    .fill(NOTE)
  await page.getByRole('button', { name: 'Accept, apply to master' }).click()
  await expect(page.getByText('Reviewer note:')).toBeVisible()
  await expect(page.getByText(NOTE)).toBeVisible()
  await expect(page.getByText('Accepted', { exact: true }).first()).toBeVisible()
})

test('the contributor reads the reviewer note on their fork', async ({ page }) => {
  await registerUser(page, CONTRIBUTOR.email, CONTRIBUTOR.name, CONTRIBUTOR.password)
  await page.goto('/u/me/topic/correlation')

  // O0/B2: the author-facing reviewer note panel on the fork view.
  await expect(page.getByText('Reviewer note')).toBeVisible()
  await expect(page.getByText(NOTE)).toBeVisible()
  // The merged fork's content now lives on the fork page too.
  await expect(page.getByText(SENTINEL)).toBeVisible()
})
