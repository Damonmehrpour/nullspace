import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

test('keyboard-only: open and close sections, focus returns, shortcuts paused in panel', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'keyboard path is desktop-only')
  await gotoEntry(page)
  const contact = page.getByRole('button', { name: 'Contact', exact: true })
  await contact.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible()
  await page.keyboard.press('2')
  await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(contact).toBeFocused()

  const toggle = page.getByRole('button', { name: 'Sections' })
  for (const title of ['Education', 'Experience', 'Projects', 'Skills', 'Contact']) {
    await toggle.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('listitem', { name: title }).getByRole('button', { name: 'Open' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: title })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(toggle).toBeFocused()
  }
})
