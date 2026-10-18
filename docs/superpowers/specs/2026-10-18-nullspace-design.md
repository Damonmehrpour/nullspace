# NULLSPACE — Design Specification

- **Date:** 2026-10-18
- **Status:** Draft for final review (all sections approved in brainstorming)
- **Context:** 24-hour AI development challenge
- **Owner:** the portfolio author (game/VR developer)

---

## 1. Purpose and intent

NULLSPACE is a playable, guided journey through the author's CV. A visitor enters a minimalist black void with floating white brutalist architecture. A floating kokedama (Japanese moss-ball plant) becomes their guide and leads them across a ring of five islands. Each island reveals one part of the CV: Education, Experience, Projects, Skills, Contact.

**Audience:** recruiters and studios hiring a game/VR developer.

**Success means:**

- It feels like a small, polished game, not a 3D slideshow.
- A recruiter can reach contact information and résumé status in at most 2 clicks without playing.
- The kokedama's guidance (lead, wait, greet, arrive) works reliably and has personality.
- Nothing in the content is invented. Unknown facts are visibly labeled as pending.
- A working public deployment exists from early in development to final delivery.

**Inspiration (not content):** the kokedama is an original character inspired by the floating kokedama guide in the XR Meditation System the author developed with their team at the University of Oulu's OASIS department. No asset from that project is used.

**Tone:** mysterious, cinematic, quiet, with occasional dry or sarcastic humor. Silence is part of the atmosphere.

---

## 2. Scope summary

### 2.1 MVP (must ship)

- Short skippable boot sequence → entry choice (**ENTER SIMULATION** / **VIEW PORTFOLIO**).
- Always-visible top bar with quick navigation, Résumé and Contact.
- One data-driven content system and one panel system for all five sections and three projects, with per-field status labeling.
- **View Portfolio** (2D) mode: complete and usable on its own, mobile-friendly, and loads no 3D code.
- 3D world: central monolith, bridge, five architecturally distinct islands and connecting walkways, all derived from one layout definition.
- Third-person player with WASD/arrow movement, walkable-area clamping (no falling) and a stable follow camera.
- Kokedama guide v1: procedural moss ball, with behaviors lead, wait (beckon), present (wait at destination), greet and arrive. Includes a spore trail and an off-screen indicator.
- Tour with player-driven arrival zones, free exploration and revisits.
- First-visit architectural reveals (≤ 2 s). Revisits and quick-nav open panels instantly.
- Three distinct project artifacts on the Projects island, each opening its own detail view.
- Dialogue director with editable lines, cooldowns and silence. Terminal-style subtitles.
- Accessibility: focus management, inert background, safe shortcuts, reduced motion, screen-reader guidance independent of subtitles.
- Quality setting (High/Low) and error fallbacks to View Portfolio.
- Automated tests (unit, component, end-to-end) and a public static deployment kept working throughout.

### 2.2 Stretch (in priority order)

1. Post-processing: selective bloom, vignette, film grain.
2. Kokedama detail: fresnel fuzz, twine band, extra spores.
3. Ambient audio and kokedama chirps (muted by default, with a toggle).
4. Longer optional cinematic boot sequence.
5. Touch-to-move in the 3D world.
6. Physics toy on the Skills island (Rapier, lazy-loaded only there).
7. Opt-in preloading of the 3D chunk (only if measured load time justifies it).

### 2.3 Never cut (protected core)

Kokedama guidance (lead, wait/beckon, present, greet, arrive), free exploration, destination revisits, quick navigation, View Portfolio, honest status labels, accessibility basics, and a working deployment.

### 2.4 Cut order if behind schedule (cut first → last)

1. Post-processing.
2. Extra particles beyond the basic trail.
3. Decorative animations (leaf sway, idle flourishes, artifact-specific idle motion).
4. Kokedama shader detail (fuzz, twine).
5. Distinct per-island reveals → one shared simple reveal style (slabs rise and light sweeps).
6. Off-route handling simplified: arrival zones still work on every island at any time (free visits are preserved). Only the guide's dynamic re-routing is reduced to "after a panel closes, route to the next island not yet in `worldVisited` from the nearest node".

---

## 3. Technology

| Concern | Choice |
|---|---|
| Build | Vite 8.x |
| UI | React 19.x |
| Language | **TypeScript `~5.9.3`** (stable; TypeScript 7 native compiler deliberately not used). Vite strips types; `tsc --noEmit` for type checks |
| 3D | three 0.186.x, @react-three/fiber 9.x, @react-three/drei 10.x |
| Post FX (stretch) | @react-three/postprocessing 3.x |
| State | Zustand 5.x |
| Styling | Tailwind CSS 4.x via `@tailwindcss/vite` |
| Unit/component tests | Vitest 5.x, Testing Library |
| End-to-end tests | Playwright 1.6x |
| Physics | **None in MVP.** Kinematic movement and walkable clamping. Rapier only for stretch item 6 |
| Hosting | Static hosting. **Provider is the author's choice** (Vercel, Netlify or GitHub Pages) and must be decided before M1 ends. The build is a plain static `dist/` |

