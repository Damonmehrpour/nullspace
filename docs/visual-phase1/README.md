# Visual Rebirth: Phase 1, global look

**Status: deployed behind `?visual=v2` for author review. Not accepted. Phase 2 has not started.**

- Review: https://nullspace-saemmi-studios.vercel.app/?visual=v2 (with the fps overlay: `…/?visual=v2&debug`)
- The default experience (no flag) is unchanged. This was verified by pixel comparison: v1 screenshots before and after differ no more than two runs of identical code do.

## What Phase 1 changes (v2 only)

Phase 0 already delivered several Phase 1 items: floating island slabs on every island, recessed arrival inlays, the monolith, the player figure and blob shadows. Phase 1 brings the remaining world into the same language.

| Area | v2 treatment |
|---|---|
| Walkways and bridge | Thin cantilevered concrete decks (chamfered) on a central spine beam with rib fins underneath. The deck sits a few centimetres below the island tops (a readable step, no z-fighting). Low path lights are set into both deck edges: emissive, no real lights. All walkways plus the bridge are **2 draw calls** (were 7) |
| Island structures (Experience, Projects, Skills, Contact) | Same architecture (rebuilding it is Phase 2), now in the shared concrete with **chamfered edges** that catch the key light. The chamfer stays a constant 4.5 cm whatever each block's proportions, because the shader corrects the instance scale |
| Grounding | Every structure that stands on an island gets a soft **contact shadow**: one draw call per island, no shadow maps. Pads grow with the first-visit reveals. The project pedestals get round ones |
| Artifacts | The experimental artifact's fragments use the shared concrete (the rest of the artifact work is Phase 2) |
| Skills | Fixed an existing bug: three grid cubes had negative heights (JS `%` on negative numbers) and never rendered. **The same bug exists in v1; it's left untouched there so v1 stays identical. Say if you want it fixed in v1 too** |

Not changed in Phase 1: the monolith keeps its approved Phase 0 form (the plan's stepped plinth wasn't added, to avoid filling the hover gap that the approved design uses). The kokedama is Phase 3, and atmosphere and camera polish are Phase 4.

## Screenshots (left Phase 0, right Phase 1, same camera)

1280×720, software renderer, quality locked to High, all islands revealed.

| View | File |
|---|---|
| Spawn | `spawn.webp` |
| Education & Research | `island-education.webp` |
| Experience | `island-experience.webp` |
| Projects | `island-projects.webp` |
| Skills | `island-skills.webp` |
| Contact | `island-contact.webp` |
| Each walkway | `walkway-education.webp`, `walkway-experience.webp`, `walkway-projects.webp`, `walkway-skills.webp`, `walkway-contact.webp` |

Regenerate: `SHOTS=1 SHOTS_VARIANT=v2 npx playwright test fogShots --project=desktop`.

## Performance (Phase 0 vs Phase 1, same setup)

Per view, at High quality after warm-up (`PROFILE=1 PROFILE_VARIANT=v2 PROFILE_MODE=software|uncapped npx playwright test profile --project=desktop`):

| View | Draw calls P0 → P1 | Triangles P0 → P1 | Software frame ms P0 → P1 | RTX uncapped frame ms P0 → P1 |
|---|---|---|---|---|
| Spawn | 53 → 49 | 26.6k → 28.6k | 101.6 → 99.8 | 0.5 → 0.5 |
| Ring overview | 18 → 15 | 3.0k → 7.5k | 60.6 → 61.9 | 0.4 → 0.4 |
| Projects close | 17 → 15 | 3.0k → 7.5k | 58.2 → 59.3 | 0.4 → 0.4 |
| Skills close | 38 → 39 | 3.5k → 5.9k | 56.0 → 59.0 | 0.5 → 0.5 |
| Education close | 32 → 26 | 9.7k → 11.3k | 85.8 → 83.8 | 0.4 → 0.4 |
| Experience close | 18 → 16 | 3.0k → 6.8k | 65.0 → 66.7 | 0.3 → 0.3 |
| Contact close | 20 → 16 | 3.6k → 5.6k | 61.9 → 62.0 | 0.4 → 0.4 |

Budgets: ≤ 80 draw calls and ≤ 150k triangles. The new e2e test asserts both at spawn.

**30 s walk from Enter to Education with adaptive quality on** (`startup` spec):
- **RTX 4060 Ti (vsync):** 60 fps throughout. The worst frame is 56 ms, once, at the first frame (Phase 0: 53 ms). All 22 shader programs compile behind the loading screen; nothing compiles afterwards, including when quality drops.
- **Software renderer, steady frame at Low:** Phase 0 measured 125–135 ms and Phase 1 125–138 ms, two runs each, alternating. The ranges overlap completely, so there's no measurable regression.

What kept Phase 1 within budget:
- Chamfers use one bevel segment (108 triangles per block instead of 300).
- Instanced block sets get real bounds, so islands outside the view are culled. Previously they were always drawn.
- Walkways are merged into two draw calls.

**These are lab numbers. The deciding measurement is your `?visual=v2&debug` reading against the 45 fps steady-state baseline you measured on Phase 0.**

## Tests

- Unit and component: 256/256.
- End-to-end: 41/41, two consecutive runs. This includes the v2 budget check (draw calls and triangles at spawn), no shader errors, arrivals and panels working, Low quality safe, no recompiles on Low, and every shader compiled before the first frame.
