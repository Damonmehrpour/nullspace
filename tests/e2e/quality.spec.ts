import { expect, test, type Page } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

async function ratio(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector('#world-canvas canvas') as HTMLCanvasElement
    return c.width / c.clientWidth
  })
}

async function enter(page: Page) {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await page.waitForFunction(() => '__nullspace' in window)
  // The software renderer is slow enough that adaptive quality would step the pixel ratio straight
  // back down; hold adaptation so the test sees what each choice sets.
  await page.evaluate(() => (window as unknown as { __nullspace: { holdQuality(): void } }).__nullspace.holdQuality())
}

async function choose(page: Page, label: string) {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: label, exact: true }).click()
  await page.keyboard.press('Escape')
}

test.describe('on a 2x screen', () => {
  test.use({ deviceScaleFactor: 2 })
  test('Auto is the default; High renders at a capped 1.5 pixel ratio, Low at 1', async ({ page }, info) => {
    test.skip(isTouchProject(info.project.name), 'desktop only')
    await enter(page)
    const q = await page.evaluate(() => (window as unknown as { __nullspace: { getQuality(): { chosen: string } } }).__nullspace.getQuality())
    expect(q.chosen).toBe('auto')
    await choose(page, 'High')
    await expect.poll(() => ratio(page)).toBeCloseTo(1.5, 1)
    await choose(page, 'Low')
    await expect.poll(() => ratio(page)).toBeCloseTo(1, 1)
  })
})

test.describe('on a 1x screen', () => {
  test.use({ deviceScaleFactor: 1 })
  test('High never renders more pixels than the screen has', async ({ page }, info) => {
    test.skip(isTouchProject(info.project.name), 'desktop only')
    await enter(page)
    await choose(page, 'High')
    await page.waitForTimeout(500)
    expect(await ratio(page)).toBeCloseTo(1, 1)
  })
})
