import { expect, test, type CDPSession, type Page } from '@playwright/test'
import { WORLD } from '../../src/content/world'
import { v } from '../../src/core/geometry'
import { gotoEntry, isTouchProject } from './helpers'

// The on-screen touch controls, driven by real touch events (Chrome's input pipeline, the same path a
// phone's fingers take): the joystick walks, a second finger turns the camera at the same time, the
// wanderer stops dead on release, and the page never scrolls or zooms under the gestures.

type Hooks = Record<string, (...a: unknown[]) => unknown>
type P = { x: number; z: number }
const ns = (page: Page, fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => (window as unknown as { __nullspace: Hooks }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
const player = async (page: Page) => ((await ns(page, 'getPlayer')) as { pos: P }).pos
const yaw = async (page: Page) => ((await ns(page, 'getCameraInfo')) as { yaw: number }).yaw

type Pt = { x: number; y: number; id: number }
const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Pt[]) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 4, radiusY: 4, force: 1 })) })

async function enterWorld(page: Page) {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.locator('#world-canvas canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => '__nullspace' in window)
  await page.waitForTimeout(1000)
  // The controls card would sit over nothing we touch, but close it to keep the view clear.
  const hide = page.getByRole('button', { name: 'Hide' })
  if (await hide.isVisible().catch(() => false)) await hide.click()
}

for (const [label, size] of [
  ['portrait 375', { width: 375, height: 812 }],
  ['portrait 390', { width: 390, height: 844 }],
  ['landscape', { width: 844, height: 390 }],
] as const) {
  test(`touch (${label}): the joystick walks, a second finger looks around at the same time, release stops`, async ({ page }, info) => {
    test.skip(!isTouchProject(info.project.name), 'touch only')
    test.setTimeout(90_000)
    await page.setViewportSize(size)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await enterWorld(page)
    const cdp = await page.context().newCDPSession(page)
    const zone = (await page.getByTestId('touch-stick-zone').boundingBox())!
    // The controls stay on screen and clear of the top bar.
    const bar = (await page.getByRole('navigation', { name: 'Quick navigation' }).boundingBox())!
    expect(zone.y).toBeGreaterThan(bar.y + bar.height)
    expect(zone.x + zone.width).toBeLessThanOrEqual(size.width)
    expect(zone.y + zone.height).toBeLessThanOrEqual(size.height)

    const start = await player(page)
    const yaw0 = await yaw(page)
    // Thumb down in the stick corner and pushed up (forward); a second finger drags across the right.
    const s0 = { x: zone.x + zone.width * 0.45, y: zone.y + zone.height * 0.7, id: 1 }
    const c0 = { x: size.width * 0.8, y: size.height * 0.4, id: 2 }
    await touch(cdp, 'touchStart', [s0])
    await touch(cdp, 'touchMove', [{ ...s0, y: s0.y - 60 }])
    await touch(cdp, 'touchStart', [{ ...s0, y: s0.y - 60 }, c0])
    for (let k = 1; k <= 8; k++) {
      await touch(cdp, 'touchMove', [{ ...s0, y: s0.y - 60 }, { ...c0, x: c0.x - k * 12 }])
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(700)
    const moved = await player(page)
    expect(Math.hypot(moved.x - start.x, moved.z - start.z)).toBeGreaterThan(0.8) // it walked
    expect(Math.abs((await yaw(page)) - yaw0)).toBeGreaterThan(0.15) // and the camera turned meanwhile
    // Both fingers up: the wanderer stops within a moment and does not drift.
    await touch(cdp, 'touchEnd', [])
    await page.waitForTimeout(400)
    const stopped = await player(page)
    await page.waitForTimeout(800)
    const later = await player(page)
    expect(Math.hypot(later.x - stopped.x, later.z - stopped.z)).toBeLessThan(0.02)
    // The page itself never scrolled or zoomed.
    const vp = await page.evaluate(() => ({ y: window.scrollY, x: window.scrollX, scale: window.visualViewport?.scale ?? 1 }))
    expect(vp).toEqual({ y: 0, x: 0, scale: 1 })
    expect(errors).toEqual([])
  })
}

test('touch: near a project the action button opens it; a resting thumb inside the dead zone does not move', async ({ page }, info) => {
  test.skip(!isTouchProject(info.project.name), 'touch only')
  test.setTimeout(90_000)
  await enterWorld(page)
  const cdp = await page.context().newCDPSession(page)
  const zone = (await page.getByTestId('touch-stick-zone').boundingBox())!
  const s0 = { x: zone.x + zone.width * 0.45, y: zone.y + zone.height * 0.7, id: 1 }
  const start = await player(page)
  await touch(cdp, 'touchStart', [s0])
  await touch(cdp, 'touchMove', [{ ...s0, x: s0.x + 3, y: s0.y - 4 }])
  await page.waitForTimeout(600)
  await touch(cdp, 'touchEnd', [])
  const still = await player(page)
  expect(Math.hypot(still.x - start.x, still.z - start.z)).toBeLessThan(0.02)
  // Stand by the first project's artifact: the action button names it and opens its details.
  const projects = WORLD.islands.find((i) => i.id === 'projects')!
  const slot = projects.artifactSlots[0]
  const toward = v.normalize(v.sub(projects.centre, slot))
  await ns(page, 'setView', v.add(slot, v.scale(toward, 1.0)), v.angleOf(v.scale(toward, -1)))
  const act = page.getByTestId('touch-action')
  await expect(act).toBeVisible({ timeout: 10_000 })
  await expect(act).toHaveText(/^Open /)
  const box = (await act.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(56) // a comfortable thumb target
  await act.tap()
  await expect(page.getByRole('dialog')).toBeVisible()
})
