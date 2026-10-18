# NULLSPACE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build NULLSPACE: a recruiter-first 2D portfolio plus a lazy-loaded third-person 3D world where a procedural kokedama guides the player across five CV islands, all driven by one content file and one layout file.

**Architecture:** Single Vite + React app. Gameplay logic lives in pure TypeScript modules under `src/core/` (no React or three imports) that are unit-tested in Node. A Zustand store is the single source of truth. React DOM renders all UI. A lazy `src/world/` chunk (the only code that imports three) renders the scene from `content/world.ts`.

**Tech Stack:** Vite 8, React 19, TypeScript ~5.9.3, three 0.186, @react-three/fiber 9, @react-three/drei 10, Zustand 5, Tailwind CSS 4 (`@tailwindcss/vite`), Vitest 5 + Testing Library + jsdom, Playwright 1.6x, tsx (scripts).

**Spec:** `docs/superpowers/specs/2026-10-18-nullspace-design.md`. Executors read the spec and this plan together. Section references like "spec 6.3" point into it.

## Global Constraints

- TypeScript pinned `~5.9.3`; no TypeScript 7. `tsc --noEmit` for type checks only.
- No physics engine in MVP. No external 3D models. Fonts self-hosted (`@fontsource/*`).
- `src/core/**` and `src/content/**` must not import `react`, `three` or `@react-three/*`.
- Only `src/world/**` may import `three` / `@react-three/*`; it is loaded only via `React.lazy` on ENTER SIMULATION. No preloading.
- **Never invent CV content.** Every unknown is `pending(...)`. Project 03 sample text begins with `Sample — `.
- Status badge copy is exact: `IN DOCUMENTATION`, `AWAITING DATA`, `PLACEHOLDER`, `[pending]`.
- Résumé copy is exact: `Download résumé (PDF)` when confirmed, otherwise a disabled `Résumé: coming soon`.
- Touch entry note is exact: `3D walking needs a keyboard in this version. View Portfolio has everything.`
- `viewed` (content opened from any source) and `worldVisited` (arrival zones physically entered) are separate. Only `worldVisited` drives the tour.
- All tunable numbers live in `src/core/config.ts` with the spec's values.
- `localStorage` is accessed only through `src/core/safeStorage.ts`.
- Every milestone ends deployed (from Task 12 onward). After hour 21.5, no new features.
- Commit after every task; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Keys held when focus leaves.** If the window blurs or a panel opens mid-keypress, movement must stop and must not resume on close. Test in Task 20.
2. **Huge frame delta after a backgrounded tab.** With `dt` of 5 s, the player must not tunnel through boundaries and the guide must not skip states. `dt` is clamped to `MAX_DT = 0.1`. Tests in Tasks 20 and 23.
3. **Quick-nav or arrival during a running reveal, and rapid repeated clicks.** Exactly one panel opens, for the latest request. A cancelled reveal still counts as played. Test in Task 28.
4. **Reload or return visit mid-session.** Boot is auto-skipped, the entry screen shows the remembered choice as highlighted, and nothing auto-enters 3D or downloads the 3D chunk. Test in Task 9.
5. **Resize or rotation while a panel is open.** The panel switches between drawer and full screen at 768 px without losing focus or trap, and the canvas resizes. Tests in Tasks 6 and 18.

---

## File Structure

```
index.html, vite.config.ts, tsconfig*.json, eslint.config.js, playwright.config.ts, .env.test
scripts/validate.ts                 prebuild: validateContent + validateWorld, exits 1 on issues
src/main.tsx, App.tsx, index.css
src/content/schema.ts               types, helpers confirmed()/pending(), SECTION_IDS, SAMPLE_MARKER
src/content/validateContent.ts
src/content/cv.ts                   launch content
src/content/dialogue.ts             DialogueTable data
src/content/world.ts                WORLD layout
src/core/config.ts                  all tunables
src/core/safeStorage.ts
src/core/geometry.ts
src/core/walkable.ts
src/core/routeGraph.ts
src/core/validateWorld.ts
src/core/input.ts                   key state + isTypingTarget
src/core/playerMotion.ts
src/core/cameraRig.ts
src/core/tour.ts
src/core/guideBrain.ts
src/core/dialogueDirector.ts
src/core/arrival.ts                 reveal duration + arrival orchestration (pure)
src/core/capabilities.ts            hasWebGL2(), isTouchFirst()
src/state/store.ts
src/state/settings.ts
src/ui/focusReturn.ts
src/ui/StatusBadge.tsx, FieldText.tsx
src/ui/Panel/Panel.tsx, sections/*.tsx, ProjectDetail.tsx, MediaItem.tsx
src/ui/TopBar.tsx, QuickNav.tsx, ResumeLink.tsx, useGlobalShortcuts.ts
src/ui/Boot.tsx, Entry.tsx, Loading3D.tsx, ErrorFallback.tsx
src/ui/Subtitles.tsx, A11yStatus.tsx, Settings.tsx, ControlsHint.tsx
src/portfolio/Portfolio.tsx
src/world/WorldRoot.tsx, GameLoop.tsx, Player.tsx, FollowCamera.tsx, testHooks.ts
src/world/islands/{Monolith,Bridge,Walkways,Education,Experience,Projects,Skills,Contact,IslandTitle}.tsx
src/world/guide/{GuideBody,Trail,OffscreenArrow}.tsx
src/world/artifacts/{Featured,Technical,Experimental,ArtifactShell}.tsx
src/world/reveals/{useReveal.ts,sharedReveal.ts}
tests/unit/*.test.ts, tests/component/*.test.tsx, tests/e2e/*.spec.ts
```

---

# Milestone M0: Foundation (target 0–1 h)

### Task 1: Scaffold and tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`, `vitest.setup.ts`, `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces npm scripts: `dev`, `build` (= `npm run validate && tsc --noEmit && vite build`), `build:test` (= `vite build --mode test`), `preview`, `validate` (= `tsx scripts/validate.ts`, a stub that exits 0 until Task 3), `test` (= `vitest run`), `test:e2e` (= `playwright test`), `typecheck`, `lint`.

- [ ] **Step 1:** Scaffold with `npm create vite@latest . -- --template react-ts` (into the existing repo, keeping `docs/`). Pin `"typescript": "~5.9.3"`.
- [ ] **Step 2:** Install dev dependencies: `vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom tsx @playwright/test tailwindcss @tailwindcss/vite`. Install `zustand`.
- [ ] **Step 3:** Configure `vite.config.ts` with `react()`, `tailwindcss()` and `test: { environment: 'jsdom', setupFiles: ['vitest.setup.ts'], include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'] }`. `src/index.css` contains `@import "tailwindcss";` plus `:root` colour tokens: `--void: #000`, `--concrete: #e8e8e4`, `--moss: #6fae3c`. `body` background is `--void`.
- [ ] **Step 4:** Write `tests/unit/smoke.test.ts` with `expect(1 + 1).toBe(2)`. Run `npm test`. Expected: 1 passed.
- [ ] **Step 5:** Run `npm run build`. Expected: exit 0 and `dist/` created. Run `npx playwright install chromium`.
- [ ] **Step 6:** Commit `chore: scaffold Vite React TS with Tailwind, Vitest, Playwright`.

### Task 2: Content schema and validation

**Files:**
- Create: `src/content/schema.ts`, `src/content/validateContent.ts`
- Test: `tests/unit/validateContent.test.ts`

**Interfaces:**
- Produces (`schema.ts`): types exactly as spec 7.1, plus:
  ```ts
  export const SECTION_IDS = ['education','experience','projects','skills','contact'] as const;
  export type SectionId = typeof SECTION_IDS[number];
  export type ProjectId = 'project-01' | 'project-02' | 'project-03';
  export const SAMPLE_MARKER = 'Sample — ';
  export function confirmed<T>(value: T): Field<T>;
  export function pending<T>(note?: string): Field<T>;
  export type CV = { education: EducationSection; experience: ExperienceSection; projects: ProjectsSection; skills: SkillsSection; contact: ContactSection };
  ```
- Produces (`validateContent.ts`): `export type ContentIssue = { path: string; rule: ContentRule; message: string }` and `export function validateContent(cv: CV, worldSectionIds: readonly SectionId[]): ContentIssue[]`, where `ContentRule = 'empty-confirmed' | 'real-has-pending' | 'pending-content-has-confirmed' | 'sample-marker-missing' | 'sample-marker-leak' | 'missing-alt' | 'bad-url' | 'section-world-mismatch'`.

