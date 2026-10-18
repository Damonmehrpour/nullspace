import { test } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual profiling only: PROFILE=1 npx playwright test profile --project=desktop
// Measures real-time fps (rAF) plus draw calls and triangles at several viewpoints.
test.skip(!process.env.PROFILE, 'manual profiling')

type V = { x: number; z: number }

test('profile world', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1920, height: 1080 })
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.waitForTimeout(1500)

  const views: { name: string; pos: V; yaw: number }[] = [
    { name: 'spawn', pos: { x: -1.18, z: 1.62 }, yaw: 2.2 },
    { name: 'ring overview (projects)', pos: { x: -10, z: -14 }, yaw: -2.2 },
    { name: 'projects close', pos: { x: -14.6, z: -14.9 }, yaw: -2.33 },
    { name: 'skills close', pos: { x: 15.8, z: -11.5 }, yaw: -0.63 },
  ]
  const rows: string[] = []
  for (const v of views) {
    await page.evaluate(([pos, yaw]) => (window as unknown as { __nullspace: { setView(p: V, y: number): void } }).__nullspace.setView(pos as V, yaw as number), [v.pos, v.yaw] as const)
    await page.waitForTimeout(800)
    const r = await page.evaluate(async () => {
      let n = 0
      const t0 = performance.now()
      await new Promise<void>((done) => {
        const f = () => {
          n++
          if (performance.now() - t0 < 2000) requestAnimationFrame(f)
          else done()
        }
        requestAnimationFrame(f)
      })
      const info = (window as unknown as { __nullspace: { getRenderInfo(): { calls: number; triangles: number } } }).__nullspace.getRenderInfo()
      return { fps: Math.round(n / 2), ...info }
    })
    rows.push(`| ${v.name} | ${r.fps} | ${r.calls} | ${r.triangles} |`)
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/profile.md', ['| View | fps | draw calls | triangles |', '|---|---|---|---|', ...rows].join('\n'))
})
