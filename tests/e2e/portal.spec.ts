import { expect, test, type Page } from '@playwright/test'
import { WORLD } from '../../src/content/world'
import { v } from '../../src/core/geometry'
import { gotoEntry, isTouchProject } from './helpers'

// The portfolio portal on the central plinth: the player starts well clear of it (no prompt, and a tap
// on its body does nothing), it opens only from within reach, by E/Enter, a tap or its button, with a
// short transition (none with reduced motion), and coming back to the world never reopens it.

type Hooks = Record<string, (...a: unknown[]) => unknown>
const ns = (page: Page, fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => (window as unknown as { __nullspace: Hooks }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)

async function enterWorld(page: Page) {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.locator('#world-canvas canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => '__nullspace' in window)
}

/** Stands the player on the portal's front step, facing it (past the grace period after entering). */
async function stepUpToPortal(page: Page) {
  await page.waitForTimeout(1400)
  const dir = v.fromAngle(WORLD.spawn.facing)
  await ns(page, 'setView', v.scale(dir, 1.7), WORLD.spawn.facing + Math.PI)
}

const portfolioShown = (page: Page) => expect(page.getByText('Building worlds, systems & intelligent experiences.')).toBeVisible({ timeout: 10_000 })

test('desktop: no prompt at spawn; at the portal E goes through with a short transition, and returning never reopens it', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'keyboard path')
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await enterWorld(page)
  const prompt = page.getByTestId('portal-prompt')
  // The player starts well out of the portal's reach: no prompt, and E does nothing.
  await page.waitForTimeout(1500)
  await expect(prompt).toBeHidden()
  await page.locator('#world-canvas').focus()
  await page.keyboard.press('KeyE')
  await page.waitForTimeout(600)
  await expect(page.locator('#world-canvas')).toHaveCount(1)
  // At the portal, E goes through: the veil covers the swap, the world unmounts, the Portfolio shows.
  await stepUpToPortal(page)
  await expect(prompt).toBeVisible({ timeout: 10_000 })
  await page.locator('#world-canvas').focus()
  await page.keyboard.press('KeyE')
  await expect(page.getByTestId('portal-veil')).toBeVisible()
  await portfolioShown(page)
  await expect(page.locator('#world-canvas')).toHaveCount(0)
  await expect(page.getByTestId('portal-veil')).toHaveCount(0, { timeout: 5_000 })
  // Focus is not trapped: Tab moves through the Portfolio's controls.
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
  // Back into the world: it starts at the spawn again, with no prompt, and stays in the world.
  await page.getByRole('button', { name: 'Enter 3D' }).click()
  await page.locator('#world-canvas canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2500)
  await expect(page.getByRole('button', { name: 'Exit to Portfolio' })).toBeVisible()
  await expect(prompt).toBeHidden()
  expect(errors).toEqual([])
})

test('reduced motion: the portal switches to the Portfolio instantly, with no transition', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'keyboard path')
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enterWorld(page)
  await stepUpToPortal(page)
  await expect(page.getByTestId('portal-prompt')).toBeVisible({ timeout: 10_000 })
  await page.locator('#world-canvas').focus()
  await page.keyboard.press('Enter')
  await portfolioShown(page)
  await expect(page.getByTestId('portal-veil')).toHaveCount(0)
})

test('touch: tapping the world at spawn never opens the Portfolio; at the portal the action button does', async ({ page }, info) => {
  test.skip(!isTouchProject(info.project.name), 'touch only')
  test.setTimeout(90_000)
  await enterWorld(page)
  // Taps right after entering, and on the middle of the screen (where the faded portal stands behind
  // the player), do nothing.
  const box = (await page.locator('#world-canvas canvas').boundingBox())!
  for (const [x, y] of [
    [0.5, 0.5],
    [0.5, 0.35],
    [0.7, 0.45],
  ])
    await page.touchscreen.tap(box.x + box.width * x, box.y + box.height * y)
  await page.waitForTimeout(1800)
  await expect(page.locator('#world-canvas')).toHaveCount(1)
  await expect(page.getByTestId('touch-action')).toHaveCount(0)
  // At the portal, the large action button offers it.
  await stepUpToPortal(page)
  const act = page.getByTestId('touch-action')
  await expect(act).toBeVisible({ timeout: 10_000 })
  await expect(act).toHaveText('Enter the Portfolio')
  await act.tap()
  await portfolioShown(page)
  await expect(page.locator('#world-canvas')).toHaveCount(0)
})

test('the landing screen still opens the Portfolio directly, without loading the 3D world', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => {
    if (/three|WorldRoot/.test(r.url())) requests.push(r.url())
  })
  await gotoEntry(page)
  await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
  await portfolioShown(page)
  expect(requests).toEqual([])
})
