import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// Manual UI review: SHOTS=1 npx playwright test uiShots --project=desktop
test.skip(!process.env.SHOTS, 'manual screenshots')

for (const [name, size] of [['desktop', { width: 1366, height: 768 }], ['mobile', { width: 390, height: 844 }]] as const) {
  test(`ui ${name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop')
    test.setTimeout(120_000)
    const dir = `test-results/ui-${name}`
    mkdirSync(dir, { recursive: true })
    await page.setViewportSize(size)
    await page.goto('/')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${dir}/01-boot.png` })
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `${dir}/02-entry.png` })
    await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${dir}/03-portfolio-top.png` })
    await page.screenshot({ path: `${dir}/04-portfolio-full.png`, fullPage: true })
    if (name === 'desktop') {
      await page.goto('/')
      await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
      await page.waitForTimeout(150)
      await page.screenshot({ path: `${dir}/05-loading.png` })
      await page.locator('#world-canvas canvas').waitFor()
      await page.waitForTimeout(2500)
      await page.screenshot({ path: `${dir}/06-world.png` })
      await page.getByRole('button', { name: 'Sections' }).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${dir}/07-sections.png` })
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Settings' }).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${dir}/08-settings.png` })
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Sections' }).click()
      await page.getByRole('button', { name: /^Experience/ }).first().click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${dir}/09-panel-experience.png` })
    }
  })
}
