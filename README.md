# NULLSPACE

Damon Mehrpour's portfolio as a surreal 3D journey: a hooded wanderer crosses five floating white-concrete islands in a black void, guided by a living moss ball (the kokedama). Each island is one part of the CV. A plain, accessible 2D portfolio carries exactly the same content for anyone who'd rather read.

**Live:** https://nullspace-saemmi-studios.vercel.app (`?visual=v1` shows the original look; `?debug` adds an fps overlay)

## The experience

| Island | What it is |
|---|---|
| Education & Research | An archive ziggurat: a stair carved into a monolith, with archive slabs that slide out |
| Experience | A corridor of monumental gates, one per career chapter in time order, engraved with role and dates |
| Projects | A sunken atrium under a floating ring, with threads of light to the three projects and an honours wall |
| Skills | The Data City: one district per skill group, one building per skill, each labelled with the skill |
| Contact | The Signal Tower: one transmitter stone per contact channel, wired to a beaconed dish |

**Controls:**
- **Move:** WASD or the arrow keys.
- **Look around:** drag with the mouse (or one finger), or J/L to turn and I/K to tilt.
- **Zoom:** mouse wheel, pinch, or +/−.
- **Recenter the camera:** C.
- **Interact:** E, Enter or click.
- **Close panels:** Esc.

**Settings:** quality (Auto, High, Medium, Low), reduced motion, subtitles and typing, camera sensitivity and inverted tilt, and optional sound with a volume control. Sound is synthesized in the browser and off by default.

## Development

```bash
npm install
npm run dev
```

- Tests: `npx vitest run` (unit and component) and `npx playwright test` (end-to-end, including accessibility).
- Live smoke tests: `BASE_URL=https://nullspace-saemmi-studios.vercel.app npm run test:smoke`.
- Profiling and screenshots: see `docs/profiling.md` and the `*Shots`, `profile`, `startup` and `ablation` specs in `tests/e2e/`. They're skipped unless their environment variables are set.
- Content lives in `src/content/cv.ts`. Unknown facts are omitted, never shown as placeholders. The private source CVs are git-ignored and never published.

Final report: `docs/FINAL.md`. History: the design and plan in `docs/superpowers/`, and the Visual Rebirth phases in `docs/visual-*`.