- [ ] **Step 1: Write failing tests.** Build fixtures with a `validCV()` factory, then one test per rule:
  ```ts
  it('accepts the valid fixture', () => expect(validateContent(validCV(), SECTION_IDS)).toEqual([]));
  it('flags empty confirmed string', () => { const cv = validCV(); cv.projects.projects[0].name = confirmed(''); expect(rules(cv)).toContain('empty-confirmed'); });
  it('flags real item with pending field', ...)            // status 'real' + summary pending
  it('flags pending-content item with confirmed field', ...)
  it('flags placeholder text without "Sample — " prefix', ...)
  it('flags "Sample — " inside a real or partial item', ...)
  it('flags media with empty alt', ...)
  it('flags confirmed http:// link and non-mailto email channel', ...)
  it('flags section id missing from world ids', () => expect(rules(validCV(), ['education'])).toContain('section-world-mismatch'));
  ```
  Every issue's `path` is a dotted path, e.g. `projects.projects[0].name`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/validateContent.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement. Walk every `Field` recursively with its path. "Text values" for the sample marker means confirmed `string` and `string[]` fields.
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit `feat(content): CV schema and validateContent`.

### Task 3: Launch content and prebuild validation

**Files:**
- Create: `src/content/cv.ts`, `scripts/validate.ts`
- Test: `tests/unit/cvContent.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces: `export const cv: CV`. `scripts/validate.ts` prints the issues and calls `process.exit(1)` if there are any. Until Task 17 it passes `SECTION_IDS` as the world ids; Task 17 replaces this with `WORLD.islands.map(i => i.id)`.

- [ ] **Step 1: Write failing tests:**
  ```ts
  it('launch content validates', () => expect(validateContent(cv, SECTION_IDS)).toEqual([]));
  it('project 01 is partial with only confirmed facts', () => {
    const p = cv.projects.projects[0];
    expect(p.status).toBe('partial');
    expect(p.name).toEqual(confirmed('XR Meditation System'));
    expect(p.context).toEqual(confirmed('Developed with a team at the University of Oulu, OASIS department'));
    for (const f of [p.summary, p.role, p.tech]) expect(f.state).toBe('pending');
    expect(p.media).toEqual([expect.objectContaining({ kind: 'youtube', src: { state: 'pending', note: 'video coming soon' } })]);
    expect(p.appearance).toBe('featured');
  });
  it('project 02 is pending-content (technical)', ...);
  it('project 03 is placeholder (experimental)', ...);
  it('all non-project sections are pending-content and resumePdf is pending', ...);
  ```
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Write `cv.ts`. Pending sections have **one** entry or group whose fields are all `pending()`, so the panel shows the structure. Contact has an `email` channel with pending `value`. Project 03 sample text, all starting with `Sample — `: name `Sample — Experimental Prototype`, plus one summary sentence and a role. Project 03's media array is empty. Write `scripts/validate.ts`.
- [ ] **Step 4:** Run `npm test`, then `npm run build`. Expected: both pass. Temporarily break `cv.ts` (empty a confirmed name) and confirm `npm run build` fails, then revert.
- [ ] **Step 5:** Commit `feat(content): launch CV content with honest pending fields`.

### Task 4: Store, settings and safe storage

**Files:**
- Create: `src/core/safeStorage.ts`, `src/state/store.ts`, `src/state/settings.ts`
- Test: `tests/unit/store.test.ts`, `tests/unit/safeStorage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // safeStorage.ts
  export function readJSON<T>(key: string, fallback: T): T;   // never throws
  export function writeJSON(key: string, value: unknown): void; // never throws
  // store.ts
  export type Phase = 'boot' | 'entry' | 'loading3d' | 'world' | 'portfolio';
  export type PanelRef = { kind: 'section'; id: SectionId } | { kind: 'project'; id: ProjectId };
  export type OpenSource = 'arrival' | 'quicknav' | 'portfolio' | 'artifact';
  export type Settings = { typing: boolean; reducedMotion: 'system' | 'on' | 'off'; subtitles: boolean; quality: 'high' | 'low' };
  interface StoreState {
    phase: Phase; panel: PanelRef | null; viewed: Set<SectionId>; worldVisited: Set<SectionId>;
    revealPlayed: Set<SectionId>; tourTarget: SectionId | null; settings: Settings; modePreference: 'world' | 'portfolio' | null;
    revealing: SectionId | null;
    setPhase(p: Phase): void;
    openSection(id: SectionId, o: { source: OpenSource }): void;  // sets panel, adds to viewed only
    openProject(id: ProjectId, o: { source: OpenSource }): void;  // sets panel, adds 'projects' to viewed
    closePanel(): void;
    markWorldVisited(id: SectionId): void;
    markRevealPlayed(id: SectionId): void;
    setTourTarget(id: SectionId | null): void;
    setRevealing(id: SectionId | null): void;
    updateSettings(p: Partial<Settings>): void;                    // persists via settings.ts
    setModePreference(m: 'world' | 'portfolio'): void;             // persists
  }
  export const useStore: UseBoundStore<StoreApi<StoreState>>;
  export const isGameplayPaused = (s: StoreState) => s.panel !== null;
  ```
  Storage keys: `nullspace.settings`, `nullspace.mode`, `nullspace.booted`.

- [ ] **Step 1: Write failing tests:**
  ```ts
  it('openSection from any source adds to viewed but never to worldVisited', () => {
    for (const source of ['portfolio','quicknav','arrival'] as const) useStore.getState().openSection('education', { source });
    expect([...s().viewed]).toEqual(['education']); expect(s().worldVisited.size).toBe(0);
  });
  it('closePanel clears panel', ...);
  it('settings persist and reload from storage', ...);
  it('readJSON returns fallback when localStorage.getItem throws', () => { vi.spyOn(Storage.prototype,'getItem').mockImplementation(() => { throw new Error('denied'); }); expect(readJSON('k', 7)).toBe(7); });
  it('writeJSON swallows setItem errors', ...);
  ```
  Reset the store between tests with `useStore.setState(initialState)`, exporting `initialState` from `store.ts`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Default settings: `{ typing: true, reducedMotion: 'system', subtitles: true, quality: 'high' }`. Sets are replaced immutably (`new Set(...)`) so subscribers re-render.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(state): store with separate viewed and worldVisited`.

---

# Milestone M1: Recruiter-first portfolio + first deploy (target 1–3.5 h)

Visual styling for Tasks 5–10: before writing UI markup, load the `frontend-design` skill once. Choose a self-hosted display font and a mono font (`@fontsource/*`), consistent with spec 9.1 (black void, white concrete, moss green as the only accent).

### Task 5: Status badges and field rendering

**Files:**
- Create: `src/ui/StatusBadge.tsx`, `src/ui/FieldText.tsx`
- Test: `tests/component/StatusBadge.test.tsx`

**Interfaces:**
- Produces: `<StatusBadge status={ItemStatus} />` renders nothing for `real` and the exact badge copy otherwise. `<FieldText field={Field<string | string[]>} as?="p" | "span" | "li" />` renders the value, an `<ul>` for arrays, or the exact `[pending]` text (with `note` appended after an em dash if present). Pending text gets a `data-pending` attribute.

- [ ] **Step 1: Write failing tests:** one per status (`partial` → `IN DOCUMENTATION`, `pending-content` → `AWAITING DATA`, `placeholder` → `PLACEHOLDER`, `real` → no badge in the document); FieldText confirmed string, confirmed array (renders `li` items), pending without note (`[pending]`), pending with note (`[pending] — video coming soon`).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): status badges and pending field rendering`.

### Task 6: Panel shell (dialog, focus, inert)

**Files:**
- Create: `src/ui/Panel/Panel.tsx`, `src/ui/focusReturn.ts`
- Test: `tests/component/Panel.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`panel`, `closePanel`).
- Produces:
  - `rememberOpener(el: HTMLElement | null): void` and `restoreFocus(fallback?: HTMLElement | null): void`. Restore focuses the remembered element if it's still connected, otherwise `fallback`, otherwise `document.body`.
  - `<Panel title={string} onClose={() => void}>{children}</Panel>` renders `role="dialog"`, `aria-modal="true"` and `aria-labelledby`, with an `h2` that has `tabIndex={-1}`.
  - `App` marks the background region `#app-background` as `inert` while `panel !== null`, through the `useBackgroundInert()` hook exported from `Panel.tsx`.

