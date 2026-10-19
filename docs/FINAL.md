# NULLSPACE: final report

**Live:** https://nullspace-saemmi-studios.vercel.app. The finished experience is the default; `?visual=v1` shows the original look.

**Status:** finished and deployed for **your final personal playthrough**. Final user acceptance is yours; it isn't marked complete here.

## The finished experience

- **The world:** five floating white-concrete islands in a black void, joined by ribbed walkways. Each island is built from your CV:
  - **Education:** the archive ziggurat.
  - **Experience:** a corridor of gates, Medrick to ARVO.
  - **Projects:** a sunken atrium under a floating ring, with an honours wall.
  - **Skills:** the Data City.
  - **Contact:** the Signal Tower.
- **Characters:**
  - **The wanderer:** your approved faceless hooded figure.
  - **The kokedama:** the approved guide. It leads the tour, reacts to discoveries, and tells its origin story at the XR Meditation System.
- **Camera (rebuilt in this pass):**
  - **Look:** drag to orbit and tilt, with low tilts lifting the view so the tops of tall and floating structures come into frame. Keyboard: J/L turn, I/K tilt.
  - **Zoom and recenter:** wheel, pinch or +/− to zoom; C eases the camera back behind you.
  - **Movement:** stays WASD/arrows, relative to wherever the camera faces.
  - **Comfort:** auto-follow waits while you look around; anything blocking the view fades; the camera never dips under the ground.
  - **Discoverability:** a controls card appears on entering, and the top bar's Controls button reopens it.
- **Recruiter path:** the 2D portfolio opens with an at-a-glance summary built from the CV:
  - your most recent role, degree, location and availability
  - every contact link, including the dialable phone number
  - jump links to each section
- **Content:** every fact comes from the CV content; nothing is shown as a placeholder.
  - Rechecked against the private sources, which are never published.
  - Unknown details are now omitted rather than labelled "pending" or "in documentation": the AI Avatars tech stack, a Medrick gameplay video, and the WasteGo year.
- **Sound:** optional, synthesized in the browser with no audio files.
  - What plays: a quiet ambience, a wordless chirp when the kokedama speaks, a chime on discoveries, and a tick when a panel opens.
  - Off by default; a top-bar toggle and a volume slider control it.
  - No voice, and no imitation of any person.
- **Quality:**
  - **Auto (default):** picks a conservative level for each device. Software rendering and small touch devices start Low; integrated or mobile GPUs, or few cores or little memory, start Medium.
  - **High, Medium, Low:** explicit choices that adapt downward if the frame rate drops, never above the choice. No level change ever compiles a shader.

## Tests (final run)

| Suite | Result |
|---|---|
| Unit and component (Vitest) | 297/297 |
| End-to-end (Playwright, desktop and touch projects) | 60/60, plus manual specs (screenshots, profiling) skipped by design |
| Accessibility (axe, WCAG 2.1 A/AA) | No violations: entry page, 2D portfolio (desktop and mobile), world HUD, Settings and a project panel |
| Lint, typecheck, production build | Clean, apart from a few warnings, none new in this pass. Bundle: 88 KB gzipped initial, 321 KB gzipped 3D chunk (loaded on demand; budget 900 KB) |

The new end-to-end coverage includes:
- **Camera:** mouse, keyboard and touch orbit, tilt and zoom; recentering; camera-relative walking.
- **Quality:** Auto as the default; the pixel-ratio cap on 1× and 2× screens; no shader compiles when stepping High → Medium → Low.
- **Sound:** the toggle.
- **Content:** no placeholders in the portfolio; the phone link on desktop and mobile.
- **Story:** the moment waits for the panel, plays once and keeps your wording.
- **Discovery:** discovery on every island.
- **Shaders:** no late shader compiles when any island comes into view.

## Performance

**These are lab numbers.** The deciding measurement is yours (`?debug`), against your last baseline of about 40 fps at startup and 45 fps steady.

- **The biggest win, likely for your screen:** the 3D view used to render at 1.5× the CSS pixels on every screen. A standard 1× display therefore drew 2.25 times more pixels than it can show. It's now capped at the screen's own ratio.
- **Slow software renderer, 1280×720, quality locked to High, before → after:**

  | View | Before (ms) | After (ms) |
  |---|---|---|
  | Spawn | ≈ 104–110 | 54 |
  | Island close-ups | 62–100 | 36–53 |

- **Real GPU (RTX 4060 Ti):**
  - every view takes 0.5–0.8 ms per frame uncapped
  - 60 fps from the first frame of the startup walk
  - one 63 ms first frame
  - all 27 shader programs compiled behind the loading screen, none afterwards
- **Slow software renderer, startup walk:** Auto detects it and starts at Low, so there's no slow stepping-down phase. The first five seconds went from a 4 fps median to 12 fps.
- **Draw calls and triangles:** at most 61 draw calls and 38.5k triangles in any measured view (budget 80 and 150k).

## Known limitations

- **No walking on touch screens.** Walking in 3D needs a keyboard. On touch, you can look around (drag, pinch) and travel between islands with Sections → Guide me there; the 2D portfolio has everything.
- **Architecture is walk-through.** It has no collision, as on every island since the start.
- **Medium and Low don't change much on software rendering.** They mostly save pixel-ratio and per-pixel detail, which matters on real GPUs. The software renderer evaluates the skipped detail anyway.
- **Approximate hardware detection.** Auto uses the GPU name, CPU cores, memory and touch. Some browsers hide the GPU name, in which case it falls back to the other hints. You can always pick a level in Settings.
- **Sound starts off,** so most visitors won't hear it unless they switch it on. That's deliberate: no autoplay, and it's optional.

## Needs your attention

1. **Your playthrough and a `?debug` fps reading** on your machine. Please compare it with your 40/45 fps baseline, especially at spawn and the Projects and Skills close-ups (the heaviest views).
2. **Confirm or supply these details if you want them shown.** They're currently omitted:
   - the LLM-Driven AI Avatars tech stack
   - a public gameplay video or store links for the Medrick games
   - the WasteGo year
3. **The LinkedIn post linked from your CV.** One CV links a LinkedIn post (activity 7403535427263127552) and ARVO's company page. I couldn't verify the post's contents without signing in, so neither is used. Tell me if one belongs to a specific project or honour.
