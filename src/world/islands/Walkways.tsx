import type { WorldLayout } from '../../content/world'
import { v, type Vec2 } from '../../core/geometry'
import { at, yawFor } from '../space'

const THICKNESS = 0.4

function Strip({ a, b, halfWidth }: { a: Vec2; b: Vec2; halfWidth: number }) {
  const mid = v.lerp(a, b, 0.5)
  return (
    <mesh position={at(mid, -THICKNESS / 2)} rotation={[0, yawFor(v.angleOf(v.sub(b, a))), 0]}>
      <boxGeometry args={[v.dist(a, b), THICKNESS, halfWidth * 2]} />
      <meshStandardMaterial color="#cfcec8" roughness={0.95} />
    </mesh>
  )
}

/** Walkways around the ring plus the bridge from the monolith, straight from the layout. */
export function Walkways({ layout }: { layout: WorldLayout }) {
  return (
    <group>
      {layout.walkways.map((w) => (
        <Strip key={w.id} a={w.a} b={w.b} halfWidth={w.halfWidth} />
      ))}
      <Strip a={layout.bridge.a} b={layout.bridge.b} halfWidth={layout.bridge.halfWidth} />
    </group>
  )
}
