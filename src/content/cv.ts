// Merged from the author's three CVs and game portfolio, with the author's review decisions
// (docs/cv-merge-review.md). Only confirmed facts are `confirmed`; anything still open is `pending`.
// The 3D world and the panels read this file only.
import { confirmed, pending, type CV } from './schema'

const c = confirmed

export const cv: CV = {
  profile: {
    name: 'Damon Mehrpour',
    headline: 'Building worlds, systems & intelligent experiences.',
    areas: ['game', 'xr', 'ai-hci'],
  },

  education: {
    id: 'education',
    status: 'real',
    title: 'Education & Research',
    entries: [
      {
        institution: c('University of Oulu'),
        degree: c('MSc in Computer Science and Engineering'),
        dates: c('02/2023 – 06/2025'),
        thesis: {
          title: c('LLM-Driven AI Avatars: A Framework for Emotionally Adaptive Interaction in Virtual Reality'),
          url: c('https://oulurepo.oulu.fi/handle/10024/56921'),
          score: c('4/5'),
        },
      },
      {
        institution: c('Islamic Azad University, Science and Research Branch'),
        degree: c('BSc in Computer Science'),
        dates: c('2018–2021'),
      },
    ],
    research: {
      interests: c([
        'Extended reality and virtual environments',
        'AI agents and LLM conversational agents',
        'Affective computing',
        'Physiological (EEG) sensing',
        'Human-computer interaction',
      ]),
      publications: [
        {
          citation: c('Mehrpour Moghadam, S.M., Chen, H. (2025). Meta-Cognitive 3D AI Avatar: A Preliminary Demo in Virtual Reality. HHAI 2025 Demo Track.'),
        },
      ],
    },
  },

  experience: {
    id: 'experience',
    status: 'real',
    title: 'Experience',
    entries: [
      {
        org: c('ARVO – Augmented Reality Vision Ocular'),
        role: c('Lead XR Engineer'),
        dates: c('08/2025 – 11/2025'),
        location: c('Helsinki, Finland (hybrid)'),
        areas: ['xr'],
        highlights: c([
          'Developed a cross-platform AR/VR communication system in Unity and C# with web technologies (WebXR, Photon).',
          'Led a multidisciplinary team through technical architecture, roadmap planning and delivery.',
          'Designed modular XR interaction systems and internal tools that let non-programmers prototype and iterate.',
        ]),
      },
      {
        org: c('OASIS, University of Oulu'),
        role: c('Project Worker / Unreal Developer'),
        dates: c('11/2024 – 03/2025'),
        location: c('Oulu, Finland'),
        areas: ['xr', 'ai-hci'],
        highlights: c([
          'Worked on the XR Meditation System: an Unreal Engine 5 application integrating EEG sensing to study interaction and relaxation in virtual environments.',
          'Owned core C++ gameplay and interaction systems and led architecture decisions for the interaction and UI systems.',
          'Conducted user studies and analysed quantitative and qualitative data on usability and interaction.',
        ]),
      },
      {
        org: c('Ubicomp, University of Oulu'),
        role: c('Research Assistant / Unreal Developer'),
        dates: c('05/2024 – 08/2024'),
        location: c('Oulu, Finland'),
        areas: ['xr', 'ai-hci'],
        highlights: c([
          'Built Unreal Engine (C++) prototypes and controlled immersive environments for UX and AI-driven user studies.',
          'Contributed to research combining XR with physiological sensing for HCI studies, including processing and analysing research data.',
        ]),
      },
      {
        org: c('Medrick (mobile game studio)'),
        role: c('Game Developer'),
        dates: c('08/2020 – 12/2021'),
        location: c('Tehran, Iran'),
        areas: ['game'],
        highlights: c([
          'Worked on 7+ mobile game projects, four of which reached release: Monster Squish, Baby Musk, Arrow and Color Finch.',
          'Built core gameplay loops, UI flows and progression systems; the four released titles were developed in Construct.',
          'Iterated with analytics and A/B testing; optimised memory, loading times and frame rate for low-end hardware.',
        ]),
      },
      {
        org: c('Self-employed'),
        role: c('Tutor'),
        dates: c('12/2021 – 12/2023'),
        areas: ['game'],
        minor: true,
        highlights: c(['Taught programming (C/C++, C#, Python) and game development concepts using Unity.']),
      },
    ],
  },

  projects: {
    id: 'projects',
    status: 'partial',
    title: 'Projects',
    projects: [
      {
        id: 'project-01',
        status: 'real',
        name: c('XR Meditation System'),
        context: c('Developed with a team at the University of Oulu, OASIS department'),
        summary: c('An immersive XR application in Unreal Engine 5 that integrates EEG sensing to investigate interaction and relaxation in virtual environments.'),
        role: c('Unreal developer in the research team: real-time interaction mechanisms and C++ components, architecture decisions for the interaction and UI systems, and user studies.'),
        tech: c(['Unreal Engine 5', 'C++', 'EEG integration', 'User studies']),
        media: [{ kind: 'youtube', src: c('https://youtu.be/lvPXvY1qMxk'), alt: 'XR Meditation System demo video' }],
        links: [{ kind: 'demo', label: 'Watch demo', url: c('https://youtu.be/lvPXvY1qMxk') }],
        appearance: 'featured',
        areas: ['xr', 'ai-hci'],
      },
      {
        id: 'project-02',
        status: 'partial',
        name: c('LLM-Driven AI Avatars'),
        context: c('MSc thesis, University of Oulu (2025), and an HHAI 2025 demo'),
        summary: c('A framework for emotionally adaptive interaction with LLM-driven AI avatars in virtual reality. A preliminary demo of a meta-cognitive 3D AI avatar in VR was presented in the HHAI 2025 Demo Track.'),
        role: c('Thesis author; co-author of the HHAI 2025 demo (Mehrpour Moghadam, S.M., Chen, H.).'),
        tech: pending('technology stack to be documented'),
        media: [],
        links: [{ kind: 'external', label: 'Read the thesis', url: c('https://oulurepo.oulu.fi/handle/10024/56921') }],
        appearance: 'technical',
        areas: ['ai-hci', 'xr'],
      },
      {
        id: 'project-03',
        status: 'partial',
        name: c('Mobile games at Medrick'),
        context: c('Game Developer, Medrick mobile game studio (08/2020 – 12/2021)'),
        summary: c('Worked on 7+ mobile game projects, four of which reached release: Monster Squish, Baby Musk, Arrow and Color Finch.'),
        role: c('Core gameplay loops, UI flows and progression systems; iteration with analytics and A/B testing; optimisation for low-end mobile hardware.'),
        tech: c(['Construct', 'Android and iOS', 'Analytics and A/B testing', 'Low-end hardware optimisation']),
        media: [
          {
            kind: 'image',
            src: c('/media/games/monster-squish.webp'),
            alt: 'Monster Squish gameplay: a grid of colourful one-eyed monsters, a countdown timer and the score',
            caption: 'Monster Squish: tap the monsters before time runs out. Stronger monsters and bigger crowds make each level harder to clear.',
          },
          {
            kind: 'image',
            src: c('/media/games/baby-musk.webp'),
            alt: 'Baby Musk gameplay: a baby astronaut flying upward past milk bottles and pacifiers',
            caption: 'Baby Musk: find the right angle to send the space baby higher. Milk bottles are fuel, pacifiers are points.',
          },
          {
            kind: 'image',
            src: c('/media/games/arrow.webp'),
            alt: 'Arrow gameplay: a rotating multicoloured target with darts, apples and a dart ready to throw',
            caption: 'Arrow: hit the target with arrows of the matching colour. Apples give extra points, two power-ups help.',
          },
          {
            kind: 'image',
            src: c('/media/games/color-finch.webp'),
            alt: 'Color Finch gameplay: a small bird approaching rotating colour-segmented rings and crosses',
            caption: 'Color Finch: guide the bird through obstacles via the part that matches its colour. The wrong colour ends the run.',
          },
        ],
        links: [{ kind: 'external', label: 'Gameplay video', url: pending('link to be provided') }],
        appearance: 'experimental',
        areas: ['game'],
      },
    ],
    honors: [
      {
        project: 'Grand Tour XR',
        award: c('Winner, Immersive Travel & Destination Track'),
        event: 'XRCC Hackathon',
        year: c('2025'),
        detail: c('Built an immersive XR experience under tight time constraints.'),
        areas: ['xr'],
      },
      {
        project: 'WasteGo',
        award: c('4th place'),
        event: 'ScaleHack AI Hackathon',
        year: pending(),
        detail: c('A Pokémon GO-inspired gamified recycling experience that encourages players to sort garbage and waste into the correct bins.'),
        areas: ['game'],
      },
      {
        project: 'Who Are You?',
        award: c('VR project lead'),
        event: 'University of Oulu Summer School',
        year: c('2024'),
        detail: c('A 360-degree VR movie and immersive storytelling project; owned technical direction and delivery.'),
        areas: ['xr'],
      },
    ],
  },

  skills: {
    id: 'skills',
    status: 'real',
    title: 'Skills',
    groups: [
      {
        label: 'Game Development',
        areas: ['game'],
        items: c(['Gameplay systems, core loops, UI flows and progression', 'Construct', 'Unity and C#', 'Mobile (Android, iOS)', 'Performance optimisation for low-end hardware', 'Analytics and A/B testing']),
      },
      {
        label: 'XR / Immersive',
        areas: ['xr'],
        items: c(['Unreal Engine 5 (C++, Blueprints)', 'VR/AR prototyping and interaction systems', 'WebXR', 'Multiplayer with Photon', 'MetaHuman Creator, Blender']),
      },
      {
        label: 'AI / HCI Research',
        areas: ['ai-hci'],
        items: c([
          'LLM-based dialogue systems and conversational avatars',
          'Affective computing and Emotion AI',
          'Physiological (EEG) sensing in XR',
          'User studies; quantitative and qualitative evaluation',
          'Research through Design, participatory design, scientific writing',
        ]),
      },
      { label: 'Programming & tools', items: c(['C++, C#, Python, C', 'Git, GitHub, Jira, Agile workflows']) },
      { label: 'Languages', items: c(['Persian (native)', 'English (C1, IELTS Academic 7.0)', 'Finnish (A2)', 'German (A1)']) },
    ],
  },

  contact: {
    id: 'contact',
    status: 'real',
    title: 'Contact',
    location: c('Oulu, Finland'),
    availability: c('Open to remote work and relocation opportunities'),
    channels: [
      { kind: 'email', label: 'Email', value: c('damons3m@gmail.com'), url: c('mailto:damons3m@gmail.com') },
      { kind: 'github', label: 'GitHub', value: c('github.com/Damonmehrpour'), url: c('https://github.com/Damonmehrpour') },
      { kind: 'linkedin', label: 'LinkedIn', value: c('linkedin.com/in/damon-mehrpour-128079250'), url: c('https://www.linkedin.com/in/damon-mehrpour-128079250/') },
    ],
  },
}
