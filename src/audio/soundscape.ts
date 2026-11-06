// NULLSPACE's sound: entirely synthesized in the browser with the Web Audio API (no audio files, so
// nothing to license or download). Off by default; it starts only when the visitor switches it on,
// which also satisfies browser autoplay rules. Quiet by design: a slow, evolving pad with distant
// glass tones and a rare shimmer, all through a generated reverb. No noise beds, no loops.

export type SoundSettings = { sound: boolean; volume: number }

/** Overall loudness for the settings: silent when off, a gentle curve up to a quiet maximum. */
export function masterGain(s: SoundSettings): number {
  if (!s.sound) return 0
  const v = Math.min(1, Math.max(0, s.volume))
  return 0.45 * v * v
}

/**
 * The ambient pad's chords (MIDI notes, four voices each), all in a soft low-to-middle register.
 * Every chord keeps a D, so moving between any two of them is a slow shift of colour, never a jump.
 */
export const AMBIENT_CHORDS: number[][] = [
  [50, 57, 64, 69], // D, A, E, A: open fifths
  [47, 54, 62, 69], // B minor 7
  [43, 55, 62, 66], // G major 7
  [45, 52, 62, 66], // D over A, with an E
  [48, 55, 62, 64], // C add 9
]

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12)

/** The next chord: any other one, picked at random. */
export function nextChord(current: number, rand: () => number = Math.random): number {
  const k = Math.floor(rand() * (AMBIENT_CHORDS.length - 1))
  return k >= current ? k + 1 : k
}

type Engine = { ctx: AudioContext; master: GainNode; fx: GainNode }
let engine: Engine | null = null

/** A procedural reverb: a dark stereo tail under a smooth decay. Only ever heard on tones, never alone. */
function makeSpace(ctx: AudioContext, seconds: number): ConvolverNode {
  const len = Math.floor(ctx.sampleRate * seconds)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < len; i++) {
      lp += 0.35 * (Math.random() * 2 - 1 - lp) // darken the tail
      d[i] = lp * Math.pow(1 - i / len, 2.6)
    }
  }
  const conv = ctx.createConvolver()
  conv.buffer = ir
  return conv
}

/** A slow sine LFO added to an AudioParam. */
function lfo(ctx: AudioContext, target: AudioParam, freq: number, depth: number): void {
  const o = ctx.createOscillator()
  o.frequency.value = freq
  const g = ctx.createGain()
  g.gain.value = depth
  o.connect(g).connect(target)
  o.start(ctx.currentTime + Math.random() * 4)
}