Versions were checked against npm on 2026-10-18. Exact minor versions are pinned at scaffold time, and compatibility is verified then. Library APIs are checked against official documentation (Context7 if authorized, otherwise official docs via the web).

---

## 4. Architecture (Approach 1: single React app, pure-TS game core, no physics engine)

### 4.1 Principles

- **One-way data flow:** input → pure-TS core modules → Zustand store → R3F scene and React DOM UI render from the store. The UI never reaches into the scene, and the scene never builds UI text.
- **Pure core:** gameplay logic (routing, guide brain, tour, dialogue, walkable area) has no React or three.js dependency, so it can be unit-tested in Node.
- **One layout source:** islands, walkways, bridge, spawn, arrival zones, artifact slots, the walkable area and the waypoint graph all derive from `content/world.ts`.
- **One content source:** all CV data lives in `content/cv.ts`, and all dialogue in `content/dialogue.ts`. Replacing content never requires touching the 3D environment.
- **One entry point to content:** `openSection(id, { source })` and `openProject(id, { source })`, where `source` is `'arrival' | 'quicknav' | 'portfolio' | 'artifact'`.

### 4.2 Project structure

```
src/
  main.tsx, App.tsx            app shell, phase routing (boot → entry → world | portfolio)
  content/
    cv.ts                      CV sections + projects (typed, per-field status)
    schema.ts                  types + validateContent()
    dialogue.ts                event → line pools, cooldowns, probabilities
    world.ts                   world layout definition (single source of truth)
  core/                        pure TypeScript, unit-tested, no React/three imports
    geometry.ts                2D vector + shape helpers (XZ plane)
    walkable.ts                build walkable area from world.ts; clamp(); contains()
    routeGraph.ts              build graph from world.ts; nearestNode(); shortestPath() (BFS)
    validateWorld.ts           layout integrity checks
    guideBrain.ts              guide state machine → GuidePose
    tour.ts                    visit order, worldVisited set, next target, completion
    dialogueDirector.ts        event → line selection, cooldowns, global silence gap
    config.ts                  all tunable numbers (speeds, thresholds, timings)
  state/
    store.ts                   Zustand: phase, activeSection/project, viewed, worldVisited, tourTarget, settings
    settings.ts                persisted settings (localStorage wrapped in try/catch)
  ui/
    TopBar.tsx, QuickNav.tsx   always-visible navigation
    Panel/                     Panel shell (dialog, focus, inert) + per-section views + ProjectDetail
    Boot.tsx, Entry.tsx        boot sequence, entry choice
    Subtitles.tsx              typed subtitle line + aria-live
    A11yStatus.tsx             visually hidden navigation announcements
    Settings.tsx               typing, reduced motion, subtitles, quality
    StatusBadge.tsx            IN DOCUMENTATION / AWAITING DATA / PLACEHOLDER / [pending]
    Loading3D.tsx, ErrorFallback.tsx
  portfolio/
    Portfolio.tsx              2D View Portfolio mode (static hero + same Panel views inline)
  world/                       lazy-loaded chunk (React.lazy), the only code importing three
    WorldRoot.tsx              Canvas, error boundary, PerformanceMonitor, game loop
    Player.tsx, FollowCamera.tsx
    guide/GuideBody.tsx        procedural kokedama (consumes GuidePose)
    guide/Trail.tsx, OffscreenArrow.tsx
    islands/Monolith.tsx, Bridge.tsx, Walkways.tsx, Education.tsx, Experience.tsx,
            Projects.tsx, Skills.tsx, Contact.tsx
    artifacts/Featured.tsx, Technical.tsx, Experimental.tsx
    reveals/                   reveal timelines per island (+ shared fallback reveal)
    testHooks.ts               window.__nullspace (test builds only)
tests/
  unit/                        Vitest: core/*, content schema
  component/                   Vitest + Testing Library: Panel, TopBar, shortcuts
  e2e/                         Playwright specs
docs/superpowers/specs/        this document
```

### 4.3 State (Zustand store)

- `phase`: `'boot' | 'entry' | 'loading3d' | 'world' | 'portfolio'`
- `panel`: `null | { kind: 'section', id } | { kind: 'project', id }`, plus `returnFocusTo` (an element reference held outside the store)
- `viewed`: set of section ids whose content has been opened from **any** source (portfolio, quick-nav, arrival). Purely informational (a "read" mark in the UI). **Never affects the tour.**
- `worldVisited`: set of section ids whose **arrival zone the player has physically entered** in 3D. This alone drives the tour, the tour target and tour completion.
- `tourTarget`: section id or `null`
- `revealPlayed`: set of section ids (set on the first in-world arrival; in practice the same set as `worldVisited`, kept explicit for reveal logic)
- `settings`: `{ typing: boolean, reducedMotion: 'system' | 'on' | 'off', subtitles: boolean, quality: 'high' | 'low' }`
- `mode preference`: last entry choice (`'world' | 'portfolio'`), persisted

Gameplay is paused whenever `panel !== null`: input is ignored and the player and guide freeze. The scene keeps rendering.

---

## 5. World layout (`content/world.ts`)

### 5.1 Definition

Coordinates are on the XZ ground plane, in metres. The layout declares:

