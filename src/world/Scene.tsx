import { OrbitControls } from '@react-three/drei'
import { WORLD } from '../content/world'
import { DialogueBridge } from './DialogueBridge'
import { FollowCamera } from './FollowCamera'
import { GameLoop } from './GameLoop'
import { GuideBody } from './guide/GuideBody'
import { OffscreenArrow } from './guide/OffscreenArrow'
import { Trail } from './guide/Trail'
import { Contact } from './islands/Contact'
import { Education } from './islands/Education'
import { Experience } from './islands/Experience'
import { ProjectsIsland } from './islands/Projects'
import { Skills } from './islands/Skills'
import { Monolith } from './islands/Monolith'
import { Walkways } from './islands/Walkways'
import { Player } from './Player'

const ISLANDS = { education: Education, experience: Experience, projects: ProjectsIsland, skills: Skills, contact: Contact } as const

const DEV_ORBIT = import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('orbit')

export function Scene() {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <fogExp2 attach="fog" args={['#000000', 0.016]} />
      {/* Concrete should read white: strong sky fill, a cool key for shape, a faint rim from behind. */}
      <hemisphereLight args={['#f4f6ff', '#2a2a28', 1.25]} />
      <directionalLight position={[18, 30, 10]} intensity={1.4} color="#f1f4ff" />
      <directionalLight position={[-20, 12, -16]} intensity={0.45} color="#dfe8ff" />
      <Monolith layout={WORLD} />
      <Walkways layout={WORLD} />
      {WORLD.islands.map((i) => {
        const Island = ISLANDS[i.id]
        return <Island key={i.id} island={i} />
      })}
      <Player />
      <GuideBody />
      <Trail />
      <OffscreenArrow />
      <GameLoop />
      <DialogueBridge />
      {DEV_ORBIT ? <OrbitControls /> : <FollowCamera />}
    </>
  )
}
