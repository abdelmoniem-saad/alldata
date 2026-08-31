/**
 * B2 e2e: search across both surfaces that share `SearchDropdown` — the
 * Home hero and the navbar Ctrl-K modal. This is the regression net for
 * the pg_trgm incident (the endpoint 500'd in production while every
 * surface showed "no topics").
 */

import { expect, test } from '@playwright/test'

test.describe('Search', () => {
  test('home hero finds a topic and navigates to it', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder(/What do you want to learn/)
    await input.fill('bayes')

    const firstResult = page.locator('button', { hasText: /Bayes/i }).first()
    await expect(firstResult).toBeVisible({ timeout: 10_000 })
    await firstResult.click()
    await expect(page).toHaveURL(/\/topic\//)
  })

  test('navbar Ctrl-K modal searches too', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Control+KeyK')
    const input = page.getByPlaceholder('Search topics, concepts, formulas...')
    await expect(input).toBeVisible()
    await input.fill('confidence')

    const result = page.locator('button', { hasText: /Confidence Intervals/i }).first()
    await expect(result).toBeVisible({ timeout: 10_000 })
    await result.click()
    await expect(page).toHaveURL(/\/topic\//)
  })

  test('a body-only term surfaces the owning topic with a snippet', async ({ request }) => {
    // API contract: "posterior" appears in body text, not in any topic title,
    // so at least one hit must carry matched_in="body" and a non-empty snippet.
    const res = await request.get('/api/graph/search?q=posterior')
    expect(res.ok()).toBeTruthy()
    const results = await res.json()
    expect(results.length).toBeGreaterThan(0)
    const bodyHit = results.find(r => r.matched_in === 'body')
    expect(bodyHit).toBeTruthy()
    expect(bodyHit.snippet.length).toBeGreaterThan(0)
  })
})