- `spawn`: the player's start position and facing, on the monolith plinth.
- `monolith`: centre and footprint.
- `islands[]`: one per section (`education`, `experience`, `projects`, `skills`, `contact`), each with `centre`, `footprint` (polygon or circle), `arrivalPoint`, `arrivalZoneRadius` (default 1.25 m, i.e. about 2.5 m across), `titleAnchor` and, for Projects, `artifactSlots[3]`.
- `walkways[]`: polylines with a width, connecting adjacent islands around the ring (5 walkways forming a closed loop).
- `bridge`: one polyline with a width, from the monolith to a ring entry node between Contact and Education.
- `tourOrder`: `['education', 'experience', 'projects', 'skills', 'contact']`.

Islands sit in a loose circle around the monolith. The ring is compact, so all islands can be seen from anywhere.

### 5.2 Derived systems

- **Walkable area** (`walkable.ts`): the union of the monolith plinth, island footprints, walkway strips and bridge strip. `clamp(prev, next)` returns the closest walkable point to `next`, so the player slides along edges. This doubles as the invisible boundary.
- **Waypoint graph** (`routeGraph.ts`): nodes at the spawn, bridge ends, ring entry, the ends and midpoint of each walkway, and each island's arrival point. Edges follow walkways, the bridge, and paths within an island (about 15–20 nodes). `shortestPath(from, to)` is BFS over the edges, weighted by length if needed. `nearestNode(pos)` snaps any position onto the graph.
- **Scene geometry:** island meshes, walkway and bridge meshes and title anchors are positioned from the same data.

### 5.3 Validation (`validateWorld()`)

Runs in unit tests, in `npm run build` (prebuild script), and at dev startup (dev overlay on failure). It fails if:

- any graph node is outside the walkable area;
- any graph edge leaves the walkable area (sampled every 0.25 m);
- any island's arrival point is unreachable from the spawn node, or from any other node;
- any arrival zone is not fully inside its island's walkable footprint;
- any section in `cv.ts` lacks an island, or the Projects island lacks exactly 3 artifact slots;
- any artifact slot is outside its island's footprint.

---

## 6. Gameplay systems

All numeric values live in `core/config.ts` for tuning.

### 6.1 Player

- A small abstract silhouette: a capsule about 0.5 m tall, with a soft white rim light.
- WASD and arrow keys, relative to the camera. Speed 4 m/s, with acceleration and deceleration easing over about 0.15 s. No jump or sprint.
- Each frame the position goes through `walkable.clamp()`.
- Pushing against an edge for ≥ 0.6 s emits a `boundary` dialogue event, subject to cooldown.
- Interact: **E** or **Enter** when within 1.5 m of an artifact, or a mouse click or tap on the artifact.

### 6.2 Follow camera (stability first)

- It sits behind and above the player (about 6 m back, 3.5 m up), smoothed with critically damped springs.
- **The player is always the primary framing target.**
- **Guide bias:** the aim point is pulled toward the guide by at most 15%. The bias is off when the guide is more than 10 m away; the off-screen arrow covers that case.
- **Auto-turn:** rotates toward the direction of travel at most about 60°/s, only after ≥ 0.4 s of steady movement, and ignores reversals shorter than 0.3 s.
- **Pull-back:** at most +1.5 m when the guide is far away, eased.
- **Collision:** a short raycast against island and bridge meshes keeps the camera out of geometry.
- No mouse-look in the MVP.
- **Reveals:** a short scripted camera move, then smooth hand-back. Reduced motion skips the scripted move.
- **Test cases (manual checklist):** tight U-turns; walking the bridge; running away from the guide; quick-nav "Guide me there" causing an instant re-route.

### 6.3 Kokedama guide

The guide is split into two parts so the visual body can be replaced:

- **`GuideBrain`** (pure TS): the state machine, waypoint following, distance checks and reaction triggers. Each frame it outputs `GuidePose = { position, facing, state, squash, glow, beckon, speakPulse }`.
- **`GuideBody`** (R3F): consumes `GuidePose` only. The MVP body is procedural. An authorized glTF of the original XR guide could be added later as another body with the same interface, without changing the brain, routing or tour.

**States** (distances are measured to the player):

| State | Entered when | Behavior |
|---|---|---|
| `idle` | No tour target (tour finished, or none set) | Floats about 2 m to one side of the player |
| `lead` | Tour target set and player within 5 m | Follows the route 2–3 m ahead of the player; speed matches the player, capped slightly above |
| `wait` | Player more than 7 m behind while leading | Stops, turns toward the player, beckon loop, spores emitted along the route. `wait` dialogue after 4 s (cooldown) |
| `greet` | Player comes within 1.5 m after a `wait`, or at the first meeting | One-shot hop and spin (about 0.5 s), then back to `lead` |
| `present` | Guide reaches the target island's arrival point | Hovers at the arrival point, turns to face the player, beckons. **No timeout. Does not open the panel** |
| `arrive` (reaction) | **The player enters the arrival zone** | One-shot hop and spin (about 0.5 s), played at the same moment as the island reveal starts |

