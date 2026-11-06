import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, type Points } from 'three'
import { useRenderBudget } from '../quality'
import { reducedMotion } from '../sim'
import { buildStars, STAR_COUNTS } from './stars'

const starMaterial = () =>
  new ShaderMaterial({
    fog: false,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uTwinkle: { value: 1 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aBright; attribute vec3 aColor; attribute float aPhase;
      uniform float uTime; uniform float uTwinkle; uniform float uPixelRatio;
      varying vec3 vColor;
      void main(){
        // A slow, shallow twinkle, gentler on the brighter stars so nothing glitters.
        float tw = 1.0 - uTwinkle * (0.32 - 0.18 * aBright) * (0.5 + 0.5 * sin(uTime * (0.25 + 0.6 * fract(aPhase * 3.7)) + aPhase));
        vColor = aColor * aBright * tw;
        gl_PointSize = aSize * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main(){
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.35, 1.0, d);
        gl_FragColor = vec4(vColor * a, 1.0);
      }`,
  })

/** The distant starfield: one draw call, far beyond the fog, turning almost imperceptibly. */
export function Starfield() {
  const { detail } = useRenderBudget()
  const gl = useThree((s) => s.gl)
  const ref = useRef<Points>(null)
  const { geo, mat } = useMemo(() => {
    const st = buildStars()
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(st.pos, 3))
    g.setAttribute('aSize', new BufferAttribute(st.size, 1))
    g.setAttribute('aBright', new BufferAttribute(st.bright, 1))
    g.setAttribute('aColor', new BufferAttribute(st.color, 3))
    g.setAttribute('aPhase', new BufferAttribute(st.phase, 1))
    return { geo: g, mat: starMaterial() }
  }, [])
  geo.setDrawRange(0, STAR_COUNTS[detail])
  useFrame(({ clock }, dt) => {
    const still = reducedMotion()
    mat.uniforms.uTwinkle.value = still ? 0 : 1
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uPixelRatio.value = gl.getPixelRatio()
    if (ref.current && !still) ref.current.rotation.y += Math.min(dt, 0.1) * 0.0025
  })
  // Drawn with the transparents, after the opaque world and the dome, and depth-tested against both.
  return <points ref={ref} name="v2-stars" geometry={geo} material={mat} frustumCulled={false} renderOrder={11} />
}
