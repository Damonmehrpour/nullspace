// CV content schema (spec 7.1). Every unknown fact is a pending Field — never invented.

export type Field<T> = { state: 'confirmed'; value: T } | { state: 'pending'; note?: string }
export type ItemStatus = 'real' | 'partial' | 'pending-content' | 'placeholder'

export const SECTION_IDS = ['education', 'experience', 'projects', 'skills', 'contact'] as const
export type SectionId = (typeof SECTION_IDS)[number]
export type ProjectId = 'project-01' | 'project-02' | 'project-03'

/** Prefix required on every confirmed text value of a placeholder item. */
export const SAMPLE_MARKER = 'Sample — '

export function confirmed<T>(value: T): Field<T> {
  return { state: 'confirmed', value }
}

export function pending<T>(note?: string): Field<T> {
  return note === undefined ? { state: 'pending' } : { state: 'pending', note }
}

/** The author's three areas, shown as small tags. */
export const AREAS = ['game', 'xr', 'ai-hci'] as const
export type Area = (typeof AREAS)[number]
export const AREA_LABEL: Record<Area, string> = { game: 'Game Development', xr: 'XR / Immersive', 'ai-hci': 'AI / HCI Research' }

export type Media = { kind: 'image' | 'video' | 'youtube'; src: Field<string>; alt: string; caption?: string }
export type Link = { kind: 'github' | 'demo' | 'store' | 'external'; label: string; url: Field<string> }

export type Project = {
  id: ProjectId
  status: ItemStatus
  name: Field<string>
  context?: Field<string>
  summary: Field<string>
  role: Field<string>
  tech: Field<string[]>
  media: Media[]
  links: Link[]
  appearance: 'featured' | 'technical' | 'experimental'
  areas: Area[]
}

/** A recognised result tied to a named project (hackathons, summer school). */
export type Honor = { project: string; award: Field<string>; event: string; year: Field<string>; detail: Field<string>; areas: Area[] }

export type Publication = { citation: Field<string>; url?: Field<string> }

export type EducationEntry = {
  institution: Field<string>
  degree: Field<string>
  dates: Field<string>
  notes?: Field<string>
  thesis?: { title: Field<string>; url?: Field<string>; score?: Field<string> }
}
export type ExperienceEntry = {
  org: Field<string>
  role: Field<string>
  dates: Field<string>
  location?: Field<string>
  highlights: Field<string[]>
  areas?: Area[]
  /** Shown less prominently (e.g. freelance tutoring next to industry roles). */
  minor?: boolean
}
export type SkillGroup = { label: string; items: Field<string[]>; areas?: Area[] }
export type ContactChannel = {
  kind: 'email' | 'phone' | 'linkedin' | 'github' | 'website' | 'other'
  label: string
  value: Field<string>
  url?: Field<string>
}

export type EducationSection = {
  id: 'education'
  status: ItemStatus
  title: string
  entries: EducationEntry[]
  research?: { interests: Field<string[]>; publications: Publication[] }
}
export type ExperienceSection = { id: 'experience'; status: ItemStatus; title: string; entries: ExperienceEntry[] }
export type ProjectsSection = { id: 'projects'; status: ItemStatus; title: string; projects: [Project, Project, Project]; honors: Honor[] }
export type SkillsSection = { id: 'skills'; status: ItemStatus; title: string; groups: SkillGroup[] }
export type ContactSection = {
  id: 'contact'
  status: ItemStatus
  title: string
  channels: ContactChannel[]
  location: Field<string>
  availability: Field<string>
}

export type Section = EducationSection | ExperienceSection | ProjectsSection | SkillsSection | ContactSection

export type Profile = { name: string; headline: string; areas: Area[] }

export type CV = {
  profile: Profile
  education: EducationSection
  experience: ExperienceSection
  projects: ProjectsSection
  skills: SkillsSection
  contact: ContactSection
}

export function isField(x: unknown): x is Field<unknown> {
  if (typeof x !== 'object' || x === null || !('state' in x)) return false
  const state = (x as { state: unknown }).state
  return state === 'confirmed' || state === 'pending'
}
