// NULLSPACE's sound: entirely synthesized in the browser with the Web Audio API (no audio files, so
// nothing to license or download). Off by default; it starts only when the visitor switches it on,
// which also satisfies browser autoplay rules. Quiet by design.

export type SoundSettings = { sound: boolean; volume: number }

/** Overall loudness for the settings: silent when off, a gentle curve up to a quiet maximum. */
export function masterGain(s: SoundSettings): number {
  if (!s.sound) return 0
  const v = Math.min(1, Math.max(0, s.volume))
  return 0.45 * v * v
}

type Engine = { ctx: AudioContext; master: GainNode; fx: GainNode }
let engine: Engine | null = null

function createEngine(): Engine | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  const ctx = new Ctor()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)
  const fx = ctx.createGain()
  fx.gain.value = 0.6
  fx.connect(master)

  // Ambient drone: two soft, slightly detuned low tones through a slowly breathing low-pass filter.
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 380
  filter.Q.value = 0.7
  const drone = ctx.createGain()
  drone.gain.value = 0.22
  filter.connect(drone).connect(master)
  for (const [freq, type, gain] of [
    [55, 'sine', 0.6],
    [82.6, 'triangle', 0.25],
    [110.3, 'sine', 0.18],
  ] as const) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = gain
    o.connect(g).connect(filter)
    o.start()
  }
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.05
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.value = 140
  lfo.connect(lfoDepth).connect(filter.frequency)
  lfo.start()

  // Void "wind": filtered noise, barely there.
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 600
  band.Q.value = 0.5
  const wind = ctx.createGain()
  wind.gain.value = 0.035
  src.connect(band).connect(wind).connect(master)
  src.start()

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
  master.gain.setTargetAtTime(gain, ctx.currentTime, 0.4)
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
