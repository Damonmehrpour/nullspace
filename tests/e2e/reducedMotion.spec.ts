import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

type NS = { freezeClock(): void; advance(s: number): void; teleportPlayer(to: string): void; isRevealing(): boolean; say(t: string): void }
const ns = (page: import('@playwright/test').Page, fn: (n: NS) => unknown) =>
  page.evaluate((src) => new Function('n', `return (${src})(n)`)((window as unknown as { __nullspace: NS }).__nullspace), fn.toString())

test('reduced motion: subtitles appear whole and reveals take at most 0.4 s', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  await ns(page, (n) => n.freezeClock())
  // Say the line and read the subtitle two frames later, in one step: under reduced motion it must
  // already be whole (no typing). (Checked atomically: under heavy test load the line's display time
  // can otherwise run out before a separate assertion looks.)
  const shown = await page.evaluate(async () => {
    ;(window as unknown as { __nullspace: NS }).__nullspace.say('The void is not a shortcut.')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    return document.querySelector('[data-testid="subtitle-text"]')?.textContent
  })
  expect(shown).toBe('The void is not a shortcut.')

  await ns(page, (n) => n.teleportPlayer('education'))
  await ns(page, (n) => n.advance(0.4))
  expect(await ns(page, (n) => n.isRevealing())).toBe(false)
  await expect(page.getByRole('dialog', { name: 'Education & Research' })).toBeVisible()
})
