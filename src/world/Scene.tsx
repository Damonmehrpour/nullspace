import { OrbitControls } from '@react-three/drei'
import { WORLD } from '../content/world'
import { GreyIsland } from './islands/GreyIsland'
import { Monolith } from './islands/Monolith'
import { Walkways } from './islands/Walkways'

const DEV_ORBIT = import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('orbit')

export function Scene() {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <fogExp2 attach="fog" args={['#000000', 0.018]} />
      <hemisphereLight args={['#dfe6ff', '#0a0a0a', 0.35]} />
      <directionalLight position={[18, 30, 10]} intensity={1.6} color="#f1f4ff" />
      <Monolith layout={WORLD} />
      <Walkways layout={WORLD} />
      {WORLD.islands.map((i) => (
        <GreyIsland key={i.id} island={i} />
      ))}
      {DEV_ORBIT && <OrbitControls />}
    </>
  )
}