- [ ] **Step 1: Write failing tests:**
  ```ts
  it('focuses heading on open', ...);
  it('traps Tab and Shift+Tab inside', ...);                 // userEvent.tab() cycles within the dialog
  it('Esc closes and focus returns to opener', ...);
  it('falls back when opener was removed from the DOM', ...);
  it('sets inert on #app-background while open and removes it on close', ...);
  it('keeps focus inside after a viewport resize across 768px', ...); // Review Focus 5: fire resize, assert activeElement within dialog
  ```
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Focus trap: keydown Tab handler that cycles through the first and last of the dialog's tabbable elements. The layout is a right drawer of `min(40rem, 100vw)`, full screen below 768 px (Tailwind `md:` breakpoint). Close button label: `Close`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): accessible modal panel with focus trap and inert background`.

### Task 7: Section views and project detail

**Files:**
- Create: `src/ui/Panel/sections/{Education,Experience,Projects,Skills,Contact}View.tsx`, `src/ui/Panel/ProjectDetail.tsx`, `src/ui/Panel/MediaItem.tsx`, `src/ui/Panel/PanelHost.tsx`
- Test: `tests/component/sections.test.tsx`

**Interfaces:**
- Consumes: `cv`, Task 5, Task 6, the store.
- Produces:
  - `<PanelHost />` reads `panel` from the store and renders `<Panel>` with the right view, or nothing.
  - Each `<XView section={...} />` can also be rendered **inline without Panel**; the portfolio uses it this way.
  - `<ProjectsView>` lists 3 project cards, each a button calling `openProject(id, { source })`.
  - `<MediaItem media={Media} />`:
    - YouTube shows a poster button `Play video` and only inserts the `youtube-nocookie.com` iframe on click.
    - Pending `src` shows `video coming soon` / `image coming soon`.
    - `onError` shows `media unavailable` plus the alt text.

- [ ] **Step 1: Write failing tests:**
  - Every view renders `cv` launch content without throwing and shows `[pending]` for pending fields.
  - ProjectDetail for project-01 shows `XR Meditation System`, the `IN DOCUMENTATION` badge, the OASIS context line, and `video coming soon`; there's no `iframe`.
  - Project-03 shows `PLACEHOLDER`.
  - A confirmed YouTube media item renders no iframe until `Play video` is clicked.
  - An image `error` event shows `media unavailable` and the alt text.
  - Links with a pending url are not rendered as anchors.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. External links get `target="_blank" rel="noopener noreferrer"`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): section views, project detail, click-to-load media`.

### Task 8: Top bar, quick nav, résumé, safe shortcuts

**Files:**
- Create: `src/ui/TopBar.tsx`, `src/ui/QuickNav.tsx`, `src/ui/ResumeLink.tsx`, `src/ui/useGlobalShortcuts.ts`, `src/core/input.ts` (only `isTypingTarget` in this task)
- Test: `tests/component/TopBar.test.tsx`, `tests/unit/input.test.ts`

**Interfaces:**
- Produces:
  - `isTypingTarget(t: EventTarget | null): boolean`: true for `input`, `textarea`, `select` and `[contenteditable]` (and anything inside them).
  - `useGlobalShortcuts()` handles keys `1`–`5` → `openSection(SECTION_IDS[n-1], { source: 'quicknav' })` and `Esc` → `closePanel()`. It ignores events when `isTypingTarget(e.target)`, or (except for Esc) when `panel !== null`.
  - `<TopBar mode={'world' | 'portfolio' | 'entry'} />` contains `NULLSPACE` · `Projects` · `Résumé` · `Contact` · `Sections` (opens `<QuickNav>`) · `Settings` · `Exit to Portfolio` / `Enter 3D`.
  - `<QuickNav>` rows show the badge, a **read** mark if in `viewed`, and in world mode a **reached** mark if in `worldVisited`, plus `Open` and (world mode) `Guide me there`. World mode shows `reached N/5` and `Next: <title>`.
  - `onGuideMeThere(id)` is a prop and is a no-op until Task 25.
  - Openers call `rememberOpener(e.currentTarget)` before opening.

- [ ] **Step 1: Write failing tests:**
  - `isTypingTarget` true and false cases.
  - Pressing `3` opens projects; pressing `3` inside an `<input>` does nothing; pressing `2` while the panel is open does nothing; Esc closes.
  - Résumé pending: an `aria-disabled` item with the exact text `Résumé: coming soon` and no `href`.
  - Résumé confirmed (fixture): an anchor `Download résumé (PDF)` with `href` equal to the file.
  - Contact opens the contact panel in 1 click.
  - In world mode, the read and reached marks render independently (viewed = {education}, worldVisited = {} → education shows read but not reached).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): top bar, quick nav, résumé link, safe shortcuts`.

### Task 9: Boot sequence and entry choice

**Files:**
- Create: `src/ui/Boot.tsx`, `src/ui/Entry.tsx`, `src/core/capabilities.ts`
- Test: `tests/component/BootEntry.test.tsx`, `tests/unit/capabilities.test.ts`

**Interfaces:**
- Produces:
  - `hasWebGL2(): boolean` (creates a canvas, tries `getContext('webgl2')`, wrapped in try/catch).
  - `isTouchFirst(): boolean` = `matchMedia('(pointer: coarse) and (hover: none)').matches || innerWidth < 768`.
  - `<Boot onDone />`: total 2500 ms (`BOOT_MS` in config). It has a `Skip` button that's visible immediately; any keydown or pointerdown skips. On done it writes `nullspace.booted = true`. `App` skips Boot when `readJSON('nullspace.booted', false)`.
  - `<Entry />` has two buttons: `ENTER SIMULATION` → `setModePreference('world')` and `setPhase('loading3d')`; `VIEW PORTFOLIO` → `setPhase('portfolio')`.
    - Touch-first: View Portfolio is rendered first with primary styling, and the exact touch note is in an element referenced by Enter's `aria-describedby`.
    - No WebGL2: Enter is `disabled` and described by `Your browser can't render the simulation.`
    - The remembered `modePreference` gets highlighted styling only and never auto-advances.
  - Until Task 18, Enter shows the inline message `Simulation coming online.` instead of changing phase (controlled by `WORLD_AVAILABLE` in config, `false` until Task 18).

- [ ] **Step 1: Write failing tests (fake timers):**
  - Boot calls `onDone` at 2500 ms.
  - The Skip button exists at 0 ms and calls `onDone` immediately; a key press does the same.
  - Boot is skipped when `nullspace.booted` is set.
  - Entry with `isTouchFirst` mocked true: View Portfolio comes first and Enter's accessible description equals the touch note. With it false, the note is absent.
  - `hasWebGL2` false → Enter disabled with the exact copy.
  - **Review Focus 4:** with `nullspace.booted` and `nullspace.mode = 'world'` in storage, the app renders Entry (not Boot, not `loading3d`), and the Enter button has `data-remembered`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The boot lines live in a constant array inside `Boot.tsx` (flavor copy, e.g. `> calibrating void... adequate`), ending with the NULLSPACE wordmark.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): skippable boot and entry choice with touch note`.

### Task 10: Portfolio mode and app phase routing

**Files:**
- Create: `src/portfolio/Portfolio.tsx`
- Modify: `src/App.tsx`
- Test: `tests/component/App.test.tsx`

**Interfaces:**
- Produces:
  - `App` renders `TopBar` (every phase after boot), `PanelHost`, and by phase: `Boot` | `Entry` | `Portfolio` | (`loading3d` / `world`: Task 18).
  - The background wrapper is `<div id="app-background">`.
  - `Portfolio` is a static hero (title, one-line tagline from a constant, CSS-only animated void lines), then the five section views inline in `tourOrder` order, each with its `StatusBadge`. Each section is an `<section aria-labelledby>`.
  - When a portfolio section scrolls into view (IntersectionObserver), `viewed` gets that section added (not `worldVisited`).
  - The portfolio has an `Enter 3D` button in the top bar.

- [ ] **Step 1: Write failing tests:**
  - Phase `portfolio` shows all 5 section headings and 3 project cards.
  - Clicking a project card opens ProjectDetail in the panel.
  - From phase `entry`, clicking Contact in the top bar opens the Contact panel (≤ 2 clicks overall).
  - `worldVisited` stays empty after viewing every section.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` and `npm run build`. Expected: PASS. Manually run `npm run dev` and check at 375 px and 1440 px.
- [ ] **Step 5:** Commit `feat(portfolio): recruiter-first 2D portfolio and phase routing`.

### Task 11: E2E suite for the portfolio path

**Files:**
- Create: `playwright.config.ts`, `.env.test` (`VITE_TEST_HOOKS=true`), `tests/e2e/boot.spec.ts`, `tests/e2e/recruiter.spec.ts`, `tests/e2e/portfolio.spec.ts`, `tests/e2e/keyboard.spec.ts`, `tests/e2e/touchEntry.spec.ts`, `tests/e2e/helpers.ts`

