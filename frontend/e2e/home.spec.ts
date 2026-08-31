/**
 * B2 e2e: the landing surface + graph navigation, against the production
 * shape (built SPA served by uvicorn, seeded SQLite).
 */

import { expect, test } from '@playwright/test'

test.describe('Home', () => {
  test('renders the hero, domain cards, and the graph link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder(/What do you want to learn/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explore Graph' }).first()).toBeVisible()
    // Domain cards use DOMAIN_LABEL short labels ("Probability"), not the schema title.
    await expect(page.getByText('Probability', { exact: true })).toBeVisible()
  })

  test('graph explorer loads the force canvas', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 })
  })
})
