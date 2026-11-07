import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BoxGeometry, CanvasTexture, Color, DoubleSide, ExtrudeGeometry, MeshBasicMaterial, Path, Shape, ShapeGeometry, type BufferGeometry, type Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { WorldLayout } from '../../content/world'
import { useStore } from '../../state/store'
import { DRAG_THRESHOLD } from '../CameraControls'
import { reducedMotion } from '../sim'
import { at, TITLE_FONT, yawFor } from '../space'
import { concreteMaterial } from './concrete'
import { ContactShadow } from './ContactShadow'
import { IslandSlab } from './IslandSlab'
import { facet, PORTAL } from './portalLayout'

// The portfolio portal: where the monolith stood, a twelve-sided gateway of layered rings between two
// angular pylons, its aperture a deep void with a slow iris of light. It is the way out of the 3D
// world into the 2D Portfolio: near it, a prompt offers it; E, Enter, a click or a tap goes through.
// Portal-local space: +x is the front (toward the spawn and the bridge), z across, y up.

const { cy, ring, halo, pylon, sides } = PORTAL

/** A twelve-sided outline at radius r around the aperture's centre, in the (z, y) plane. */
function polygon(target: Shape | Path, r: number, turn = 0) {
  for (let k = 0; k <= sides; k++) {
    const a = facet(k % sides) + turn
    const z = r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    if (k === 0) target.moveTo(z, y)
    else target.lineTo(z, y)
  }
}

/** A faceted ring (rIn..rOut) extruded along x, centred on `x`. */
function facetedRing(rIn: number, rOut: number, depth: number, x: number, turn = 0): BufferGeometry {
  const s = new Shape()
  polygon(s, rOut, turn)
  const hole = new Path()
  polygon(hole, rIn, turn)
  s.holes.push(hole)
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: false })
  g.rotateY(-Math.PI / 2) // shape x → z, extrusion → -x
  return ready(g.translate(x + depth / 2, 0, 0))
}

function ready(g: BufferGeometry): BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g
  if (out.getAttribute('uv')) out.deleteAttribute('uv')
  return out
}

function block(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.04): BufferGeometry {
  const g = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, Math.min(r, (x1 - x0) / 2.2, (y1 - y0) / 2.2, (z1 - z0) / 2.2))
  return ready(g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
}

/** A block standing on the ring at angle `a`, from radius r0 to r1 (tangential width w, x from x0 to x1). */
function onRing(a: number, r0: number, r1: number, w: number, x0: number, x1: number): BufferGeometry {
  const g = new RoundedBoxGeometry(x1 - x0, r1 - r0, w, 1, 0.03)
  g.translate((x0 + x1) / 2, (r0 + r1) / 2, 0)
  g.rotateX(Math.PI / 2 - a) // +y (radial) turns to the angle a in the (z, y) plane, measured from +z
  return ready(g.translate(0, cy, 0))
}

