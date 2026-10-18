import { useMemo } from 'react'
import { BoxGeometry, Matrix4, MeshBasicMaterial, Quaternion, Vector3, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { WorldLayout } from '../../content/world'
import { v, type Vec2 } from '../../core/geometry'
import { yawFor } from '../space'
import { concreteMaterial } from './concrete'

/** Deck top sits a hair below the island tops: a readable step down, and no z-fighting where they overlap. */
const DECK_TOP = -0.025
const DECK_T = 0.22
const RIB_EVERY = 1.6
const LIGHT_EVERY = 2.2

type Strip = { a: Vec2; b: Vec2; halfWidth: number }

function placed(g: BufferGeometry, x: number, y: number, z: number, strip: Strip): BufferGeometry {
  const mid = v.lerp(strip.a, strip.b, 0.5)
  const yaw = yawFor(v.angleOf(v.sub(strip.b, strip.a)))
  const m = new Matrix4().compose(new Vector3(mid.x, 0, mid.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), new Vector3(1, 1, 1))
  g.translate(x, y, z)
  return g.applyMatrix4(m)
}

/** Structure of one strip in its local frame (+x along the walkway): deck, spine beam and rib fins. */
function stripConcrete(s: Strip): BufferGeometry[] {
  const len = v.dist(s.a, s.b)
  const w = s.halfWidth * 2
  const parts = [
    placed(new RoundedBoxGeometry(len, DECK_T, w, 1, 0.05), 0, DECK_TOP - DECK_T / 2, 0, s),
    placed(new BoxGeometry(len - 0.6, 0.34, w * 0.34), 0, DECK_TOP - DECK_T - 0.17, 0, s),
  ]
  const ribs = Math.max(1, Math.floor((len - 1.2) / RIB_EVERY))
  for (let i = 0; i <= ribs; i++) {
    const x = -len / 2 + 0.6 + (i * (len - 1.2)) / ribs
    parts.push(placed(new BoxGeometry(0.12, 0.42, w * 0.82), x, DECK_TOP - DECK_T - 0.21, 0, s))
  }
  return parts
}

/** Low path lights set into both deck fascias (not the top, where they'd read as lane markings). Emissive, no real lights. */
function stripLights(s: Strip): BufferGeometry[] {
  const len = v.dist(s.a, s.b)
  const n = Math.max(1, Math.floor((len - 1.5) / LIGHT_EVERY))
  const out: BufferGeometry[] = []
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + 0.75 + (i * (len - 1.5)) / n
    for (const side of [-1, 1]) out.push(placed(new BoxGeometry(0.22, 0.035, 0.02), x, DECK_TOP - 0.075, side * (s.halfWidth + 0.004), s))
  }
  return out
}

const lightMat = new MeshBasicMaterial({ color: '#dfeccf', toneMapped: false })

/** v2 walkways and bridge: thin cantilevered decks on ribbed spines, path lights along the edges. Two draw calls in all. */
export function WalkwaysV2({ layout }: { layout: WorldLayout }) {
  const { concrete, lights } = useMemo(() => {
    const strips: Strip[] = [...layout.walkways, layout.bridge]
    return {
      concrete: mergeGeometries(strips.flatMap(stripConcrete).map((g) => (g.index ? g.toNonIndexed() : g)), false)!,
      lights: mergeGeometries(strips.flatMap(stripLights).map((g) => g.toNonIndexed()), false)!,
    }
  }, [layout])
  return (
    <group>
      <mesh name="v2-walkway" geometry={concrete} material={concreteMaterial('#d2cfc7')} />
      <mesh name="v2-pathlights" geometry={lights} material={lightMat} />
    </group>
  )
}