**Interfaces:**
- Produces:
  - Config with projects `desktop` (Desktop Chrome) and `touch` (`hasTouch: true`, `isMobile: true`, 375 × 812).
  - `webServer: { command: 'npm run build:test && npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173' }`.
  - `BASE_URL` env var overrides `use.baseURL`, for the deployed smoke test.
  - Helper `collect3DRequests(page): string[]` records request URLs matching `/three|world-|WorldRoot/`. This relies on the chunk naming from Task 18; before then it is trivially empty.

- [ ] **Step 1:** Write the specs from spec 11.3 items 1–4 and 9:
  - `boot.spec`: the Skip button works; a key works; reload skips boot.
  - `recruiter.spec`: Contact is visible within 2 clicks, plus the `Résumé: coming soon` text, in under 10 s.
  - `portfolio.spec`: View Portfolio shows all badges; `collect3DRequests` is empty; on the touch project there's no horizontal scroll (`document.documentElement.scrollWidth <= 375`).
  - `keyboard.spec`: keyboard-only open and close of each section through the top bar and QuickNav; focus returns to the opener; `2` does nothing with the panel open.
  - `touchEntry.spec`: on the touch project, View Portfolio is first and Enter's `aria-describedby` text equals the exact note; on desktop the note is absent.
- [ ] **Step 2:** Run `npm run test:e2e`. Expected: all pass. Fix app bugs if any (not the tests).
- [ ] **Step 3:** Commit `test(e2e): boot, recruiter path, portfolio, keyboard, touch entry`.

### Task 12: First deployment (Checkpoint A)

**Files:**
- Create: the host config chosen by the author. One of: `.github/workflows/deploy.yml` (GitHub Pages; set `base` in `vite.config.ts` to `/<repo>/`), `vercel.json`, or `netlify.toml`.

- [ ] **Step 1:** **Ask the author** which host to use (spec 14) and confirm they're signed in to it. Claude does not create accounts or enter credentials. If they haven't decided yet, continue with M2 and return here before hour 3.5.
- [ ] **Step 2:** Add the config. The build command is `npm run build` and the output is `dist`.
- [ ] **Step 3:** The author connects the repo or runs the first deploy. Record the public URL in `README.md` (a one-line README is created here).
- [ ] **Step 4:** Run `BASE_URL=<public url> npx playwright test tests/e2e/boot.spec.ts tests/e2e/recruiter.spec.ts tests/e2e/portfolio.spec.ts tests/e2e/touchEntry.spec.ts`. Expected: pass.
- [ ] **Step 5:** Commit `chore: deploy configuration`. **Checkpoint A reached.**

---

# Milestone M2: World core (target 3.5–7 h)

### Task 13: Geometry helpers and config

**Files:**
- Create: `src/core/geometry.ts`, `src/core/config.ts`
- Test: `tests/unit/geometry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Vec2 = { x: number; z: number };
  export const v: { add; sub; scale; len; dist; lerp; normalize; dot; angleOf(v: Vec2): number; fromAngle(a: number): Vec2 };
  export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2;
  export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number;
  export type Circle = { kind: 'circle'; c: Vec2; r: number };
  export type Strip = { kind: 'strip'; a: Vec2; b: Vec2; halfWidth: number };   // capsule-free rectangle along a→b
  export type Shape = Circle | Strip;
  export function shapeContains(s: Shape, p: Vec2, eps?: number): boolean;
  export function closestPointInShape(s: Shape, p: Vec2): Vec2;
  ```
  `config.ts` exports the constant groups `PLAYER`, `CAMERA`, `GUIDE`, `TOUR`, `DIALOGUE`, `REVEAL`, `BOOT_MS = 2500`, `MAX_DT = 0.1`, `WORLD_AVAILABLE`, with every value from spec sections 6 and 8. Each value is used by its owning task.
- [ ] **Step 1: Write failing tests:** closest point on a segment (interior, endpoints); a strip contains points within its half-width but not beyond its ends; the circle closest point is on the boundary for an outside point.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(core): geometry helpers and config`.

### Task 14: World layout definition

**Files:**
- Create: `src/content/world.ts`
- Test: `tests/unit/world.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type IslandDef = { id: SectionId; centre: Vec2; radius: number; arrivalPoint: Vec2; arrivalZoneRadius: number;
    titleAnchor: Vec2; artifactSlots: Vec2[] };            // artifactSlots length 3 for projects, else []
  export type WalkwayDef = { id: string; from: SectionId; to: SectionId; a: Vec2; b: Vec2; halfWidth: number };
  export type WorldLayout = { spawn: { pos: Vec2; facing: number }; monolith: { centre: Vec2; plinthRadius: number; slit: Vec2 };
    islands: IslandDef[]; walkways: WalkwayDef[]; bridge: { a: Vec2; b: Vec2; halfWidth: number }; ringEntry: Vec2; tourOrder: SectionId[] };
  export function buildLayout(p?: Partial<LayoutParams>): WorldLayout;
  export const WORLD: WorldLayout;
  ```
  Layout parameters:
  - ring radius 22 m; island radius 6 m; monolith plinth radius 5 m
  - walkway half-width 1.0 m; bridge half-width 1.25 m; arrival zone radius 1.25 m
  - **Islands** in `tourOrder` at angles `90° − i·72°`.
  - **Walkways** connect consecutive islands in a closed loop (5 walkways). Each runs from island edge to island edge, inset 0.5 m into each island so the strip overlaps the island.
  - **`ringEntry`** is the midpoint of the contact→education walkway. The bridge runs from the plinth edge (inset 0.5 m) to `ringEntry`.
  - **`arrivalPoint`** is the island centre moved 2 m toward the monolith.
  - **Spawn** is the plinth centre plus 2 m toward `ringEntry`, facing `ringEntry`.
  - **`slit`** is the plinth centre.
  - **Artifact slots** sit 3 m from the Projects centre at −40°, 0° and +40° relative to the outward direction.
- [ ] **Step 1: Write failing tests:** 5 islands with unique ids equal to `SECTION_IDS`; adjacent island centres are about 25.86 m apart (`toBeCloseTo(25.86, 1)`); Projects has 3 slots, the others 0; `ringEntry` lies on the contact→education walkway segment.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(world): single-source world layout`.

### Task 15: Walkable area

**Files:**
- Create: `src/core/walkable.ts`
- Test: `tests/unit/walkable.test.ts`

**Interfaces:**
- Consumes: Tasks 13, 14.
- Produces: `export type Walkable = { shapes: Shape[]; contains(p: Vec2): boolean; clamp(prev: Vec2, next: Vec2): Vec2 }` and `export function createWalkable(layout: WorldLayout): Walkable`. The shapes are the plinth circle, the island circles, the walkway strips and the bridge strip.
- **Algorithm for `clamp`:** if `contains(next)`, return `next`. Otherwise, compute `closestPointInShape(s, next)` for every shape, keep those within 0.001 of being contained by the union, and return the one nearest to `next`. If none qualifies, return `prev`. This gives edge sliding.
- [ ] **Step 1: Write failing tests:**
  - Island centre, walkway midpoint and bridge midpoint are contained; a point 3 m outside the ring is not.
  - Clamp leaves interior points unchanged.
  - Moving diagonally out of a walkway side keeps the along-walkway component (sliding): `clamp(mid, mid + (side 2 m, along 0.5 m))` stays inside, moves about 0.5 m along, and is within 0.01 of the edge.
  - A walkway–island join corner is never outside.
  - **Review Focus 2:** clamp from the plinth centre to a point 50 m away returns a point inside.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(core): walkable area with edge sliding`.

### Task 16: Route graph

**Files:**
- Create: `src/core/routeGraph.ts`
- Test: `tests/unit/routeGraph.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type RouteNode = { id: string; pos: Vec2; kind: 'spawn' | 'bridge' | 'ring-entry' | 'walkway' | 'arrival' | 'island-edge'; sectionId?: SectionId };
  export type RouteGraph = { nodes: Map<string, RouteNode>; adj: Map<string, string[]> };
  export function buildRouteGraph(layout: WorldLayout): RouteGraph;
  export function nearestNode(g: RouteGraph, p: Vec2): string;
  export function shortestPath(g: RouteGraph, from: string, to: string): Vec2[];   // includes both endpoints; Dijkstra by edge length
  export const arrivalNodeId = (id: SectionId) => `arrival:${id}`;
  ```
  Nodes:
  - `spawn`
  - `bridge:mid`
  - `ring-entry`
  - per walkway `walkway:<id>:a`, `walkway:<id>:mid`, `walkway:<id>:b`, with the end nodes placed at the island edges
  - per island `arrival:<id>`, connected to its adjacent walkway end nodes
  - `ring-entry` splits the contact→education walkway, connected to that walkway's `a` and `b` and to `bridge:mid`.
- [ ] **Step 1: Write failing tests:** the path from `spawn` to `arrival:education` passes through `ring-entry`; the path between adjacent islands doesn't cross the monolith (all points have distance from the origin > 10 m); every pair of arrival nodes has a path; `nearestNode` at an island centre returns that island's arrival node.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(core): waypoint route graph with shortest paths`.