- The 5 m (resume lead) and 7 m (start wait) thresholds leave a gap so the guide doesn't flicker between states.
- **First meeting:** the kokedama emerges from the monolith's light slit, greets the player, and leads them to the bridge.
- **Off-graph recovery:** if the guide is ever more than 1 m from its route (e.g. after a re-route), it snaps to `nearestNode` and replans.
- **Re-routing:** setting a new `tourTarget` (via the tour or quick-nav "Guide me there") replans from the guide's nearest node.

### 6.4 Tour and arrival

- The tour target is the first island in `tourOrder` that is not in `worldVisited`.
- **Content viewed ≠ destination visited.** Reading a section in View Portfolio or via quick-nav **Open** adds it to `viewed` only. It never advances or completes the tour. A visitor who reads the whole CV first can then enter 3D and get the full guided journey from the beginning.
- **Arrival is player-driven.** Entering any island's arrival zone (whether following the guide or exploring freely) triggers:
  - if that island's reveal has not played yet (`revealPlayed`): the island reveal (≤ 2 s), then `openSection(id, { source: 'arrival' })`;
  - otherwise: the panel opens instantly (no reveal, or a reveal of ≤ 0.3 s).
- Entering an arrival zone adds the island to `worldVisited` (and `revealPlayed`), and opening its panel adds it to `viewed`. A section first read via quick-nav or View Portfolio still gets its full first-visit reveal on the first in-world arrival.
- After the panel closes, the tour target becomes the next island not in `worldVisited`, and the guide leads there.
- Visiting islands out of order is allowed. Those islands count as world-visited and the guide quietly re-routes.
- **The tour completes only when all five arrival zones are in `worldVisited`.** The guide then switches to `idle` and says a closing line. Free exploration and revisits continue.
- **Quick-nav "Guide me there"** sets the tour target to that island. On touch devices it teleports the player into the arrival zone (8.1). That counts as a world visit, because the arrival path really runs in the world.
- Re-entering a zone after closing its panel does not reopen the panel until the player has left the zone (hysteresis).
- **Projects island:** arrival opens the Projects section panel, which lists all three projects. Each artifact also opens its own project detail directly via interaction (`openProject(id, { source: 'artifact' })`).

### 6.5 Dialogue director

- Gameplay emits events: `firstMeet`, `greet`, `wait`, `boundary`, `idle`, `arrive:<section>`, `revisit:<section>`, `tourComplete`, `skipTour` (quick-nav used before the tour is finished).
- `content/dialogue.ts` maps each event to a pool of lines with `cooldownMs`, `probability` and an optional `once` flag.
- A global minimum silence gap (default 8 s) applies between any two lines, and lines are never queued (if one can't play, it's dropped).
- Random selection uses an injectable seeded random generator so it can be tested.
- Every spoken line sends a `speakPulse` to the guide pose (bounce, tilt or glow).
- Lines are short flavor text drafted for the author to edit. They never state professional facts.

---

## 7. Content system (`content/cv.ts`, `content/schema.ts`)

### 7.1 Schema

```ts
type Field<T> = { state: 'confirmed'; value: T } | { state: 'pending'; note?: string };
type ItemStatus = 'real' | 'partial' | 'pending-content' | 'placeholder';

type Media = { kind: 'image' | 'video' | 'youtube'; src: Field<string>; alt: string; caption?: string };
type Link  = { kind: 'github' | 'demo' | 'store' | 'external'; label: string; url: Field<string> };

type Project = {
  id: 'project-01' | 'project-02' | 'project-03';
  status: ItemStatus;
  name: Field<string>;
  context?: Field<string>;
  summary: Field<string>;
  role: Field<string>;
  tech: Field<string[]>;
  media: Media[];
  links: Link[];
  appearance: 'featured' | 'technical' | 'experimental';
};

type Section =
  | { id: 'education';  status: ItemStatus; title: string;
      entries: { institution: Field<string>; degree: Field<string>; dates: Field<string>; notes?: Field<string> }[] }
  | { id: 'experience'; status: ItemStatus; title: string;
      entries: { org: Field<string>; role: Field<string>; dates: Field<string>; highlights: Field<string[]> }[] }
  | { id: 'projects';   status: ItemStatus; title: string; projects: [Project, Project, Project] }
  | { id: 'skills';     status: ItemStatus; title: string; groups: { label: string; items: Field<string[]> }[] }
  | { id: 'contact';    status: ItemStatus; title: string;
      channels: { kind: 'email' | 'linkedin' | 'github' | 'website' | 'other'; label: string; value: Field<string>; url?: Field<string> }[];
      resumePdf: Field<string> };
```

### 7.2 Status meaning and labeling

| Status | Meaning | Badge |
|---|---|---|
| `real` | All required fields confirmed | none |
| `partial` | Real item, some fields pending | **IN DOCUMENTATION**, and each pending field shows **[pending]** |
| `pending-content` | Real slot, no details provided yet | **AWAITING DATA** |
| `placeholder` | Clearly fictional sample content | **PLACEHOLDER** |

Badges appear in the panel, quick nav, View Portfolio and the in-world labels.

### 7.3 Initial content (MVP launch state)

- **Project 01 (featured), `partial`:**
  - name: *XR Meditation System* (confirmed)
  - context: *Developed with a team at the University of Oulu, OASIS department* (confirmed)
  - summary, role/individual contribution, tech: pending
  - media: one YouTube entry with `src` pending ("video coming soon"; no fake embed)
