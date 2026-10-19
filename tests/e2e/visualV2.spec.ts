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

test('the clean URL shows the finished (v2) world; ?visual=v1 keeps the original look', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  const wanderer = () => page.evaluate(() => (window as unknown as { __nullspace: { materialsUnder(n: string): unknown[] } }).__nullspace.materialsUnder('v2-wanderer').length)
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.waitForFunction(() => (window as unknown as { __nullspace: { materialsUnder(n: string): unknown[] } }).__nullspace.materialsUnder('v2-wanderer').length > 0)
  expect(await wanderer()).toBeGreaterThan(0)
  await page.goto('/?visual=v1')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.locator('#world-canvas canvas').waitFor()
  await page.waitForTimeout(500)
  expect(await wanderer()).toBe(0)
})

// Changing quality (by hand or adaptively) must not recompile shaders: a recompile cascade froze
// slow machines for seconds right when they most needed relief. Starts from High, then steps down.
for (const variant of ['v1', 'v2'] as const) {
  test(`${variant}: stepping from High to Medium to Low compiles no new shader programs`, async ({ page }, info) => {
    test.skip(isTouchProject(info.project.name), 'desktop only')
    await gotoEntry(page)
    if (variant === 'v1') await page.goto('/?visual=v1')
    await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
    await expect(page.locator('#world-canvas canvas')).toBeVisible({ timeout: 15_000 })
    await page.waitForFunction(() => '__nullspace' in window)
    const programs = () => page.evaluate(() => (window as unknown as { __nullspace: { listPrograms(): string[] } }).__nullspace.listPrograms().length)
    const choose = async (label: string) => {
      await page.getByRole('button', { name: 'Settings' }).click()
      await page.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: label, exact: true }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(800)
    }
    await choose('High')
    const before = await programs()
    await choose('Medium')
    expect(await programs()).toBe(before)
    await choose('Low')
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

// The wanderer's face stays hidden in shadow: no eyes or glowing dots, and the face cavity is unlit black
// (so no light, the player's own lamp included, can reveal features).
test('v2: the wanderer has no visible facial features', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  type Mat = { mesh: string; type: string; color: string; emissive: string | null }
  await page.waitForFunction(() => (window as unknown as { __nullspace: { materialsUnder(n: string): unknown[] } }).__nullspace.materialsUnder('v2-wanderer').length > 0)
  const mats = (await page.evaluate(() => (window as unknown as { __nullspace: { materialsUnder(n: string): unknown } }).__nullspace.materialsUnder('v2-wanderer'))) as Mat[]
  expect(mats.length).toBeGreaterThan(0)
  // Nothing on the figure glows.
  expect(mats.filter((m) => m.emissive !== null && m.emissive !== '000000')).toEqual([])
  // The only unlit material is the black face cavity.
  const unlit = mats.filter((m) => m.type === 'MeshBasicMaterial')
  expect(unlit).toEqual([{ mesh: 'v2-wanderer-face', type: 'MeshBasicMaterial', color: '000000', emissive: null }])
})

// Experience portals: walking the corridor discovers each career chapter once per visit, and each
// discovery cues the kokedama (walking back through adds nothing).
test('v2: walking the Experience corridor discovers each portal once', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  test.setTimeout(90_000) // many small steps on the software renderer
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  const a = ((90 - 72) * Math.PI) / 180
  const at = (lx: number) => ({ x: (22 + lx) * Math.cos(a), z: (22 + lx) * Math.sin(a) })
  const walk = async (from: number, to: number) => {
    const step = from < to ? 0.35 : -0.35
    for (let lx = from; step > 0 ? lx <= to : lx >= to; lx += step) {
      await ns('setView', at(lx), a)
      await page.waitForTimeout(40)
    }
  }
  await walk(-1.6, -1.5)
  const before = (await ns('getGuideCue')) as number
  const programs = ((await ns('listPrograms')) as string[]).length
  await walk(-1.5, 5.6)
  expect((await ns('getGuideCue')) as number).toBe(before + 4)
  await walk(5.6, -1.5)
  expect((await ns('getGuideCue')) as number).toBe(before + 4)
  // Portals fading for the camera along the way switch to an already-compiled variant.
  expect(((await ns('listPrograms')) as string[]).length).toBe(programs)
})

// Everything compiles behind the loading screen: bringing each island into view later must not
// compile a new shader (a late compile is a visible hitch on slower machines).
test('v2: visiting every island compiles no new shader programs', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  await page.waitForTimeout(500)
  const before = ((await ns('listPrograms')) as string[]).length
  for (let i = 0; i < 5; i++) {
    const a = ((90 - i * 72) * Math.PI) / 180
    // Stand just outside each island's arrival zone, facing it, so it fills the view.
    await ns('setView', { x: 15.5 * Math.cos(a), z: 15.5 * Math.sin(a) }, a)
    await page.waitForTimeout(400)
  }
  expect(((await ns('listPrograms')) as string[]).length).toBe(before)
})