### Task 17: World validation in tests and the prebuild

**Files:**
- Create: `src/core/validateWorld.ts`
- Modify: `scripts/validate.ts`
- Test: `tests/unit/validateWorld.test.ts`

**Interfaces:**
- Produces: `export type WorldIssue = { rule: 'node-outside' | 'edge-outside' | 'unreachable' | 'zone-outside' | 'section-missing' | 'artifact-slots' | 'slot-outside'; detail: string }` and `export function validateWorld(layout: WorldLayout, sectionIds: readonly SectionId[]): WorldIssue[]`. Edges are sampled every 0.25 m. Reachability is checked from `spawn` to every arrival node, and from every node to every arrival node.
- [ ] **Step 1: Write failing tests:** `validateWorld(WORLD, SECTION_IDS)` returns `[]`. Each broken layout triggers its rule (via `buildLayout` overrides or by mutating a clone):
  - island moved 15 m outward → `unreachable` or `edge-outside`
  - `arrivalZoneRadius: 7` → `zone-outside`
  - Projects with 2 slots → `artifact-slots`
  - missing `skills` island → `section-missing`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Update `scripts/validate.ts` to run both validators, with the world's section ids feeding `validateContent`.
- [ ] **Step 4:** Run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(core): validateWorld in tests and prebuild`.

### Task 18: Lazy world chunk, loading and failure states

**Files:**
- Create: `src/world/WorldRoot.tsx`, `src/ui/Loading3D.tsx`, `src/ui/ErrorFallback.tsx`
- Modify: `src/App.tsx`, `vite.config.ts`, `src/core/config.ts` (`WORLD_AVAILABLE = true`)
- Test: `tests/component/Loading3D.test.tsx`; extend `tests/e2e/portfolio.spec.ts`; create `tests/e2e/world.spec.ts`

**Interfaces:**
- Produces:
  - `const WorldRoot = lazy(() => import('./world/WorldRoot'))`, mounted when phase is `loading3d` or `world`.
  - `vite.config.ts` `build.rollupOptions.output.manualChunks`: `three` and `@react-three/*` → `three`; `src/world/**` → `world`.
  - `<Loading3D />` shows `> materializing void... N%` (from Drei `useProgress` inside the chunk; before the chunk resolves it shows `> materializing void...` with no number) and a `View Portfolio instead` link.
  - `<ErrorFallback reason={'load' | 'crash' | 'context'} onRetry />`: crash copy `The simulation collapsed. Typical.`, buttons `Retry` and `View Portfolio`. A lazy import rejection → `load`.
  - `WorldRoot` renders `<Canvas dpr={[1, 1.5]}>` wrapped in an error boundary. It listens for `webglcontextlost` and `webglcontextrestored`, and shows `context` if the context isn't restored within 3 s. It calls `setPhase('world')` once the first frame renders.
- [ ] **Step 1: Write failing tests:**
  - Component: ErrorFallback copy and buttons; `Retry` calls `onRetry`; `View Portfolio` sets the phase.
  - E2E `world.spec`: Enter shows the loading text, then a `canvas` is visible within 15 s.
  - E2E `portfolio.spec`: still zero 3D requests (now meaningful).
  - **Review Focus 5:** in `world.spec`, after a 1280 → 700 px viewport resize, the canvas width matches the viewport.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Install `three @react-three/fiber @react-three/drei` and `@types/three`. Implement. The scene is just a black background and fog for now.
- [ ] **Step 4:** Run `npm test` and `npm run test:e2e`. Expected: PASS. Run `npm run build` and record the gzip sizes of the initial and `world` + `three` chunks in the commit message.
- [ ] **Step 5:** Commit `feat(world): lazy 3D chunk with loading and failure fallbacks`.

### Task 19: Greybox scene from the layout

**Files:**
- Create: `src/world/islands/{Monolith,Bridge,Walkways,IslandTitle}.tsx`, `src/world/islands/GreyIsland.tsx`, `src/world/Scene.tsx`
- Modify: `src/world/WorldRoot.tsx`

**Interfaces:**
- Consumes: `WORLD`.
- Produces: `<Scene />`:
  - places the monolith (a slab about 3 × 9 × 1 m hovering 0.5 m above the plinth, with an emissive slit)
  - places a `GreyIsland` (slab cylinder, radius from the layout, 1.5 m thick) at each island
  - places walkway and bridge boxes from their `a`, `b` and `halfWidth`
  - places an `IslandTitle` (Drei `<Text>`, the section title plus the status badge copy when not `real`) at `titleAnchor`
  - adds `<fogExp2 density={0.018}>`, a hemisphere light and one directional key light
  - The walkable surface top is at `y = 0`.
- [ ] **Step 1:** Implement. (Visual; verified manually and by screenshot.)
- [ ] **Step 2:** Run `npm run dev`, enter 3D, and use a temporary `OrbitControls` (dev only, behind `import.meta.env.DEV && location.search.includes('orbit')`) to confirm every island, walkway and the bridge are positioned as in the layout.
- [ ] **Step 3:** Take a Playwright screenshot from the default camera (`tests/e2e/world.spec.ts`, `toHaveScreenshot` disabled; save it to `test-results/` for manual review only).
- [ ] **Step 4:** Commit `feat(world): greybox monolith, bridge, islands from layout`.

### Task 20: Player controller

**Files:**
- Modify: `src/core/input.ts`
- Create: `src/core/playerMotion.ts`, `src/world/Player.tsx`, `src/world/GameLoop.tsx`
- Test: `tests/unit/playerMotion.test.ts`, `tests/unit/input.test.ts` (extend)

**Interfaces:**
- Produces:
  ```ts
  // input.ts
  export type InputState = { up: boolean; down: boolean; left: boolean; right: boolean; interact: boolean };
  export function createKeyboardInput(target: Window): { state: InputState; clear(): void; dispose(): void };
  //  maps KeyW/ArrowUp, KeyS/ArrowDown, KeyA/ArrowLeft, KeyD/ArrowRight, KeyE/Enter→interact; ignores isTypingTarget; clears on window 'blur' and 'visibilitychange' (hidden)
  // playerMotion.ts
  export type PlayerState = { pos: Vec2; vel: Vec2; facing: number; edgePushTime: number };
  export function stepPlayer(s: PlayerState, input: InputState, cameraYaw: number, dt: number, walk: Walkable, paused: boolean): { state: PlayerState; events: Array<'boundary'> };
  ```
  Values: `PLAYER.speed = 4`, `PLAYER.accelTime = 0.15`, `PLAYER.boundaryPushS = 0.6`. `dt` is clamped to `MAX_DT`. When `paused`, velocity is set to 0 and the state is returned unchanged.
  - `GameLoop` is the single `useFrame` that calls the core steps in order: input → player → guide (Task 23) → zones (Task 25) → camera (Task 21). It writes positions to refs, not to the store, each frame. It calls `input.clear()` when `panel` becomes non-null.
  - `Player` renders a 0.5 m capsule with a rim-light material at the ref position.
- [ ] **Step 1: Write failing tests:**
  - Holding `up` for 1 s (60 steps) reaches ≥ 3.9 m/s.
  - Releasing stops within about 0.15–0.25 s.
  - Movement is camera-relative (`cameraYaw = π/2` → `up` moves along +x).
  - Pushing into an edge for 0.6 s emits exactly one `boundary`, then none until the player leaves and pushes again.
  - `paused` freezes movement.
  - **Review Focus 1:** after a `blur` event, `state.up` is false; with `up` held, `clear()` then stepping 0.5 s gives speed ≈ 0.
  - **Review Focus 2:** one step with `dt = 5` from the edge of a walkway stays `walk.contains`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The accel/decel easing is exponential approach to the target velocity with time constant `accelTime / 3`.
- [ ] **Step 4:** Run. Expected: PASS. Manually walk the ring in `npm run dev`; there should be no void falls.
- [ ] **Step 5:** Commit `feat(world): kinematic player with walkable clamp and safe input`.

### Task 21: Follow camera

**Files:**
- Create: `src/core/cameraRig.ts`, `src/world/FollowCamera.tsx`
- Test: `tests/unit/cameraRig.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CameraRigState = { yaw: number; aim: Vec2; extraDistance: number; steadyTime: number; lastMoveDir: number | null; reversalTime: number };
  export function stepCameraRig(r: CameraRigState, t: { playerPos: Vec2; playerVel: Vec2; guidePos: Vec2 | null }, dt: number, reducedMotion: boolean): CameraRigState;
  ```
  Values: `CAMERA.distance = 6`, `height = 3.5`, `guideBiasMax = 0.15`, `guideBiasOffDistance = 10`, `turnRateDegPerS = 60`, `steadyBeforeTurnS = 0.4`, `ignoreReversalS = 0.3`, `pullbackMax = 1.5`.
  - `FollowCamera` applies the rig with critically damped smoothing (Drei `maath` `damp3`, or a hand-written spring).
  - A short raycast from the aim point to the desired position against island and bridge meshes (`layers` 1) shortens the distance to avoid clipping.
- [ ] **Step 1: Write failing tests:**
  - With the guide 3 m away, the aim lies within 15% of player→guide; with the guide 12 m away, aim equals the player.
  - The yaw changes by ≤ 60° per second of simulated time.
  - No yaw change during the first 0.4 s of movement.
  - A 0.2 s reversal (left then right) leaves the yaw unchanged.
  - `extraDistance` ≤ 1.5 always.
  - With `reducedMotion`, the turn rate is halved.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS. Manual checklist (spec 6.2): tight U-turns, walking the bridge, running away. Note the results in the commit body.
- [ ] **Step 5:** Commit `feat(world): stability-first follow camera`. Deploy. **End of M2.**

---

# Milestone M3: Guide and tour, core (target 7–11 h)

### Task 22: Tour logic

**Files:**
- Create: `src/core/tour.ts`
- Test: `tests/unit/tour.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function nextTarget(order: readonly SectionId[], worldVisited: ReadonlySet<SectionId>): SectionId | null;
  export function isTourComplete(order: readonly SectionId[], worldVisited: ReadonlySet<SectionId>): boolean;
  export type ZoneTracker = { inside: SectionId | null; armed: Set<SectionId> };   // armed = may trigger on next entry
  export function createZoneTracker(ids: readonly SectionId[]): ZoneTracker;
  export function updateZones(t: ZoneTracker, playerPos: Vec2, islands: IslandDef[]): { tracker: ZoneTracker; entered: SectionId | null };
  ```
  Hysteresis: a zone re-arms only once the player is more than `arrivalZoneRadius + TOUR.rearmMargin (0.75 m)` from its arrival point.
- [ ] **Step 1: Write failing tests:**
  - `nextTarget` with an empty set → `education`.
  - With {education, projects} → `experience`.
  - Complete only with all 5.
  - **viewed is irrelevant:** `nextTarget` takes only `worldVisited`. A store-level test sets viewed = all 5 and checks `nextTarget(order, worldVisited) === 'education'`.
  - Entering a zone gives `entered` once; staying inside → `null`; leaving 1 m → still not re-armed; leaving 2.5 m and returning → entered again.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(core): tour order, completion and zone hysteresis`.

### Task 23: Guide brain

**Files:**
- Create: `src/core/guideBrain.ts`
- Test: `tests/unit/guideBrain.test.ts`

**Interfaces:**
- Consumes: Tasks 16, 22.
- Produces:
  ```ts
  export type GuideStateName = 'idle' | 'lead' | 'wait' | 'greet' | 'present' | 'arrive';
  export type GuidePose = { position: Vec2; height: number; facing: number; state: GuideStateName; squash: number; glow: number; beckon: number; speakPulse: number };
  export type GuideEvent = 'firstMeet' | 'greet' | 'wait' | 'idle';
  export type GuideState = { name: GuideStateName; pos: Vec2; path: Vec2[]; pathIndex: number; target: SectionId | null; timer: number; waitedFor: number; met: boolean; speakPulse: number };
  export function createGuide(layout: WorldLayout): GuideState;             // pos = layout.monolith.slit, name 'greet', met false
  export function stepGuide(g: GuideState, ctx: { graph: RouteGraph; playerPos: Vec2; target: SectionId | null; playerEnteredZone: SectionId | null; dt: number }): { guide: GuideState; pose: GuidePose; events: GuideEvent[] };
  export function pulseSpeak(g: GuideState): GuideState;                     // sets speakPulse = 1, decays over 0.4 s
  ```
  Values: `GUIDE.leadAheadMin = 2`, `leadAheadMax = 3`, `resumeLeadDist = 5`, `startWaitDist = 7`, `greetDist = 1.5`, `greetS = 0.5`, `arriveS = 0.5`, `waitDialogueS = 4`, `idleOffset = 2`, `offRouteSnap = 1`, `speedCapFactor = 1.15`, `bobAmp = 0.15`, `hover = 1.2`. `dt` is clamped to `MAX_DT`.
  - **Transitions** follow the spec 6.3 table exactly.
  - A target change replans with `shortestPath(nearestNode(pos), arrivalNodeId(target))`.
  - On reaching the final path point → `present`.
  - `present` → `arrive` **only** when `playerEnteredZone === target`. After `arriveS` → `idle` (the next target comes from the store).
  - **First meeting:** `greet` is entered with `met=false`; it emits `firstMeet` once, and after `greetS` → `lead`.
- [ ] **Step 1: Write failing tests (deterministic, scripted player positions):**
  - The first step emits `firstMeet`, and after 0.5 s the state is `lead` with target `education`.
  - While leading with the player following at 4 m/s, the guide–player distance stays in [2, 3] ± 0.3 after settling.
  - Player stops → after the distance exceeds 7 → `wait`; at 6 m it is still `wait` (no flicker in the 5–7 m gap); at 4.9 m → `lead`.
  - Coming within 1.5 m after a wait → `greet`, then `lead`.
  - `wait` lasting 4 s emits `wait` exactly once per wait episode.
  - Reaching the arrival node → `present`. `present` holds for 60 s of steps with no `arrive` while the player stays outside the zone.
  - `playerEnteredZone = target` → `arrive` → after 0.5 s → `idle`.
  - `playerEnteredZone` for a different island → no `arrive` (the store re-targets instead).
  - A target change mid-route replans from the nearest node, and every new path point is in `createWalkable(WORLD)`.
  - A guide displaced more than 1 m from its path snaps to `nearestNode` and replans.
  - `target = null` → `idle`, settling about 2 m beside the player.
  - **Review Focus 2:** a single step with `dt = 5` moves at most `speedCap × 0.1` and doesn't skip from `lead` straight to `present`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Leading speed = clamp(player speed + (desiredAhead − actualAhead) × 2, 0, 4 × 1.15). "Ahead" is the distance along the path between the guide and the player's projection onto it, approximated by straight-line distance.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(core): kokedama guide brain state machine`.

### Task 24: Kokedama body v1, trail, off-screen arrow

**Files:**
- Create: `src/world/guide/GuideBody.tsx`, `src/world/guide/Trail.tsx`, `src/world/guide/OffscreenArrow.tsx`

**Interfaces:**
- Consumes: `GuidePose` (via a ref updated by GameLoop).
- Produces:
  - `<GuideBody poseRef />`: an icosphere (`IcosahedronGeometry(0.35, 3)`) with CPU-side vertex noise displacement (amplitude 0.03), vertex colours between `#4f8a2b` and `#7fbf4a`, and 4 instanced leaf planes on top.
  - Motion from the pose: bob `sin(t·1.6)·0.15`, facing slerp, squash `scale.y = 1 − 0.2·squash` / `xz = 1 + 0.1·squash`, emissive `glow`, and a beckon tilt oscillation `±12°` scaled by `beckon`.
  - Reduced motion halves the amplitudes.
  - `<Trail />`: about 60 instanced points emitted along the remaining path when the state is `lead` or `wait`. Material `fog: false`.
  - `<OffscreenArrow />`: an HTML overlay (Drei `<Html>` not used; project into screen space in `useFrame` and update a DOM element through a ref). Visible only when the guide is outside the camera frustum. It's a moss-green chevron at the screen edge.
- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Manual check: the moss ball is recognizable at 6 m camera distance; the arrow appears when walking away; the trail is visible through fog. Keep the kokedama ≤ 5 draw calls (check `renderer.info.render.calls` in a dev overlay `?debug`).
- [ ] **Step 3:** Commit `feat(world): procedural kokedama v1, spore trail, off-screen arrow`.

### Task 25: Arrival wiring, Guide me there, test hooks, tour e2e (Checkpoint B)

**Files:**
- Create: `src/core/arrival.ts`, `src/world/testHooks.ts`, `tests/e2e/tour.spec.ts`
- Modify: `src/world/GameLoop.tsx`, `src/state/store.ts`, `src/ui/QuickNav.tsx`
- Test: `tests/unit/arrival.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // arrival.ts
  export function revealDurationMs(id: SectionId, revealPlayed: ReadonlySet<SectionId>, reducedMotion: boolean): number; // 2000 first, 300 reduced first, 0 revisit
  // store.ts additions
  arrive(id: SectionId): void;     // markWorldVisited + (revealPlayed ? openSection : start reveal via setRevealing(id)); then setTourTarget(nextTarget(...)) on closePanel
  guideMeThere(id: SectionId, touch: boolean): void;  // setTourTarget(id); if touch → request teleport (store.teleportRequest = arrivalPoint)
  teleportRequest: Vec2 | null;
  ```
  - `GameLoop` consumes `teleportRequest` (sets the player position, clears it) and feeds `updateZones` → `entered` → `store.arrive(entered)` and into `stepGuide` as `playerEnteredZone`.
  - On `closePanel`, if the phase is `world`, the store sets `tourTarget = nextTarget(order, worldVisited)`, or `null` with a `tourComplete` signal when complete.
  - `testHooks.ts` (only when `import.meta.env.VITE_TEST_HOOKS === 'true'`) defines `window.__nullspace = { teleportPlayer(id: SectionId | 'spawn'): void; getGuideState(): GuideStateName; getWorldVisited(): SectionId[]; getViewed(): SectionId[]; isTourComplete(): boolean; isRevealing(): boolean }`.
  - Until Task 28, the reveal is a timer: after `revealDurationMs` it calls `setRevealing(null)`, `markRevealPlayed(id)` and `openSection(id, {source: 'arrival'})`.
- [ ] **Step 1: Write failing unit tests:**
  - `revealDurationMs` cases.
  - A store test: `arrive('education')` adds it to `worldVisited` and, after the reveal, to `viewed`.
  - `openSection('skills', { source: 'quicknav' })` does not change `worldVisited` or `tourTarget`.
  - After closing a panel with worldVisited = {education}, the target is `experience`.
- [ ] **Step 2: Write the e2e `tour.spec.ts`** (spec 11.3 items 6–8):
  - Teleport to each zone in order; assert `getGuideState() === 'present'` before each teleport (navigate the guide by first teleporting the player next to it; acceptable via a polling `expect.poll` with a 20 s timeout).
  - The panel appears after the reveal; Esc; `getWorldVisited().length` increments; `isTourComplete()` only after the 5th.
  - Out-of-order teleport to `skills` opens Skills and adds it to `worldVisited`.
  - Read-first: View Portfolio, scroll through all sections, Enter 3D → `getViewed().length === 5`, `getWorldVisited()` is empty, the tour isn't complete, and the first teleport to education has `isRevealing() === true`.
  - Quick-nav Open in 3D leaves `getWorldVisited()` unchanged.
  - Touch project: quick-nav `Guide me there` for contact → `getWorldVisited()` contains `contact`.
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run `npm test` and `npm run test:e2e`. Expected: PASS. Manually play the full tour by following the guide (spec acceptance 5–6).
- [ ] **Step 6:** Commit `feat: player-driven arrivals, guide me there, tour e2e`. Deploy. **Checkpoint B reached.** If it's past hour 13, apply cut-order items 1–4 now (spec 12).

---

# Milestone M4: Content in the world (target 11–14 h)

### Task 26: Dialogue director and lines

**Files:**
- Create: `src/core/dialogueDirector.ts`, `src/content/dialogue.ts`
- Test: `tests/unit/dialogueDirector.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DialogueEventKey = 'firstMeet' | 'greet' | 'wait' | 'boundary' | 'idle' | 'tourComplete' | 'skipTour' | `arrive:${SectionId}` | `revisit:${SectionId}`;
  export type DialogueRule = { lines: string[]; cooldownMs: number; probability: number; once?: boolean };
  export type DialogueTable = Partial<Record<DialogueEventKey, DialogueRule>>;
  export function createDialogueDirector(table: DialogueTable, rng: () => number, globalGapMs?: number /* 8000 */): {
    emit(event: DialogueEventKey, nowMs: number): string | null;   // null = silent; never queues
  };
  ```
  `dialogue.ts` holds draft flavor lines (2–4 per event) that make no professional claims. Example: `boundary`: `The void is not a shortcut.`
  - `skipTour` is emitted when quick-nav Open is used in 3D while the tour isn't complete.
  - `revisit:*` is emitted on arrival when the island is already in `revealPlayed`.
- [ ] **Step 1: Write failing tests (seeded `rng`):**
  - The first emit returns a line from the pool.
  - The same event within `cooldownMs` → `null`.
  - A different event within 8000 ms of any line → `null`.
  - After the gap → a line.
  - `once` events never repeat.
  - `probability: 0` → always `null`.
  - An unknown key → `null`.
  - A blocked emit isn't replayed later (call `emit` at t=100 blocked, then at t=9000 a different event plays and nothing else).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(core): dialogue director with cooldowns and silence`.

