/**
 * D3 e2e: the quiz and exercise blocks, the practice density surfaces.
 *
 * The p-values quiz gates on its decision (depends_on), so the spec
 * answers the decision first, then walks both questions, picking wrong
 * then right. The variance exercise checks the numeric entry with
 * tolerance: a wrong number is called out, the right one passes.
 */

import { expect, test } from '@playwright/test'

test('the quiz appears after its decision and walks both questions', async ({ page }) => {
  await page.goto('/topic/p-values')

  // The quiz gates on the pv-acquittal decision; answer it first.
  await page.getByRole('button', { name: /too small to say much/ }).click()
  await expect(page.getByText('Check yourself')).toBeVisible()

  // Question 1: the right pick confirms and shows the teaching response.
  await page
    .getByRole('button', { name: /Sampling noise; the p-value is a statistic/ })
    .click()
  await expect(page.getByText(/The p-value is itself random/)).toBeVisible()

  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(page.getByText(/p = 0\.06 with n = 50/)).toBeVisible()

  await page
    .getByRole('button', { name: /Nothing about the estimate changed/ })
    .click()
  await expect(page.getByText(/Read the estimate and its interval first/)).toBeVisible()
  await expect(page.getByText(/Quiz complete/)).toBeVisible()
})

test('the exercise checks a number with tolerance', async ({ page }) => {
  await page.goto('/topic/variance')

  const input = page.getByLabel('Your answer')
  await input.fill('5.0')
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText(/Not quite/)).toBeVisible()

  // Tolerance: 6.1 +/- 0.15 passes; 5.0 did not.
  await input.fill('6.1')
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText(/Correct\. This will come back/)).toBeVisible()
  await expect(page.getByText(/Dividing by n = 3 instead/)).toBeVisible()
})
