# Visual Rebirth: Phase 2A, character prototype

**Status: prototype behind `?visual=v2`, awaiting your visual approval. Nothing beyond this prototype has started** (story moment, contact number, islands and UI/UX are planned in the revised [`visual-rebirth-plan.md`](../visual-rebirth-plan.md), revision 2).

- Review it live: https://nullspace-saemmi-studios.vercel.app/?visual=v2 (fps overlay: `…/?visual=v2&debug`)
- The default experience (no flag) is unchanged: v1 keeps its original player and kokedama.

## The hooded wanderer (your chosen direction)

A small traveller exploring an impossible world:

| Aspect | Prototype |
|---|---|
| Silhouette | Recognisably humanoid: a rounded hood drooping into a soft point at the back, a layered **shoulder mantle** over a short **cloak**, both cut into points (the cloak's longest point trails at the back), slim legs with rounded boots |
| Face | A dark recessed opening, crisply rimmed in bone, with **two soft eye glints** that blink every few seconds. Nothing else |
| Palette | Slate-indigo cloak with a lighter mantle and bone trim (reads dark against the white architecture), a muted ochre scarf as the single warm accent, charcoal legs. The kokedama stays the only green |
| Walk | The stride follows the distance actually walked (no foot sliding), with legs swinging under the cloak, a double bob per stride and a forward lean with speed. The cloak lags and sways; the scarf tail trails |
| Idle | Breathing, slow glances around |
| Reactions to the kokedama | The head turns toward it when it's within 5 m, the eyes brighten while it speaks, and the hood dips in a small nod when it greets |
| Reduced motion | All amplitudes drop to about a third |
| Size | About 1.1 m tall, so the kokedama hovers just above head height: a small figure in a monumental world |

Built procedurally (no downloads): about 4.5k triangles, 10 draw calls (the shard used 3), Lambert materials (the cheap lighting model from the performance pass).

## The kokedama upgrade

| Aspect | Before | Prototype |
|---|---|---|
| Moss | Lumpy ball plus 3 fuzz shells | **Cushion-moss pads** shaped into the ball itself (so the fuzz follows them) with stronger dark/light variation; lighter fuzz tips; **lichen flecks** between the moss |
| Foliage | 6 leaves | **9 leaves** in two sizes, a **curling sprout frond** with 3 small leaves, **5 tiny pale buds** |
| Roots | 3 thin tubes | **5 roots tapering to fine tips**, swinging with motion and slowly curling at rest |
| Personality | Lean, root swing, beckon tilt, speech wiggle | Plus: **leaves perk up** when it speaks or greets, **droop slowly** the longer it's kept waiting, it **leans toward the player** while waiting, it **ruffles** when the player brushes past, and it **hops** when it greets |
| Low quality | Drops fuzz shells | Drops fuzz shells and buds (the buds are hidden, not unmounted, so returning to High compiles nothing) |

One idea was tried and rejected during prototyping: separate moss tufts. As cones they read as cactus spines, and as bumps they read as polka dots. Shaping the ball itself reads as moss and costs nothing extra.

## Screenshots (left: current v2, right: prototype; same camera)

1280×720, software renderer, quality locked to High.

| View | File |
|---|---|
| Wanderer close-up / walking | `wanderer-closeup.webp`, `wanderer-walking.webp` |
| Kokedama close-up | `kokedama-closeup.webp` |
| Front three-quarter, side, back | `front-three-quarter.webp`, `side.webp`, `back.webp` |
| Mid-stride | `walking.webp` |
| Kokedama, the pair together | `kokedama.webp`, `pair.webp` |
| Default gameplay camera | `gameplay.webp` |

Regenerate: `SHOTS=1 SHOTS_VARIANT=v2 npx playwright test characterShots --project=desktop`.

## Performance (measured against the Phase 1 build)

The agreed budget for this upgrade: at most +10% frame time at spawn on the pixel-bound profile, and at most +12 draw calls. Result: +7% and exactly +12 at spawn (wanderer +7, kokedama +5: sprout stem, sprout leaves, buds, two more roots); +7 elsewhere.

| View | Draw calls P1 → 2A | Triangles P1 → 2A | Software frame ms P1 → 2A | RTX uncapped ms P1 → 2A |
|---|---|---|---|---|
| Spawn | 49 → 61 | 28.6k → 34.1k | 99.8 → 107.2 (+7%) | 0.5 → 0.7 |
| Ring overview | 15 → 22 | 7.5k → 11.8k | 61.9 → 66.3 (+7%) | 0.4 → 0.5 |
| Projects close | 15 → 22 | 7.5k → 11.8k | 59.3 → 63.2 (+7%) | 0.4 → 0.5 |
| Skills close | 39 → 46 | 5.9k → 10.2k | 59.0 → 62.9 (+7%) | 0.5 → 0.7 |
| Education close | 26 → 33 | 11.3k → 15.6k | 83.8 → 88.1 (+5%) | 0.4 → 0.6 |
| Experience close | 16 → 23 | 6.8k → 11.1k | 66.7 → 71.1 (+7%) | 0.4 → 0.5 |
| Contact close | 16 → 23 | 5.6k → 9.9k | 62.0 → 65.2 (+5%) | 0.4 → 0.5 |

Isolated costs at the Education close-up (pixel-bound): the whole kokedama is 7.8 ms, of which the fuzz shells are 4.9 ms (unchanged from Phase 0); the wanderer's body is 3.0 ms; the buds are about 0.2 ms. A fourth fuzz shell was tried and cost about 2.5 ms for little visible gain, so it was dropped.

**30 s walk from Enter with adaptive quality on:**
- **RTX (vsync):** 60 fps throughout. All 23 shader programs compile behind the loading screen, and nothing compiles afterwards.
- **Software renderer, steady frame at Low:** 131–132 ms, inside Phase 1's 125–138 ms range. Low drops the expensive parts.

**What this means for your machine:** the prototype is inside the agreed budget at about +5–7% in a fully pixel-bound case. If your GPU is fully fill-bound, that's roughly 45 → 42–43 fps at High; Low is unaffected. If your `?visual=v2&debug` reading drops more than you'd like, these levers keep the look:
- two fuzz shells instead of three (about −1.6 ms)
- dropping the buds at Medium
- a lower pixel ratio for the first step down

## Tests

- Unit and component: 258/258.
- End-to-end: 41/41. This includes the v2 checks: no shader errors, arrivals and panels working, draw-call and triangle budget at spawn, no recompiles when switching to Low, and every shader compiled before the first frame.
