// Prebuild validation: fails the build when content or the world layout is invalid.
import { cv } from '../src/content/cv'
import { SECTION_IDS } from '../src/content/schema'
import { validateContent } from '../src/content/validateContent'
import { WORLD } from '../src/content/world'
import { validateWorld } from '../src/core/validateWorld'

const contentIssues = validateContent(cv, WORLD.islands.map((i) => i.id))
const worldIssues = validateWorld(WORLD, SECTION_IDS)

for (const i of contentIssues) console.error(`content: ${i.rule} at ${i.path} — ${i.message}`)
for (const i of worldIssues) console.error(`world: ${i.rule} — ${i.detail}`)

if (contentIssues.length + worldIssues.length > 0) process.exit(1)
console.log('content: ok\nworld: ok')
