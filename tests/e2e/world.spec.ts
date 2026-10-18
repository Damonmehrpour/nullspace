import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

test('Enter shows the loading state, then the 3D canvas', async ({ page }) => {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Exit to Portfolio' })).toBeVisible()
})

test('the canvas follows a viewport resize', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await page.setViewportSize({ width: 1280, height: 800 })
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  const canvas = page.locator('#world-canvas canvas')
  await expect(canvas).toBeVisible({ timeout: 15_000 })
  await page.setViewportSize({ width: 700, height: 800 })
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(700)
})
