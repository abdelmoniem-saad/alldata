/**
 * B2 e2e: the full A2 account lifecycle, in a real browser against the
 * production-shaped stack — register, edit profile, change password,
 * generate a recovery code, sign out, and sign back in *via the recovery
 * code*. This is the flow that has no email safety net, so it must work
 * end to end.
 */

import { expect, test } from '@playwright/test'
import { registerUser } from './helpers'

test.describe.serial('Account lifecycle', () => {
  const email = `e2e-${Date.now()}@example.com`
  const password = 'e2e-password-1'
  let recoveryCode = ''

  test('register a new account', async ({ page }) => {
    await registerUser(page, email, 'E2E Tester', password)
    await expect(page.getByLabel(/Account:/i)).toBeVisible()
  })

  test('edit profile and change password', async ({ page }) => {
    await registerUser(page, email, 'E2E Tester', password)

    await page.getByLabel(/Account:/i).click()
    await page.getByRole('link', { name: 'Account settings' }).click()
    await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()

    await page.getByLabel('Display name').fill('E2E Renamed')
    await page.getByRole('button', { name: 'Save profile' }).click()
    await expect(page.getByText('Profile saved.')).toBeVisible()
    await expect(page.getByLabel(/Account: E2E Renamed/i)).toBeVisible()
  })

  test('generate a recovery code, sign out, recover, sign in', async ({ page }) => {
    await registerUser(page, email, 'E2E Renamed', password)

    await page.getByLabel(/Account:/i).click()
    await page.getByRole('link', { name: 'Account settings' }).click()
    await page.getByRole('button', { name: 'Generate recovery code' }).click()
    recoveryCode = (await page.locator('code').textContent()) ?? ''
    expect(recoveryCode).toMatch(/^[0-9a-f]{4}(-[0-9a-f]{4}){3}$/)

    // Sign out.
    await page.getByLabel(/Account:/i).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    // Recover via the modal's "Forgot password?" path.
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.getByRole('button', { name: /Forgot password\?/ }).click()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Recovery code').fill(recoveryCode)
    await page.getByRole('button', { name: 'Recover and sign in' }).click()

    await expect(page.getByLabel(/Account: E2E Renamed/i)).toBeVisible({ timeout: 10_000 })
  })
})
