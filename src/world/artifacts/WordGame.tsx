import { useMemo } from 'react'
import { BoxGeometry, CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { concreteMaterial } from '../v2/concrete'
import { CROSSWORD, EXHIBIT } from '../v2/sanaSauna'

const TILE = '#e6e1d6'
const INK = '#3d3a35'
const FOLK = '#9c4a3f' // a muted folk-art red, the exhibit's one accent
const BOARD = '#cfc9bc'

/** Paints the crossword board: letter tiles on a pale ground, framed by a band of eight-point stars. */
function boardTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const n = 512
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')
  if (!g) return null
  g.fillStyle = BOARD
  g.fillRect(0, 0, n, n)
  // Folk border: a row of small eight-point stars (two overlaid squares) on each side.
  const star = (x: number, y: number, r: number) => {
    g.save()
    g.translate(x, y)
    g.fillStyle = FOLK
    for (const a of [0, Math.PI / 4]) {
      g.save()
      g.rotate(a)
      g.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4)
      g.restore()
    }
    g.fillStyle = BOARD
    g.beginPath()
    g.arc(0, 0, r * 0.32, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  const band = 44
  for (let i = 0; i < 9; i++) {
    const t = band / 2 + (i * (n - band)) / 8
    star(t, band / 2, 11)
    star(t, n - band / 2, 11)
    if (i > 0 && i < 8) {
      star(band / 2, t, 11)
      star(n - band / 2, t, 11)
    }
  }
  // The grid of letter tiles.
  const inner = n - band * 2 - 16
  const cell = inner / CROSSWORD.length
  const ox = band + 8
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `800 ${Math.round(cell * 0.56)}px Archivo, system-ui, sans-serif`
  CROSSWORD.forEach((row, r) =>
    [...row].forEach((ch, k) => {
      const x = ox + k * cell
      const y = ox + r * cell
      if (ch === '.') {
        g.strokeStyle = 'rgba(61,58,53,0.18)'
        g.lineWidth = 2
        g.strokeRect(x + 6, y + 6, cell - 12, cell - 12)
        return
      }
      g.fillStyle = TILE
      g.fillRect(x + 4, y + 4, cell - 8, cell - 8)
      g.fillStyle = 'rgba(0,0,0,0.12)'
      g.fillRect(x + 4, y + cell - 10, cell - 8, 6) // a little thickness under each tile
      g.fillStyle = ch === 'S' && r === 4 && k === 0 ? FOLK : INK
      g.fillText(ch, x + cell / 2, y + cell / 2 + 2)
    }),
  )
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** The cabin, its pitched roof and chimney, the board's frame and stand, and the base: one merged mesh. */
function bodyGeometry(): BufferGeometry {
  const { base, cabin, roof, board } = EXHIBIT
  const parts: BufferGeometry[] = []
  const add = (g: BufferGeometry) => {
    g.deleteAttribute('uv')
    parts.push(g.toNonIndexed())
  }
  add(new RoundedBoxGeometry(base.d, base.h, base.w, 1, 0.03).translate(0, base.h / 2, 0))
  const cd = cabin.x1 - cabin.x0
  const cx = (cabin.x0 + cabin.x1) / 2
  add(new RoundedBoxGeometry(cd, cabin.h, cabin.w, 1, 0.025).translate(cx, base.h + cabin.h / 2, 0))
  // A low doorway step and two horizontal log-like courses across the front, for the cabin's character.
  for (const y of [0.3, 0.58]) add(new BoxGeometry(0.03, 0.035, cabin.w + 0.02).translate(cabin.x1 + 0.01, base.h + y, 0))
  // Roof: two slabs meeting at a ridge along z.
  const half = cd / 2 + roof.overhang
  const slope = half / Math.cos(roof.pitch)
  const eave = base.h + cabin.h
  for (const side of [-1, 1]) {
    const g = new RoundedBoxGeometry(slope, roof.t, cabin.w + roof.overhang * 2, 1, 0.02)
    g.rotateZ(-side * roof.pitch)
    g.translate(cx + (side * half) / 2, eave + (Math.tan(roof.pitch) * half) / 2 + roof.t / 2, 0)
    add(g)
  }
  // Gable walls under the roof (triangles approximated by a stepped pair of blocks).
  for (const [k, f] of [
    [0, 0.62],
    [1, 0.28],
  ] as const)
    add(new BoxGeometry(cd * f, 0.09, cabin.w).translate(cx, eave + 0.045 + k * 0.09, 0))
  // Chimney: the stove (kiuas) pipe rising through the back slope.
  add(new RoundedBoxGeometry(0.12, 0.42, 0.12, 1, 0.02).translate(cabin.x0 + 0.16, eave + 0.32, cabin.w * 0.28))
  // The board's frame and its stand.
  const frame = new RoundedBoxGeometry(0.05, board.size + 0.08, board.size + 0.08, 1, 0.015)
  frame.rotateZ(board.tilt).translate(board.x, board.y, 0)
  add(frame)
  // The stand stops below the tilted face (it would poke through the board otherwise).
  const standH = board.y - 0.22 - base.h
  add(new RoundedBoxGeometry(0.18, standH, board.size * 0.6, 1, 0.02).translate(board.x + 0.03, base.h + standH / 2, 0))
  return mergeGeometries(parts, false)!
}

/** SanaSauna: a small sauna cabin and a crossword board of its words, in folk-art red and concrete. */
export function WordGame() {
  const { board, cabin, base } = EXHIBIT
  const body = useMemo(() => bodyGeometry(), [])
  const face = useMemo(() => {
    const g = new PlaneGeometry(board.size, board.size)
    // The plane faces +z; turn it to face +x (the atrium), then tilt it back with the board.
    g.rotateY(Math.PI / 2)
    g.translate(0.028, 0, 0)
    g.rotateZ(board.tilt)
    g.translate(board.x, board.y, 0)
    return g
  }, [board])
  const faceMat = useMemo(() => {
    const map = boardTexture()
    return new MeshBasicMaterial({ map, color: map ? '#ffffff' : BOARD })
  }, [])
  const glowMat = useMemo(() => new MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }), [])
  return (
    <group>
      <mesh name="v2-wordgame" geometry={body} material={concreteMaterial('#e8e3d8')} />
      <mesh name="v2-wordgame-board" geometry={face} material={faceMat} />
      {/* Löyly light: a warm doorway glow and a spark at the chimney's top. */}
      <mesh position={[cabin.x1 + 0.006, base.h + 0.3, -0.22]} material={glowMat}>
        <boxGeometry args={[0.01, 0.42, 0.22]} />
      </mesh>
      <mesh position={[cabin.x0 + 0.16, base.h + cabin.h + 0.54, cabin.w * 0.28]} material={glowMat}>
        <boxGeometry args={[0.07, 0.02, 0.07]} />
      </mesh>
    </group>
  )
}
