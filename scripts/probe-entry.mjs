// Probes the two entry paths on a deployed NULLSPACE (or any base URL): clicks ENTER SIMULATION and
// VIEW PORTFOLIO on desktop and phone viewports, and reports what actually opened plus any errors.
// Usage: node scripts/probe-entry.mjs https://nullspace-saemmi-studios.vercel.app
import { chromium, devices, webkit } from '@playwright/test'

const base = process.argv[2] ?? 'https://nullspace-saemmi-studios.vercel.app'
// Optional saved state (a returning visitor): JSON of localStorage key → raw string value.
const saved = process.argv[3] ? JSON.parse(process.argv[3]) : null
// ENGINE=webkit probes Safari's engine (what every iPhone browser uses); the default is Chromium.
const ENGINE = process.env.ENGINE === 'webkit' ? 'webkit' : 'chromium'
const browser = ENGINE === 'webkit' ? await webkit.launch() : await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = false

async function probe(label, contextOptions, path) {
  const ctx = await browser.newContext(contextOptions)
  if (saved) await ctx.addInitScript((entries) => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v) }, saved)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => r.status() >= 400 && errors.push(`http ${r.status()}: ${r.url()}`))
  const result = { label, path }
  try {
    await page.goto(base, { waitUntil: 'load' })
    const button = page.getByRole('button', { name: path === 'world' ? 'ENTER SIMULATION' : 'VIEW PORTFOLIO' })
    await button.waitFor({ timeout: 15_000 })
    await button.click()
    if (path === 'portfolio') {
      await page.locator('main > section').first().waitFor({ timeout: 10_000 })
      result.opened = `portfolio: ${await page.locator('main > section').count()} sections, first "${(await page.locator('main h2').first().textContent())?.trim()}"`
    } else {
      await page.locator('#world-canvas canvas').waitFor({ state: 'visible', timeout: 60_000 })
      await page.getByRole('button', { name: 'Sections' }).waitFor({ timeout: 30_000 })
      await page.waitForTimeout(2500)
      const shot = await page.locator('#world-canvas canvas').screenshot()
      result.opened = `world: canvas visible, HUD up, canvas screenshot ${shot.length} bytes`
    }
  } catch (e) {
    result.error = String(e).split('\n')[0]
    failed = true
  }
  result.url = page.url()
  result.errors = errors
  await page.screenshot({ path: `test-results/probe-${ENGINE}-${label}-${path}.png` }).catch(() => {})
  console.log(JSON.stringify(result))
  await ctx.close()
}

for (const [label, opts] of [
  ['desktop', { viewport: { width: 1366, height: 768 } }],
  ENGINE === 'webkit' ? ['iphone', { ...devices['iPhone 14'] }] : ['phone', { ...devices['Pixel 7'] }],
]) {
  await probe(label, opts, 'portfolio')
  await probe(label, opts, 'world')
}
await browser.close()
process.exit(failed ? 1 : 0)