function createEngine(): Engine | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  const ctx = new Ctor()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // A long, dark space that everything distant passes through.
  const space = ctx.createGain()
  space.gain.value = 0.9
  space.connect(makeSpace(ctx, 6)).connect(master)

  const fx = ctx.createGain()
  fx.gain.value = 0.6
  fx.connect(master)
  const fxSend = ctx.createGain()
  fxSend.gain.value = 0.25
  fx.connect(fxSend).connect(space)

  // The pad: four voices, each two slightly detuned oscillators, through a slowly breathing low-pass.
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 720
  filter.Q.value = 0.4
  lfo(ctx, filter.frequency, 0.011, 260)
  const pad = ctx.createGain()
  pad.gain.value = 0.16
  const padSend = ctx.createGain()
  padSend.gain.value = 0.5
  filter.connect(pad).connect(master)
  pad.connect(padSend).connect(space)

  let chord = Math.floor(Math.random() * AMBIENT_CHORDS.length)
  const voices = AMBIENT_CHORDS[chord].map((m, v) => {
    const amp = ctx.createGain()
    amp.gain.value = 0.16
    lfo(ctx, amp.gain, 0.021 + v * 0.0137, 0.09) // each voice swells on its own slow cycle
    amp.connect(filter)
    return [-4, 4].map((cents, j) => {
      const o = ctx.createOscillator()
      o.type = j === 0 ? 'sine' : 'triangle'
      o.frequency.value = midiHz(m)
      o.detune.value = cents
      lfo(ctx, o.detune, 0.05 + v * 0.017, 3) // a slow drift keeps the beating alive
      const g = ctx.createGain()
      g.gain.value = j === 0 ? 0.7 : 0.3
      o.connect(g).connect(amp)
      o.start()
      return o
    })
  })

  // A soft sub an octave under the chord's root, swelling very slowly.
  const sub = ctx.createOscillator()
  sub.frequency.value = midiHz(AMBIENT_CHORDS[chord][0] - 12)
  const subGain = ctx.createGain()
  subGain.gain.value = 0.07
  lfo(ctx, subGain.gain, 0.008, 0.045)
  sub.connect(subGain).connect(master)
  sub.start()

  const live = () => engine !== null && soundRunning()
  const later = (fn: () => void, min: number, max: number) => window.setTimeout(fn, (min + Math.random() * (max - min)) * 1000)

  // Every 40–60 s the pad glides, over several seconds and one voice after another, to another chord.
  const changeChord = () => {
    if (live()) {
      chord = nextChord(chord)
      const t = ctx.currentTime
      AMBIENT_CHORDS[chord].forEach((m, v) => voices[v].forEach((o) => o.frequency.setTargetAtTime(midiHz(m), t + v * 1.5, 3.5)))
      sub.frequency.setTargetAtTime(midiHz(AMBIENT_CHORDS[chord][0] - 12), t, 5)
    }
    later(changeChord, 40, 60)
  }
  later(changeChord, 40, 60)

  // Now and then, a distant glass tone from the current chord, two octaves up, mostly reverb.
  const bell = () => {
    if (live()) {
      const notes = AMBIENT_CHORDS[chord]
      const f = midiHz(notes[Math.floor(Math.random() * notes.length)] + 24)
      const t = ctx.currentTime + 0.05
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.022, t + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 6)
      g.connect(space)
      const dry = ctx.createGain()
      dry.gain.value = 0.25
      g.connect(dry).connect(master)
      for (const [mult, level] of [
        [1, 1],
        [2.76, 0.18],
      ]) {
        const o = ctx.createOscillator()
        o.frequency.value = f * mult
        const og = ctx.createGain()
        og.gain.value = level
        o.connect(og).connect(g)
        o.start(t)
        o.stop(t + 6.2)
      }
    }
    later(bell, 10, 25)
  }
  later(bell, 6, 12)

  // Rarely, a faint cosmic shimmer: the chord three octaves up, blooming slowly and fading away.
  const shimmer = () => {
    if (live()) {
      const t = ctx.currentTime + 0.05
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.012, t + 3.5)
      g.gain.setTargetAtTime(0, t + 4, 2.2)
      g.connect(space)
      for (const m of AMBIENT_CHORDS[chord]) {
        const o = ctx.createOscillator()
        o.frequency.value = midiHz(m + 36)
        o.detune.value = (Math.random() - 0.5) * 14
        o.connect(g)
        o.start(t)
        o.stop(t + 16)
      }
    }
    later(shimmer, 45, 90)
  }
  later(shimmer, 25, 45)

  document.addEventListener('visibilitychange', () => {
    if (!engine) return
    if (document.visibilityState === 'hidden') void engine.ctx.suspend()
    else if (masterGain(currentSettings) > 0) void engine.ctx.resume()
  })
  return { ctx, master, fx }
}

let currentSettings: SoundSettings = { sound: false, volume: 0.6 }

/** Apply the visitor's sound settings. Creating the engine only happens once sound is on (a user gesture). */
export function applySoundSettings(s: SoundSettings): void {
  currentSettings = s
  const gain = masterGain(s)
  if (gain > 0 && !engine) engine = createEngine()
  if (!engine) return
  const { ctx, master } = engine
  if (gain > 0 && ctx.state !== 'running') void ctx.resume()
  // Fade in over a few seconds from silence; later changes (volume, mute) ease over about a second.
  master.gain.setTargetAtTime(gain, ctx.currentTime, master.gain.value < 0.001 && gain > 0 ? 1.0 : 0.35)
  if (gain === 0) window.setTimeout(() => masterGain(currentSettings) === 0 && void ctx.suspend(), 1500)
}

export function soundRunning(): boolean {
  return engine !== null && engine.ctx.state === 'running' && masterGain(currentSettings) > 0
}

/** A short enveloped tone into the effects bus. */
function tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'sine', bendTo?: number): void {
  if (!engine || !soundRunning()) return
  const { ctx, fx } = engine
  const o = ctx.createOscillator()
  o.type = type
  const t0 = ctx.currentTime + at
  o.frequency.setValueAtTime(freq, t0)
  if (bendTo) o.frequency.exponentialRampToValueAtTime(bendTo, t0 + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(fx)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

/** The kokedama speaking: a soft, wordless chirp (no voice). */
export function chirp(): void {
  const base = 520 + Math.random() * 90
  tone(base, 0, 0.12, 0.12, 'sine', base * 1.35)
  tone(base * 1.2, 0.09, 0.14, 0.09, 'sine', base * 0.95)
}

/** Something discovered (a portal walked through, a project or district found). */
export function chime(): void {
  tone(659.3, 0, 0.9, 0.08, 'sine')
  tone(987.8, 0.12, 1.1, 0.06, 'sine')
}

/** A panel opening. */
export function tick(): void {
  tone(880, 0, 0.06, 0.05, 'triangle')
}
