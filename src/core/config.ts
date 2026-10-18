// Every tunable number lives here, with the spec's values (spec sections 6 and 8).

export const BOOT_MS = 2500

/** Largest simulation step; protects against huge deltas after a backgrounded tab. */
export const MAX_DT = 0.1

/** The lazy 3D chunk exists; Enter loads it. */
export const WORLD_AVAILABLE = true

export const WALK = {
  /** Sweep substep (m). Must stay below the narrowest strip half-width and void gap (validateWorld checks). */
  maxSubstep: 0.2,
} as const

export const PLAYER = {
  speed: 4,
  accelTime: 0.15,
  boundaryPushS: 0.6,
  height: 0.5,
} as const

export const CAMERA = {
  distance: 6,
  height: 3.5,
  guideBiasMax: 0.15,
  guideBiasOffDistance: 10,
  turnRateDegPerS: 60,
  steadyBeforeTurnS: 0.4,
  ignoreReversalS: 0.3,
  pullbackMax: 1.5,
} as const

export const GUIDE = {
  leadAheadMin: 2,
  leadAheadMax: 3,
  resumeLeadDist: 5,
  startWaitDist: 7,
  greetDist: 1.5,
  greetS: 0.5,
  arriveS: 0.5,
  waitDialogueS: 4,
  idleOffset: 2,
  offRouteSnap: 1,
  speedCapFactor: 1.15,
  bobAmp: 0.15,
  hover: 1.2,
} as const

export const TOUR = {
  rearmMargin: 0.75,
} as const

export const DIALOGUE = {
  globalGapMs: 8000,
  typeCharsPerS: 40,
  holdBaseMs: 2500,
  holdPerCharMs: 40,
} as const

export const REVEAL = {
  firstMs: 2000,
  reducedMs: 300,
  revisitMs: 0,
} as const
