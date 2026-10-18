import type { Page } from '@playwright/test'

/** Records every request for 3D code (three.js or the world chunk). */
export function collect3DRequests(page: Page): string[] {
  const hits: string[] = []
  page.on('request', (r) => {
    if (/three|world-|WorldRoot/.test(r.url())) hits.push(r.url())
  })
  return hits
}

/** Fresh visit with boot already seen, so the test starts at the entry screen. */
export async function gotoEntry(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.setItem('nullspace.booted', 'true')
      sessionStorage.setItem('e2e-init', '1')
    }
  })
  await page.goto('/')
}

export const isTouchProject = (name: string) => name === 'touch'