### Task 27: Subtitles, accessible status and controls hint

**Files:**
- Create: `src/ui/Subtitles.tsx`, `src/ui/A11yStatus.tsx`, `src/ui/ControlsHint.tsx`
- Modify: `src/state/store.ts` (`subtitle: { text: string; id: number } | null`, `say(text)`, `announce(text)`), `src/world/GameLoop.tsx` (guide and player events → director → `say` + `pulseSpeak`)
- Test: `tests/component/Subtitles.test.tsx`

**Interfaces:**
- Produces:
  - `<Subtitles />` shows `KOKEDAMA ›` (moss green) plus the text typed at 40 characters per second, visible for `2500 + 40 × length` ms, then a fade.
  - Clicking it or pressing **Space** (not in a typing target or dialog) completes the typing.
  - When `settings.typing === false` or reduced motion is on, the full text shows instantly.
  - When `settings.subtitles === false`, nothing is rendered.
  - Position is bottom centre; when the panel is open on ≥ 768 px it sits in the left area (`right: min(40rem, 100vw)`); on smaller screens it's hidden while the panel is open.
  - A separate visually hidden `aria-live="polite"` node gets the full text at once.
  - `<A11yStatus />` is visually hidden with `aria-live="polite"`. The store's `announce()` is called when the tour target changes: `Next destination: <Title>. Follow the guide or press <n> to open.` On completion: `All destinations reached.`
  - Test hook added: `window.__nullspace.say(text: string)` calls `store.say`.
  - `<ControlsHint />` is shown on first world entry for 6 s, or until the first movement. On touch-first it shows `Walking needs a keyboard here, for now. Tap ☰ to travel.`
