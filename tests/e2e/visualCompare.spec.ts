import { test, type Page } from '@playwright/test'
import { gotoEntry } from './helpers'

// Manual visual review only: SHOTS=1 npx playwright test visualCompare --project=desktop
// Writes matched before/after pairs to test-results/compare/{v1,v2}-<view>.png
test.skip(!process.env.SHOTS, 'manual screenshots')

type V = { x: number; z: number }
type NS = {
  freezeClock(): void
  markAllRevealed(): void
  advance(s: number): void
  setView(p: V, yaw: number): void
  setCamera(pos: [number, number, number] | null, look?: [number, number, number]): void
  placeGuide(p: V, facing?: number): void
}

const deg = (d: number) => (d * Math.PI) / 180
const centre = (i: number): V => ({ x: 22 * Math.cos(deg(90 - i * 72)), z: 22 * Math.sin(deg(90 - i * 72)) })
const EDU = centre(0)
const CONTACT = centre(4)
const ENTRY = { x: (EDU.x + CONTACT.x) / 2, z: (EDU.z + CONTACT.z) / 2 }
const toEdu = Math.atan2(EDU.z - ENTRY.z, EDU.x - ENTRY.x)

/** Identical camera positions for both versions. */
const FIXED: { name: string; pos: [number, number, number]; look: [number, number, number]; player: V; yaw: number }[] = [
  { name: 'spawn', pos: [-6.5, 6.2, 9.5], look: [6, 1.5, 15], player: { x: -1.18, z: 1.62 }, yaw: 2.2 },
  { name: 'approach', pos: [ENTRY.x - 3, 5.5, ENTRY.z - 4], look: [EDU.x, 2, EDU.z], player: ENTRY, yaw: toEdu },
  { name: 'education', pos: [EDU.x * 0.55, 4.2, EDU.z * 0.55 - 7], look: [EDU.x, 1.8, EDU.z + 1], player: { x: EDU.x * 0.78, z: EDU.z * 0.78 }, yaw: Math.PI / 2 },
  { name: 'kokedama', pos: [EDU.x * 0.75 + 1.6, 1.9, EDU.z * 0.75 - 2.4], look: [EDU.x * 0.75, 1.2, EDU.z * 0.75], player: { x: EDU.x * 0.55, z: EDU.z * 0.55 }, yaw: Math.PI / 2 },
]

async function capture(page: Page, variant: 'v1' | 'v2') {
  await page.setViewportSize({ width: 1280, height: 720 })
  await gotoEntry(page)
  if (variant === 'v2') await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.evaluate(() => (window as unknown as { __nullspace: { lockQuality(): void } }).__nullspace.lockQuality())
  await page.waitForTimeout(1500)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  await ns('markAllRevealed')
  for (const v of FIXED) {
    await ns('setView', v.player, v.yaw)
    await ns('placeGuide', { x: EDU.x * 0.75, z: EDU.z * 0.75 }, v.yaw + Math.PI)
    await ns('advance', 0.05)
    await ns('setCamera', v.pos, v.look)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `test-results/compare/${variant}-fixed-${v.name}.png` })
  }
  // Each version's own gameplay framing from the same player spot and heading.
  await ns('setCamera', null)
  for (const v of FIXED.slice(0, 3)) {
    await ns('setView', v.player, v.yaw)
    await page.waitForTimeout(1300)
    await page.screenshot({ path: `test-results/compare/${variant}-play-${v.name}.png` })
  }
  void ({} as NS)
}

test('v1 shots', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  await capture(page, 'v1')
})

test('v2 shots', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  await capture(page, 'v2')
})
