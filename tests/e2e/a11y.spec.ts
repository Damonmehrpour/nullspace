import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { gotoEntry, isTouchProject } from './helpers'

// Automated accessibility audit (WCAG 2.x A/AA rules) of the pages people actually use. The 3D canvas
// itself is excluded: its content is mirrored in the panels and the 2D portfolio.
async function audit(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('#world-canvas canvas').analyze()
  return r.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help} :: ${v.nodes.map((n) => n.html).join(' | ').slice(0, 300)}`)
}

test('entry page', async ({ page }) => {
  await gotoEntry(page)
  expect(await audit(page)).toEqual([])
})

test('2D portfolio (desktop and mobile)', async ({ page }) => {
  await gotoEntry(page)
  await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
  await page.getByRole('region', { name: 'At a glance' }).waitFor()
  expect(await audit(page)).toEqual([])
})

test('world HUD, settings and a project panel', async ({ page }, info) => {
  test.skip(isTouchProject(info.project.name), 'desktop only')
  await gotoEntry(page)
  await page.getByRole('button', { name: 'ENTER SIMULATION' }).click()
  await page.getByRole('region', { name: 'Controls' }).waitFor()
  expect(await audit(page)).toEqual([])
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('dialog', { name: 'Settings' }).waitFor()
  expect(await audit(page)).toEqual([])
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Projects' }).click()
  await page.getByRole('dialog', { name: 'Projects' }).waitFor()
  expect(await audit(page)).toEqual([])
})
