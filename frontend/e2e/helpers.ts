/**
 * Shared e2e helpers. Registration runs through the real modal so the
 * specs exercise the exact UI a visitor uses. Each test starts from a
 * clean storage state (Playwright gives every test a fresh context), so
 * registering the same account across serial tests just logs in again.
 */

import { expect, type Page } from '@playwright/test'

export async function registerUser(
  page: Page,
  email: string,
  displayName: string,
  password: string,
): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: /Create one\./ }).click()
  await page.getByLabel('Display name').fill(displayName)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  try {
    await expect(page.getByLabel(/Account:/i)).toBeVisible({ timeout: 5_000 })
  } catch {
    // Serial suite: the account may already exist from an earlier test.
    // Fall back to logging in with the same credentials.
    await page.getByRole('button', { name: /Already have an account\? Sign in\./ }).click()
    await page.getByLabel('Password').fill(password)
    // Scope to the form: the navbar's anonymous "Sign in" chip shares the name.
    await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.getByLabel(/Account:/i)).toBeVisible({ timeout: 10_000 })
  }
}
