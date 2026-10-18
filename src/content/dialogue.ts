// The kokedama's lines. Draft flavour text for the author to rewrite freely — they are jokes about
// the void, never claims about the author's career. Keep them short; silence does most of the work.
import type { DialogueTable } from '../core/dialogueDirector'

const S = 1000

export const dialogue: DialogueTable = {
  firstMeet: { lines: ['Oh. A visitor. Follow me — the void has no signage.'], cooldownMs: 0, probability: 1, once: true },
  greet: { lines: ['There you are.', 'Welcome back to the tour you wandered off from.', 'Good. I was beginning to photosynthesize alone.'], cooldownMs: 30 * S, probability: 0.8 },
  wait: { lines: ['I can wait. I am moss.', 'Take your time. Nothing here expires. Probably.', 'This way. The glowing spores were a hint.'], cooldownMs: 25 * S, probability: 1 },
  boundary: { lines: ['The void is not a shortcut.', 'That edge is load-bearing. For you.', 'Falling is not on the itinerary.'], cooldownMs: 20 * S, probability: 0.9 },
  idle: { lines: ['Free roam. Bold.'], cooldownMs: 120 * S, probability: 0.3 },
  tourComplete: { lines: ['That is everything. Feel free to drift. I will.'], cooldownMs: 0, probability: 1, once: true },
  skipTour: { lines: ['Skipping ahead. Very efficient. Very recruiter.'], cooldownMs: 60 * S, probability: 0.7 },

  'arrive:education': { lines: ['Education. Where it started.'], cooldownMs: 0, probability: 1 },
  'arrive:experience': { lines: ['Experience. Each frame is a chapter.'], cooldownMs: 0, probability: 1 },
  'arrive:projects': { lines: ['Projects. Touch the artifacts. Gently.'], cooldownMs: 0, probability: 1 },
  'arrive:skills': { lines: ['Skills. The cubes are not decorative. Mostly.'], cooldownMs: 0, probability: 1 },
  'arrive:contact': { lines: ['Contact. The antenna is very eager.'], cooldownMs: 0, probability: 1 },

  'revisit:education': { lines: ['Back for a second read?'], cooldownMs: 45 * S, probability: 0.5 },
  'revisit:experience': { lines: ['Still the same frames. I checked.'], cooldownMs: 45 * S, probability: 0.5 },
  'revisit:projects': { lines: ['The artifacts missed you. Probably.'], cooldownMs: 45 * S, probability: 0.5 },
  'revisit:skills': { lines: ['The cubes stay where you left them.'], cooldownMs: 45 * S, probability: 0.5 },
  'revisit:contact': { lines: ['Ready to say hello?'], cooldownMs: 45 * S, probability: 0.5 },
}