- **Project 02 (technical), `pending-content`:** all fields pending.
- **Project 03 (experimental), `placeholder`:** clearly fictional sample content, badged PLACEHOLDER everywhere.
- **Education, Experience, Skills, Contact:** `pending-content` until the author provides details. `resumePdf` is pending.
- No professional facts, media, links or contact details are invented.

### 7.4 Content validation (`validateContent()`, prebuild and unit tests)

The build fails if:

- a `confirmed` field is empty;
- an item marked `real` contains any pending field;
- any media lacks alt text;
- an item marked `pending-content` contains any confirmed field;
- placeholder sample text is mislabeled. Placeholder items store their fictional sample text as `confirmed` fields, and every such text value must begin with the marker `Sample —`. Conversely, no `real` or `partial` item may contain that marker. This keeps fictional text from leaking into real items, and vice versa;
- a confirmed URL is not `https:`, or not a `mailto:` for email channels;
- section ids don't match `world.ts` islands.

---

## 8. UI and interaction

### 8.1 Boot sequence and entry

- **Boot:** about 2.5 s of terminal lines with light dry humor (e.g. `> calibrating void... adequate`), then the NULLSPACE wordmark.
  - A visible **Skip** button from the first frame; any key or click also skips.
  - Skipped automatically on return visits (`localStorage`, try/catch).
  - The longer cinematic version is stretch item 4.
- **Entry screen:** **ENTER SIMULATION** and **VIEW PORTFOLIO**.
  - Only simple hints, no device fingerprinting:
    - **Touch-first** (`(pointer: coarse)` and `(hover: none)`) or a narrow screen (< 768 px): View Portfolio becomes the primary, recommended button. A clear note sits under ENTER SIMULATION **before** anything loads: "3D walking needs a keyboard in this version. View Portfolio has everything." Enter stays allowed.
    - Without WebGL2: Enter is disabled with an explanation.
    - The note is part of the button's accessible description (`aria-describedby`).
  - The choice is remembered and can be switched at any time from the top bar.
  - The top bar (Projects, Résumé, Contact) is already usable on this screen.
- **First 3D entry:** a controls hint: `WASD / arrows · move` `E / click · interact` `Esc · close`.
- **Touch devices in 3D (MVP):** entering is allowed, but there is no touch movement in the MVP (touch-to-move is stretch item 5). On a coarse-pointer device without a keyboard, the controls hint says so honestly: "Walking needs a keyboard here, for now. Tap ☰ to travel." Quick-nav **Open** works. **Guide me there** teleports the player to the island's arrival zone on touch devices (a cheap fallback reusing the arrival path), so the reveal and the guide's `arrive` reaction still play. View Portfolio stays the highlighted suggestion.

### 8.2 Loading the 3D world

- No 3D code downloads during boot, on the entry screen or in View Portfolio.
- Clicking **ENTER SIMULATION** triggers `React.lazy` loading of `world/`. A loading screen shows progress (`> materializing void... 63%`) and a **View Portfolio instead** link.
- Preloading is off (stretch item 7, opt-in only if justified by measurements).

### 8.3 Top bar and quick navigation

- Always visible and keyboard-reachable in every phase after boot: `NULLSPACE` · Projects · Résumé · Contact · ☰ Sections · ⚙ Settings · **Exit to Portfolio / Enter 3D**.
- ☰ Sections lists all five sections, each with a status badge and two separate marks: **read** (in `viewed`) and, in 3D, **reached** (in `worldVisited`). Each has **Open** and, in 3D, **Guide me there**. In 3D it also shows the next tour destination and tour progress (`reached 2/5`).
- **Résumé:** if `resumePdf` is confirmed, a direct **Download résumé (PDF)** link; otherwise a disabled item labeled **Résumé: coming soon**.
- **Contact:** opens the Contact panel directly. It never requires the tour.
- Quick-nav **Open** always opens instantly, with no reveal or cinematic wait. If that island's reveal hasn't played yet, it stays available for the player's first in-world arrival.
- Keyboard shortcuts: `1`–`5` open sections; `Esc` closes the panel.

### 8.4 Panel

- One `Panel` component: a right-side drawer, full screen below 768 px.
- Section views per section; a `ProjectDetail` view with a gallery, videos and links. A project opened from the Projects list or an artifact uses the same view.
- YouTube embeds use click-to-load (privacy and performance).
- Media that fails to load shows "media unavailable" plus its alt text.
- In View Portfolio, the same section views render inline in a scrolling page. Project details still open in the Panel.

### 8.5 Accessibility and keyboard safety

- **Panel as dialog:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to its heading.
  - On open: focus moves to the heading (`tabIndex=-1`).
  - Tab and Shift+Tab are trapped inside the panel; Esc and the close button close it.
  - On close: focus returns to the element that opened it (the quick-nav item or artifact trigger), or to the canvas container for in-world arrivals.
