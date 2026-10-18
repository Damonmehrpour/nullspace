# Visual Rebirth: audit and plan

Status: **Phases 0 and 2A approved; Phase 1 delivered. Phase 2B (island architecture): Experience approved; Projects (`docs/visual-phase2b-projects/`) awaiting review.** Skills, Contact and later phases haven't started.

Constraints carried over: preserve gameplay, CV content, accessibility, navigation and fallbacks. Protect real-device performance (author baseline: 45–55 fps). No bloom, grain or post-processing as a substitute for art direction. Avoid excessive geometry.

Evidence: screenshots from spawn, every walkway and every island (`SHOTS=1 npx playwright test fogShots`), taken at `4f82222`.

## Revision 2: expanded creative feedback (author, after Phase 1)

The author isn't satisfied with the character designs or the overall visual/UX experience yet, and wants it done properly rather than fast. Five areas were added; the rest of this document still holds where this section doesn't override it.

### Player character: concepts

Three directions were considered (none of them decorates the capsule):

| Direction | Silhouette and personality | Movement | Cost |
|---|---|---|---|
| **A. Hooded wanderer (chosen by the author)** | A small hooded traveller: big hood, short sculpted cloak with a pointed hem, slim legs. A face completely hidden in shadow. Mysterious, curious, a little lonely; the kokedama brings the warmth | Readable stride: legs swing under the cloak, the hem sways and lags, the body bobs and leans with speed. The hood turns toward the kokedama | Procedural, about 2–3k triangles, 6–7 draw calls, no textures |
| B. Stone pilgrim | A faceted, carved figure made of the same concrete as the world, as if a statue walked off its plinth | Heavy, deliberate steps, with stone dust at each footfall | Similar |
| C. Lantern sprite | A floating cloth lantern with a soft inner light | Drifts and sways; no legs | Cheapest, but weakest as a "traveller" |

**Confirmed direction: A, the mysterious stylised humanoid wanderer.**
- **Silhouette:** recognisably humanoid at gameplay distance, carried by the hood point, the cloak's pointed hem and the leg gap.
- **Palette:** deep slate-indigo cloak (`#353b55`), near-black face cavity, bone-white trim along the hem and hood edge, a muted ochre scarf as the single warm accent, charcoal legs. Dark-on-white keeps the player from disappearing into the architecture. The trim and scarf separate it from the void.
- **Face:** completely hidden in shadow. No eyes, dots or features of any kind; the cavity is unlit black, so no light (the player's own lamp included) reveals anything. Author's correction after the first prototype.
- **Motion:**
  - **Walk:** stride phase advances with the distance actually walked, so the feet don't slide; legs swing; the hem lags and sways.
  - **Idle:** breathing, an occasional look around.
- **Reactions to the kokedama:** the hood turns toward it when it's near and tilts in a small nod when it greets.
- **Reduced motion:** amplitudes drop to a calm minimum.

### Kokedama upgrade

- **Richer moss:** a tuft layer of short moss blades over the core (one instanced draw) for a soft, uneven silhouette, and lichen flecks (pale yellow-green and silver) in the moss shader.
- **Foliage:** nine leaves in two sizes (was six), a curling sprout frond on top, and a few tiny pale flower buds.
- **Roots:** five roots (was three), with thinner, longer tips that swing with motion and curl gently at rest.
- **Expressive motion and reactions:**
  - leaves perk up when it speaks or greets, and droop slowly the longer it waits
  - the body tilts toward the player
  - the leaves ruffle when the player brushes past
  - a small hop on greeting

**Budget:** the author accepts some extra cost, measured at every step. Target: the kokedama and player together cost at most 10% more frame time at the spawn view on the pixel-bound profile, plus no more than 12 extra draw calls. Low quality drops the tuft layer and the flower buds.

### XR Meditation System story moment

When the player first enters the XR Meditation System artifact's interaction range on a visit, the kokedama says:
1. "Oh… this is actually where I was first born."
2. After about 1.5 s: "Well, not exactly me. But the idea that became me started here."

How it fits the existing systems:
- It's a once-per-visit event in the dialogue director (once, kept in memory for this page visit, not in storage), queued behind any line already showing.
- It goes through the same subtitle region (polite live region), so screen readers get it without stealing focus.
- It never opens, blocks or delays the project panel or the interact prompt, and it's skipped if the panel is already open.
- The kokedama turns toward the artifact while speaking.
- Copy is the author's own; it isn't reworded.

### Contact information

Add the public number **+358 45 8629910**, linked as `tel:+358458629910`, in the Contact island panel, the accessible 2D portfolio and the mobile layout.
- This replaces the earlier "don't show my phone number" rule, by the author's explicit request.
- Discord and the personal YouTube channel stay excluded.
- Covered by content validation and an e2e check of the link.

### World and UI/UX

- **Islands:** more environmental detail and a distinct identity per island (the architecture of section 2, plus small environmental props that support each section's meaning).
- **UI:**
  - interaction prompts that say what will happen
  - clearer navigation (where am I, where next)
  - information panels with better typography, spacing and hierarchy
  - short, purposeful transitions that respect reduced motion
  - better mobile and keyboard usability: touch targets, focus order, visible focus, one-handed reach

### Revised phases (each one stops for author approval)

| Phase | Scope | Status |
|---|---|---|
| 0. Proof of concept | Material, lighting, void, Education, first kokedama, camera | Accepted |
| 1. Global look | Walkways, bridge, chamfers, contact shadows across the world | Delivered |
| 2A. Character prototype | Hooded wanderer plus the upgraded kokedama | **Approved** (faceless wanderer and kokedama are the character baseline) |
| **2B. Island architecture** | Per your direction, after 2A approval: one island at a time, each stopping for review. Experience (Monumental Corridor of Portals) **approved** (`docs/visual-phase2b/`). **Projects (sunken atrium under a floating ring) delivered** (`docs/visual-phase2b-projects/`). Then Skills and Contact | **Projects: awaiting review** |
| 2C. Character finish | Polish from feedback; the kokedama's environmental reactions across the world; Low-quality variants; reduced-motion review | Later |
| 3. Story and contact | XR Meditation dialogue moment; contact number in the panel, the 2D portfolio and mobile | After 2B |
| 5. UI/UX | Prompts, navigation, panels, typography and spacing, transitions, mobile and keyboard | After the islands (can run alongside them if you prefer) |
| 6. Atmosphere and final pass | Light shafts, fog and camera polish, final performance pass, full screenshot set, final review | Last |

Every phase keeps the original guarantees:
- all tests green
- the optimised startup (shaders precompiled, no recompiles on quality changes)
- the 2D fallback and accessibility unchanged unless a phase improves them
- v1 untouched until the v2 look is approved and the flag is retired
- the **45 fps steady-state baseline** (author-measured, Phase 0 build): no phase may regress it measurably, and any spending goes through the budget above

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

### Phases 1–4 (original scoping, superseded by revision 2)

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
