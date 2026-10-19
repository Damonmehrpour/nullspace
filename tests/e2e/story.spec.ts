import { expect, test } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

// Phase 3 story moment: the first time per visit the player reaches the XR Meditation System, the
// kokedama says the author's two lines (in order, with a pause). It never covers the project panel and
// never repeats in the same visit. Shared by both looks, so it runs on the default experience.
const LINE_1 = 'Oh… this is actually where I was first born.'
const LINE_2 = 'Well, not exactly me. But the idea that became me started here.'

test('the XR Meditation story moment waits for the panel, plays once, in order', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  test.setTimeout(60_000)
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.waitForFunction(() => '__nullspace' in window)
  const ns = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as unknown as { __nullspace: Record<string, (...x: unknown[]) => unknown> }).__nullspace[f as string](...(a as unknown[])), [fn, args] as const)
  // The subtitle live region gets each full line at once (the visible line types out, and under heavy
  // test load its typing can lag), so the order and wording are checked there.
  const said = (line: string) => page.getByRole('status').filter({ hasText: line })
  await ns('freezeClock')

  // Open the XR Meditation System straight away: the story must not appear over the panel.
  await ns('interactArtifact', 0)
  const panel = page.getByRole('dialog', { name: 'XR Meditation System' })
  await expect(panel).toBeVisible()
  await page.waitForTimeout(2500)
  await expect(page.getByText(LINE_1)).toHaveCount(0)

  // Closing the panel lets it play: first line, then (after it clears and a pause) the second.
  await page.keyboard.press('Escape')
  await expect(said(LINE_1)).toHaveCount(1, { timeout: 15_000 })
  await expect(said(LINE_2)).toHaveCount(1, { timeout: 15_000 })

  // Leaving and coming back in the same visit does not repeat it.
  await ns('teleportPlayer', 'projects')
  await ns('advance', 0.1)
  await expect(said(LINE_2)).toHaveCount(0, { timeout: 15_000 }) // the second line has cleared
  await ns('interactArtifact', 0)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(3000)
  await expect(page.getByText(LINE_1)).toHaveCount(0)
})
