import { expect, test, type Page } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

// The orbit camera: drag to look around (including up at tall and floating structures), wheel or pinch
// to zoom, J/L/I/K to turn and tilt, C to recenter. Movement stays camera-relative WASD.
type Info = { position: [number, number, number]; forward: [number, number, number]; yaw: number; pitch: number; zoom: number; facing: number }
type Hooks = Record<string, (...a: unknown[]) => unknown>

async function enter(page: Page) {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.locator('#world-canvas canvas').waitFor()
  await page.waitForTimeout(600)
}
const ns = (page: Page, fn: string, ...args: unknown[]) => page.evaluate(([f, a]) => ((window as unknown as { __nullspace: Hooks }).__nullspace[f as string](...(a as unknown[]))), [fn, args] as const)
const info = async (page: Page) => (await ns(page, 'getCameraInfo')) as Info

test('mouse: drag to orbit and look up, wheel to zoom', async ({ page }, ti) => {
  test.skip(isTouchProject(ti.project.name), 'desktop only')
  await enter(page)
  const canvas = page.locator('#world-canvas canvas')
  const box = (await canvas.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const before = await info(page)

  // Drag right: the view turns right (yaw increases).
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 200, cy, { steps: 10 })
  await page.mouse.up()
  const turned = await info(page)
  expect(turned.yaw).toBeGreaterThan(before.yaw + 0.5)

  // Drag up: the camera lowers and the view tilts upward, toward tall and floating structures.
  await page.mouse.move(cx, cy + 150)
  await page.mouse.down()
  await page.mouse.move(cx, cy - 250, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(700)
  const up = await info(page)
  expect(up.pitch).toBeLessThan(before.pitch - 0.4)
  expect(up.forward[1]).toBeGreaterThan(0.15) // actually looking upward

  // Wheel: zoom out and back in.
  await page.mouse.move(cx, cy)
  await page.mouse.wheel(0, 600)
  const far = await info(page)
  expect(far.zoom).toBeGreaterThan(up.zoom)
  await page.mouse.wheel(0, -1200)
  expect((await info(page)).zoom).toBeLessThan(far.zoom)
})

test('keyboard: J/L turn, I/K tilt, C recenters; W walks where the camera faces', async ({ page }, ti) => {
  test.skip(isTouchProject(ti.project.name), 'desktop only')
  await enter(page)
  await page.locator('#world-canvas').focus()
  const before = await info(page)
  await page.keyboard.down('KeyL')
  await page.waitForTimeout(500)
  await page.keyboard.up('KeyL')
  const turned = await info(page)
  expect(turned.yaw).toBeGreaterThan(before.yaw + 0.3)
  await page.keyboard.down('KeyI')
  await page.waitForTimeout(400)
  await page.keyboard.up('KeyI')
  expect((await info(page)).pitch).toBeLessThan(before.pitch - 0.1)

  // Movement follows the camera: W walks along the (turned) camera forward.
  await ns(page, 'freezeClock')
  const start = (await ns(page, 'getPlayer')) as { pos: { x: number; z: number } }
  const yaw = (await info(page)).yaw
  await page.keyboard.down('KeyW')
  await ns(page, 'advance', 0.6)
  await page.keyboard.up('KeyW')
  const end = (await ns(page, 'getPlayer')) as { pos: { x: number; z: number } }
  const dx = end.pos.x - start.pos.x
  const dz = end.pos.z - start.pos.z
  expect(Math.hypot(dx, dz)).toBeGreaterThan(0.5)
  expect((dx * Math.cos(yaw) + dz * Math.sin(yaw)) / Math.hypot(dx, dz)).toBeGreaterThan(0.9)

  // C eases the camera back behind the wanderer at the default tilt.
  await page.keyboard.press('KeyC')
  await ns(page, 'advance', 2)
  const c = await info(page)
  expect(Math.abs(Math.atan2(Math.sin(c.yaw - c.facing), Math.cos(c.yaw - c.facing)))).toBeLessThan(0.05)
  expect(Math.abs(c.pitch - before.pitch)).toBeLessThan(0.02)
})

test('touch: one-finger drag orbits, pinch zooms', async ({ page }, ti) => {
  test.skip(!isTouchProject(ti.project.name), 'touch only')
  await enter(page)
  const before = await info(page)
  await page.evaluate(() => {
    const el = document.querySelector('#world-canvas canvas')!
    const ev = (type: string, id: number, x: number, y: number) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }))
    ev('pointerdown', 1, 150, 300)
    for (let i = 1; i <= 10; i++) ev('pointermove', 1, 150 + i * 15, 300 - i * 10)
    ev('pointerup', 1, 300, 200)
    // Pinch in: two fingers moving apart zooms in (closer).
    ev('pointerdown', 2, 150, 300)
    ev('pointerdown', 3, 250, 300)
    for (let i = 1; i <= 10; i++) {
      ev('pointermove', 2, 150 - i * 6, 300)
      ev('pointermove', 3, 250 + i * 6, 300)
    }
    ev('pointerup', 2, 90, 300)
    ev('pointerup', 3, 310, 300)
  })
  const after = await info(page)
  expect(after.yaw).toBeGreaterThan(before.yaw + 0.3)
  expect(after.pitch).toBeLessThan(before.pitch)
  expect(after.zoom).toBeLessThan(before.zoom)
})
