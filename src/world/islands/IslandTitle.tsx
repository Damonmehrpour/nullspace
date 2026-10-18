import { Billboard, Text } from '@react-three/drei'
import { cv } from '../../content/cv'
import type { IslandDef } from '../../content/world'
import { BADGE_COPY } from '../../ui/StatusBadge'
import { at, TITLE_FONT } from '../space'

/** Section title floating over an island, with its status when the content isn't confirmed. */
export function IslandTitle({ island }: { island: IslandDef }) {
  const section = cv[island.id]
  return (
    <Billboard position={at(island.titleAnchor, 5)}>
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
