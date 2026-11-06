import { Color } from 'three'

/** Stars drawn at each quality level: one buffer, fewer of it drawn on slower devices (no shader change). */
export const STAR_COUNTS = { high: 12000, medium: 7000, low: 3000 } as const
const TOTAL = STAR_COUNTS.high

// Cool whites and pale blues from the void's palette, with the odd faint warm star.
const TINTS = ['#e6ecf7', '#c9d6ee', '#a9bde0', '#dfe4ec', '#efe2cc'].map((c) => new Color(c))
const TINT_WEIGHTS = [0.34, 0.26, 0.2, 0.14, 0.06]

/**
 * A deterministic sky: three depth layers (many tiny distant stars, fewer mid ones, a rare bright near
 * one), a few faint clusters and a soft dusty band. Order is shuffled so any prefix is an even sample.
 */
export function buildStars(total = TOTAL) {
  let s = 99991
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
  const dir = (): [number, number, number] => {
    const u = rnd() * 2 - 1
    const t = rnd() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    return [r * Math.cos(t), u, r * Math.sin(t)]
  }
  const norm = (v: [number, number, number]): [number, number, number] => {
    const l = Math.hypot(...v)
    return [v[0] / l, v[1] / l, v[2] / l]
  }
  const clusters = Array.from({ length: 7 }, () => {
    const d = dir()
    return norm([d[0], Math.abs(d[1]) * 0.8 + 0.1, d[2]]) // above the horizon, where they're seen
  })
  // The band: a great circle tilted across the sky.
  const bandN = norm([0.35, 0.9, -0.25])
  const bandU = norm([bandN[1], -bandN[0], 0])
  const bandV: [number, number, number] = [bandN[1] * bandU[2] - bandN[2] * bandU[1], bandN[2] * bandU[0] - bandN[0] * bandU[2], bandN[0] * bandU[1] - bandN[1] * bandU[0]]

  const pos = new Float32Array(total * 3)
  const size = new Float32Array(total)
  const bright = new Float32Array(total)
  const color = new Float32Array(total * 3)
  const phase = new Float32Array(total)
  for (let i = 0; i < total; i++) {
    const kind = rnd()
    let d: [number, number, number]
    let sz: number
    let br: number
    if (kind < 0.12) {
      // Faint cluster member.
      const c = clusters[Math.floor(rnd() * clusters.length)]
      d = norm([c[0] + gauss() * 0.045, c[1] + gauss() * 0.045, c[2] + gauss() * 0.045])
      sz = 1.0 + rnd() * 0.6
      br = 0.3 + rnd() * 0.3
    } else if (kind < 0.3) {
      // Dust band: many dim specks hugging the great circle.
      const a = rnd() * Math.PI * 2
      const off = gauss() * 0.07
      d = norm([bandU[0] * Math.cos(a) + bandV[0] * Math.sin(a) + bandN[0] * off, bandU[1] * Math.cos(a) + bandV[1] * Math.sin(a) + bandN[1] * off, bandU[2] * Math.cos(a) + bandV[2] * Math.sin(a) + bandN[2] * off])
      sz = 0.9 + rnd() * 0.5
      br = 0.2 + rnd() * 0.22
    } else {
      d = dir()
      const layer = rnd()
      if (layer < 0.74) {
        sz = 1.0 + rnd() * 0.7
        br = 0.3 + rnd() * 0.32
      } else if (layer < 0.96) {
        sz = 1.5 + rnd() * 0.8
        br = 0.45 + rnd() * 0.35
      } else {
        sz = 2.3 + rnd() * 0.9
        br = 0.75 + rnd() * 0.25
      }
    }
    // Fainter toward the abyss below the horizon.
    if (d[1] < 0) br *= Math.max(0.25, 1 + d[1] * 1.2)
    const r = 300 + rnd() * 120
    pos.set([d[0] * r, d[1] * r, d[2] * r], i * 3)
    size[i] = sz
    bright[i] = br
    let w = rnd()
    let t = 0
    while (t < TINTS.length - 1 && w > TINT_WEIGHTS[t]) w -= TINT_WEIGHTS[t++]
    color.set([TINTS[t].r, TINTS[t].g, TINTS[t].b], i * 3)
    phase[i] = rnd() * Math.PI * 2
  }
  // Shuffle, so drawing only the first N stars still covers the whole sky evenly.
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    for (const [arr, n] of [
      [pos, 3],
      [color, 3],
      [size, 1],
      [bright, 1],
      [phase, 1],
    ] as const) {
      for (let k = 0; k < n; k++) {
        const a = arr[i * n + k]
        arr[i * n + k] = arr[j * n + k]
        arr[j * n + k] = a
      }
    }
  }
  return { pos, size, bright, color, phase }
}
