import { expect, test } from '@playwright/test'

test('contact and résumé status are reachable within two clicks and ten seconds', async ({ page }) => {
  const start = Date.now()
  await page.goto('/')
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Contact', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Contact' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Résumé: coming soon')).toBeVisible()
  expect(Date.now() - start).toBeLessThan(10_000)
})