/** The stone: main ring with its inner lip and rims, the set-back halo and its struts, clamps, sill steps and pylons. */
function stoneGeometry(): BufferGeometry {
  const front = ring.depth / 2
  const haloX = -front - halo.back - halo.depth / 2
  const parts: BufferGeometry[] = [
    facetedRing(ring.rIn, ring.rOut, ring.depth, 0),
    facetedRing(ring.rIn - 0.12, ring.rIn + 0.04, ring.depth + 0.24, 0), // the inner lip, proud of both faces
    facetedRing(ring.rOut - 0.1, ring.rOut + 0.05, 0.12, front + 0.04), // front rim
    facetedRing(ring.rOut - 0.1, ring.rOut + 0.05, 0.12, -front - 0.04), // back rim
    facetedRing(halo.rIn, halo.rOut, halo.depth, haloX, Math.PI / sides),
  ]
  // Struts from the ring's back to the halo, every other facet.
  for (let k = 0; k < sides; k += 2) parts.push(onRing(facet(k), ring.rOut - 0.2, halo.rIn + 0.12, 0.16, haloX, -front + 0.05))
  // Clamps over the ring's upper facets, and a heavier keystone clamp at the top.
  for (const k of [1, 4]) parts.push(onRing(facet(k), ring.rOut - 0.25, ring.rOut + 0.3, 0.5, -front - 0.15, front + 0.18))
  parts.push(onRing(Math.PI / 2, ring.rOut - 0.25, ring.rOut + 0.45, 0.8, -front - 0.2, front + 0.22))
  // Steps up to the raised sill, front and back.
  const sillTop = cy - ring.rIn * Math.cos(Math.PI / sides)
  const sillZ = ring.rIn * Math.sin(Math.PI / sides) + 0.5
  for (const s of [1, -1]) {
    parts.push(block(Math.min(s * front, s * (front + 0.4)), Math.max(s * front, s * (front + 0.4)), 0, sillTop * 0.5, -sillZ, sillZ, 0.03))
  }
  // Pylons: angular buttresses leaning back, and the arms that hold the ring between them.
  for (const side of [-1, 1]) {
    const prof = new Shape()
    prof.moveTo(pylon.x0, 0)
    prof.lineTo(pylon.x1, 0)
    prof.lineTo(pylon.x1 - 0.45, pylon.h)
    prof.lineTo(pylon.x0 + 0.25, pylon.h + pylon.top)
    prof.lineTo(pylon.x0, 0)
    const g = new ExtrudeGeometry(prof, { depth: pylon.z1 - pylon.z0, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 })
    parts.push(ready(g.translate(0, 0, side < 0 ? -pylon.z1 : pylon.z0)))
    const z0 = side * (ring.rOut - 0.2)
    const z1 = side * (pylon.z0 + 0.1)
    parts.push(block(-0.32, 0.32, cy - 0.28, cy + 0.28, Math.min(z0, z1), Math.max(z0, z1)))
    // A plinth course along the pylon's foot.
    parts.push(block(pylon.x0 - 0.08, pylon.x1 + 0.08, 0, 0.18, side < 0 ? -pylon.z1 - 0.08 : pylon.z0 - 0.08, side < 0 ? -pylon.z0 + 0.08 : pylon.z1 + 0.08, 0.03))
  }
  return mergeGeometries(parts, false)!
}

/** Accents: a fine line round the lip on both faces, slots in the arms and the pylons, and the step edges. */
function accentGeometry(): BufferGeometry {
  const front = ring.depth / 2
  const lip = (x: number) => {
    const s = new Shape()
    polygon(s, ring.rIn - 0.05)
    const h = new Path()
    polygon(h, ring.rIn - 0.085)
    s.holes.push(h)
    const g = new ShapeGeometry(s)
    g.rotateY(Math.sign(x) > 0 ? -Math.PI / 2 : Math.PI / 2)
    return ready(g.translate(x, 0, 0))
  }
  const parts = [lip(front + 0.125), lip(-front - 0.125)]
  for (const side of [-1, 1]) {
    parts.push(ready(new BoxGeometry(0.02, 0.05, 0.5).translate(0.33, cy, side * (ring.rOut + 0.08))))
    parts.push(ready(new BoxGeometry(0.02, pylon.h - 1.2, 0.05).rotateZ(-0.1).translate(pylon.x1 - 0.2 + 0.006, (pylon.h - 1.2) / 2 + 0.5, side * (pylon.z0 + pylon.z1) / 2)))
  }
  const sillZ = ring.rIn * Math.sin(Math.PI / sides) + 0.5
  parts.push(ready(new BoxGeometry(0.02, 0.025, sillZ * 2 - 0.2).translate(front + 0.41, (cy - ring.rIn * Math.cos(Math.PI / sides)) * 0.5 - 0.02, 0)))
  return mergeGeometries(parts, false)!
}

/** The iris: three thin faceted rings receding into the aperture. */
function irisGeometry(): BufferGeometry {
  const ringAt = (r: number, x: number, turn: number) => {
    const s = new Shape()
    polygon(s, r + 0.02, turn)
    const h = new Path()
    polygon(h, r - 0.02, turn)
    s.holes.push(h)
    const g = new ShapeGeometry(s)
    g.rotateY(-Math.PI / 2)
    return ready(g.translate(x, -cy, 0))
  }
  return mergeGeometries([ringAt(1.75, 0.18, 0), ringAt(1.25, 0.04, Math.PI / sides), ringAt(0.75, -0.1, 0)], false)!
}

/** A soft white disc fading to nothing at its edge (tinted by the material). */
function glowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  if (!g) return null
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

