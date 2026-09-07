/**
 * C6e, spec 1: the decision block, felt-consequence end to end.
 *
 * Uses the Expectation topic's "Price the game" gear — three tickets, one
 * correct pick (B). The spec exercises what a learner actually does: read
 * the question, pick the tempting-but-wrong ticket, read the teaching
 * response, then re-pick the best one and see the choice follow.
 *
 * Runs anonymously on purpose: decision picks persist in localStorage,
 * not on the server, so no auth is needed to exercise the whole surface.
 */

import { expect, test } from '@playwright/test'

test('the Expectation decision teaches through a wrong pick, then the right one', async ({ page }) => {
  await page.goto('/topic/expectation')

  // The decision renders with its question and the three ticket options.
  await expect(page.getByText('Which ticket has the highest expected value?')).toBeVisible()
  const optionA = page.getByRole('button', { name: 'Ticket A' })
  const optionB = page.getByRole('button', { name: 'Ticket B' })
  const optionC = page.getByRole('button', { name: 'Ticket C' })
  await expect(optionA).toBeVisible()
  await expect(optionB).toBeVisible()
  await expect(optionC).toBeVisible()

  // Nothing is picked yet.
  await expect(optionA).toHaveAttribute('aria-pressed', 'false')
  await expect(optionB).toHaveAttribute('aria-pressed', 'false')

  // The tempting wrong pick: A pays more per win. The response explains
  // why it loses — variance is not value.
  await optionA.click()
  await expect(page.getByText(/But B's expectation is higher/)).toBeVisible()
  await expect(optionA).toHaveAttribute('aria-pressed', 'true')

  // Re-pick the best ticket: the choice and the teaching response follow.
  await optionB.click()
  await expect(page.getByText(/Right\. B's expectation is/)).toBeVisible()
  await expect(optionB).toHaveAttribute('aria-pressed', 'true')
  await expect(optionA).toHaveAttribute('aria-pressed', 'false')
})

test('the decision pick survives a page reload (localStorage persistence)', async ({ page }) => {
  await page.goto('/topic/expectation')
  await page.getByRole('button', { name: 'Ticket C' }).click()
  await expect(
    page.getByText(/C pays \+1 always, so its expectation is exactly 1\.0/),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ticket C' })).toHaveAttribute('aria-pressed', 'true')

  // Fresh load, same context: the pick is remembered.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Ticket C' })).toHaveAttribute('aria-pressed', 'true')
})