- [ ] **Step 1: Write failing tests (fake timers):**
  - The text types out progressively, and the live region has the full text immediately.
  - Space completes it; Space inside an `<input>` does not.
  - Typing is off → full text immediately.
  - Subtitles off → no `KOKEDAMA ›` in the document, but A11yStatus still announces the next destination.
  - It's hidden while the panel is open at 375 px width.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): terminal subtitles, a11y status, controls hint`.

### Task 28: Reveal system (shared reveal)

**Files:**
- Create: `src/world/reveals/useReveal.ts`, `src/world/reveals/sharedReveal.ts`
- Modify: `src/state/store.ts`, `src/world/islands/GreyIsland.tsx`
- Test: `tests/unit/revealFlow.test.ts`

**Interfaces:**
- Produces:
  - `useReveal(id: SectionId): { progress: MutableRefObject<number> }`: progress goes from 0 to 1 over `revealDurationMs` while `revealing === id`.
  - `sharedReveal(progress, group)`: slabs rise 0.6 m with an ease-out, and a light sweep (an emissive plane moving across the island).
  - Store rules:
    - `openSection` / `openProject` while `revealing !== null` cancels the reveal: `markRevealPlayed(revealing)`, `setRevealing(null)`, then open the **requested** panel.
    - A reveal timer that completes after a cancel does nothing.
    - Repeated `openSection` calls for the same id are idempotent.
    - Reveal completion always opens the arrival panel exactly once.
