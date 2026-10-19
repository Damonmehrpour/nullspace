import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual review: SHOTS=1 npx playwright test cameraShots --project=desktop
// Looking up and around with the orbit camera at the spawn, every island and a walkway.
test.skip(!process.env.SHOTS, 'manual screenshots')
type Hooks = Record<string, (...a: unknown[]) => unknown>

test('camera views', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(180_000)
  const dir = 'test-results/camera'
  mkdirSync(dir, { recursive: true })
  await page.setViewportSize({ width: 1280, height: 720 })
  await gotoEntry(page)
  await page.goto(process.env.SHOTS_URL ?? '/')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => ((window as unknown as { __nullspace: Hooks }).__nullspace[f as string](...(a as unknown[]))), [fn, args] as const)
  await ns('lockQuality')
  await ns('freezeClock')
  await ns('markAllRevealed')
  const shot = async (name: string, pos: { x: number; z: number }, yaw: number, pitch: number, zoom = 0) => {
    await ns('setView', pos, yaw)
    await ns('look', 0, pitch, zoom)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: `${dir}/${name}.png` })
    await ns('look', 0, -pitch, -zoom)
  }
  const isl = (i: number, r: number) => {
    const a = ((90 - i * 72) * Math.PI) / 180
    return { pos: { x: r * Math.cos(a), z: r * Math.sin(a) }, yaw: a }
  }
  await shot('spawn-up', { x: -1.2, z: 1.6 }, 2.2, -1)
  for (const [i, name] of ['education', 'experience', 'projects', 'skills', 'contact'].entries()) {
    const p = isl(i, 18.5)
    await shot(`${name}-default`, p.pos, p.yaw, 0)
    await shot(`${name}-look-up`, p.pos, p.yaw, -1)
    await shot(`${name}-high`, p.pos, p.yaw, 1, 0.35)
  }
  const near = isl(4, 21.5) // right at the Signal Tower's foot
  await shot('contact-tower-up-close', near.pos, near.yaw, -1)
})
