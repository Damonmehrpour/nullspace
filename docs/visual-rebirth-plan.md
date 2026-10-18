# Visual Rebirth: audit and plan

Status: **Phase 0 accepted; Phase 1 delivered for review** (see `docs/visual-phase0/`, `docs/visual-phase1/`). Phases 2–4 not started.

Constraints carried over: preserve gameplay, CV content, accessibility, navigation and fallbacks. Protect real-device performance (author baseline: 45–55 fps). No bloom, grain or post-processing as a substitute for art direction. Avoid excessive geometry.

Evidence: screenshots from spawn, every walkway and every island (`SHOTS=1 npx playwright test fogShots`), taken at `4f82222`.

## 1. Five biggest reasons it looks like a prototype

1. **No light structure, so no depth.** Every surface is the same flat mid-grey. There are no cast shadows, no contact or ambient occlusion, and no light/dark rhythm. Objects look pasted on: the Skills cubes and Education steps don't sit on anything. One directional light plus a hemisphere fill flattens all forms. Nothing reads as massive or dramatic.
2. **Blockout geometry and one shape language.** Islands are plain cylinders (they read as hockey pucks or cake tins), and structures are raw boxes with perfect, unbevelled edges. Every island uses the same disc-plus-boxes vocabulary. There's no thickness variation, no seams or edges to catch light, and no sense of being carved, cast or suspended. It reads as a CAD greybox, not architecture.
3. **The camera frames the player, not the world.** The camera sits low and close (6 m back, 3.5 m up, 50° FOV), aimed at a capsule in the dead centre. The architecture's tops and the island titles are cut off by the frame edge. Each island becomes a flat ellipse filling the lower half. There's no establishing view, no foreground/background layering, and no horizon.
4. **The void is empty, not deep.** A flat `#000` background with black fog only darkens things. With no distant forms, no subtle gradient, no particles and no scale references, size and distance can't be judged. "Suspended in a void" needs something below and beyond to be suspended over.
5. **The living things look like placeholders.** The kokedama is a faceted, low-poly, saturated cartoon-green ball. It has no fuzz silhouette, the leaves are flat cards, and the twine is a thin torus. The player is a plain capsule. The spore trail renders as **square white pixels** (default `PointsMaterial`). Arrival rings are thin neon outlines that read as debug gizmos.

## 2. Visual direction

**Overall:** monumental, quiet, surreal. Warm-white cast concrete with board-form texture and chamfered edges, lit by a low raking key light so every form throws long, soft, **baked** shadows. Each island is a massive slab whose underside tapers into hanging rock and roots, so it visibly *floats*. A deep blue-black abyss sits below, with faint distant megastructures for scale. The kokedama is the only saturated, living colour.

**Shared material:** one custom concrete material (`MeshStandardMaterial` with `onBeforeCompile`):
- world-space noise for aggregate and staining
- faint horizontal board-form banding
- slightly darker, rougher undersides
- edge highlights from bevelled geometry

One shader is reused everywhere: no image textures to download, and one compile.

| Place | Composition and silhouette | Signature detail | First-visit reveal |
|---|---|---|---|
| **Monolith / spawn** | A tall, thick, slightly tapered monolith on a stepped three-tier plinth. The bridge is a thin cantilevered slab with ribbed underside fins | A recessed vertical slit glowing soft moss-white, where the kokedama is born | (none) |
| **Education & Research** | **"Archive ziggurat."** A massive block with a stair carved into it, flanked by stacked "archive slabs" like giant book spines leaning against it. A heavy cantilevered lintel roof | A light slot across the top step (knowledge); the slabs have engraved lines | Archive slabs slide out like drawers, top-down |
| **Experience** | **"Timeline colonnade."** Five thick portal frames in a straight procession, each slightly taller than the last, framing the void beyond. An inset path runs through them | A recessed light strip on each lintel underside | Strips light one by one along the path |
| **Projects** | **"Sunken atrium."** A broken ring wall with fractured, stepped tops around a sunken square floor. Three plinths stand under a floating ring | A thin oculus ring hovering above; artifacts lit from within | Walls rise and fracture into place; the ring descends |
| **Skills** | **"Data city."** A dense grid of rectangular pillars of varied heights, like a brutalist skyline or bar chart, with a central clearing for the player | Recessed window-slit pattern in the shader (no extra geometry) | Pillars rise in a wave from the clearing outward |
| **Contact** | **"Signal tower."** Stacked, offset, cantilevered slabs climbing to a dish, with a slowly blinking beacon | Thin cable lines down to the island edge | The beacon ignites and a short light pulse travels up the tower |
| **Bridge and walkways** | Thin slabs with small rib fins underneath and a slight step down where they meet islands | Embedded low path lights along the edges (emissive, no real lights) | (none) |
| **Kokedama** | A smooth, round moss ball with a **soft fuzzy silhouette** (3–4 cheap shell layers, alpha-tested, on this one small object), varied moss greens with lighter tips, and wrap lighting so it glows softly at the edges | 5–7 curved leaves on short stems; **twine wrapped twice**, crossing; **3 dangling root strands** that swing with motion; a faint moss-green glow on the ground beneath | Expressive motion: lean into movement, leaf flutter when speaking, a root swing when stopping, a hop-and-settle when greeting, a curious tilt toward the player when waiting |
| **Player** | A slender white "pilgrim" form: a tall tapered shard with a soft halo ring. It reads as an abstract figure, not a capsule | A soft blob shadow on the ground | (none) |
| **Void / atmosphere** | A very dark blue-black gradient dome, a few huge, dim megastructure silhouettes far below and beyond (one instanced draw call), slow drifting dust motes (a few hundred, round, soft), and fog tinted blue-black | Faint light shafts from the monolith slit (additive cones, no post-processing) | (none) |
| **Arrival marker** | Replace the neon ring with a recessed floor inlay: a moss-lit groove set into the concrete that pulses softly | (none) | (none) |
| **Camera** | Higher and farther: about 7.5 m back, 4.6 m up, 42° FOV, with the player in the lower third and the aim ahead of the player, so architecture and the horizon are in frame | (none) | (none) |

