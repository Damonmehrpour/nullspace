import { CanvasTexture, SRGBColorSpace } from 'three'

let radial: CanvasTexture | null = null
let rect: CanvasTexture | null = null

function make(draw: (g: CanvasRenderingContext2D, s: number) => void, size = 128): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  draw(g, size)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** Soft round falloff (black, alpha from centre) for blob/contact shadows. Generated once. */
export function radialShadowTexture(): CanvasTexture {
  radial ??= make((g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(0.45, 'rgba(0,0,0,0.55)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, s, s)
  })
  return radial
}

/** Soft rectangular falloff for contact shadows under buildings. Generated once. */
export function rectShadowTexture(): CanvasTexture {
  rect ??= make((g, s) => {
    g.filter = `blur(${s * 0.09}px)`
    g.fillStyle = 'black'
    g.fillRect(s * 0.16, s * 0.16, s * 0.68, s * 0.68)
  })
  return rect
}
