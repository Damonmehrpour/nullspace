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

test('a lost graphics context that never returns falls back with Retry and View Portfolio', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'desktop only')
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => {
    const c = document.querySelector('#world-canvas canvas') as HTMLCanvasElement
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGL2RenderingContext
    gl.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await expect(page.getByText('The graphics context was lost.')).toBeVisible({ timeout: 6000 })
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  await page.getByRole('button', { name: 'View Portfolio' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Education' })).toBeVisible()
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
