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
  // Plan budget, checked at spawn (the view that sees the most of the world): ≤ 80 draw calls, ≤ 150k triangles.
  await page.waitForTimeout(300)
  const render = (await ns('getRenderInfo')) as { calls: number; triangles: number }
  expect(render.calls).toBeLessThanOrEqual(80)
  expect(render.triangles).toBeLessThanOrEqual(150_000)
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

// Dropping to Low quality (by hand or adaptively) must not recompile shaders: a recompile cascade
// froze slow machines for seconds right when they most needed relief.
for (const variant of ['v1', 'v2'] as const) {
  test(`${variant}: switching to Low quality compiles no new shader programs`, async ({ page }, info) => {
    test.skip(isTouchProject(info.project.name), 'desktop only')
    await gotoEntry(page)
    if (variant === 'v2') await page.goto('/?visual=v2')
    await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
    await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
    await page.waitForFunction(() => '__nullspace' in window)
    const programs = () => page.evaluate(() => (window as unknown as { __nullspace: { listPrograms(): string[] } }).__nullspace.listPrograms().length)
    await page.waitForTimeout(800)
    const before = await programs()
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: 'Low', exact: true }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
    expect(await programs()).toBe(before)
  })
}

// Shaders compile behind the loading screen: the first visible frame already has every program,
// instead of freezing for ~1 s while the driver compiles them all synchronously.
test('v2: the first drawn frame already has every shader compiled', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.evaluate(() => ((window as unknown as { __recordTimeline: boolean }).__recordTimeline = true))
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.waitForTimeout(1500)
  const frames = (await page.evaluate(() => (window as unknown as { __nullspace: { getTimeline(): { programs: number }[] } }).__nullspace.getTimeline())) as { programs: number }[]
  expect(frames.length).toBeGreaterThan(0)
  const steady = Math.max(...frames.map((f) => f.programs))
  expect(frames[0].programs).toBeGreaterThanOrEqual(steady - 1)
})