/** The portfolio portal on its plinth. */
export function PortalV2({ layout }: { layout: WorldLayout }) {
  const { centre, plinthRadius } = layout.monolith
  const stone = useMemo(() => stoneGeometry(), [])
  const accents = useMemo(() => accentGeometry(), [])
  const iris = useMemo(() => irisGeometry(), [])
  const void_ = useMemo(() => {
    const s = new Shape()
    polygon(s, ring.rIn - 0.08)
    return ready(new ShapeGeometry(s).rotateY(-Math.PI / 2).translate(-0.25, 0, 0))
  }, [])
  // Its own transparent concrete, so the portal can fade when it blocks the camera (as the monolith did;
  // the transparent variant is compiled at startup either way).
  const stoneMat = useMemo(() => {
    const base = concreteMaterial('#e6e3dc')
    const m = base.clone()
    m.onBeforeCompile = base.onBeforeCompile
    m.customProgramCacheKey = base.customProgramCacheKey
    m.transparent = true
    return m
  }, [])
  const accentMat = useMemo(() => new MeshBasicMaterial({ color: '#cfe6bd', toneMapped: false, transparent: true, side: DoubleSide }), [])
  const irisMat = useMemo(() => new MeshBasicMaterial({ color: '#b7cfa6', toneMapped: false, transparent: true, opacity: 0.3, depthWrite: false, side: DoubleSide }), [])
  const voidMat = useMemo(() => new MeshBasicMaterial({ color: '#06100a', side: DoubleSide, transparent: true }), [])
  const glowTex = useMemo(() => glowTexture(), [])
  const glowMat = useMemo(() => new MeshBasicMaterial({ map: glowTex, color: '#7fbf4a', transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, fog: false }), [glowTex])
  const irisRef = useRef<Group>(null)
  const labelRef = useRef<{ fillOpacity: number; color: Color | string } | null>(null)
  const warmth = useRef(0)
  const dim = useMemo(() => new Color('#8fa884'), [])
  const lit = useMemo(() => new Color('#e9f6dc'), [])
  const enterPortal = useStore((s) => s.enterPortal)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useStore.getState()
    // Brighten as the player comes within reach; flare while the transition plays.
    const target = s.portalTransit ? 1.6 : s.nearPortal ? 1 : 0
    warmth.current += (target - warmth.current) * (1 - Math.exp(-dt * 5))
    const w = Math.min(1, warmth.current)
    const fade = stoneMat.opacity
    accentMat.color.copy(dim).lerp(lit, w)
    accentMat.opacity = fade
    irisMat.opacity = (0.18 + 0.22 * w) * fade
    voidMat.opacity = fade
    glowMat.opacity = (0.16 + 0.3 * warmth.current) * fade
    if (irisRef.current && !reducedMotion()) irisRef.current.rotation.x += dt * (0.08 + 0.5 * warmth.current)
    const label = labelRef.current
    if (label) label.fillOpacity = (0.45 + 0.55 * w) * fade
  })

  const activate = (e: { stopPropagation(): void; delta: number }) => {
    e.stopPropagation()
    if (e.delta > DRAG_THRESHOLD) return // the end of a camera drag, not a click
    enterPortal()
  }

  return (
    <group position={at(centre)}>
      <IslandSlab position={[0, 0, 0]} radius={plinthRadius} depth={4.5} seed={3.3} />
      <group rotation={[0, yawFor(PORTAL.facing), 0]}>
        <ContactShadow position={[-0.4, 0, 0]} size={[3.4, 8.4]} opacity={0.45} />
        <group onClick={activate} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
          <mesh name="v2-monolith" geometry={stone} material={stoneMat} userData={{ blocksCamera: true, fadeOnBlock: true }} />
          <mesh name="v2-portal-void" geometry={void_} material={voidMat} />
        </group>
        <mesh name="v2-portal-accents" geometry={accents} material={accentMat} />
        <group ref={irisRef} position={[0, cy, 0]}>
          <mesh name="v2-portal-iris" geometry={iris} material={irisMat} />
        </group>
        {/* A soft bloom in the aperture, faked with an additive card (no post-processing). */}
        <mesh position={[0.05, cy, 0]} rotation={[0, Math.PI / 2, 0]} material={glowMat}>
          <planeGeometry args={[ring.rIn * 2.2, ring.rIn * 2.2]} />
        </mesh>
        {/* The way in, inlaid in the floor in front of the step, reading toward the approach. */}
        <Text
          name="v2-portal-label"
          ref={(t) => void (labelRef.current = t as unknown as { fillOpacity: number; color: Color | string } | null)}
          font={TITLE_FONT}
          position={[ring.depth / 2 + 1.05, 0.015, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          fontSize={0.3}
          letterSpacing={0.18}
          color="#cfe6bd"
          anchorX="center"
          anchorY="middle"
        >
          PORTFOLIO
        </Text>
      </group>
    </group>
  )
}
