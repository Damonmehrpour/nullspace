import { expect, test } from '@playwright/test'

test('boot can be skipped with the button and is skipped on reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByRole('button', { name: 'ENTER SIMULATION' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'VIEW PORTFOLIO' })).toBeVisible()
})

test('boot can be skipped with a key', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible()
  await page.keyboard.press('x')
  await expect(page.getByRole('button', { name: 'ENTER SIMULATION' })).toBeVisible()
})

test('boot ends on its own within about three seconds of appearing', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ENTER SIMULATION' })).toBeVisible({ timeout: 3200 })
})
