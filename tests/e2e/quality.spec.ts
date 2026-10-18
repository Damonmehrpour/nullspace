import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

test.use({ deviceScaleFactor: 2 })

async function ratio(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const c = document.querySelector('#world-canvas canvas') as HTMLCanvasElement
    return c.width / c.clientWidth
  })
}

test('High renders at a capped 1.5 pixel ratio; Low at 1', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await page.waitForFunction(() => '__nullspace' in window)
  const q = await page.evaluate(() => (window as unknown as { __nullspace: { getQuality(): { chosen: string } } }).__nullspace.getQuality())
  expect(q.chosen).toBe('high')
  await expect.poll(() => ratio(page)).toBeCloseTo(1.5, 1)

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: 'Low', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect.poll(() => ratio(page)).toBeCloseTo(1, 1)
})
