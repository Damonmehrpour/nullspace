import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { gotoEntry } from './helpers'

// Manual startup profiling on the real GPU (ANGLE/D3D11):
//   PROFILE=1 PROFILE_VARIANT=v1|v2 npx playwright test startup --project=desktop
// Records every frame for 30 s after Enter while the player walks to Education, with adaptive
// quality left ON (as on a real visit), and writes test-results/startup-<variant>.json + .md.
test.skip(!process.env.PROFILE, 'manual profiling')
const MODE = process.env.PROFILE_MODE ?? 'gpu' // gpu | uncapped | software
const ARGS: Record<string, string[]> = {
  gpu: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'],
  uncapped: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
  software: [],
}
test.use({ launchOptions: { args: ARGS[MODE] } })

type Frame = { t: number; dt: number; programs: number; calls: number; quality: string }

test('startup timeline', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  const variant = process.env.PROFILE_VARIANT === 'v2' ? 'v2' : 'v1'
  await page.setViewportSize({ width: 1920, height: 1080 })
  await gotoEntry(page)
  if (variant === 'v2') await page.goto('/?visual=v2')
  await page.evaluate(() => ((window as unknown as { __recordTimeline: boolean }).__recordTimeline = true))
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')!
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) as string
  })
  const clickAt = await page.evaluate(() => performance.now())
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await page.evaluate(() => (window as unknown as { __nullspace: { walkPlayerTo(id: string): void } }).__nullspace.walkPlayerTo('education'))
  await page.waitForTimeout(30_000)
  const frames = (await page.evaluate(() => (window as unknown as { __nullspace: { getTimeline(): unknown } }).__nullspace.getTimeline())) as Frame[]

  const rel = (f: Frame) => Math.round(f.t - clickAt)
  const spikes = frames.filter((f) => f.dt > 50).map((f) => ({ at: rel(f), dt: Math.round(f.dt), programs: f.programs, quality: f.quality }))
  const programSteps: string[] = []
  const qualitySteps: string[] = []
  frames.forEach((f, i) => {
    const p = frames[i - 1]
    if (!p || p.programs !== f.programs) programSteps.push(`${rel(f)} ms: ${f.programs} programs (frame ${Math.round(f.dt)} ms)`)
    if (!p || p.quality !== f.quality) qualitySteps.push(`${rel(f)} ms: ${f.quality}`)
  })
  const windows: string[] = []
  for (let s = 0; s < 30; s += 5) {
    const w = frames.filter((f) => rel(f) >= s * 1000 && rel(f) < (s + 5) * 1000)
    if (w.length === 0) continue
    const sorted = w.map((f) => f.dt).sort((a, b) => a - b)
    windows.push(`| ${s}–${s + 5} s | ${Math.round(1000 / sorted[Math.floor(sorted.length / 2)])} | ${Math.round(sorted[Math.floor(sorted.length * 0.95)])} | ${Math.round(sorted[sorted.length - 1])} |`)
  }
  mkdirSync('test-results', { recursive: true })
  const tag = `${variant}-${MODE}`
  writeFileSync(`test-results/startup-${tag}.json`, JSON.stringify({ renderer, frames }, null, 0))
  writeFileSync(
    `test-results/startup-${tag}.md`,
    [
      `variant ${variant} · mode ${MODE} · ${renderer}`,
      `first frame at ${frames[0] ? rel(frames[0]) : '?'} ms after Enter · ${frames.length} frames in 30 s`,
      '',
      '| window | median fps | p95 frame ms | worst frame ms |',
      '|---|---|---|---|',
      ...windows,
      '',
      `frames > 50 ms: ${spikes.length}`,
      ...spikes.slice(0, 25).map((s) => `- ${s.at} ms: ${s.dt} ms (programs ${s.programs}, ${s.quality})`),
      '',
      'program count changes:',
      ...programSteps.slice(0, 40).map((x) => `- ${x}`),
      '',
      'quality changes:',
      ...qualitySteps.map((x) => `- ${x}`),
    ].join('\n'),
  )
})
