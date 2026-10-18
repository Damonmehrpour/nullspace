import { expect, test } from '@playwright/test'

test('contact details are reachable within two clicks and ten seconds', async ({ page }) => {
  const start = Date.now()
  await page.goto('/')
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Contact', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Contact' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'damons3m@gmail.com' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: /linkedin/i })).toBeVisible()
  await expect(dialog.getByText('Open to remote work and relocation opportunities')).toBeVisible()
  await expect(page.getByText(/résumé|download cv/i)).toHaveCount(0)
  expect(Date.now() - start).toBeLessThan(10_000)
})
