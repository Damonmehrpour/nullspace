import { expect, test } from '@playwright/test'
import { gotoEntry } from './helpers'

test('settings can be changed in a real browser and persist across reloads', async ({ page }) => {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()
  const typing = dialog.getByRole('checkbox', { name: 'Typing effect' })
  await typing.click()
  await expect(typing).not.toBeChecked()
  await dialog.getByRole('radio', { name: 'Low', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused()
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('checkbox', { name: 'Typing effect' })).not.toBeChecked()
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: 'Low', exact: true })).toBeChecked()
})