- **Inert background:** while the panel is open, the canvas, top bar and subtitles get the `inert` attribute.
- **Shortcut safety:** global shortcuts (1–5, WASD/arrows, E) are ignored when the event target is an `input`, `textarea`, `select` or `[contenteditable]`, or when any dialog is open. Inside the panel only Esc is handled.
- **Guidance without subtitles:** `A11yStatus` (visually hidden, `aria-live="polite"`) announces navigation facts such as "Next destination: Education. Follow the guide or press 1 to open." The ☰ menu shows the next destination visually. Disabling subtitles removes only flavor text.
- **Reduced motion:** follows `prefers-reduced-motion` by default, with an override in settings. It means no typing effect, reveals shortened to ≤ 0.3 s or replaced with a fade, scripted camera moves skipped, and guide bob and squash reduced.
- **Text:** high-contrast subtitle and panel text, with a minimum size of 16 px.

### 8.6 Subtitles

- One line at a time. Monospace, a moss-green `KOKEDAMA ›` tag, typed at about 40 characters per second.
- Shown for 2.5 s + 40 ms per character, then fade out. Clicking the subtitle or pressing **Space** finishes the line instantly (handled only when focus isn't inside an input or dialog). Enter and E are reserved for artifact interaction (6.1), so the keys never conflict.
- Position: bottom centre above the safe area, never overlapping the top bar or panel. While the panel is open on wide screens, the subtitle moves to the left of the panel; on narrow screens it's held until the panel closes, or dropped if its moment has passed.
- The full line is written to an `aria-live="polite"` region at once (not typed character by character).
- Settings: typing on/off, subtitles on/off.

---

## 9. World and visuals

### 9.1 Direction and priorities

- Black void; white to pale-grey matte materials with subtle procedural noise only; the kokedama and its spores in moss green (around `#6fae3c`) are the only saturated colour.
- **Build order:** silhouettes, composition and lighting first. Effects are optional polish.
- **Lighting:** one cool key light, a dim hemisphere fill, a static contact shadow under each island. No real-time shadow maps.
- **Fog** (exponential): creates atmosphere, but from anywhere on the ring the next destination and the current walkway stay clearly readable. Only the far side and the void beyond fade. The trail, off-screen arrow and arrival-zone ring are drawn without fog. Verified with screenshots from the spawn and every walkway midpoint.

### 9.2 Architecture (six structures, each with a distinct silhouette)

| Structure | Form | First-visit reveal (≤ 2 s) |
|---|---|---|
| Monolith (spawn) | Tall slab hovering a little above a plinth, with a thin slit of light | The kokedama emerges from the slit (first meeting) |
| Education | Stepped terraces / ziggurat of stacked slabs | Slabs slide out like drawers in sequence |
| Experience | Corridor of repeating portal frames (a physical timeline) | Frames light up in sequence |
| Projects | Broken courtyard with three plinths | Plinths rise; artifacts power on |
| Skills | Grid field of cubes at varied heights | Cubes rise in a wave |
| Contact | Antenna / transmission mast with a dish | A beam of light fires upward |

A shared simple reveal (slabs rise and light sweeps) exists as the fallback if per-island reveals are cut (cut-order item 5).

### 9.3 Project artifacts (visual themes only; no claims implied)

- **01 featured:** slow concentric rings around a soft light core.
- **02 technical:** a wireframe lattice cube that assembles when the player approaches.
- **03 experimental:** an unstable, glitching cluster of fragments, with a floating **[PLACEHOLDER]** tag.

Each artifact has a floating label showing its name, or its status for anything not confirmed, and a highlight ring when within interaction range. The artifact visual is chosen by `appearance`, so content changes never touch the scene.

### 9.4 Procedural kokedama (personality over shader complexity)

- **v1 (MVP, built first):** an icosphere (about 640 triangles) with noise-based vertex bumps and moss colour variation, plus 3–5 instanced small leaves on top. It must be recognizable as a moss ball.
- **Then:** movement, guidance and reactions driven by `GuidePose`:
  - idle bob (about 0.15 m sine)
  - turning toward the player
  - beckon
  - squash and stretch on hops
  - tilt into travel
  - glow pulse when speaking
  - a basic spore trail (shared instanced points)
- **Only after gameplay works (stretch item 2):** fresnel rim fuzz, twine band, leaf sway, extra spores.
- Target: ≤ 5 draw calls for the kokedama. All motion is reduced under reduced motion.

### 9.5 3D text and post-processing

- Drei `<Text>` only for island titles and artifact labels. All other text is HTML.
- Post-processing (stretch item 1): selective bloom (kokedama, spores, light slits, beams), light vignette, subtle grain. Always off on Low quality.

### 9.6 Performance (measurable targets, not goals in themselves)

- Target: smooth 60 fps at 1080p on integrated laptop graphics, under 120 draw calls and under 150k triangles, instancing for repeated elements, device pixel ratio capped at 1.5.
- Drei `PerformanceMonitor` lowers the pixel ratio, then switches to Low quality if frame rate stays low.
- **Bundles:** initial (boot, entry, View Portfolio) under 150 KB gzipped with no three.js; 3D chunk under 900 KB gzipped. No external 3D models; fonts self-hosted.
- **Process:** profile the production build on the author's available hardware at checkpoint C and in the final buffer. Fix only problems users can see or feel (stutter, slow loading, overheating). Don't spend time chasing numbers that cause no visible problem.

### 9.7 Audio

None in the MVP (stretch item 3).

---

## 10. Error handling

| Failure | Behavior |
|---|---|
| No WebGL2 | Enter disabled with "Your browser can't render the simulation"; View Portfolio works |
| 3D chunk fails to load | Loading screen shows **Retry** and **View Portfolio** |
| Runtime error in the 3D scene | Error boundary around the canvas: "The simulation collapsed. Typical." with **Retry** and **View Portfolio** |
| WebGL context lost | Pause; try to restore once; otherwise the error fallback above |
| Media fails to load | "media unavailable" plus alt text; links stay usable |
| `localStorage` unavailable | Silent defaults; the boot sequence just isn't auto-skipped |
| Invalid content or world layout | `npm run build` and `npm test` fail; dev overlay during development |

In every failure the top bar's Projects, Résumé and Contact keep working.

---

## 11. Testing

### 11.1 Unit (Vitest, written test-first for `core/` and `content/`)

- `routeGraph`: graph construction from `world.ts`, `nearestNode`, `shortestPath` between all pairs.
- `walkable.clamp`: interior points unchanged; edge sliding; corners; walkway-island joins; the bridge.
- `validateWorld`: passes on the real layout; fails on deliberately broken layouts (node outside walkable area, disconnected island, zone outside footprint, missing artifact slot).
- `guideBrain`: every transition in the state table; no flicker inside the 5–7 m gap; `present` never opens a panel; arrival fires only on player zone entry.
- `tour`: order, out-of-order visits, revisit behavior, zone hysteresis; completion only when all five zones are world-visited; `markViewed` (portfolio and quick-nav) never changes the tour target or completion.
- `dialogueDirector`: per-event cooldowns, global silence gap, `once`, probabilities with a seeded random generator, lines dropped rather than queued.
- `validateContent`: each rule in 7.4, using deliberately invalid fixtures.

### 11.2 Component (Vitest + Testing Library)

- Panel: focus moves to the heading on open, Tab is trapped, Esc closes, focus returns to the opener, background gets `inert`.
- Shortcuts: ignored in input fields and while a dialog is open.
- StatusBadge and pending fields render correctly for every `ItemStatus` and `Field` state.
- Résumé item: a link when confirmed, disabled "coming soon" when pending.

### 11.3 End-to-end (Playwright, against a production-mode build with the test flag, served by `vite preview`)

1. Boot can be skipped via the button and via a key; the entry choice appears; boot is auto-skipped on reload.
2. Recruiter path: from first load, Contact opens and the résumé state is visible within 2 clicks, without entering 3D.
3. View Portfolio: all five sections and three projects render with correct badges; **no three.js or 3D chunk request appears in the network log**; works at a 375 × 812 viewport.
4. Keyboard-only: Tab through the top bar, open and close each panel, focus returns correctly; number keys do nothing while the panel is open.
5. 3D: Enter shows the loading state, then the canvas renders; quick-nav Open shows the panel instantly.
6. Tour: using the test-only `window.__nullspace` hook (`teleportPlayer`, `getGuideState`, `getWorldVisited`, `getViewed`, `isTourComplete`), move the player to each arrival zone in order; check that the reveal and panel happen, the guide's state is `present` before player entry, `worldVisited` grows by one each time, and the tour completes only after the fifth zone.
7. Free visit: teleport into an out-of-order island zone; the panel opens, it's added to `worldVisited`, and the guide re-routes.
8. **Read first, then play:** in View Portfolio open all five sections, then Enter 3D. `getViewed()` has 5 entries, `getWorldVisited()` is empty, `isTourComplete()` is false, the guide leads to Education, and Education's first arrival plays its full reveal. Quick-nav **Open** in 3D likewise leaves `worldVisited` unchanged.
9. **Touch-first entry:** with a touch-device emulation (`hasTouch`, coarse pointer, 375 × 812), the entry screen shows View Portfolio as the primary button and the keyboard note under Enter is visible and part of the button's accessible description before any 3D request. With a desktop profile, the note is absent.
10. Reduced motion (emulated): no typing effect; reveals shortened.
11. Error path: simulate a 3D chunk load failure; Retry and View Portfolio appear and work.
12. Deployed smoke test: tests 1–3, 5 and 9 run against the public URL.

The `window.__nullspace` hook exists only when built with a test flag and is absent from the public production build. The deployed smoke test therefore skips hook-based tests.

### 11.4 Manual checklist

- Camera cases (6.2), fog readability screenshots (9.1), guide feel (leading distance, beckon readability), profiling passes (9.6), mobile View Portfolio on a real phone if available.

---

## 12. Milestones (24-hour targets with checkpoints)

Estimates are targets. Each milestone ends with the app working **and deployed**. After hour 21.5 no new features are started.

| Hours (target) | Milestone | Done when |
|---|---|---|
| 0–1 | **M0 Foundation:** scaffold (Vite 8, React 19, TS 5.9, Tailwind 4), lint, Vitest and Playwright setup, `schema.ts` + `validateContent` (test-first), `cv.ts` launch content, store | `npm test` and `npm run build` pass; content validates |
| 1–3.5 | **M1 Recruiter-first portfolio + first deploy:** boot (≤ 3 s, Skip), entry screen (Enter shows "coming online" until M2), top bar, Résumé/Contact, Panel with full focus and inert handling, all five section views, ProjectDetail, status badges, View Portfolio mode, touch-first entry note; **hosting set up and deployed** | **Checkpoint A:** the public URL is a usable, honest portfolio on desktop and phone; e2e tests 1–4 and 9 pass |
| 3.5–7 | **M2 World core:** `world.ts`, `walkable`, `routeGraph`, `validateWorld` (test-first), lazy `world/` chunk with loading and error states, greybox monolith, bridge, islands and walkways, player and follow camera | Walk the whole layout with no void falls; camera cases feel stable; deployed |
| 7–11 | **M3 Guide and tour (core):** `guideBrain` (test-first), kokedama v1 body, trail, off-screen arrow, tour, arrival zones, free visits, revisits, quick-nav Guide me there | **Checkpoint B:** following the guide reaches all 5 islands; wait, beckon, greet, present and arrive all work; deployed |
| 11–14 | **M4 Content in the world:** dialogue director and subtitles, `A11yStatus`, shared simple reveal, panels opening on arrival, three artifacts with interaction and ProjectDetail | Full core loop playable end to end; deployed |
| 14–17 | **M5 Place-making:** distinct island architecture and per-island reveals, lighting and fog pass, kokedama motion polish (squash, beckon, speak pulse), first profiling pass | **Checkpoint C:** the world reads as a mysterious place; no visible stutter; deployed |
| 17–20 | **M6 Hardening:** accessibility pass, reduced motion, settings, quality toggle and `PerformanceMonitor`, all error fallbacks, complete Playwright suite | All automated tests green; deployed |
| 20–21.5 | **M7 Polish (only if checkpoints met):** stretch items 1–2, dialogue writing pass | Deployed |
| 21.5–24 | **Protected buffer:** final production build, full test run, deployed smoke test, second profiling pass, fixes only | Acceptance criteria verified on the live URL |

**Checkpoint rules:**

- If checkpoint B slips past hour 13, apply cut-order items 1–4 immediately, and M5 uses the shared reveal (item 5).
- If checkpoint C slips past hour 18.5, skip M7 entirely.
- The protected buffer is never used for new features.

---

## 13. Acceptance criteria

1. From first load, a visitor opens Contact and sees the résumé status in at most 2 clicks and under 10 seconds, without entering 3D.
2. The boot sequence lasts ≤ 3 s, can be skipped from the first frame by button, key or click, and is skipped automatically on return visits.
3. View Portfolio shows all 5 sections and 3 projects with correct status badges, downloads no 3D code, and is usable at 375 px width.
3a. On touch-first devices, the entry screen recommends View Portfolio as the primary choice and states, before anything 3D loads, that 3D walking needs a keyboard in this version while View Portfolio works fully. Entering 3D is still allowed, and quick-nav "Guide me there" teleports the player into each arrival zone.
4. In 3D, the player can't leave the walkable area; `validateWorld()` passes, confirming every island is reachable from spawn and from every node.
5. The kokedama leads 2–3 m ahead, waits and beckons when the player is more than 7 m behind, greets when they return, and waits (`present`) at each destination without opening anything until the player enters the arrival zone.
6. Following the guide visits all 5 islands in tour order. Each first visit plays a reveal of ≤ 2 s followed by the panel. Revisits and quick-nav open the panel with no forced wait. Out-of-order free visits work. The tour completes only when the player has physically entered all five arrival zones.
6a. Content viewed and destinations visited are tracked separately. Reading sections in View Portfolio or via quick-nav **Open** never advances or completes the tour. A visitor who has read every section can still enter 3D and get the full guided journey, starting at Education, with every first-visit reveal intact.
7. The three artifacts look clearly different, and each opens its own project detail.
8. Every non-confirmed item and field carries its status label (IN DOCUMENTATION, AWAITING DATA, PLACEHOLDER, [pending]). No invented professional facts, media, links or contact details exist in the content.
9. Panels trap focus, make the background inert, close on Esc and restore focus. Shortcuts never fire in input fields or dialogs. Navigation guidance is still available to assistive technology with subtitles off.
10. Reduced motion (from the OS or the setting) removes typing and shortens or stills reveals, camera moves and guide motion.
11. Dialogue respects per-event cooldowns and the global silence gap; lines are dropped, not queued.
12. Every 3D failure mode leads to a working View Portfolio route, and top-bar access to Projects, Résumé and Contact keeps working.
13. The production build runs without visible stutter while walking the ring on the author's profiling hardware, at High or Low quality.
14. All unit, component and end-to-end tests pass. The public deployment has worked since checkpoint A and is verified again with the deployed smoke test before final delivery.

---

## 14. Open items (need the author's input; not blocking the plan)

- **Hosting provider** (Vercel, Netlify or GitHub Pages) and account access, needed by the end of M1. Claude will not create accounts.
- **CV content:** education, experience, skills, contact channels, résumé PDF.
- **Project 01:** YouTube URL, technologies, individual contribution, summary.
- **Project 02:** all details.
- **Dialogue:** Claude drafts flavor lines for the author to edit.
