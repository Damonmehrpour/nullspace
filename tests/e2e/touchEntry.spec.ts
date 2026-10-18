import { expect, test } from '@playwright/test'
import { collect3DRequests, gotoEntry, isTouchProject } from './helpers'

const NOTE = '3D walking needs a keyboard in this version. View Portfolio has everything.'

test('touch-first entry recommends the portfolio and explains the keyboard need before loading 3D', async ({ page }, info) => {
  test.skip(!isTouchProject(info.project.name), 'touch only')
  const hits = collect3DRequests(page)
  await gotoEntry(page)
  await expect(page.locator('main button').first()).toHaveText('VIEW PORTFOLIO')
  await expect(page.getByRole('button', { name: 'ENTER SIMULATION' })).toHaveAccessibleDescription(NOTE)
  await expect(page.getByText(NOTE)).toBeVisible()
  expect(hits).toEqual([])
})

test('desktop entry shows no keyboard note', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await expect(page.getByText(NOTE)).toHaveCount(0)
  await expect(page.locator('main button').first()).toHaveText('ENTER SIMULATION')
})
