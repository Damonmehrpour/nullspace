# Profiling

Targets (spec 9.6) are measurable goals, not ends in themselves. Fix only what people can see or feel.

## Pass 1: checkpoint C (2026-10-18)

**Build:** production-mode test build, headless Chromium with **software WebGL (SwiftShader, no GPU)**, 1920×1080, DPR 1.

| View | fps | Draw calls | Triangles |
|---|---|---|---|
| Spawn | 17 | 20 | 2,346 |
| Ring overview (Projects) | 24 | 14 | 1,532 |
| Projects close | 20 | 13 | 1,520 |
| Skills close | 23 | 31 | 1,868 |

At 1280×720 the same software renderer reaches about 38 fps. The fps column measures the CPU-emulated rasteriser, **not** real GPU performance. Draw calls and triangles are representative: both are far under budget (120 calls / 150k triangles).

**Bundles (gzipped):** initial 80.5 KB (target under 150 KB, contains no three.js). 3D chunk `WorldRoot` 294 KB (target under 900 KB).

**Real hardware:** open the live site with `?debug` (for example `https://nullspace-saemmi-studios.vercel.app/?debug`) and enter the simulation. An fps/CPU overlay appears at the top left, just below the top bar.

**Author's machine (2026-10-18, live build `0341a84` plus the overlay fix):** **45–55 fps while moving.** That's playable, but below the 60 fps target, so M6 adds adaptive quality: a lower pixel ratio first, then Low quality. Expensive effects (post-processing) are deferred.

**Action taken:** none needed. No visible stutter in any measured view, and every budget has large headroom.

To re-run: `PROFILE=1 npx playwright test profile --project=desktop` writes `test-results/profile.md`.
