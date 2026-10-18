# Visual Rebirth: Phase 2B, island architecture (Skills prototype)

**Status: the Skills island prototype is behind `?visual=v2`, awaiting your review.** Contact and the UI/UX phase haven't started. The approved Experience corridor, Projects atrium, characters and shared visual language are preserved.

- Review it live: https://nullspace-saemmi-studios.vercel.app/?visual=v2 (walk to Skills; fps overlay: `…/?visual=v2&debug`)
- The default experience (no flag) is unchanged.

## The Data City

A miniature brutalist skyline around an open plaza. **One district per CV skill group and one building per skill**, so the city's layout is the skill list itself:

| District (CV group) | Where | Architecture | Buildings |
|---|---|---|---|
| **Game Development** | Left of the plaza | Stacked, offset "pixel" blocks (echoing the Medrick gate) | 6, one per skill |
| **XR / Immersive** | Behind the plaza, toward the void: the skyline's peak | Slender towers, each wearing a floating frame of light near its top (echoing ARVO's augmented frame) | 5 |
| **AI / HCI Research** | Right of the plaza | Ribbed towers with vertical fins (echoing the Ubicomp lattice) | 5 |
| **Programming & tools** | Low, near the entrance | Long infrastructure blocks with a line of light along the top | 2 |
| **Languages** | Low, near the entrance | Standing stones, one per language | 4 |

**Organisation you can read:**
- Each district has a **name stone** at the plaza's edge, and a faint **line in the floor** leads from the plaza's centre to each one.
- Every building has its **skill on a slanted label plate** in front of it, in the CV's exact words, angled up toward the camera so it reads comfortably from the plaza (see `labels-closeup.webp`).
- The three main areas form the skyline; programming and languages are the low foundations by the entrance.
- **Height shapes the skyline and never rates a skill.** Each district simply rises toward its middle.

**All 22 skills and their groups come straight from the CV content** (`skillDistricts()`, unit-tested). Every skill is kept word for word, in order, in its own group.

**Lighting and discovery:**
- Windows on the skyline towers are faint by default. On the first visit the skyline **rises district by district**.
- Reaching a district's name stone for the first time on a visit **lights its windows and its floor line**, and the kokedama reacts (hop, glow, perked leaves), as on the other islands.

**Navigation:**
- The plaza stays open, with entrances where the walkways arrive.
- When the camera swings out over the skyline (say, while you face the entrance), districts beside it fade. Previously only buildings directly between the camera and the player faded, so up close towers could fill the frame.

**Unchanged:** the Skills panel (it still opens at the arrival ring with the full list), accessibility, the 2D portfolio, Low quality and reduced motion.

## Screenshots (left: approved build with the old Skills island; right: prototype; same camera)

1280×720, software renderer, quality locked to High, island revealed.

| View | File |
|---|---|
| Approach from a walkway | `approach.webp` |
| At the arrival ring, inside the plaza | `arrival.webp`, `corridor-1.webp` |
| Facing each district from the plaza | `district-game.webp`, `district-xr.webp`, `district-ai.webp`, `district-tools.webp`, `district-languages.webp` |
| Label plates up close | `labels-closeup.webp` |
| At the edge, and looking back | `edge.webp`, `look-back.webp` |
| Side elevation, from the void, overview | `elevation.webp`, `from-void.webp`, `overview.webp` |

Regenerate: `SHOTS=1 SHOTS_VARIANT=v2 ISLAND=skills npx playwright test islandShots --project=desktop`.

## Performance (measured back to back against the approved build)

**Measurement change:** the profile now marks every island as revealed before measuring, the steady state after a tour. Earlier phases measured unrevealed islands, which would have flattened this skyline mid-reveal and hidden its real cost. Both builds below use the new method, and the runs alternate (before, after, before, after) to separate cost from machine noise.

| View | Draw calls before → after | Triangles before → after | Software frame ms before → after | RTX uncapped ms before → after |
|---|---|---|---|---|
| **Skills close** | 22 → 54 | 15.2k → 25.3k | 77–83 → 100 (+20–25%) | 0.6 → 0.9 |
| Projects close (the heaviest view so far) | 62 → 62 | unchanged | 97–101 → 98 (same) | 0.8–1.0 → 0.9 |
| Education close | 33 → 33 | unchanged | 96–101 → 94–95 (same) | 0.6 → 0.6–0.7 |
| Ring overview (frames Skills) | 22 → 54 | 15.2k → 25.3k | 75–80 → 96–97 | 0.6 → 0.9–1.0 |
| Spawn, Experience, Contact | unchanged | unchanged | within noise | within noise |

- **Where it stands:** the Skills close-up now costs about the same as the Projects and Education close-ups, which are the heaviest views since Phase 0 (within about 3%, run-to-run noise). It doesn't set a new worst case.
- **What it took** (the first version was +45%):
  - slimmer towers spread over wider arcs and staggered in depth (they had merged into solid walls)
  - tighter grounding pads, only under buildings (the overlapping pads cost about 6.6 ms)
  - a slightly lower skyline
  - districts drawn before the island slab
  - a lighter concrete surface for the city's small buildings, with one coarse noise octave plus the grain and no staining pass, which saved about 5 ms
- **Draw calls:** 27 of the 32 new draw calls are the engraved labels. They render only near the island.
- **Shaders:** the light concrete variant, including its faded form, compiles behind the loading screen (a hidden warm-up mesh covers the faded form). Tests confirm that no new shaders compile when the islands come into view, when districts are discovered, or when districts fade.

**Lab numbers. The deciding check is your `?visual=v2&debug` reading in the plaza.** If it dips there, these levers keep the look:
- render the label plates only within a few metres of each district
- drop the window lights to a single column
- use plain concrete on the support districts

## Tests

- Unit and component: 269/269. New: every skill group becomes a district with its exact label and kind; every skill is kept word for word and in order (22 in all); pending groups are left out.
- End-to-end: 46/46. New: reaching each district's name stone discovers it once (five districts) and cues the kokedama; visiting again adds nothing; and no new shaders compile, even while districts fade. The walking tests now have explicit time headroom on the software renderer.
