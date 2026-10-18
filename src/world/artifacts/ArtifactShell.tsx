import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import type { Mesh } from 'three'
import type { Project } from '../../content/schema'
import { v, type Vec2 } from '../../core/geometry'
import { useStore } from '../../state/store'
import { BADGE_COPY } from '../../ui/StatusBadge'
import { sim } from '../sim'
import { at, TITLE_FONT } from '../space'

const RANGE = 1.5

function label(p: Project): { main: string; sub: string | null } {
  if (p.status === 'placeholder') return { main: '[PLACEHOLDER]', sub: null }
  const main = p.name.state === 'confirmed' ? p.name.value : BADGE_COPY[p.status === 'real' ? 'partial' : p.status]
  const sub = p.status === 'real' || p.name.state !== 'confirmed' ? null : BADGE_COPY[p.status]
  return { main, sub }
}

/** Common frame for a project artifact: plinth, label, in-range ring, click/tap to open. */
export function ArtifactShell({ project, slot, children }: { project: Project; slot: Vec2; children: ReactNode }) {
  const ring = useRef<Mesh>(null)
  const openProject = useStore((s) => s.openProject)
  const { main, sub } = label(project)

  useFrame(() => {
    if (ring.current) ring.current.visible = v.dist(sim.player.pos, slot) <= RANGE
  })

  return (
    <group position={at(slot)}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.6, 24]} />
        <meshStandardMaterial color="#ecebe6" roughness={0.9} />
      </mesh>
      <group
        position={[0, 1.6, 0]}
        onClick={(e) => {
          e.stopPropagation()
          openProject(project.id, { source: 'artifact' })
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        {children}
      </group>
      <mesh ref={ring} position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.7, 0.78, 48]} />
        <meshBasicMaterial color="#6fae3c" fog={false} />
      </mesh>
      <Billboard position={[0, 2.9, 0]}>
        <Text font={TITLE_FONT} fontSize={0.32} color="#ecebe6" anchorX="center" anchorY="bottom" maxWidth={4} textAlign="center">
          {main}
        </Text>
        {sub && (
          <Text font={TITLE_FONT} fontSize={0.16} color="#8a8984" anchorX="center" anchorY="top" position={[0, -0.06, 0]}>
            {sub}
          </Text>
        )}
      </Billboard>
    </group>
  )
}
