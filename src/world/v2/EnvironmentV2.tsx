import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BackSide, BufferAttribute, BufferGeometry, Color, FogExp2, Object3D, ShaderMaterial, type InstancedMesh } from 'three'
import { useRenderBudget } from '../quality'
import { softPointsMaterial } from './softPoints'

const FOG = '#070a12'

/**
 * Lighting for the v2 look. No shadow maps: a low, warm raking key gives every form a lit side and a
 * shadow side; a cool sky/ground fill and a blue rim from behind separate silhouettes from the void.
 */
export function LightingV2() {
  return (
    <>
      <hemisphereLight args={['#c8cedb', '#141210', 0.7]} />
      <directionalLight position={[-34, 16, 26]} intensity={2.7} color="#fff1e0" />
      <directionalLight position={[28, 12, -30]} intensity={0.45} color="#b7c4e6" />
    </>
  )
}

/** Gradient dome: near-black above, a faint blue-black horizon matching the fog, darker abyss below. */
function SkyDome() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTop: { value: new Color('#020306') }, uHorizon: { value: new Color(FOG) }, uBottom: { value: new Color('#000000') } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; varying vec3 vDir;
          void main(){
            float h = vDir.y;
            vec3 c = h > 0.0 ? mix(uHorizon, uTop, smoothstep(0.0, 0.55, h)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.35, -h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  )
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[450, 24, 16]} />
    </mesh>
  )
}

const MEGA = [
  [-150, -60, -90, 22, 230, 18],
  [-120, -95, 60, 14, 160, 30],
  [-60, -140, 150, 30, 190, 16],
  [40, -80, -170, 18, 260, 22],
  [130, -120, -70, 26, 210, 14],
  [165, -70, 50, 12, 150, 40],
  [90, -150, 140, 34, 170, 20],
  [-175, -130, 10, 16, 120, 50],
  [10, -170, -130, 40, 110, 12],
  [-30, -55, 190, 10, 220, 10],
] as const

/** Dim, cold slabs that fade out toward their tops and bottoms, so they read as distant mass, not cards. */
const megaMaterial = new ShaderMaterial({
  fog: false,
  transparent: true,
  depthWrite: false,
  uniforms: { uColor: { value: new Color('#1a2030') } },
  vertexShader: /* glsl */ `varying float vH; void main(){ vH = position.y + 0.5; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `uniform vec3 uColor; varying float vH; void main(){ float a = smoothstep(0.0, 0.35, vH) * smoothstep(1.0, 0.55, vH); gl_FragColor = vec4(uColor, a * 0.85); }`,
})

/** Huge, dim slabs far below and beyond: scale and depth for the void. One draw call, no fog. */
function Megastructures() {
  const mesh = useMemo(() => ({ ref: null as InstancedMesh | null }), [])
  useEffect(() => {
    const m = mesh.ref
    if (!m) return
    const o = new Object3D()
    MEGA.forEach(([x, y, z, w, h, d], i) => {
      o.position.set(x, y, z)
      o.rotation.set(0, (i * 0.7) % Math.PI, 0)
      o.scale.set(w, h, d)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [mesh])
  return (
    <instancedMesh ref={(r) => (mesh.ref = r)} args={[undefined, undefined, MEGA.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={megaMaterial} attach="material" />
    </instancedMesh>
  )
}

/** Slow drifting dust in the space around the ring. GPU-animated; fewer motes on Low. */
function Dust() {
  const { spores } = useRenderBudget()
  const count = spores > 30 ? 420 : 140
  const gl = useThree((s) => s.gl)
  const { geo, mat } = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < count; i++) {
      pos.set([(rnd() - 0.5) * 80, -6 + rnd() * 22, (rnd() - 0.5) * 80], i * 3)
      seed[i] = rnd()
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('seed', new BufferAttribute(seed, 1))
    return { geo: g, mat: softPointsMaterial({ color: '#cdd6ea', size: 2.2, opacity: 0.35, drift: 1.4 }) }
  }, [count])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

/** The v2 void: background, fog, dome, megastructures and dust. */
export function VoidV2() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.background = new Color('#000000')
    scene.fog = new FogExp2(FOG, 0.0125)
  }, [scene])
  return (
    <>
      <SkyDome />
      <Megastructures />
      <Dust />
    </>
  )
}
