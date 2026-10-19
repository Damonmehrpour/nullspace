import { isField, SAMPLE_MARKER, SECTION_IDS, type CV, type Field, type ItemStatus, type SectionId } from './schema'

export type ContentRule =
  | 'empty-confirmed'
  | 'real-has-pending'
  | 'pending-content-has-confirmed'
  | 'sample-marker-missing'
  | 'sample-marker-leak'
  | 'missing-alt'
  | 'bad-url'
  | 'section-world-mismatch'
  | 'corrected-claim'

export type ContentIssue = { path: string; rule: ContentRule; message: string }

type FoundField = { path: string; key: string; field: Field<unknown> }

/** Keys whose values are addresses, not prose: exempt from the sample-marker rules. */
const ADDRESS_KEYS = new Set(['url', 'src'])

/** Claims the author has explicitly corrected; they must never reappear in confirmed text. */
const CORRECTED_CLAIMS: { pattern: RegExp; why: string }[] = [
  { pattern: /shipped (more than )?(seven|7\+?)|(7\+?|seven) (\w+ )?shipped/i, why: 'Medrick: 7+ projects worked on, four released (not 7+ shipped)' },
  { pattern: /neural network/i, why: 'WasteGo: use of neural networks is unconfirmed' },
]

function collectFields(node: unknown, path: string, key: string, out: FoundField[], skipKey?: string): void {
  if (isField(node)) {
    out.push({ path, key, field: node })
    return
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectFields(child, `${path}[${i}]`, key, out))
    return
  }
  if (typeof node === 'object' && node !== null) {
    for (const [k, child] of Object.entries(node)) {
      if (k === skipKey) continue
      collectFields(child, path ? `${path}.${k}` : k, k, out)
    }
  }
}

function textValues(field: Field<unknown>): string[] {
  if (field.state !== 'confirmed') return []
  const v = field.value
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  return []
}

function isEmpty(field: Field<unknown>): boolean {
  if (field.state !== 'confirmed') return false
  const v = field.value
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0 || v.some((x) => typeof x === 'string' && x.trim() === '')
  return v === null || v === undefined
}

function checkItem(item: unknown, status: ItemStatus, path: string, issues: ContentIssue[], skipKey?: string): void {
  const fields: FoundField[] = []
  collectFields(item, path, '', fields, skipKey)
  for (const { path: p, key, field } of fields) {
    if (isEmpty(field)) issues.push({ path: p, rule: 'empty-confirmed', message: 'Confirmed field is empty' })
    if (status === 'real' && field.state === 'pending') {
      issues.push({ path: p, rule: 'real-has-pending', message: 'Item marked real has a pending field' })
    }
    if (status === 'pending-content' && field.state === 'confirmed') {
      issues.push({ path: p, rule: 'pending-content-has-confirmed', message: 'Pending-content item has a confirmed field' })
    }
    if (key === 'url' && field.state === 'confirmed' && typeof field.value === 'string' && !/^(https:|mailto:|tel:)/.test(field.value)) {
      issues.push({ path: p, rule: 'bad-url', message: 'Urls must use https: (or mailto: for email, tel: for phone)' })
    }
    if (ADDRESS_KEYS.has(key)) continue
    for (const text of textValues(field)) {
      if (status === 'placeholder' && !text.startsWith(SAMPLE_MARKER)) {
        issues.push({ path: p, rule: 'sample-marker-missing', message: `Placeholder text must start with "${SAMPLE_MARKER}"` })
      }
      for (const c of CORRECTED_CLAIMS) {
        if (c.pattern.test(text)) issues.push({ path: p, rule: 'corrected-claim', message: c.why })
      }
      if ((status === 'real' || status === 'partial') && text.includes(SAMPLE_MARKER)) {
        issues.push({ path: p, rule: 'sample-marker-leak', message: 'Sample text inside a real item' })
      }
    }
  }
}

function confirmedValue(f: Field<string> | undefined): string | null {
  return f && f.state === 'confirmed' ? f.value : null
}

export function validateContent(cv: CV, worldSectionIds: readonly SectionId[]): ContentIssue[] {
  const issues: ContentIssue[] = []

  for (const id of SECTION_IDS) {
    if (!worldSectionIds.includes(id)) {
      issues.push({ path: id, rule: 'section-world-mismatch', message: `Section "${id}" has no island in the world layout` })
    }
  }

  checkItem(cv.education, cv.education.status, 'education', issues)
  checkItem(cv.experience, cv.experience.status, 'experience', issues)
  checkItem(cv.skills, cv.skills.status, 'skills', issues)
  checkItem(cv.contact, cv.contact.status, 'contact', issues)
  checkItem(cv.projects, cv.projects.status, 'projects', issues, 'projects')

  cv.projects.projects.forEach((p, i) => {
    const path = `projects.projects[${i}]`
    checkItem(p, p.status, path, issues)
    p.media.forEach((m, j) => {
      if (m.alt.trim() === '') issues.push({ path: `${path}.media[${j}].alt`, rule: 'missing-alt', message: 'Media needs alt text' })
    })
  })

  cv.contact.channels.forEach((c, i) => {
    const url = confirmedValue(c.url)
    if (url === null) return
    // Email must be mailto:, a phone a dialable tel: (digits only, optional leading +), anything else https:.
    const ok = c.kind === 'email' ? url.startsWith('mailto:') : c.kind === 'phone' ? /^tel:\+?\d+$/.test(url) : url.startsWith('https:')
    if (!ok) {
      const message = c.kind === 'email' ? 'Email url must be mailto:' : c.kind === 'phone' ? 'Phone url must be tel: with digits only' : 'Url must use https:'
      issues.push({ path: `contact.channels[${i}].url`, rule: 'bad-url', message })
    }
  })

  return issues
}
