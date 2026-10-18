# Phase 0 performance investigation

**Status: fixes deployed for the author's retest. Phase 1 stays on hold.**

Author's report on `?visual=v2`: about 17 fps for the first ~30 s, then about 43 fps (v1 baseline 45–55).

## How it was measured

- **Real GPU:** headless Chromium on ANGLE/D3D11 (RTX 4060 Ti), vsync on and uncapped, 1920×1080, recording every frame for 30 s after Enter while the player walks to Education. Adaptive quality stays on, as on a real visit (`tests/e2e/startup.spec.ts`).
- **Pixel-bound proxy for a weaker GPU:** the same run on SwiftShader (software WebGL). It's far slower than any real device, so only the ratios mean anything.
- **Ablation:** a fixed Education close-up at 1280×720, software renderer. Each v2 element is hidden in turn, or its material swapped, and the frame time is re-measured (`tests/e2e/ablation.spec.ts`).

## What caused the slowdown (evidence)

| # | Cause | Evidence |
|---|---|---|
| 1 | **All shaders compiled synchronously on the first frame.** v2 needs 17+ programs, compiled in one draw call. | RTX: a **1,090 ms** single-frame freeze, then a 166 ms one. v1: 364 ms for 7 programs |
| 2 | **Quality drops recompiled every lit shader.** Low quality *removed* the player's point light. A different light count makes three.js rebuild every lit material. | The program count jumped 18 → 25 at the step to Low, with 319 ms and 178 ms freezes exactly then. Seen in v1 too (11 → 15) |
| 3 | **Physically based specular on all the concrete.** The rock slabs and the archive cover most of the screen. Their GGX specular on rough concrete is visually negligible, but it was the largest per-pixel cost. | Swapping only the concrete material to a diffuse (Lambert) model: 111 → 72 ms per frame. The noise detail itself is a smaller cost |
| 4 | **The sky dome was painted under everything.** It drew first, full screen, and the islands then overdrew it. | Hiding the dome saved 7–9 ms |
| 5 | Fine aggregate noise octave (8 hashes per pixel for a 1–2 px grain) | Part of the remaining ~15 ms shader-detail cost |

Causes 1 and 2 explain the "slow for ~30 s, then better" pattern: a long freeze, then stuttering while adaptive quality stepped down, and each step recompiled shaders. Cause 3 explains why the steady rate stayed below v1.

## What changed (the look is preserved: matched screenshots compared with the approved Phase 0 shots)

1. **Precompile behind the loading screen** (`src/world/Precompile.tsx`, `WorldRoot.tsx`). Nothing draws until `renderer.compileAsync()` has finished, using parallel shader compile where the browser supports it. The loading text stays up meanwhile. There's a 5 s safety timeout.
2. **The player light is always mounted.** Low sets its intensity to 0 instead of removing it (`Player.tsx`, `PlayerV2.tsx`). Quality changes no longer recompile anything. This also fixes v1.
3. **Concrete and moss use Lambert lighting** instead of PBR (`v2/concrete.ts`, `v2/GuideBodyV2.tsx`). The diffuse response is identical. All surface detail (aggregate, stains, board lines, contact darkening, undersides, depth fade) is unchanged.
4. **The sky dome draws after the opaque world**, so only sky pixels shade it.
5. **The finest aggregate octave** is one hash per 3 cm cell instead of an 8-hash interpolated noise.

## Before / after

| Measurement | Before | After |
|---|---|---|
| RTX, worst frame at startup (v2) | 1,090 ms | 53 ms |
| RTX, world fully drawn after Enter (v2) | ≈ 3.0 s (first frame 0.8 s, then a 1.1 s freeze) | 1.05 s, no freeze |
| RTX uncapped, frames rendered in 30 s (v2) | 37,288 | 47,979 (+29%) |
| RTX uncapped, p95 frame time 10–30 s (v2) | 4 ms | 2 ms |
| Shader programs added when quality drops to Low | v1 +4, v2 +7–9 | 0 |
| Software, Education close-up, High (v2; v1 = 41.9 ms) | 109.8 ms | 84.1 ms (−23%) |
| Software 30 s walk, steady frame at Low (v2; v1 ≈ 57 ms) | 161–175 ms | 125–128 ms (−25%) |
| Software 30 s walk, frames rendered (v2) | 216 | 256 |

The software renderer still shows one ~0.85 s frame at start: SwiftShader compiles at first draw and has no parallel compile. On the real GPU that freeze is gone.

**These are lab numbers. Whether v2 now matches the 45–55 fps v1 baseline on the author's computer is for the author's retest to decide** (`?visual=v2&debug`).

## New regression tests

- `v1/v2: switching to Low quality compiles no new shader programs`. It failed before the fix (11 → 15, 21 → 30).
- `v2: the first drawn frame already has every shader compiled`. It failed before the fix (0 programs on the first frame).

Re-run the profiling: `PROFILE=1 PROFILE_VARIANT=v2 PROFILE_MODE=gpu|uncapped|software npx playwright test startup --project=desktop` and `… ablation …`.
