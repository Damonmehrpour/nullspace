import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual review of the Experience island: SHOTS=1 SHOTS_VARIANT=v1|v2 npx playwright test experienceShots --project=desktop
// Gameplay-camera views along the portal corridor plus fixed views, into test-results/experience-<variant>.
test.skip(!process.env.SHOTS, 'manual screenshots')

type V = { x: number; z: number }
type Hooks = Record<string, (...a: unknown[]) => unknown>

test('experience island views', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  const variant = process.env.SHOTS_VARIANT === 'v2' ? 'v2' : 'v1'
  const dir = `test-results/experience-${variant}`
  mkdirSync(dir, { recursive: true })
  await page.setViewportSize({ width: 1280, height: 720 })
  await gotoEntry(page)
  if (variant === 'v2') await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => ((window as unknown as { __nullspace: Hooks }).__nullspace[f as string](...(a as unknown[]))), [fn, args] as const)
  await ns('lockQuality')
  await page.waitForTimeout(1500)
  await ns('freezeClock')
  await ns('markAllRevealed')

  // Experience is the second island on the ring (90° − 72°). Local +x points outward.
  const a = ((90 - 72) * Math.PI) / 180
  const c: V = { x: 22 * Math.cos(a), z: 22 * Math.sin(a) }
  const local = (lx: number, lz: number): V => ({ x: c.x + lx * Math.cos(a) - lz * Math.sin(a), z: c.z + lx * Math.sin(a) + lz * Math.cos(a) })
  const world3 = (lx: number, y: number, lz: number): [number, number, number] => {
    const p = local(lx, lz)
    return [p.x, y, p.z]
  }
  const play = async (name: string, lx: number, lz: number, yawOffset = 0) => {
    await ns('setCamera', null)
    await ns('setView', local(lx, lz), a + yawOffset)
    await ns('setPlayerFacing', a + yawOffset)
    await page.waitForTimeout(1300)
    await page.screenshot({ path: `${dir}/${name}.png` })
  }
  const fixed = async (name: string, from: [number, number, number], to: [number, number, number]) => {
    await ns('setCamera', from, to)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${dir}/${name}.png` })
  }
  // Approach from the Education walkway, then the corridor from the arrival ring outward.
  await play('approach', -5.2, -3.6, 0.55)
  await play('arrival', -3.4, 0)
  await play('corridor-1', -0.1, 0)
  await play('corridor-2', 2.0, 0)
  await play('edge', 5.6, 0)
  await play('look-back', 5.4, 0, Math.PI)
  await fixed('elevation', world3(2.2, 3.2, -11), world3(2.2, 2.4, 0))
  await fixed('from-void', world3(12, 2.6, 3.5), world3(3, 2.6, 0))
  await fixed('overview', world3(-9, 9, -7), world3(2.2, 1.5, 0))
})
