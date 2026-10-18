# Visual Rebirth: Phase 2B, island architecture (Projects prototype)

**Status: the Projects island prototype is behind `?visual=v2`, awaiting your review.** Skills and Contact are untouched. The approved Experience corridor, wanderer, kokedama and shared visual language are preserved.

- Review it live: https://nullspace-saemmi-studios.vercel.app/?visual=v2 (walk to Projects; fps overlay: `…/?visual=v2&debug`)
- The default experience (no flag) is unchanged.

## A sunken atrium beneath a monumental floating ring

| Element | What it is | Why |
|---|---|---|
| **Sunken atrium** | Stepped concrete terraces rise around the island's rim, so the floor reads as sunk into the stone. A soft wash darkens the floor and deepens at the foot of the steps | An amphitheatre for the work: you step down into it from the walkways |
| **Openings** | The terraces break where the two walkways arrive, and once more straight ahead, behind the central project, framing the open void | Clear entrances, and a view out at the heart of the island |
| **Floating ring** | A thick chamfered concrete ring hovering high above the atrium. On the first visit it descends into place (instant under reduced motion). It sits just above the gameplay camera's view from inside, so it crowns the island from afar while only its threads of light reach into view up close | The island's silhouette: recognisable from anywhere on the ring of islands |
| **Threads of light** | A thin line from the ring down to each project, faint until that project is discovered | Ties the three projects to one idea, and marks what you've found |
| **Project plinths** | One per project, shaped by its kind from the CV: a **round meditation plinth ringed with light** (XR Meditation System), a **lattice-faced block** (LLM-Driven AI Avatars), and a **stepped "pixel" stack with four tiles** for the four released mobile games (Mobile games at Medrick) | Each project's world in one glance; the round and pixel motifs echo its Experience gate (OASIS and Medrick) |
| **Honour wall** | One terrace rises into a wall with three engraved panels: **Grand Tour XR** (Winner, Immersive Travel & Destination Track, XRCC Hackathon 2025), **WasteGo** (4th place, ScaleHack AI Hackathon), **Who Are You?** (VR project lead, University of Oulu Summer School 2024) | Celebrates the hackathon and immersive work that isn't one of the three artifacts |

**All facts come from the CV content.** The plinth styles follow each project's `appearance`, and the honour panels come from `honorPlaques()`, unit-tested against the real data. WasteGo's year is still pending, so it's left off rather than guessed.

**Discovery:**
- The first time on a visit that you come within a project's interaction range (the same range that shows the interact prompt), its plinth lights brighten, its thread of light ignites, and the kokedama reacts (a small hop, a brief glow, perked-up leaves).
- Opening a project works exactly as before (interact key, click or tap, with the same prompt and in-range ring), and the project panel content is unchanged.

Unchanged: the artifacts themselves, their labels, interaction, panels and accessibility; the arrival trigger; Low quality and reduced motion. Architecture is walk-through, as on every island.

## Screenshots (left: approved Phase 2B build with the old Projects island; right: prototype; same camera)

1280×720, software renderer, quality locked to High, island revealed.

| View | File |
|---|---|
| Approach from a walkway | `approach.webp` |
| At the arrival ring | `arrival.webp` |
| Inside the atrium | `corridor-1.webp` |
| At each project (in range) | `artifact-left.webp`, `artifact-centre.webp`, `artifact-right.webp` |
| Honour wall close-up | `honour-wall.webp` |
| At the far edge, and looking back | `edge.webp`, `look-back.webp` |
| Side elevation, from the void, overview | `elevation.webp`, `from-void.webp`, `overview.webp` |

Regenerate: `SHOTS=1 SHOTS_VARIANT=v2 ISLAND=projects npx playwright test islandShots --project=desktop`.

## Performance (measured back to back against the approved build)

**A correction to earlier reports:** the profile's per-island views were hand-placed, and the ones labelled "projects close" and "skills close" actually framed other parts of the ring. They're now computed from the layout (in front of each island, facing it), and the before/after below uses the corrected views for both builds.

| View | Draw calls before → after | Triangles before → after | Software frame ms before → after | RTX uncapped ms before → after |
|---|---|---|---|---|
| **Projects close** | 51 → 62 | 17.2k → 25.5k | 71.4 → 90.7 (+27%) | 0.7 → 0.8 |
| Education close (reference, the heaviest view since Phase 0) | 33 → 33 | 19.0k → 19.0k | 89.2 → 89.4 | 0.6 → 0.6 |
| Experience close | 37 → 37 | 17.1k → 17.1k | 82.9 → 82.8 | 0.6 → 0.7 |
| Spawn, ring overview, Skills, Contact | unchanged | unchanged | within noise | within noise |

- **What it took to get here:** the first build cost 131.5 ms at the Projects close-up. The terraces had been built as stacked solid steps, which shaded the same pixels up to three times (about 59 ms). Rebuilt as one stepped surface, each riser and tread drawn once, they dropped from 12k to 2.4k triangles and cost 20 ms. The terraces also draw before the island slab, so the slab pixels they cover can be rejected by the depth test.
- **Where it stands:** the Projects close-up now costs the same as the Education close-up, the heaviest view the world has had since Phase 0 (and the one your 45 fps baseline already includes). Every other view is unchanged.
- **Startup and hitches:** all 26 shader programs compile behind the loading screen, and nothing compiles when the island comes into view or the ring fades for the camera (both covered by tests). The RTX runs at 60 fps throughout the startup walk.

**Lab numbers. The deciding check is your `?visual=v2&debug` reading in the atrium.** If it dips there, the levers that keep the look are: plain concrete (no surface noise) on the terraces, which are about 20 ms of the close-up on the pixel-bound profile, or two terrace steps instead of three.

## Tests

- Unit and component: 265/265. New: honour panels come from the CV in order, with exact wording; a pending year is left off; a pending award is never engraved.
- End-to-end: 45/45. New: approaching each project discovers it exactly once and cues the kokedama; approaching again adds nothing; and no new shaders compile. The existing checks still pass: no late compiles when islands come into view, faceless wanderer, Experience corridor discovery, budgets at spawn.
