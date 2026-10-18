import { expect, test, type Page } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

const ORDER = ['education', 'experience', 'projects', 'skills', 'contact'] as const
const TITLES: Record<string, string> = { education: 'Education', experience: 'Experience', projects: 'Projects', skills: 'Skills', contact: 'Contact' }

/** Calls a hook in the page. */
async function ns<T>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>
}

async function enterWorld(page: Page) {
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await page.waitForFunction(() => '__nullspace' in window)
  await ns(page, 'freezeClock')
}

test.describe('guided tour (deterministic clock)', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard world on desktop; touch has its own test')

  test('the guide leads, presents, and the tour completes only after all five zones', async ({ page }) => {
    await gotoEntry(page)
    await enterWorld(page)
    await ns(page, 'advance', 0.6)
    expect(await ns(page, 'getGuideState')).toBe('lead')
    expect(await ns(page, 'getTourTarget')).toBe('education')

    for (const [i, id] of ORDER.entries()) {
      expect(await ns(page, 'getTourTarget')).toBe(id)
      await ns(page, 'placeGuideAtTarget')
      await ns(page, 'advance', 1 / 60)
      expect(await ns(page, 'getGuideState')).toBe('present')
      await ns(page, 'advance', 10)
      expect(await ns(page, 'getGuideState')).toBe('present')
      await expect(page.getByRole('dialog')).toHaveCount(0)

      await ns(page, 'teleportPlayer', id)
      await ns(page, 'advance', 1 / 60)
      expect(await ns(page, 'isRevealing')).toBe(true)
      expect(await ns(page, 'getGuideState')).toBe('arrive')
      await ns(page, 'advance', 2.1)
      await expect(page.getByRole('dialog', { name: TITLES[id] })).toBeVisible()
      expect(await ns<string[]>(page, 'getWorldVisited')).toHaveLength(i + 1)
      expect(await ns(page, 'isTourComplete')).toBe(i === ORDER.length - 1)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await ns(page, 'advance', 0.1)
    }
    expect(await ns(page, 'getTourTarget')).toBeNull()
  })

  test('lead then wait when the player stops', async ({ page }) => {
    await gotoEntry(page)
    await enterWorld(page)
    await ns(page, 'advance', 0.6)
    await ns(page, 'walkPlayerTo', 'education')
    await ns(page, 'advance', 3)
    expect(await ns(page, 'getGuideState')).toBe('lead')
    await ns(page, 'teleportPlayer', await page.evaluate(() => ({ x: 0, z: 0 })))
    await ns(page, 'advance', 6)
    expect(await ns(page, 'getGuideState')).toBe('wait')
  })

  test('an out-of-order visit opens that island and counts as reached', async ({ page }) => {
    await gotoEntry(page)
    await enterWorld(page)
    await ns(page, 'advance', 0.6)
    await ns(page, 'teleportPlayer', 'skills')
    await ns(page, 'advance', 2.2)
    await expect(page.getByRole('dialog', { name: 'Skills' })).toBeVisible()
    expect(await ns<string[]>(page, 'getWorldVisited')).toEqual(['skills'])
  })

  test('reading the CV first leaves the whole journey intact', async ({ page }) => {
    await gotoEntry(page)
    await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
    for (const title of Object.values(TITLES)) {
      await page.getByRole('heading', { level: 2, name: title }).scrollIntoViewIfNeeded()
    }
    await page.getByRole('button', { name: 'Contact', exact: true }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Enter 3D' }).click()
    await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
    await page.waitForFunction(() => '__nullspace' in window)
    await ns(page, 'freezeClock')
    expect(await ns<string[]>(page, 'getViewed')).toHaveLength(5)
    expect(await ns<string[]>(page, 'getWorldVisited')).toEqual([])
    expect(await ns(page, 'isTourComplete')).toBe(false)
    await ns(page, 'advance', 0.6)
    expect(await ns(page, 'getTourTarget')).toBe('education')
    await ns(page, 'teleportPlayer', 'education')
    await ns(page, 'advance', 1 / 60)
    expect(await ns(page, 'isRevealing')).toBe(true)
  })

  test('each artifact opens its own project details', async ({ page }) => {
    await gotoEntry(page)
    await enterWorld(page)
    await ns(page, 'advance', 0.6)
    await ns(page, 'teleportPlayer', 'projects')
    await ns(page, 'advance', 2.2)
    await expect(page.getByRole('dialog', { name: 'Projects' })).toBeVisible()
    await page.keyboard.press('Escape')
    await ns(page, 'interactArtifact', 0)
    const featured = page.getByRole('dialog', { name: 'XR Meditation System' })
    await expect(featured).toBeVisible()
    await expect(featured.getByText('IN DOCUMENTATION')).toBeVisible()
    await page.keyboard.press('Escape')
    await ns(page, 'interactArtifact', 2)
    await expect(page.getByRole('dialog').getByText('PLACEHOLDER')).toBeVisible()
  })

  test('quick-nav Open inside the world never counts as a visit', async ({ page }) => {
    await gotoEntry(page)
    await enterWorld(page)
    await page.getByRole('button', { name: 'Sections' }).click()
    await page.getByRole('listitem', { name: 'Skills' }).getByRole('button', { name: 'Open' }).click()
    await expect(page.getByRole('dialog', { name: 'Skills' })).toBeVisible()
    expect(await ns<string[]>(page, 'getWorldVisited')).toEqual([])
  })
})

test('touch: Guide me there moves the player into the arrival zone and counts as a visit', async ({ page }, info) => {
  test.skip(!isTouchProject(info.project.name), 'touch only')
  await gotoEntry(page)
  await enterWorld(page)
  await ns(page, 'advance', 0.6)
  await page.getByRole('button', { name: 'Sections' }).click()
  await page.getByRole('listitem', { name: 'Contact' }).getByRole('button', { name: 'Guide me there' }).click()
  await ns(page, 'advance', 2.2)
  expect(await ns<string[]>(page, 'getWorldVisited')).toContain('contact')
})
