import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// Manual review of the plain portfolio, one image per section at each width:
// SHOTS=1 npx playwright test portfolioShots --project=desktop
test.skip(!process.env.SHOTS, 'manual screenshots')

const WIDTHS = [1440, 1280, 1024, 768, 390, 375]

test('portfolio sections at every width', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(180_000)
  const dir = 'test-results/portfolio'
  mkdirSync(dir, { recursive: true })
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
    await page.waitForTimeout(400)
    // The fixed top bar would sit over each cropped section; hide it for these crops only.
    await page.addStyleTag({ content: 'nav[aria-label="Quick navigation"] { visibility: hidden }' })
    await page.locator('main .hero').screenshot({ path: `${dir}/${width}-00-hero.png` })
    const sections = page.locator('main > section')
    for (let i = 0; i < (await sections.count()); i++) await sections.nth(i).screenshot({ path: `${dir}/${width}-${String(i + 1).padStart(2, '0')}.png` })
  }
})
