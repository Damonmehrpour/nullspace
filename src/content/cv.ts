// Launch content. Only facts the author has confirmed are `confirmed`; everything else is `pending`.
// Replace pending fields here as details arrive — the 3D world and panels read this file only.
import { confirmed, pending, SAMPLE_MARKER, type CV } from './schema'

export const cv: CV = {
  education: {
    id: 'education',
    status: 'pending-content',
    title: 'Education',
    entries: [{ institution: pending(), degree: pending(), dates: pending() }],
  },
  experience: {
    id: 'experience',
    status: 'pending-content',
    title: 'Experience',
    entries: [{ org: pending(), role: pending(), dates: pending(), highlights: pending() }],
  },
  projects: {
    id: 'projects',
    status: 'partial',
    title: 'Projects',
    projects: [
      {
        id: 'project-01',
        status: 'partial',
        name: confirmed('XR Meditation System'),
        context: confirmed('Developed with a team at the University of Oulu, OASIS department'),
        summary: pending(),
        role: pending('individual contribution to be documented'),
        tech: pending(),
        media: [{ kind: 'youtube', src: pending('video coming soon'), alt: 'XR Meditation System video' }],
        links: [],
        appearance: 'featured',
      },
      {
        id: 'project-02',
        status: 'pending-content',
        name: pending(),
        summary: pending(),
        role: pending(),
        tech: pending(),
        media: [],
        links: [],
        appearance: 'technical',
      },
      {
        id: 'project-03',
        status: 'placeholder',
        name: confirmed(`${SAMPLE_MARKER}Experimental Prototype`),
        summary: confirmed(`${SAMPLE_MARKER}This slot holds sample text until a real experimental project is added.`),
        role: confirmed(`${SAMPLE_MARKER}Role not yet specified`),
        tech: confirmed([`${SAMPLE_MARKER}Technology not yet specified`]),
        media: [],
        links: [],
        appearance: 'experimental',
      },
    ],
  },
  skills: {
    id: 'skills',
    status: 'pending-content',
    title: 'Skills',
    groups: [{ label: 'Skills', items: pending() }],
  },
  contact: {
    id: 'contact',
    status: 'pending-content',
    title: 'Contact',
    channels: [{ kind: 'email', label: 'Email', value: pending() }],
    resumePdf: pending(),
  },
}
