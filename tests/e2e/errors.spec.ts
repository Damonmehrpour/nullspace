import { expect, test } from '@playwright/test'
import { gotoEntry } from './helpers'

const CHUNK = '**/WorldRoot-*.js'

test('a failed 3D chunk load recovers on Retry', async ({ page }) => {
  let calls = 0
  await page.route(CHUNK, (route) => (calls++ === 0 ? route.abort() : route.continue()))
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
})

test('a persistent failure keeps the portfolio and contact reachable', async ({ page }) => {
  await page.route(CHUNK, (route) => route.abort())
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('button', { name: 'Reload and retry' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View Portfolio' })).toBeVisible()
  await page.getByRole('button', { name: 'Contact', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'View Portfolio' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Education' })).toBeVisible()
})
