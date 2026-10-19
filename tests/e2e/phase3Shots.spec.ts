import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual review shots for Phase 3: SHOTS=1 npx playwright test phase3Shots --project=desktop
// The XR Meditation story moment (v2), the phone number in the contact panel and the 2D portfolio
// (desktop and phone width), into test-results/phase3.
test.skip(!process.env.SHOTS, 'manual screenshots')
type Hooks = Record<string, (...a: unknown[]) => unknown>

test('phase 3 review shots', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  const dir = 'test-results/phase3'
  mkdirSync(dir, { recursive: true })
  await page.setViewportSize({ width: 1280, height: 720 })
  // Subtitles appear whole under reduced motion (typing is starved on the software renderer).
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => ((window as unknown as { __nullspace: Hooks }).__nullspace[f as string](...(a as unknown[]))), [fn, args] as const)
  await ns('lockQuality')
  await ns('freezeClock')
  await ns('markAllRevealed')
  // Stand beside the XR Meditation System (slot 0 of Projects) with the kokedama nearby.
  const a = ((90 - 2 * 72) * Math.PI) / 180
  const o = a - (40 * Math.PI) / 180
  const c = { x: 22 * Math.cos(a), z: 22 * Math.sin(a) }
  const slot = { x: c.x + 3 * Math.cos(o), z: c.z + 3 * Math.sin(o) }
  const stand = { x: slot.x - 1.3 * Math.cos(o) + 0.4 * Math.sin(o), z: slot.z - 1.3 * Math.sin(o) - 0.4 * Math.cos(o) }
  await ns('placeGuide', { x: stand.x - 0.9 * Math.sin(o) - 0.3 * Math.cos(o), z: stand.z + 0.9 * Math.cos(o) - 0.3 * Math.sin(o) }, o)
  await ns('setView', stand, o)
  await ns('advance', 0.05)
  const said = (line: string) => page.getByRole('status').filter({ hasText: line })
  await expect(said('Oh… this is actually where I was first born.')).toHaveCount(1, { timeout: 20_000 })
  await expect(page.getByTestId('subtitle-text')).toHaveText('Oh… this is actually where I was first born.', { timeout: 10_000 })
  await page.screenshot({ path: `${dir}/story-line-1.png` })
  await expect(said('Well, not exactly me. But the idea that became me started here.')).toHaveCount(1, { timeout: 20_000 })
  await expect(page.getByTestId('subtitle-text')).toHaveText('Well, not exactly me. But the idea that became me started here.', { timeout: 10_000 })
  await page.screenshot({ path: `${dir}/story-line-2.png` })
  // The in-world contact panel.
  await page.getByRole('button', { name: 'Sections' }).click()
  await page.getByRole('button', { name: /^Contact/ }).first().click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${dir}/contact-panel.png` })
  // The 2D portfolio, desktop and phone width.
  await page.goto('/')
  await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
  const phone = page.getByRole('link', { name: '+358 45 8629910' })
  await phone.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${dir}/portfolio-contact-desktop.png` })
  await page.setViewportSize({ width: 390, height: 844 })
  await phone.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${dir}/portfolio-contact-mobile.png` })
})
