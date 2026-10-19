# Phase 3: story and contact

**Status: delivered for your review.** The UI/UX phase and the final atmosphere and performance pass haven't started.

- Review it live: https://nullspace-saemmi-studios.vercel.app/?visual=v2 (and the default experience, which both changes also apply to; see below)

## 1. The XR Meditation System story moment

The first time on a visit that you come within the **XR Meditation System's** interaction range (the same range that shows the "open" prompt), the kokedama says your lines, word for word:

> Oh… this is actually where I was first born.

and then, after the first line has cleared and a 1.5 s pause:

> Well, not exactly me. But the idea that became me started here.

How it fits the existing systems:
- **Once per visit.** Leaving and coming back in the same visit doesn't repeat it. A new visit (page load) can hear it again.
- **It never covers the project information.** If you open the project straight away, the moment waits until the panel is closed and plays then. It also waits for any line already on screen. It's queued, not dropped.
- **It isn't interrupted.** While it plays, the guide's ordinary chatter is held back, so nothing talks over it.
- **Accessibility:**
  - It goes through the existing subtitle line and its polite live region, so screen readers get each full line once, without any change of focus.
  - Reduced motion shows the lines whole.
  - The Subtitles setting applies as usual.
- **In v2 the kokedama turns toward the artifact** while it speaks, and gets its usual speaking pulse.
- **It works in both looks.** It's narrative, not visual, so it lives in the shared dialogue system. The wording is stored with the dialogue content (`storyMoments` in `content/dialogue.ts`), keyed by the project, and tied to the project's id rather than its slot.

Screenshots (v2): `story-line-1.webp`, `story-line-2.webp`.

## 2. Public phone number

**+358 45 8629910** is now a contact channel, linked as **`tel:+358458629910`**. It opens in place, with no new tab.

| Where | Result |
|---|---|
| Contact panel in the 3D world (both looks) | Listed after Email, as a dialable link (`contact-panel.webp`) |
| Accessible 2D portfolio, desktop | Same (`portfolio-contact-desktop.webp`) |
| 2D portfolio at phone width | Same (`portfolio-contact-mobile.webp`) |
| v2 Signal Tower | It gets its **own transmitter stone and cable** automatically, from the same content. The stones now read left to right in CV order from the arrival ring: Email, Phone, GitHub, LinkedIn (`signal-tower-*.webp`) |

**Rules it replaces and keeps:**
- The phone number replaces the earlier "don't show my phone number" rule, at your explicit request. The tests that enforced the old rule now enforce the new one.
- Still excluded, and checked by tests: Discord, the personal YouTube channel, and any CV or résumé download.

**Content validation:** a phone channel must link as `tel:` with digits only (an optional leading `+`, no spaces). `tel:` isn't accepted on any other channel kind. Email still has to be `mailto:`, everything else `https:`.

## Tests

- **Unit and component:** 279/279.
- **End-to-end:** 50/50 (twice, plus a final run).

New in this phase:
- **The story sequence (unit):**
  - nothing until triggered
  - lines in order, the second only after the first has cleared plus the pause
  - waits, never drops, while a line or panel is showing
  - plays once however often it's triggered
- **The story moment (end-to-end):**
  - opening the project panel straight away holds the line back
  - closing it plays both lines in order
  - coming back doesn't repeat it
  - both lines are checked word for word through the live region
- **Phone, content:** the channel's exact value and `tel:` link; still no Discord or résumé.
- **Phone, contact view (component):** a dialable link that opens in place.
- **Phone, 2D portfolio (end-to-end, desktop and mobile):** the `tel:` link.
- **Content validation:** a `tel:` link accepted on a phone channel; a malformed one, or `tel:` on any other channel, flagged.
- **Signal Tower:** four stones from the content, and each discovered once (end-to-end).

## Noted for the UI/UX phase (not changed here)

- **Mobile 2D portfolio header:** at phone width the header doesn't cover the content scrolling under it, so text shows through behind the navigation (visible at the top of `portfolio-contact-mobile.webp`).
- **Subtitle hold time:** under very heavy load, the typed subtitle's hold timer can end before typing finishes. Normally typing finishes about 2.5 s early. Counting the hold from the end of typing would make it robust.
