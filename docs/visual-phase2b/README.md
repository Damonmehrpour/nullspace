# Visual Rebirth: Phase 2B, island architecture (Experience prototype)

**Status: one proof of concept, the Experience island, behind `?visual=v2`, awaiting your visual review.** The other islands are untouched. The approved wanderer and kokedama are preserved as the character baseline.

- Review it live: https://nullspace-saemmi-studios.vercel.app/?visual=v2 (walk to Experience; the fps overlay is `…/?visual=v2&debug`)
- The default experience (no flag) is unchanged.

## The Monumental Corridor of Portals

Each career chapter is a massive white-concrete gate. They stand in time order along a straight corridor: the oldest nearest the arrival ring, the most recent at the island's edge, framing the open void ahead. Walking the corridor is walking the timeline toward what comes next. The gates grow taller with each chapter (3.6 m → 5.3 m), so from the arrival ring they telescope into one layered silhouette.

**All career facts come straight from the CV content** (`experienceChapters()`, unit-tested against the real data). Nothing is retyped, and any field still pending would be left out rather than engraved.

| Gate | Chapter (from the CV) | Architectural identity |
|---|---|---|
| **Medrick** | Game Developer · 08/2020 – 12/2021 | A tall, phone-proportioned opening with stepped "pixel" corners. Four inset tiles on the jamb, one for each of the four released titles |
| *(stele beside the path)* | Tutor · 12/2021 – 12/2023 | The minor chapter as a low stele, in its place in time between Medrick and Ubicomp |
| **Ubicomp** | Research Assistant / Unreal Developer · 05/2024 – 08/2024 | Jambs opened into a lattice of fins (controlled research environments). A sensing waveform runs across the lintel and lights up once discovered |
| **OASIS** | Project Worker / Unreal Developer · 11/2024 – 03/2025 | A **moon gate**: a thick slab pierced by a round opening you walk through (the XR Meditation work), ringed with points of light. A few moss cushions grow at its foot, a quiet nod to the kokedama's origin |
| **ARVO** | Lead XR Engineer · 08/2025 – 11/2025 | The tallest gate. Its lintel cantilevers past one jamb, and a thin floating frame of light hangs in front of it, like an augmented layer over the real one |

**Career information is engraved into each lintel** (name, role, dates), facing the approach. It isn't floating UI. The engravings render only near the island (unreadable from afar anyway) and disappear with their gate when it fades for the camera.

**Approach, navigation and discovery:**
- From the arrival ring the gates line up into one telescoping view, the names stacked in time order.
- **Walking through a gate for the first time on a visit discovers that chapter.** Its threshold strip in the floor and its own light details (waveform, moon-gate ring, augmented frame) brighten, and **the kokedama reacts with a small hop, a brief glow and perked-up leaves.**
- The first-visit reveal lights the slots under the lintels one after another.
- The full chapter text stays in the Experience panel, which opens at the arrival ring exactly as before, so content and accessibility are unchanged.
- **Camera:** every gate between the camera and the player fades out, not just the nearest, so the corridor never fills the screen with a lintel. Their lights and engravings fade with them.
- **The void:** the ARVO gate stands at the edge and frames the open void and the distant megastructures; seen from beyond the island, it's a silhouette at the end of the world.

Unchanged: the Experience panel content and its arrival trigger, the tour order, Low quality and reduced motion (the discovery reaction is smaller under reduced motion). Architecture is walk-through, as on every island.

## Screenshots (left: Phase 2A Experience island, right: prototype; same camera)

1280×720, software renderer, quality locked to High, island revealed.

| View | File |
|---|---|
| Approach from the Education walkway | `approach.webp` |
| At the arrival ring | `arrival.webp` |
| Inside the corridor (after Medrick, after Ubicomp) | `corridor-1.webp`, `corridor-2.webp` |
| At the edge, and looking back | `edge.webp`, `look-back.webp` |
| Side elevation, from the void, overview | `elevation.webp`, `from-void.webp`, `overview.webp` |

Regenerate: `SHOTS=1 SHOTS_VARIANT=v2 ISLAND=experience npx playwright test islandShots --project=desktop`.

## Performance (against the approved Phase 2A build)

| View | Draw calls 2A → 2B | Triangles 2A → 2B | Software frame ms 2A → 2B | RTX uncapped ms 2A → 2B |
|---|---|---|---|---|
| Experience close | 23 → 37 | 14.5k → 17.1k | 72.6 → 86.4 (+19%) | 0.5 → 0.7 |
| Education close (unchanged island, for reference) | 33 → 33 | 19.0k → 19.0k | 89.6 → 89.9 | 0.6 → 0.6 |
| Spawn | 61 → 61 | 37.5k → 37.5k | 108.0 → 109.8 | 0.7 → 0.8 |
| Other views | unchanged | unchanged | within ±3 ms (noise) | within ±0.1 ms |

- **Where the Experience cost is:** the gates themselves (about 18 ms of the close-up on the pixel-bound profile). They cover far more screen than the old thin frames. The new close-up now costs about the same as the Education close-up, which has been the heaviest view since Phase 0; it doesn't set a new worst case.
- **Two optimisations kept the gates within that envelope:**
  - Each gate stays opaque until it actually fades for the camera, since four telescoping transparent gates shaded the same pixels up to four times.
  - The camera tests simple invisible stand-ins instead of the real geometry, and the lights update only when something changes. Together these took the RTX frame from 0.9 to 0.7 ms.
- **Startup and hitches:** all 25 shader programs compile behind the loading screen, and the RTX runs at 60 fps throughout the 30 s walk. A late compile, when the island first came into view, was found and fixed, and a new test now guards it.
- **30 s walk with adaptive quality, software renderer, steady frame at Low:** Phase 2A measured 131–142 ms and Phase 2B 135–142 ms, two alternating runs each. The ranges overlap, so there's no measurable regression.

**Lab numbers again. The deciding check is your `?visual=v2&debug` reading at the Experience island against your 45 fps steady baseline.** If it dips there, the first levers are: plain (no surface noise) concrete for the gates' back faces, shallower gates, or dropping the moon-gate slab to a ring.

## Tests

- Unit and component: 262/262. New: the portal chapters come from the CV in time order, with exact roles and dates; the minor chapter becomes a stele; pending fields are never engraved.
- End-to-end: 44/44. New:
  - walking the corridor discovers each of the four gates exactly once and cues the kokedama, and walking back adds nothing
  - bringing every island into view compiles no new shaders
  - fading gates switch to an already-compiled variant
