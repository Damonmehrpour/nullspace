# Visual Rebirth: Phase 0 proof of concept

**Status: deployed behind `?visual=v2` for author review. Not accepted. Phase 1 has not started.**

- Compare: https://nullspace-saemmi-studios.vercel.app/ (v1, unchanged) vs https://nullspace-saemmi-studios.vercel.app/?visual=v2
- With fps overlay: `…/?visual=v2&debug`

## What Phase 0 changes (v2 only)

| Area | v2 treatment |
|---|---|
| Shared material | One cast-concrete shader: world-space aggregate noise, staining, faint board-form lines, ground-contact darkening on walls, darker undersides, rock fading into the void. No textures, no shadow maps |
| Lighting | Low warm raking key, neutral sky/ground fill, faint cool rim. No real-time or baked shadow maps |
| Contact shadows | Soft decals under the archive, the monolith, the player and the kokedama (generated once, no runtime cost) |
| Void | Blue-black gradient dome, fog tinted to match, dim distant megastructures (one draw call), slow GPU-animated dust |
| Islands | Every island becomes a floating mass: flat walkable top plus a hewn rock underside. Arrival rings become recessed inlays. The Experience, Projects, Skills and Contact architecture is unchanged (that's Phase 2) |
| Education & Research | **Archive ziggurat:** a stair carved into a monolithic mass, cheeks, back wall, cantilevered lintel with a light slot, ten leaning archive slabs that slide out as the first-visit reveal |
| Spawn | Heavier bevelled monolith with a glowing birth slit and halo, on a floating plinth. It fades out when it would block the camera |
| Kokedama | Lumpy moss core with patchy colour, three fuzz shells (dropped on Low quality), crossed twine hugging the surface, six curved leaves, three short curling roots that swing with motion, lean into travel, curious tilt while waiting, leaf flutter when speaking, blob shadow |
| Player | Slender white shard with a floating halo and a blob shadow |
| Spores | Soft round glowing motes instead of square pixels |
| Camera | Higher, farther, 42° lens, aim slightly ahead, so architecture and horizon fit |
| Low quality | Drops the fuzz shells, thins the dust, and turns off concrete surface noise (on top of the existing pixel-ratio step) |

Gameplay, content, panels, accessibility, the 2D portfolio and all fallbacks are unchanged. v1 renders exactly as before.

## Matched screenshots (left v1, right v2)

`fixed-*`: identical camera position for both (each keeps its own lens: v1 50°, v2 42°).
`play-*`: each version's own gameplay camera from the same player spot and heading.

| View | File |
|---|---|
| Spawn | `fixed-spawn.webp`, `play-spawn.webp` |
| Approach to Education | `fixed-approach.webp`, `play-approach.webp` |
| Education & Research | `fixed-education.webp`, `play-education.webp` |
| Kokedama | `fixed-kokedama.webp` |

Regenerate: `SHOTS=1 npx playwright test visualCompare --project=desktop`.

## Measurements

Headless Chromium with **software WebGL (no GPU)**, 1920×1080, quality locked to High, warm-up 6 s. These numbers compare v1 and v2 with each other; they **don't predict real-device fps**.

| | v1 | v2 |
|---|---|---|
| Startup (Enter → world ready) | 2.2–2.3 s | 3.2–3.4 s (+≈1 s: shader compile and geometry) |
| Draw calls, spawn / Education close | 20 / 14 | 52 / 32 (budget ≤ 80) |
| Triangles, spawn / Education close | 2.4k / 1.5k | 26.5k / 9.7k (budget ≤ 150k) |
| fps, software renderer (5 views) | 9–12 | 4–9 |
| 3D chunk (gzipped) | 298 KB | about 302 KB (no new assets) |

**Reading:** the software renderer is pixel-bound, and v2's per-pixel concrete detail roughly halves its frame rate there. A real GPU handles this kind of shader very differently, so the only meaningful number is **the author's `?visual=v2&debug` reading**. The previous v1 baseline was 45–55 fps. If v2 is noticeably lower, the first levers are: the concrete noise octaves, the fuzz shell count, the dome/fog cost and the pixel ratio.

## Tests

- Unit and component: 256/256
- End-to-end: 38/38, two consecutive runs. That includes two new checks: v2 renders without shader errors, arrivals and panels work, and Low quality is safe; and without the flag, v1 is used.
