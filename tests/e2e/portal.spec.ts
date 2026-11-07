import { expect, test, type Page } from '@playwright/test'
import { WORLD } from '../../src/content/world'
import { gotoEntry, isTouchProject } from './helpers'

// The portfolio portal on the central plinth: its prompt, activation from the keyboard, by tap and with
// reduced motion, the 3D world unmounting behind the transition, and the way back into the world.

type Hooks = Record<string, (...a: unknown[]) => unknown>
const ns = (page: Page, fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => (window as unknown as { __nullspace: Hooks }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)

async function enterWorld(page: Page) {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.locator('#world-canvas canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => '__nullspace' in window)
}

const portfolioShown = (page: Page) => expect(page.getByText('Building worlds, systems & intelligent experiences.')).toBeVisible({ timeout: 10_000 })

test('desktop: the prompt appears at the portal, E goes through with a short transition, and the world can be re-entered', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'keyboard path')
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await enterWorld(page)
  // The player spawns just in front of the portal (facing away from it): the prompt offers it.
  const prompt = page.getByTestId('portal-prompt')
  await expect(prompt).toBeVisible()
  await expect(prompt).toContainText('E or Enter')
  // Walking away toward the bridge hides it.
  await page.locator('#world-canvas').focus()
  await page.keyboard.down('KeyW')
  await expect(prompt).toBeHidden({ timeout: 10_000 })
  await page.keyboard.up('KeyW')
  // Back at the portal, E goes through: the veil covers the swap, the world unmounts, the Portfolio shows.
  await ns(page, 'setView', WORLD.spawn.pos, WORLD.spawn.facing)
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
  // And back into the world through the existing navigation.
  await page.getByRole('button', { name: 'Enter 3D' }).click()
  await page.locator('#world-canvas canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Exit to Portfolio' })).toBeVisible()
  expect(errors).toEqual([])
})

test('reduced motion: the portal switches to the Portfolio instantly, with no transition', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'keyboard path')
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enterWorld(page)
  await expect(page.getByTestId('portal-prompt')).toBeVisible()
  await page.locator('#world-canvas').focus()
  await page.keyboard.press('Enter')
  await portfolioShown(page)
  await expect(page.getByTestId('portal-veil')).toHaveCount(0)
})

test('touch: the prompt invites a tap, and its button goes through to the Portfolio', async ({ page }, info) => {
  test.skip(!isTouchProject(info.project.name), 'touch only')
  test.setTimeout(90_000)
  await enterWorld(page)
  const prompt = page.getByTestId('portal-prompt')
  await expect(prompt).toBeVisible()
  await expect(prompt).toContainText('Tap the portal')
  await prompt.getByRole('button', { name: 'Enter the Portfolio' }).click()
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
