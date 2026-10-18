// Prebuild validation: fails the build when content (and, from Task 17, the world layout) is invalid.
import { cv } from '../src/content/cv'
import { SECTION_IDS } from '../src/content/schema'
import { validateContent } from '../src/content/validateContent'

const issues = validateContent(cv, SECTION_IDS)

if (issues.length > 0) {
  for (const i of issues) console.error(`content: ${i.rule} at ${i.path} — ${i.message}`)
  process.exit(1)
}
console.log('content: ok')
