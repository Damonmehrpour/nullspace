# Manual checklist

Things automation can't judge: feel, readability, comfort. Use real keyboard input on the live site or `npm run preview`, with no test hooks.

## Full-tour playthrough (plan Task 25, step 6)

Status: **waiting for the author's run.** Claude's in-app browser pane is throttled to about 2 fps while hidden, so a fair real-time playthrough wasn't possible there.

| Check | Expected | Result |
|---|---|---|
| Follow the guide from spawn through all 5 islands | Guide leads 2–3 m ahead; the tour reaches Education → Experience → Projects → Skills → Contact | |
| Fall behind on the bridge | Guide stops, turns to you and beckons after you're more than 7 m away; greets you when you come back | |
| Fall behind on a walkway | Same as above | |
| Stand outside an arrival zone for 30 s | Guide hovers at the island beckoning (`present`); no panel opens by itself | |
| Visit an island out of order | Its reveal plays, its panel opens, and the guide re-routes after you close it | |
| Revisit an island | Panel opens instantly, with no reveal | |
| Camera: tight U-turns, walking the bridge, running away from the guide | No whipping or disorientation; the player stays framed | |
| Lead distance and beckon readability | You can always tell where to go | |

Notes:

## Verified by Claude (automated or scripted)

- The guide state machine, routing, waiting and arrivals are covered by unit tests (`tests/unit/guideBrain.test.ts`, `tour.test.ts`, `arrival.test.ts`).
- End to end, on a deterministic clock (`tests/e2e/tour.spec.ts`): lead → present → arrive for all 5 islands, tour completion only after the 5th, out-of-order visits, read-first-then-play, quick-nav not counting as a visit, and touch "Guide me there".
- Real-time headless Chromium (software WebGL, no GPU): about 38 fps, and the guide leads in real time.
- Scripted keyboard walk in dev: the player walks the bridge and slides on its edges, and the camera follows.