- [ ] **Step 1: Write failing tests (Review Focus 3):**
  - `arrive('education')`, then quick-nav `openSection('contact')` at 500 ms → the panel is contact; at 2000 ms the panel is still contact; `revealPlayed` has education.
  - Five rapid `openSection('skills')` calls → one panel, and `viewed` has skills once.
  - `arrive` during an open panel is ignored (gameplay is paused, so `GameLoop` doesn't call it; also guarded in the store).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Replace the Task 25 timer with the store-driven reveal.
- [ ] **Step 4:** Run `npm test` and `npm run test:e2e`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(world): shared first-visit reveal with safe cancellation`.

### Task 29: Project artifacts

**Files:**
- Create: `src/world/artifacts/{ArtifactShell,Featured,Technical,Experimental}.tsx`
- Modify: `src/world/islands/GreyIsland.tsx` (Projects mounts the artifacts at `artifactSlots`), `src/world/GameLoop.tsx` (interaction)
- Test: `tests/unit/artifactRange.test.ts`; extend `tests/e2e/tour.spec.ts`

**Interfaces:**
- Produces:
  - `export function artifactInRange(playerPos: Vec2, slots: Vec2[], range = 1.5): number | null` in `src/core/arrival.ts`.
  - `<ArtifactShell project slot>` renders the visual chosen by `project.appearance`, a floating label (the name if confirmed, otherwise the status badge copy; Experimental always shows `[PLACEHOLDER]`), a highlight ring when in range, and `onClick` / tap → `openProject(id, { source: 'artifact' })`.
  - Pressing E or Enter in range does the same.
  - Visuals per spec 9.3: Featured has 3 concentric torus rings rotating slowly around an emissive core. Technical is a wireframe box lattice whose 12 edges assemble as the player gets closer (distance-driven). Experimental is 8 fragment boxes with random jitter (seeded).
  - Test hook added: `window.__nullspace.interactArtifact(i: 0 | 1 | 2)`.
- [ ] **Step 1: Write failing tests:**
  - `artifactInRange` returns the nearest slot within 1.5 and `null` beyond.
  - E2E: teleport to projects, close the section panel, `interactArtifact(0)` → `XR Meditation System` and `IN DOCUMENTATION` are visible; `interactArtifact(2)` → `PLACEHOLDER`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS. Manually check that the three artifacts look clearly different.
- [ ] **Step 5:** Commit `feat(world): three distinct project artifacts`. Deploy. **End of M4: full core loop.**

---

# Milestone M5: Place-making (target 14–17 h)

### Task 30: Distinct island architecture and reveals

**Files:**
- Create: `src/world/islands/{Education,Experience,Projects,Skills,Contact}.tsx`
- Modify: `src/world/Scene.tsx` (swap GreyIsland for the specific islands; keep GreyIsland plus the shared reveal as the fallback)

**Interfaces:**
- Each island component takes `{ def: IslandDef }`, uses `useReveal(def.id)`, and keeps its walkable top at `y = 0` within `def.radius`. Forms and reveals per the spec 9.2 table. Everything is built from instanced boxes and cylinders, with ≤ 15 draw calls per island.
- [ ] **Step 1:** Implement one island at a time. After each: `npm run test:e2e` still passes, and the reveal finishes in ≤ 2 s (it reads `progress` from `useReveal`).
- [ ] **Step 2:** Manual check: from spawn, each island is recognizable by silhouette alone.
- [ ] **Step 3:** Commit per island: `feat(world): <name> island architecture and reveal`.

### Task 31: Lighting, fog readability, kokedama motion polish, profiling pass 1 (Checkpoint C)

**Files:**
- Modify: `src/world/Scene.tsx`, `src/world/guide/GuideBody.tsx`
- Create: `docs/profiling.md`

- [ ] **Step 1:** Tune the fog density so the next destination and the current walkway stay readable. Capture screenshots from spawn and from each walkway midpoint using `teleportPlayer` plus a `page.screenshot` script (`tests/e2e/fogShots.spec.ts`, tagged `@manual`). Review them by eye.
- [ ] **Step 2:** Polish the kokedama motion: squash on greet and arrive hops, a clearer beckon, a speak pulse bounce and tilt. Reduced motion halves the amplitudes and removes the hops.
- [ ] **Step 3:** Run `npm run build && npm run preview` on the author's hardware. Record the fps (Drei `<StatsGl>` behind `?debug`), draw calls, triangles and chunk sizes in `docs/profiling.md`. Fix only visible problems.
- [ ] **Step 4:** Commit `feat(world): lighting and fog pass, guide motion polish`. Deploy. **Checkpoint C.** If it's past hour 18.5, skip M7.

---

# Milestone M6: Hardening (target 17–20 h)

### Task 32: Settings, reduced motion, quality

**Files:**
- Create: `src/ui/Settings.tsx`, `src/state/useReducedMotion.ts`
- Modify: `src/world/WorldRoot.tsx`, `src/world/FollowCamera.tsx`, `src/world/reveals/useReveal.ts`
- Test: `tests/component/Settings.test.tsx`, `tests/e2e/reducedMotion.spec.ts`

**Interfaces:**
- Produces:
  - `useReducedMotion(): boolean` combines `settings.reducedMotion` (`system` → `matchMedia('(prefers-reduced-motion: reduce)')`).
  - `<Settings>` is a dialog using the Panel shell, with toggles for Typing, Subtitles, Reduced motion (System / On / Off) and Quality (High / Low).
  - `WorldRoot` wraps the scene in Drei `<PerformanceMonitor onDecline>`: the first decline sets dpr to 1, the second sets quality `low`. On Low quality, any post-processing is not mounted.
  - Reduced motion: scripted reveal camera moves are skipped (`REVEAL.reducedMs = 300`).
- [ ] **Step 1: Write failing tests:**
  - Component: the toggles persist through the store and survive a reload (via `safeStorage`).
  - E2E with `page.emulateMedia({ reducedMotion: 'reduce' })`: a subtitle appears complete at once (trigger it via `teleportPlayer` to a boundary-adjacent point, or a test hook `say('test')`), and the education reveal takes ≤ 400 ms (`isRevealing()` is false at 400 ms).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat: settings, reduced motion, adaptive quality`.

### Task 33: Error path e2e and full suite

**Files:**
- Create: `tests/e2e/errors.spec.ts`, `tests/e2e/smoke.deployed.spec.ts`

- [ ] **Step 1:** `errors.spec`: `page.route('**/world-*.js', r => r.abort())` → Enter → `Retry` and `View Portfolio` are visible; View Portfolio works; the top bar Contact still opens. Context loss via `WEBGL_lose_context` in `page.evaluate` → after 3 s the `context` fallback is visible.
- [ ] **Step 2:** `smoke.deployed.spec`: re-exports the boot, recruiter, portfolio, world-loads and touchEntry checks, run with `BASE_URL` and skipping hook-based tests (`test.skip(!hooks)`).
- [ ] **Step 3:** Run `npm test` and `npm run test:e2e`. Expected: all green. Fix app bugs.
- [ ] **Step 4:** Commit `test(e2e): error paths and deployed smoke suite`. Deploy.

---

# Milestone M7: Polish (target 20–21.5 h, only if Checkpoint C was met by 18.5 h)

### Task 34: Stretch items 1–2 and dialogue pass

- [ ] **Step 1:** Install `@react-three/postprocessing`. Add selective bloom (kokedama, spores, slits, beams on a bloom layer), a light vignette and subtle grain, mounted only when quality is `high`. Re-check profiling and revert if there's visible stutter.
- [ ] **Step 2:** Kokedama detail: a fresnel rim (via `onBeforeCompile` on `MeshStandardMaterial`), a twine torus band, leaf sway. Stay ≤ 5 draw calls.
- [ ] **Step 3:** Revise the lines in `dialogue.ts`. Flag them for the author to edit.
- [ ] **Step 4:** Run the full test suite. Commit `feat: post-processing and kokedama detail`. Deploy.

---

# Protected buffer (21.5–24 h): fixes only

### Task 35: Final verification

- [ ] **Step 1:** Run `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e`. Expected: all pass. Record the output.
- [ ] **Step 2:** Run `BASE_URL=<public url> npx playwright test tests/e2e/smoke.deployed.spec.ts`. Expected: pass.
- [ ] **Step 3:** Profiling pass 2 on the deployed build; update `docs/profiling.md`.
- [ ] **Step 4:** Walk spec 13 acceptance criteria 1–14 (including 3a and 6a) and tick each one in `docs/acceptance.md`, with evidence (a test name or manual note).
- [ ] **Step 5:** Run `git grep -n "Sample — "` and confirm hits appear only in project-03; confirm `validateContent` passes. Then commit `docs: final acceptance record`.