// Projects atrium: coming within interaction range of each project discovers it once per visit
// (its plinth lights and its thread of light ignite) and cues the kokedama.
test('v2: approaching each project in the atrium discovers it once', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  test.setTimeout(90_000) // many small steps on the software renderer
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  const a = ((90 - 2 * 72) * Math.PI) / 180 // Projects: third island on the ring
  const c = { x: 22 * Math.cos(a), z: 22 * Math.sin(a) }
  const near = (off: number) => ({ x: c.x + 2 * Math.cos(a + (off * Math.PI) / 180), z: c.z + 2 * Math.sin(a + (off * Math.PI) / 180) })
  await ns('setView', c, a)
  await page.waitForTimeout(300)
  const before = (await ns('getGuideCue')) as number
  const programs = ((await ns('listPrograms')) as string[]).length
  for (const pass of [1, 2]) {
    for (const off of [-40, 0, 40]) {
      await ns('setView', near(off), a + (off * Math.PI) / 180)
      await page.waitForTimeout(150)
      await ns('setView', c, a)
      await page.waitForTimeout(100)
    }
    expect((await ns('getGuideCue')) as number, `pass ${pass}`).toBe(before + 3)
  }
  expect(((await ns('listPrograms')) as string[]).length).toBe(programs)
})

// Data City: reaching each district's name stone discovers it once per visit (its windows and
// floor line light up) and cues the kokedama; no new shaders compile along the way.
test('v2: visiting each Data City district discovers it once', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  test.setTimeout(90_000) // many small steps on the software renderer
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  await ns('markAllRevealed')
  const a = ((90 - 3 * 72) * Math.PI) / 180 // Skills: fourth island on the ring
  const c = { x: 22 * Math.cos(a), z: 22 * Math.sin(a) }
  const local = (r: number, deg: number) => {
    const t = (deg * Math.PI) / 180
    const x = r * Math.cos(t)
    const z = r * Math.sin(t)
    return { x: c.x + x * Math.cos(a) - z * Math.sin(a), z: c.z + x * Math.sin(a) + z * Math.cos(a) }
  }
  await ns('setView', c, a)
  await page.waitForTimeout(600)
  const before = (await ns('getGuideCue')) as number
  const programs = ((await ns('listPrograms')) as string[]).length
  for (const pass of [1, 2]) {
    for (const deg of [-62, 0, 62, 160, 200]) {
      await ns('setView', local(1.6, deg), a + (deg * Math.PI) / 180)
      await page.waitForTimeout(150)
    }
    expect((await ns('getGuideCue')) as number, `pass ${pass}`).toBe(before + 5)
  }
  expect(((await ns('listPrograms')) as string[]).length).toBe(programs)
})

// Signal tower: approaching each contact channel's stone discovers it once per visit (a pulse climbs
// its cable to the tower) and cues the kokedama; no new shaders compile.
test('v2: approaching each contact stone discovers it once', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  test.setTimeout(90_000) // many small steps on the software renderer
  await gotoEntry(page)
  await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('freezeClock')
  await ns('markAllRevealed')
  const a = ((90 - 4 * 72) * Math.PI) / 180 // Contact: fifth island on the ring
  const c = { x: 22 * Math.cos(a), z: 22 * Math.sin(a) }
  const local = (x: number, z: number) => ({ x: c.x + x * Math.cos(a) - z * Math.sin(a), z: c.z + x * Math.sin(a) + z * Math.cos(a) })
  // Stones fan around the tower (2.4, 0) at 3.15 m, 46° apart around 180° (four channels: ±23°, ±69°); stand 1 m in front of each.
  const front = (deg: number) => {
    const t = ((180 + deg) * Math.PI) / 180
    return local(2.4 + 4.15 * Math.cos(t), 4.15 * Math.sin(t))
  }
  await ns('setView', local(-3.5, 0), a)
  await page.waitForTimeout(500)
  const before = (await ns('getGuideCue')) as number
  const programs = ((await ns('listPrograms')) as string[]).length
  for (const pass of [1, 2]) {
    for (const deg of [-69, -23, 23, 69]) {
      await ns('setView', front(deg), a)
      await page.waitForTimeout(200)
    }
    expect((await ns('getGuideCue')) as number, `pass ${pass}`).toBe(before + 4)
  }
  expect(((await ns('listPrograms')) as string[]).length).toBe(programs)
})
