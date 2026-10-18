import { test } from '@playwright/test'
import { gotoEntry } from './helpers'

// Manual visual review only: SHOTS=1 npx playwright test fogShots --project=desktop
// Saves screenshots from spawn, each walkway midpoint and in front of each island to test-results/shots.
test.skip(!process.env.SHOTS, 'manual screenshots')

type V = { x: number; z: number }

test('fog and island readability shots', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1280, height: 720 })
  // SHOTS_VARIANT=v2 shoots the ?visual=v2 look into test-results/shots-v2.
  const v2 = process.env.SHOTS_VARIANT === 'v2'
  await gotoEntry(page)
  if (v2) await page.goto('/?visual=v2')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  // Headless rendering is slow; keep High quality so the shots show the full look.
  await page.evaluate(() => (window as unknown as { __nullspace: { lockQuality(): void } }).__nullspace.lockQuality())
  const views = await page.evaluate(() => {
    const deg = (d: number) => (d * Math.PI) / 180
    const ids = ['education', 'experience', 'projects', 'skills', 'contact']
    const out: { name: string; pos: V; yaw: number }[] = []
    const centre = (i: number) => ({ x: 22 * Math.cos(deg(90 - i * 72)), z: 22 * Math.sin(deg(90 - i * 72)) })
    const entry = { x: (centre(4).x + centre(0).x) / 2, z: (centre(4).z + centre(0).z) / 2 }
    const len = Math.hypot(entry.x, entry.z)
    out.push({ name: 'spawn', pos: { x: (entry.x / len) * 2, z: (entry.z / len) * 2 }, yaw: Math.atan2(entry.z, entry.x) })
    ids.forEach((id, i) => {
      const c = centre(i)
      const n = centre((i + 1) % 5)
      const mid = { x: (c.x + n.x) / 2, z: (c.z + n.z) / 2 }
      out.push({ name: `walkway-${id}`, pos: mid, yaw: Math.atan2(n.z - mid.z, n.x - mid.x) })
      const a = Math.atan2(c.z, c.x)
      out.push({ name: `island-${id}`, pos: { x: c.x - Math.cos(a) * 3.5, z: c.z - Math.sin(a) * 3.5 }, yaw: a })
    })
    return out
  })
  await page.evaluate(() => {
    const ns = (window as unknown as { __nullspace: { freezeClock(): void; markAllRevealed(): void } }).__nullspace
    ns.freezeClock()
    ns.markAllRevealed()
  })
  for (const v of views) {
    await page.evaluate(([pos, yaw]) => (window as unknown as { __nullspace: { setView(p: V, y: number): void } }).__nullspace.setView(pos as V, yaw as number), [v.pos, v.yaw] as const)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `test-results/shots${v2 ? '-v2' : ''}/${v.name}.png` })
  }
})
