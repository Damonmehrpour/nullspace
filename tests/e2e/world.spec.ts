import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

test('Enter shows the loading state, then the 3D canvas', async ({ page }) => {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Exit to Portfolio' })).toBeVisible()
})

test('?debug shows the fps overlay on top of the world, below the top bar', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await page.addInitScript(() => localStorage.setItem('nullspace.booted', 'true'))
  await page.goto('/?debug')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  const overlay = page.locator('#debug-stats')
  await expect(overlay).toBeVisible({ timeout: 15_000 })
  const hit = await page.evaluate(() => {
    const el = document.getElementById('debug-stats')!
    const r = el.getBoundingClientRect()
    // Hit-testing skips pointer-events:none, so enable it briefly to measure what is painted on top.
    el.style.pointerEvents = 'auto'
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + 10)
    el.style.pointerEvents = ''
    const bar = document.querySelector('nav[aria-label="Quick navigation"]')!.getBoundingClientRect()
    return { onTop: el.contains(top), belowBar: r.top >= bar.bottom - 1, position: getComputedStyle(el).position }
  })
  expect(hit).toEqual({ onTop: true, belowBar: true, position: 'fixed' })
})

test('without ?debug there is no fps overlay', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#debug-stats')).toHaveCount(0)
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
