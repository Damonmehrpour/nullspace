import { OrbitControls, StatsGl } from '@react-three/drei'
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
import { LightingV2, VoidV2 } from './v2/EnvironmentV2'
import { EducationV2 } from './v2/EducationV2'
import { ExperienceV2 } from './v2/ExperienceV2'
import { ProjectsIslandV2 } from './v2/ProjectsV2'
import { SkillsV2 } from './v2/SkillsV2'
import { ContactV2 } from './v2/ContactV2'
import { GuideBodyV2 } from './v2/GuideBodyV2'
import { MonolithV2 } from './v2/MonolithV2'
import { Wanderer } from './v2/Wanderer'
import { WalkwaysV2 } from './v2/WalkwaysV2'
import { V2 } from './visual'

const ISLANDS = { education: V2 ? EducationV2 : Education, experience: V2 ? ExperienceV2 : Experience, projects: V2 ? ProjectsIslandV2 : ProjectsIsland, skills: V2 ? SkillsV2 : Skills, contact: V2 ? ContactV2 : Contact } as const

/** ?debug shows an fps/GPU overlay, so the author can profile the live build on their own hardware. */
const DEBUG_STATS = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')

const DEV_ORBIT = import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('orbit')

export function Scene() {
  return (
    <>
      {V2 ? (
        <>
          <VoidV2 />
          <LightingV2 />
          <MonolithV2 layout={WORLD} />
        </>
      ) : (
        <>
          <color attach="background" args={['#000000']} />
          <fogExp2 attach="fog" args={['#000000', 0.016]} />
          {/* Concrete should read white: strong sky fill, a cool key for shape, a faint rim from behind. */}
          <hemisphereLight args={['#f4f6ff', '#2a2a28', 1.25]} />
          <directionalLight position={[18, 30, 10]} intensity={1.4} color="#f1f4ff" />
          <directionalLight position={[-20, 12, -16]} intensity={0.45} color="#dfe8ff" />
          <Monolith layout={WORLD} />
        </>
      )}
      {V2 ? <WalkwaysV2 layout={WORLD} /> : <Walkways layout={WORLD} />}
      {WORLD.islands.map((i) => {
        const Island = ISLANDS[i.id]
        return <Island key={i.id} island={i} />
      })}
      {V2 ? <Wanderer /> : <Player />}
      {V2 ? <GuideBodyV2 /> : <GuideBody />}
      <Trail />
      <OffscreenArrow />
      <GameLoop />
      <DialogueBridge />
      {DEV_ORBIT ? <OrbitControls /> : <FollowCamera />}
      {/* Drei strips stats-gl's inline position/z-index, so positioning must come from these classes. */}
      {DEBUG_STATS && <StatsGl id="debug-stats" className="pointer-events-none fixed top-16 left-2 z-50" />}
    </>
  )
}
