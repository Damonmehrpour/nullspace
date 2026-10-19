import { expect, test } from '@playwright/test'
import { collect3DRequests, gotoEntry } from './helpers'

test('view portfolio shows every section with honest badges and loads no 3D code', async ({ page }) => {
  const hits = collect3DRequests(page)
  await gotoEntry(page)
  await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
  await expect(page.getByText('Building worlds, systems & intelligent experiences.')).toBeVisible()
  for (const title of ['Education & Research', 'Experience', 'Projects', 'Skills', 'Contact']) {
    await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible()
  }
  await expect(page.getByText('IN DOCUMENTATION').first()).toBeVisible()
  await expect(page.getByText('PLACEHOLDER')).toHaveCount(0)
  await expect(page.getByText('AWAITING DATA')).toHaveCount(0)
  for (const honor of ['Grand Tour XR', 'WasteGo', 'Who Are You?']) await expect(page.getByText(honor).first()).toBeVisible()
  await page.getByRole('button', { name: /open project: XR Meditation System/i }).click()
  await expect(page.getByRole('dialog', { name: 'XR Meditation System' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.waitForLoadState('networkidle')
  expect(hits).toEqual([])
})

test('portfolio has no horizontal scroll', async ({ page }) => {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})

// Runs on desktop and on the touch (mobile) project: the public phone number is a dialable tel: link.
test('portfolio contact offers the phone number as a tel: link', async ({ page }) => {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
  const phone = page.getByRole('link', { name: '+358 45 8629910' })
  await phone.scrollIntoViewIfNeeded()
  await expect(phone).toBeVisible()
  await expect(phone).toHaveAttribute('href', 'tel:+358458629910')
  await expect(phone).not.toHaveAttribute('target', '_blank')
})
