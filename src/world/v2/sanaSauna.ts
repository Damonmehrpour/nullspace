// The SanaSauna exhibit on the Projects atrium floor: a small sauna cabin under a pitched roof and a
// tilted word-puzzle board in front of it. Shared by its meshes (WordGame) and its collider.
// Exhibit-local space: +x faces the atrium's centre, z runs across the exhibit, y is up.

export const EXHIBIT = {
  /** The base slab every part stands on: its footprint is the collider. */
  base: { d: 1.3, w: 1.7, h: 0.1 },
  cabin: { x0: -0.62, x1: 0.02, w: 1.0, h: 0.82 },
  roof: { pitch: (34 * Math.PI) / 180, overhang: 0.1, t: 0.06 },
  board: { x: 0.36, y: 0.52, size: 0.86, tilt: (52 * Math.PI) / 180 },
}

/**
 * The board's crossword: SAUNA across the bottom row, SANA and VIHTA (the game's currency, the sauna
 * whisk) down into it. Rows top to bottom; '.' is an empty square.
 */
export const CROSSWORD = ['....V', '.S..I', '.A..H', '.N..T', 'SAUNA']

/** Ridge height of the cabin's roof above the floor. */
export function ridgeHeight(): number {
  const { cabin, roof, base } = EXHIBIT
  return base.h + cabin.h + Math.tan(roof.pitch) * ((cabin.x1 - cabin.x0) / 2 + roof.overhang)
}
