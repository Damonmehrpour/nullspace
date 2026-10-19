import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { BADGE_COPY } from '../../ui/StatusBadge'
import { v } from '../../core/geometry'
import { sim } from '../sim'
import { at, TITLE_FONT } from '../space'
import { V2 } from '../visual'

/** v2: above the tallest architecture (the Signal Tower's dish), and gone once you're on the island. */
const HEIGHT = V2 ? 9.6 : 5
const HIDE_WITHIN = 9

/** Section title floating over an island, with its status when the content isn't confirmed. */
export function IslandTitle({ island }: { island: IslandDef }) {
  const section = cv[island.id]
  const ref = useRef<Group>(null)
  // Titles are for finding islands from afar; up close they would cut across the architecture.
  useFrame(() => {
    if (V2 && ref.current) ref.current.visible = v.dist(sim.player.pos, island.centre) > HIDE_WITHIN
  })
  return (
    <Billboard ref={ref} position={at(island.titleAnchor, HEIGHT)}>
      <Text font={TITLE_FONT} fontSize={section.title.length > 12 ? 0.8 : 1.1} color="#ecebe6" anchorX="center" anchorY="bottom">
        {section.title}
      </Text>
      {section.status !== 'real' && (
        <Text font={TITLE_FONT} fontSize={0.38} color="#8a8984" anchorX="center" anchorY="top" position={[0, -0.15, 0]} letterSpacing={0.06}>
          {BADGE_COPY[section.status]}
        </Text>
      )}
    </Billboard>
  )
}
