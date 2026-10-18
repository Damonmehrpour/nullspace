import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual character review: SHOTS=1 SHOTS_VARIANT=v1|v2 npx playwright test characterShots --project=desktop
// Close-ups of the player and the kokedama (front three-quarter, side, back, mid-stride, kokedama,
// gameplay camera) into test-results/characters-<variant>.
test.skip(!process.env.SHOTS, 'manual screenshots')

type V = { x: number; z: number }
type Hooks = Record<string, (...a: unknown[]) => unknown>

test('character close-ups', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  const variant = process.env.SHOTS_VARIANT === 'v2' ? 'v2' : 'v1'
  const dir = `test-results/characters-${variant}`
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

  // Stage on the Contact–Education walkway: open deck, nothing between the camera and the pair.
  const deg = (d: number) => (d * Math.PI) / 180
  const centre = (i: number): V => ({ x: 22 * Math.cos(deg(90 - i * 72)), z: 22 * Math.sin(deg(90 - i * 72)) })
  const edu = centre(0)
  const con = centre(4)
  const stage = { x: con.x * 0.42 + edu.x * 0.58, z: con.z * 0.42 + edu.z * 0.58 }
  const facing = Math.atan2(edu.z - con.z, edu.x - con.x)
  await ns('setView', stage, facing)
  await ns('setPlayerFacing', facing)
  const dir2 = (a: number, r: number): V => ({ x: stage.x + Math.cos(a) * r, z: stage.z + Math.sin(a) * r })
  // The kokedama waits straight ahead, so the wanderer looks forward and the camera sees the face.
  await ns('placeGuide', dir2(facing, 2.3), facing + Math.PI)
  await ns('advance', 0.05)
  await ns('setPlayerFacing', facing)

  const shoot = async (name: string, angle: number, dist: number, camY: number, lookY: number, at: V = stage) => {
    const c = { x: at.x + Math.cos(angle) * dist, z: at.z + Math.sin(angle) * dist }
    await ns('setCamera', [c.x, camY, c.z], [at.x, lookY, at.z])
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${dir}/${name}.png` })
  }
  await shoot('front-three-quarter', facing + 0.6, 2.2, 1.0, 0.6)
  await shoot('side', facing + Math.PI / 2, 2.6, 0.9, 0.55)
  await shoot('back', facing + Math.PI, 2.6, 1.2, 0.55)
  const g = dir2(facing, 2.3)
  await shoot('kokedama', facing + Math.PI + 0.5, 2.0, 1.75, 1.3, g)
  await shoot('pair', facing + 1.25, 3.4, 1.5, 0.75, { x: (stage.x + g.x) / 2, z: (stage.z + g.z) / 2 })

  // Mid-stride: walk toward Education for a moment, then freeze and frame from the side.
  await ns('setCamera', null)
  await ns('walkPlayerTo', 'education')
  // Small steps with real frames between them, so the stride follows the distance walked.
  for (let i = 0; i < 9; i++) {
    await ns('advance', 0.05)
    await page.waitForTimeout(60)
  }
  const p = (await ns('getPlayer')) as { pos: V; facing: number }
  await shoot('walking', p.facing + Math.PI / 2 + 0.3, 2.6, 0.95, 0.55, p.pos)
  await ns('setCamera', null)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${dir}/gameplay.png` })
})
