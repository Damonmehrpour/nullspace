# Visual Rebirth: Phase 2B, island architecture (Contact prototype)

**Status: the Contact island prototype is behind `?visual=v2`, awaiting your review.** This completes the island-architecture prototypes; the UI/UX phase and the Phase 3 story and contact-number work haven't started. The approved Experience, Projects and Skills islands, characters and shared visual language are preserved.

- Review it live: https://nullspace-saemmi-studios.vercel.app/?visual=v2 (walk to Contact; fps overlay: `…/?visual=v2&debug`)
- The default experience (no flag) is unchanged.

## The Signal Tower

| Element | What it is |
|---|---|
| **Tower** | Six offset concrete slabs spiralling up a slender core, each cantilevered out a little further round, to about 7 m. A shallow **dish** at the top aims out at the void, with a slowly blinking **beacon** at its focus (steady under reduced motion). Thin guy lines run down to the island's edge |
| **Station house** | A block at the tower's foot, facing the plaza, engraved with your **location** and **availability**, exactly as in the CV |
| **Transmitter stones** | **One stone per public contact channel** (Email, GitHub, LinkedIn), fanned around the tower toward the plaza. Each is engraved with the channel's CV label and value, and leans back so its face catches the light and reads from the camera |
| **Cables of light** | Each stone is wired to the tower by a thin cable, faint until discovered |

**Discovery:** the first time on a visit you approach a stone, **a pulse of light climbs its cable to the tower**, the cable stays lit, and the kokedama reacts (hop, glow, perked leaves). The **first-visit reveal** lights the slab tips one by one from the bottom up, then the beacon ignites.

**All contact facts come from the CV content** (`contactStones()` and `contactBase()`, unit-tested). Pending channels or lines are never engraved. **Update (Phase 3):** the approved phone number is now in the content, so it has its own stone and cable here (see `docs/visual-phase3/`). Discord and the personal YouTube channel stay excluded.

**Unchanged:** the Contact panel and its links (it still opens at the arrival ring), accessibility, the 2D portfolio, Low quality and reduced motion. The tower fades for the camera like the other tall structures.

## Screenshots

Before/after pairs (left: approved build with the old mast and dish; right: prototype; same camera; 1280×720, software renderer, quality locked to High, island revealed):

| View | File |
|---|---|
| Approach from a walkway | `approach.webp` |
| At the arrival ring, inside the plaza | `arrival.webp`, `corridor-1.webp` |
| At the edge, and looking back | `edge.webp`, `look-back.webp` |
| Side elevation, from the void, overview | `elevation.webp`, `from-void.webp`, `overview.webp` |

Prototype-only views: in front of each stone (`stone-left.webp`, `stone-centre.webp`, `stone-right.webp`), a stone close-up (`stone-closeup.webp`), and looking up at the tower and dish (`tower.webp`).

Regenerate: `SHOTS=1 SHOTS_VARIANT=v2 ISLAND=contact npx playwright test islandShots --project=desktop`.

## Performance (measured back to back against the approved build, islands revealed)

| View | Draw calls before → after | Triangles before → after | Software frame ms before → after | RTX uncapped ms before → after |
|---|---|---|---|---|
| **Contact close** | 23 → 32 | 13.3k → 14.4k | 66.5 → 72.6 (+9%) | 0.6 → 0.7 |
| Spawn | 61 → 62 | 37.5k → 38.3k | 107–108 → 108.7 | 0.8 → 0.8 |
| All other views | unchanged | unchanged | within noise | within noise |

These numbers come from alternating runs (before, after, before, after). The first "after" run was noisy across every view, including views that don't see Contact, so the table uses the second, clean pair.

- **Contact stays the lightest island view.** The heaviest views are still the Education, Projects and Skills close-ups (about 94–103 ms here).
- **Shaders:** everything compiles behind the loading screen. Tests confirm no new shaders when the island comes into view, when stones are discovered, or when the tower fades.

**Lab numbers. The deciding check is your `?visual=v2&debug` reading.**

## Tests

- Unit and component: 272/272. New: a stone per channel with the CV's label and value, in order; location and availability as stated; pending items never engraved.
- End-to-end: 47/47. New: approaching each stone discovers it once and cues the kokedama; approaching again adds nothing; and no new shaders compile.

## Where this leaves the plan

All five islands now have their Phase 2B architecture behind `?visual=v2`: Education (Phase 0), Experience, Projects, Skills and Contact. Next in the revised plan, after your review:
- **Phase 3, story and contact:** the XR Meditation dialogue moment, and the phone number in the content, panel and 2D portfolio.
- **The UI/UX phase.**
- **The final atmosphere and performance pass.**
