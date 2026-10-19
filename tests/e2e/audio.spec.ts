import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

// Sound is optional: silent until the visitor switches it on (a click, so autoplay rules are met),
// and the switch is a pressed/unpressed toggle that screen readers announce.
test('sound starts off, switches on and off from the top bar, and is remembered', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const running = () => page.evaluate(() => (window as unknown as { __nullspace: { soundRunning(): boolean } }).__nullspace.soundRunning())
  const toggle = page.getByRole('button', { name: /^Sound (on|off)$/ })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  expect(await running()).toBe(false)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(running).toBe(true)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await page.reload()
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await expect(page.getByRole('button', { name: /^Sound (on|off)$/ })).toHaveAttribute('aria-pressed', 'true')
})
