import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual: PROFILE=1 PROFILE_VARIANT=v1|v2 npx playwright test ablation --project=desktop
// Real GPU, uncapped, ~4K backing store, fixed Education close-up: frame time with each v2 element hidden.
test.skip(!process.env.PROFILE, 'manual profiling')
const SOFTWARE = process.env.PROFILE_MODE === 'software'
test.use(
  SOFTWARE
    ? { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }
    : {
        launchOptions: { args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] },
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 1.5,
      },
)

test('ablation', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(240_000)
  const variant = process.env.PROFILE_VARIANT === 'v2' ? 'v2' : 'v1'
  await gotoEntry(page)
  if (variant === 'v2') await page.goto(SOFTWARE ? '/?visual=v2&sw' : '/?visual=v2')
  else if (SOFTWARE) await page.goto('/?sw')
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  await ns('lockQuality')
  await page.waitForTimeout(3000)
  await ns('freezeClock')
  await ns('markAllRevealed')
  const VIEWS: Record<string, number> = { experience: 1, projects: 2 }
  if (process.env.ABLATION_VIEW && process.env.ABLATION_VIEW in VIEWS) {
    // Gameplay camera in front of the named island (same as the profile's "<island> close").
    const a = ((90 - 72 * VIEWS[process.env.ABLATION_VIEW]) * Math.PI) / 180
    await ns('setView', { x: 18.5 * Math.cos(a), z: 18.5 * Math.sin(a) }, a)
    await ns('advance', 0.05)
  } else {
    await ns('setView', { x: 0, z: 17 }, Math.PI / 2)
    await ns('placeGuide', { x: 0.8, z: 16.4 }, 0)
    await ns('advance', 0.05)
    await ns('setCamera', [0, 4.2, 9.5], [0, 1.8, 22.5])
  }
  await page.waitForTimeout(800)

  const measure = () =>
    page.evaluate(async () => {
      const dts: number[] = []
      let last = performance.now()
      await new Promise<void>((done) => {
        const f = () => {
          const now = performance.now()
          dts.push(now - last)
          last = now
          if (dts.length < (location.search.includes('sw') ? 40 : 400)) requestAnimationFrame(f)
          else done()
        }
        requestAnimationFrame(f)
      })
      dts.sort((a, b) => a - b)
      return { p50: dts[dts.length >> 1], p90: dts[Math.floor(dts.length * 0.9)] }
    })

  const rows: string[] = []
  const base = await measure()
  rows.push(`| (everything on) | ${base.p50.toFixed(2)} | ${base.p90.toFixed(2)} | |`)
  const parts = variant === 'v2' ? ['v2-dome', 'v2-mega', 'v2-dust', 'v2-contact', 'v2-slab', 'v2-archive', 'v2-spine', 'v2-shell', 'v2-monolith', 'v2-walkway', 'v2-pathlights', 'v2-blocks', 'v2-blockshadow', 'v2-wanderer', 'v2-kokedama', 'v2-buds', 'v2-portal', 'v2-portal-lights', 'v2-engraving', 'v2-moss', 'v2-stele', 'v2-terraces', 'v2-plaques', 'v2-plinths', 'v2-atrium-wash', 'v2-ring', 'v2-atrium-lights'] : []
  for (const p of parts) {
    const n = (await ns('setVisibleByName', p, false)) as number
    await page.waitForTimeout(200)
    const m = await measure()
    await ns('setVisibleByName', p, true)
    rows.push(`| hide ${p} (${n}) | ${m.p50.toFixed(2)} | ${m.p90.toFixed(2)} | ${(base.p50 - m.p50).toFixed(2)} |`)
  }
  if (variant === 'v2') {
    await ns('setConcreteDetail', false)
    await page.waitForTimeout(200)
    const m = await measure()
    await ns('setConcreteDetail', true)
    rows.push(`| concrete detail off | ${m.p50.toFixed(2)} | ${m.p90.toFixed(2)} | ${(base.p50 - m.p50).toFixed(2)} |`)
  }
  if (variant === 'v2') {
    for (const mode of ['plain', 'lambert'] as const) {
      const n = (await ns('swapConcrete', mode)) as number
      await page.waitForTimeout(1500)
      await measure()
      const m = await measure()
      rows.push(`| concrete → ${mode} (${n} meshes) | ${m.p50.toFixed(2)} | ${m.p90.toFixed(2)} | ${(base.p50 - m.p50).toFixed(2)} |`)
    }
    await ns('swapConcrete', 'v2')
    for (const p of ['v2-slab', 'v2-archive', 'v2-spine', 'v2-shell', 'v2-dome', 'v2-walkway', 'v2-pathlights', 'v2-blocks', 'v2-blockshadow', 'v2-terraces', 'v2-plaques', 'v2-plinths', 'v2-ring', 'v2-atrium-wash']) rows.push(`| triangles ${p} | ${await ns('triangles', p)} | | |`)
  }
  const programs = (await ns('listPrograms')) as string[]
  mkdirSync('test-results', { recursive: true })
  writeFileSync(
    `test-results/ablation-${variant}${SOFTWARE ? '-software' : ''}.md`,
    [`variant ${variant}`, '', '| condition | p50 ms | p90 ms | saved vs base (p50) |', '|---|---|---|---|', ...rows, '', `programs (${programs.length}):`, ...programs.map((p) => `- ${p}`)].join('\n'),
  )
})
