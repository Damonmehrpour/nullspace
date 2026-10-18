/**
 * Tiny cue channel from the world to the kokedama's body, read every frame. `seq` changes when the
 * player discovers something (e.g. walks through an Experience portal); the body answers with a
 * small hop and a brief glow. Purely visual; it doesn't touch the guide's brain or dialogue.
 */
export const guideCue = { seq: 0 }
