# CV merge review: decisions and status

**Sources** (in `cv-sources/`, git-ignored, never published):
- **A:** `Damon_Mehrpour_CV.pdf`, the "Unreal Engine / XR Developer" CV
- **B:** `Damon_Mehrpour_CV - Copy.pdf`, the "Game programmer" CV
- **C:** `Mehrpour_Moghadam_CV.pdf`, the "XR and HCI researcher-developer" CV
- **D:** `Portfolio-Mehrpour Moghadam.pdf`, a game portfolio with descriptions, assets and screenshots

**Rule:** only facts confirmed in the sources or by the author are published. Nothing is invented.

## Decisions (author, 2026-10-18)

### Identity
- Public name: **Damon Mehrpour**. Academic author names are kept exactly as published ("Mehrpour Moghadam, S.M.").
- Headline: **"Building worlds, systems & intelligent experiences."**
- Three equal areas: **Game Development · XR / Immersive Technology · AI / HCI Research**. Area tags are used where useful. No new islands.

### Conflicts resolved
| # | Decision |
|---|---|
| C1 | Display name: Damon Mehrpour |
| C2 | BSc dates: **2018–2021** |
| C3 | ScaleHack AI Hackathon: **4th place** |
| C4 | WasteGo: a Pokémon GO-inspired gamified recycling experience that encourages players to sort garbage and waste into the correct bins. **No claim of neural networks** (unconfirmed) |
| C5 | Who Are You?: a 360-degree VR movie and immersive storytelling project at the University of Oulu Summer School (2024) |

### Content approved
| # | Decision |
|---|---|
| O1 | Self-employed tutor (12/2021 – 12/2023) included in Experience, shown less prominently |
| O2 | XR Meditation System: Unreal Engine 5, EEG integration, C++ interaction systems, user studies. Supporting detail from CV C, without overstating the individual contribution |
| O3 | AI/HCI expertise and research methods included alongside game development and XR skills |
| O4 | Languages: Persian (native), English (C1, IELTS Academic 7.0), Finnish (A2), German (A1) |
| O5 | Short Research Interests: XR, AI agents, affective computing, physiological sensing, HCI |
| O6 | Thesis link: https://oulurepo.oulu.fi/handle/10024/56921 |
| O7 | HHAI 2025 demo publication featured under Education & Research, with author names as published |
| O8 | All three achievements: XRCC track winner (Grand Tour XR), ScaleHack 4th place (WasteGo), Summer School VR project lead (Who Are You?) |
| O9 | GitHub `https://github.com/Damonmehrpour`, LinkedIn `https://www.linkedin.com/in/damon-mehrpour-128079250/` |

### Projects and materials
| # | Decision |
|---|---|
| M1 | XR Meditation System video: https://youtu.be/lvPXvY1qMxk, with a "Watch demo" link |
| M2 | GamePlay URL stays **pending** |
| M3 | XRCC-winning project: **Grand Tour XR**, winner of the Immersive Travel & Destination Track, 2025. No technical details |
| M4 | Medrick (08/2020 – 12/2021): **worked on 7+ mobile game projects, four reaching release**: Monster Squish, Baby Musk, Arrow, Color Finch. Every "7+ shipped" claim is replaced. Gameplay screenshots from D are used in a gallery |
| M5 | **No CV downloads.** The résumé link is removed from the site entirely. The source PDFs are never published |
| M6 | Contact: email, GitHub, LinkedIn, and "Oulu, Finland — open to remote work and relocation opportunities". No phone, Discord or personal YouTube channel |

### Structure
- The five islands stay. Education is renamed **"Education & Research"** (publication, thesis, research interests).
- Three artifacts, one per area:
  - **01: XR Meditation System** (XR; the research side lives in the section text)
  - **02: LLM-Driven AI Avatars** (AI/HCI)
  - **03: Medrick mobile games** (Game Dev, with a gallery)
- Grand Tour XR, WasteGo and Who Are You? appear under **Honors** in the Projects panel and in the portfolio.

## New flags for the author (found while integrating)

| # | Flag | Handling until resolved |
|---|---|---|
| F1 | **Resolved (author, 2026-10-18):** Monster Squish, Baby Musk, Arrow and Color Finch were developed in **Construct**, not Unity | Project 03 lists Construct, and the Medrick entry credits Construct for the four released titles. Unity/C# stays only where other work supports it (ARVO, tutoring, skills). A content test blocks Unity from being attributed to these games |
| F2 | **Resolved (author, 2026-10-18):** all four games were developed during the Medrick role (08/2020 – 12/2021). The screenshots were taken later (January 2023 timestamps) | No change to dates. Screenshots carry no dates |
| F3 | **Project 02 technologies.** The CVs name the thesis and demo, not the stack used | Technologies shown as **[pending]** on Project 02 |
| F4 | **Store links** for the four released games | None published. Please provide them if you'd like them linked |

## Assets copied into the public build

Four gameplay screenshots, cropped from D to the game viewport (no editor, browser or taskbar), saved as WebP (37 KB total):
- `public/media/games/monster-squish.webp`
- `public/media/games/baby-musk.webp`
- `public/media/games/arrow.webp`
- `public/media/games/color-finch.webp`

No other files from `cv-sources/` are published.
