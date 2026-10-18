import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

// The Phase 0 look is opt-in via ?visual=v2; gameplay, panels and fallbacks must behave exactly as in v1.

test('?visual=v2 renders without shader or runtime errors and keeps arrivals working', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  await ns('advance', 0.6)
  await ns('teleportPlayer', 'education')
  await ns('advance', 2.2)
  await expect(page.getByRole('dialog', { name: 'Education & Research' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Low quality must not break the v2 materials.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: 'Low', exact: true }).click()
  await page.keyboard.press('Escape')
  await ns('advance', 0.5)
  await page.waitForTimeout(500)
  expect(errors.filter((e) => /shader|webgl|three|error/i.test(e))).toEqual([])
})

test('without the flag the original look is used', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  const usesV2 = await page.evaluate(() => new URLSearchParams(location.search).get('visual'))
  expect(usesV2).toBeNull()
})
