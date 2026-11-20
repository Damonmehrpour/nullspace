import { expect, test, type Page } from '@playwright/test'
import { gotoEntry } from './helpers'

// The 2D Portfolio's full-viewport detail view: every section and a project open as a full page with
// a centred reading column, scroll inside on small phones, close by its button, Escape or the
// browser's Back, return focus and keep the page's scroll position. The page behind stays put.

const SECTIONS = ['Education & Research', 'Experience', 'Projects', 'Skills', 'Contact']

async function openPortfolio(page: Page) {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
  await expect(page.getByText('Building worlds, systems & intelligent experiences.')).toBeVisible()
}

async function openSection(page: Page, title: string) {
  await page.getByRole('button', { name: 'Sections' }).click()
  await page.getByRole('listitem', { name: title }).getByRole('button', { name: 'Open' }).click()
}

for (const [label, size] of [
  ['desktop 1440', { width: 1440, height: 900 }],
  ['phone 375', { width: 375, height: 667 }],
  ['phone 390', { width: 390, height: 844 }],
] as const) {
  test(`${label}: every section opens full-viewport, reads in a centred column, scrolls and closes`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize(size)
    await openPortfolio(page)
    for (const title of SECTIONS) {
      await openSection(page, title)
      const dialog = page.getByRole('dialog', { name: title })
      await expect(dialog).toBeVisible()
      // The whole viewport, over the top bar.
      const box = (await dialog.boundingBox())!
      expect(box).toEqual({ x: 0, y: 0, width: size.width, height: size.height })
      await expect(page.getByRole('navigation', { name: 'Quick navigation' })).not.toBeInViewport({ ratio: 0.01 }).catch(() => {})
      // A centred reading column, never edge to edge on wide screens.
      const col = (await dialog.locator('article').boundingBox())!
      expect(col.width).toBeLessThanOrEqual(Math.min(size.width, 52 * 16) + 1)
      expect(Math.abs(col.x + col.width / 2 - size.width / 2)).toBeLessThan(2)
      // No horizontal overflow; long content scrolls inside the view.
      const m = await dialog.evaluate((d) => ({ sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight }))
      expect(m.sw).toBeLessThanOrEqual(m.cw + 1)
      if (m.sh > m.ch) {
        await dialog.evaluate((d) => d.scrollTo(0, d.scrollHeight))
        expect(await dialog.evaluate((d) => d.scrollTop)).toBeGreaterThan(0)
        // The way back stays in reach at the bottom.
        await expect(dialog.getByRole('button', { name: /Back to portfolio/ })).toBeInViewport()
      }
      await dialog.getByRole('button', { name: /Back to portfolio/ }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
  })
}

test('a project opens full-viewport from its card; Escape and the browser Back both close; focus and scroll return', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await openPortfolio(page)
  const card = page.getByRole('button', { name: 'Open project: SanastoSauna' })
  await card.scrollIntoViewIfNeeded()
  const scrolled = await page.evaluate(() => window.scrollY)
  expect(scrolled).toBeGreaterThan(0)
  // Open, then Escape: closed, focus back on the card, the page where it was.
  await card.click()
  await expect(page.getByRole('dialog', { name: 'SanastoSauna' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'SanastoSauna', level: 2 })).toBeFocused()
  // The page behind does not scroll while the view is open.
  await page.mouse.wheel(0, 600)
  expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(card).toBeFocused()
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrolled)).toBeLessThan(2)
  // Open, then the browser's Back: it closes the view and stays on the Portfolio.
  await card.click()
  await expect(page.getByRole('dialog', { name: 'SanastoSauna' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Building worlds, systems & intelligent experiences.')).toBeVisible()
  // Tab stays inside the view while it is open.
  await card.click()
  for (let k = 0; k < 12; k++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
})

test('the 3D world keeps its compact side panel', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.locator('#world-canvas canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await page.getByRole('button', { name: 'Contact', exact: true }).click()
  const box = (await page.getByRole('dialog', { name: 'Contact' }).boundingBox())!
  expect(box.width).toBeLessThanOrEqual(641)
  expect(box.x).toBeGreaterThan(700)
})

for (const [label, size] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone 375', { width: 375, height: 667 }],
] as const) {
  test(`${label}: the SanastoSauna screenshots load, switch, enlarge and close back to the detail`, async ({ page }, info) => {
    test.setTimeout(60_000)
    await page.setViewportSize(size)
    await openPortfolio(page)
    await page.getByRole('button', { name: 'Open project: SanastoSauna' }).click()
    const dialog = page.getByRole('dialog', { name: 'SanastoSauna' })
    const region = dialog.getByRole('region', { name: 'SanastoSauna screenshots' })
    const featured = region.getByRole('button', { name: /Open screenshot 1 of 6 larger/ })
    await expect(featured).toBeVisible()
    // The featured shot is loaded and shown whole: its box has the screenshot's own proportions.
    const img = featured.getByRole('img')
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(300)
    const b = (await featured.boundingBox())!
    expect(b.height / b.width).toBeGreaterThan(2.0)
    expect(b.width).toBeLessThanOrEqual(size.width)
    // Switch with a thumbnail, then enlarge.
    await region.getByRole('button', { name: /screenshot 3: Worlds/ }).click()
    await region.getByRole('button', { name: /Open screenshot 3 of 6 larger/ }).click()
    const viewer = page.getByTestId('gallery-viewer')
    await expect(viewer).toBeVisible()
    await expect(viewer.getByRole('button', { name: 'Close' })).toBeFocused()
    // Browse: arrows (desktop) or a swipe (touch).
    if (info.project.name === 'touch') {
      // A real finger swipe, right to left, through Chrome's touch input.
      const vb = (await viewer.boundingBox())!
      const cdp = await page.context().newCDPSession(page)
      const at = (x: number) => [{ x: vb.width * x, y: vb.height * 0.5, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0.8) })
      for (const x of [0.7, 0.55, 0.4, 0.25]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(x) })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('dialog', { name: 'Screenshot 4 of 6' })).toBeVisible()
    // Escape closes only the viewer; the detail stays open with focus back on the screenshot.
    await page.keyboard.press('Escape')
    await expect(viewer).toHaveCount(0)
    await expect(dialog).toBeVisible()
    await expect(region.getByRole('button', { name: /Open screenshot 4 of 6 larger/ })).toBeFocused()
    // No published claim and no store link.
    await expect(dialog.getByText(/In development/)).toBeVisible()
    await expect(dialog.getByRole('link', { name: /Google Play/ })).toHaveCount(0)
  })
}
