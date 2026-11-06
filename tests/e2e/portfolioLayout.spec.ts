import { expect, test } from '@playwright/test'

// The plain portfolio's layout holds at every width: no title running into its content, no horizontal
// overflow, and no line of text overlapping another (headings, meta lines, lists, tags, cards).

const WIDTHS = [1440, 1280, 1024, 768, 390, 375]

for (const width of WIDTHS) {
  test(`portfolio layout at ${width} px: nothing overlaps or overflows`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop')
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.getByRole('button', { name: 'VIEW PORTFOLIO' }).click()
    await page.locator('main > section').first().waitFor()
    await page.evaluate(() => document.fonts.ready)

    const problems = await page.evaluate(() => {
      const out: string[] = []
      const doc = document.documentElement
      if (doc.scrollWidth > doc.clientWidth + 1) out.push(`page scrolls sideways: ${doc.scrollWidth} > ${doc.clientWidth}`)
      for (const section of Array.from(document.querySelectorAll('main > section'))) {
        const title = section.querySelector('h2')!
        const body = section.querySelector('.cv-body')!
        const t = title.getBoundingClientRect()
        const b = body.getBoundingClientRect()
        // The title's own text must fit its box (a single long word can't overflow it)...
        if (title.scrollWidth > title.clientWidth + 1) out.push(`${title.textContent}: title wider than its column`)
        // ...and it must sit beside the content (left of it) or above it, never on top of it.
        const beside = t.right <= b.left + 1
        const above = t.bottom <= b.top + 1
        if (!beside && !above) out.push(`${title.textContent}: title overlaps its content`)
        // Every line box of text in the section, as rectangles; no two may overlap.
        const boxes: { r: DOMRect; text: string }[] = []
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.trim()) continue
          const range = document.createRange()
          range.selectNodeContents(n)
          for (const r of Array.from(range.getClientRects())) if (r.width > 1 && r.height > 1) boxes.push({ r, text: n.textContent.trim().slice(0, 30) })
        }
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i].r
            const c = boxes[j].r
            const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left)
            const oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)
            if (ox > 2 && oy > 2) out.push(`"${boxes[i].text}" overlaps "${boxes[j].text}"`)
          }
        // Nothing pokes out of the section sideways.
        const s = section.getBoundingClientRect()
        for (const el of Array.from(section.querySelectorAll('*'))) {
          const r = el.getBoundingClientRect()
          if (r.width > 0 && (r.right > s.right + 1 || r.left < s.left - 1)) out.push(`${el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 30)}" overflows its section`)
        }
      }
      return [...new Set(out)]
    })
    expect(problems).toEqual([])
  })
}
