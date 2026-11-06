import { expect, test, type Page } from '@playwright/test'
import { cv } from '../../src/content/cv'
import { WORLD } from '../../src/content/world'
import { skillDistricts } from '../../src/world/v2/skillDistricts'
import { placeBuildings } from '../../src/world/v2/skillsCity'
import { gotoEntry, isTouchProject } from './helpers'

// Solid structures in the real app: the player stops at walls, slides along them, and still walks
// through the Experience gates. (Reachability of every path and interaction is covered by unit tests.)

type V = { x: number; z: number }
const island = (id: string) => WORLD.islands.find((i) => i.id === id)!
const toWorld = (id: string, p: V): V => {
  const c = island(id).centre
  const a = Math.atan2(c.z, c.x)
  return { x: c.x + p.x * Math.cos(a) - p.z * Math.sin(a), z: c.z + p.x * Math.sin(a) + p.z * Math.cos(a) }
}

async function enter(page: Page) {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  await ns('markAllRevealed')
  return ns
}

async function walk(page: Page, ns: (fn: string, ...a: unknown[]) => Promise<unknown>, from: V, yaw: number, seconds: number): Promise<V> {
  // Close any island panel (arriving opens one, which pauses walking).
  while (await page.getByRole('dialog').count()) await page.keyboard.press('Escape')
  await ns('setView', from, yaw)
  await ns('setPlayerFacing', yaw)
  await page.keyboard.down('KeyW')
  // In short stretches, dismissing any island panel on the way (arriving opens one and pauses walking).
  for (let t = 0; t < seconds; t += 0.25) {
    await ns('advance', 0.25)
    if (await page.getByRole('dialog').count()) {
      await page.keyboard.up('KeyW')
      while (await page.getByRole('dialog').count()) await page.keyboard.press('Escape')
      await page.keyboard.down('KeyW')
    }
  }
  await page.keyboard.up('KeyW')
  return ((await ns('getPlayer')) as { pos: V }).pos
}

test('walking into a Data City tower stops at its face; walking past it at an angle slides along it', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'walking needs a keyboard')
  test.setTimeout(90_000)
  const ns = await enter(page)
  const game = skillDistricts(cv.skills.groups).find((d) => d.style === 'game')!
  const b = placeBuildings(game)[2]
  const tower = toWorld('skills', b)
  // From 2.6 m in front of the tower (on the plaza side), straight at it for 3 s (12 m of intent).
  const out = { x: b.x + Math.cos(b.theta + Math.PI) * 2.6, z: b.z + Math.sin(b.theta + Math.PI) * 2.6 }
  const start = toWorld('skills', out)
  const at = Math.atan2(tower.z - start.z, tower.x - start.x)
  const end = await walk(page, ns, start, at, 3)
  const left = Math.hypot(end.x - tower.x, end.z - tower.z)
  expect(left).toBeGreaterThan(0.6) // stopped outside the tower and its label plate
  expect(left).toBeLessThan(2.0) // but it did walk up to it
  await ns('advance', 1) // let the camera settle against the tower
  if (process.env.SHOTS) await page.screenshot({ path: 'test-results/collision-tower.png' })
  // At 40° off the face: it keeps moving, sliding along the row instead of sticking.
  const slid = await walk(page, ns, start, at + 0.7, 2)
  expect(Math.hypot(slid.x - start.x, slid.z - start.z)).toBeGreaterThan(1.2)
  if (process.env.SHOTS) {
    await ns('advance', 1)
    await page.screenshot({ path: 'test-results/collision-slide.png' })
  }
})

test('the monolith and the archive are solid; the Experience gates stay open', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'walking needs a keyboard')
  test.setTimeout(90_000)
  const ns = await enter(page)
  // Spawn faces away from the monolith: turn around and walk into it.
  const s = WORLD.spawn
  const back = await walk(page, ns, s.pos, s.facing + Math.PI, 2)
  expect(Math.hypot(back.x, back.z)).toBeGreaterThan(0.9)
  // The archive mass: from the Education arrival ring straight outward.
  const edu = island('education')
  const eduOut = Math.atan2(edu.centre.z, edu.centre.x)
  const atArchive = await walk(page, ns, toWorld('education', { x: -3.6, z: 0 }), eduOut, 3)
  const local = (p: V) => (p.x - edu.centre.x) * Math.cos(eduOut) + (p.z - edu.centre.z) * Math.sin(eduOut)
  expect(local(atArchive)).toBeGreaterThan(-0.5) // walked all the way up to it
  expect(local(atArchive)).toBeLessThan(0.4) // and no further
  // Experience: from the arrival ring outward through all four gates to the far edge.
  const exp = island('experience')
  const expOut = Math.atan2(exp.centre.z, exp.centre.x)
  const through = await walk(page, ns, toWorld('experience', { x: -3.6, z: 0 }), expOut, 3)
  const along = (through.x - exp.centre.x) * Math.cos(expOut) + (through.z - exp.centre.z) * Math.sin(expOut)
  expect(along).toBeGreaterThan(5.4)
})
