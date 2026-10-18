# Acceptance record

Live build `6c47cca` · https://nullspace-saemmi-studios.vercel.app · 2026-10-18

Test totals at `6c47cca`:
- Unit + component: **250/250**
- End-to-end, local: **36/36**, two consecutive runs
- Live smoke (`npm run test:smoke`): **22 pass**, 6 skipped by design (device-specific checks)
- Typecheck clean; lint 0 errors

| # | Criterion (spec 13) | Status | Evidence |
|---|---|---|---|
| 1 | Contact reachable in ≤ 2 clicks / < 10 s without 3D | **Met (amended)** | `recruiter.spec`: Contact plus email, LinkedIn and availability. *Amended per author (M5): no résumé download, so there's no résumé status to show* |
| 2 | Boot ≤ 3 s, skippable by button/key/click, auto-skipped on return | Met | `boot.spec` (3 tests) |
| 3 | View Portfolio: all sections and projects, correct badges, no 3D code, usable at 375 px | Met | `portfolio.spec` (no 3D requests; no horizontal scroll on touch) |
| 3a | Touch-first entry recommends View Portfolio and explains the keyboard need before loading 3D | Met | `touchEntry.spec`; `BootEntry.test` |
| 4 | Can't leave the walkable area; every island reachable | Met | `walkable.test` (sweep, no gap crossing), `validateWorld` in the prebuild, `playerMotion.test` |
| 5 | Guide leads 2–3 m ahead, waits/beckons beyond 7 m, greets, presents without opening anything | Met | `guideBrain.test` (13), `tour.spec` (deterministic) |
| 6 | Tour in order; first-visit reveal ≤ 2 s then panel; revisits/quick-nav instant; out-of-order visits; completes only after five zones | Met | `tour.spec`, `arrival.test`, `revealFlow.test` |
| 6a | Viewed content ≠ world visits; read-first keeps the full journey | Met | `tour.spec` "reading the CV first…", `store.test` |
| 7 | Three distinct artifacts, each opens its own project | Met | `tour.spec` "each artifact opens…" (XR demo link; 4-image game gallery) |
| 8 | Every non-confirmed item labeled; nothing invented | Met | `validateContent` in the prebuild (incl. corrected-claim guard), `cvContent.test`, `docs/cv-merge-review.md` |
| 9 | Focus trap, inert background, Esc, focus return; safe shortcuts; guidance without subtitles | Met | `Panel.test` (incl. nested panels and stacked-dialog inert), `TopBar.test`, `keyboard.spec`, `Subtitles.test` |
| 10 | Reduced motion removes typing, shortens reveals, stills motion | Met | `reducedMotion.spec`, `cameraRig.test` |
| 11 | Dialogue cooldowns and silence gap; dropped, not queued | Met | `dialogueDirector.test` |
| 12 | Every 3D failure leads to a working View Portfolio; top bar keeps working | **Met with known issue** | `errors.spec` (load failure, persistent failure, context loss). Known: the context-loss wording is sometimes the generic crash copy |
| 13 | No visible stutter on the author's hardware | **Met per author** | Author's `?debug` reading: 45–55 fps while moving. Adaptive quality locks after 3 recoveries |
| 14 | All tests pass; deployment live since checkpoint A, verified with the deployed smoke test | Met | Totals above; live smoke 22 passed |

## Not done or pending (author input)
- **GamePlay URL**: pending (shown as "[pending]" on the games project)
- **Engine of the four released games** (F1: screenshots show Construct, CVs say Unity) and their release status (F2)
- **Project 02 technology stack** (F3) and **store links** (F4)
- **WasteGo hackathon year**: not in any source, shown as "[pending]"
- Deferred minors from the final review are listed in the progress ledger. None blocks acceptance.
