import { test } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual profiling only: PROFILE=1 npx playwright test profile --project=desktop
// Measures real-time fps (rAF) plus draw calls and triangles at several viewpoints.
test.skip(!process.env.PROFILE, 'manual profiling')
// PROFILE_MODE: software (default, pixel-bound proxy) | uncapped (real GPU via ANGLE/D3D11, no vsync).
const MODE = process.env.PROFILE_MODE === 'uncapped' ? 'uncapped' : 'software'
if (MODE === 'uncapped') test.use({ launchOptions: { args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] } })

type V = { x: number; z: number }

test('profile world', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  await page.setViewportSize(MODE === 'uncapped' ? { width: 1920, height: 1080 } : { width: 1280, height: 720 })
  const variant = process.env.PROFILE_VARIANT === 'v2' ? 'v2' : 'v1'
  await gotoEntry(page)
  if (variant === 'v2') await page.goto('/?visual=v2')
  const t0 = Date.now()
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.locator('#world-canvas canvas').waitFor()
  const startupMs = Date.now() - t0
  // PROFILE_QUALITY=high|medium|low pins the level (default High, the worst case).
  const level = process.env.PROFILE_QUALITY ?? 'high'
  await page.evaluate((l) => (window as unknown as { __nullspace: { lockQuality(l: string): void } }).__nullspace.lockQuality(l), level)
  // Let adaptive quality settle first; its one-time downgrade (shader recompiles) is not steady-state cost.
  await page.waitForTimeout(6000)
  const quality = await page.evaluate(() => (window as unknown as { __nullspace: { getQuality(): unknown } }).__nullspace.getQuality())
  // Measure the steady state a visitor sees after the tour: every island revealed (risen towers,
  // lit portals, settled ring), not mid-reveal. Earlier phases measured unrevealed islands.
  await page.evaluate(() => (window as unknown as { __nullspace: { markAllRevealed(): void } }).__nullspace.markAllRevealed())

  // Spawn and a ring overview, then each island from in front of it (18.5 m out on its own bearing,
  // facing outward), computed from the ring layout so every label shows the island it names.
  // (Earlier phases used hand-placed "projects/skills close" positions that actually framed each other.)
  const ISLANDS = ['education', 'experience', 'projects', 'skills', 'contact']
  const views: { name: string; pos: V; yaw: number }[] = [
    { name: 'spawn', pos: { x: -1.18, z: 1.62 }, yaw: 2.2 },
    { name: 'ring overview', pos: { x: -10, z: -14 }, yaw: -2.2 },
    ...ISLANDS.map((id, i) => {
      const a = ((90 - i * 72) * Math.PI) / 180
      return { name: `${id} close`, pos: { x: 18.5 * Math.cos(a), z: 18.5 * Math.sin(a) }, yaw: a }
    }),
  ]
  const rows: string[] = []
  for (const v of views) {
    await page.evaluate(([pos, yaw]) => (window as unknown as { __nullspace: { setView(p: V, y: number): void } }).__nullspace.setView(pos as V, yaw as number), [v.pos, v.yaw] as const)
    await page.waitForTimeout(800)
    const r = await page.evaluate(async () => {
      const dts: number[] = []
      const t0 = performance.now()
      let last = t0
      await new Promise<void>((done) => {
        const f = () => {
          const now = performance.now()
          dts.push(now - last)
          last = now
          if (now - t0 < 3000) requestAnimationFrame(f)
          else done()
        }
        requestAnimationFrame(f)
      })
      dts.shift()
      dts.sort((a, b) => a - b)
      const info = (window as unknown as { __nullspace: { getRenderInfo(): { calls: number; triangles: number } } }).__nullspace.getRenderInfo()
      return { p50: dts[dts.length >> 1], p95: dts[Math.floor(dts.length * 0.95)], ...info }
    })
    rows.push(`| ${v.name} | ${r.p50.toFixed(2)} | ${r.p95.toFixed(2)} | ${r.calls} | ${r.triangles} |`)
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync(`test-results/profile-${variant}-${MODE}-${level}.md`, [`variant: ${variant} · mode ${MODE} · quality ${level}`, `startup (Enter click → world ready): ${startupMs} ms`, `quality after warm-up: ${JSON.stringify(quality)}`, '', '| View | p50 frame ms | p95 frame ms | draw calls | triangles |', '|---|---|---|---|---|', ...rows].join('\n'))
})