## 3. Phased plan

**Every phase:** all existing unit, component and end-to-end tests stay green; profiling after warm-up; screenshot set; deployed to the live URL behind a flag until approved.

### Phase 0: Visual proof of concept (one small, reviewable slice)

**Scope:** Education & Research island only, plus the shared concrete material, the new lighting rig with baked shadows, the void backdrop, the new kokedama and the new camera framing.

**How you review it:** live, behind a URL flag, **`?visual=v2`**. Without the flag the current look stays, so you can compare the same spot side by side. The flag is only a comparison switch and is removed after approval.

**What I'll measure:**
- fps in your `?debug` overlay (same route as before)
- headless profile after warm-up
- draw calls and triangles

**Deliverables:** before/after screenshots and a short note. Then **stop for your verdict** on the direction before touching the other islands.

### Phases 1–4

| Phase | Scope |
|---|---|
| **1. Global look** | Apply the material, lighting and baked shadows to the whole world: monolith, bridge, walkways, island slabs with suspended undersides, arrival inlays. Player figure and blob shadows |
| **2. Island architecture** | Experience, Projects, Skills and Contact rebuilt per section 2, one island per commit, each with its new reveal. Artifacts re-lit to sit in the atrium |
| **3. Kokedama life** | Animation polish: lean, root swing, leaf flutter tied to speech, greet hop, waiting tilt. Spore trail as soft round motes |
| **4. Atmosphere and composition** | Megastructures, dust, light shafts, fog tuning, camera polish. Final performance tuning. Final screenshot set and your visual review |

## 4. Performance risks and how they'll be measured

| Risk | Mitigation |
|---|---|
| **Real-time shadow maps** (biggest cost) | Shadows are **baked once**: the shadow map renders on load and never updates (`shadowMap.autoUpdate = false`), since architecture is static. Moving things (player, kokedama) get cheap blob shadows. Low quality uses no shadow maps at all |
| **Overdraw from transparency** (kokedama shells, dust, shafts) | Shells only on the small kokedama (3–4 layers, alpha test, not blending). Dust is a few hundred small points. Shafts are a few additive cones. All are cut back on Low |
| **Draw calls from extra detail** | Instancing and merged static geometry per island. Budget **≤ 80 draw calls** in any view (now 13–31) |
| **Triangles** | Bevels with low segment counts, detail in the shader (window slits, board marks) rather than geometry. Budget **≤ 150k** |
| **Shader compile hitch** | One shared concrete material, compiled during the existing loading screen (pre-compiled before first frame) |
| **Environment lighting** | A tiny 64 px procedural environment, generated once, for subtle reflections. No HDR download |
| **Adaptive quality** | Existing `PerformanceMonitor` path. Low turns off shadows, shells, dust and shafts |

**Measurement each phase:**
1. Headless `PROFILE=1` run after warm-up: four fixed views plus the Education close-up. It fails if draw calls exceed 80 or triangles exceed 150k, or if fps drops more than 15% versus the current baseline in the same headless setup.
2. **Your `?debug` reading on your machine** at the same route: target **no worse than 45–55 fps**, ideally better.
3. Bundle size: the 3D chunk stays under 900 KB gzipped (now 298 KB).

## 5. Visual acceptance checklist

**Light and depth**
- [ ] From spawn, every island is readable as a distinct silhouette against the void, without its title.
- [ ] Every structure casts a visible soft shadow onto its island; nothing looks pasted on.
- [ ] Each island visibly *floats*: its underside reads as mass hanging over depth.
- [ ] Lighting has a clear direction: lit faces, shadow faces and a rim separate forms.

**Material**
- [ ] Surfaces read as cast concrete or stone (variation, banding, bevel highlights), not flat grey.
- [ ] No debug-looking elements remain (neon rings, square particles, raw capsule).

**Architecture**
- [ ] Each island has its own signature (archive ziggurat, timeline colonnade, sunken atrium, data city, signal tower) recognisable in one glance.
- [ ] Each first-visit reveal is short (≤ 2 s) and fits that island's architecture.

**Kokedama**
- [ ] Reads instantly as a living moss ball: soft fuzzy edge, varied greens, leaves, crossed twine, dangling roots.
- [ ] Its motion expresses lead, wait (curious tilt), greet (hop) and speaking (leaf flutter), and stays calm under reduced motion.

**Atmosphere and composition**
- [ ] The void has depth: gradient, distant megastructures and dust give scale without clutter.
- [ ] The default camera frames architecture and horizon; titles and tops aren't cut off at normal distances.
- [ ] One coherent, memorable aesthetic: black void, warm-white concrete, a single living green.

**Must not regress**
- [ ] All unit, component and end-to-end tests green; live smoke green.
- [ ] Your `?debug` reading: no worse than 45–55 fps on your machine.
- [ ] Headless profile within the budgets above.
- [ ] Reduced motion, Low quality, View Portfolio, keyboard and touch flows unchanged.
- [ ] No post-processing (bloom, grain, vignette) used to achieve the look.
