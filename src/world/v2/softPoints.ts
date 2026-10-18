import { AdditiveBlending, Color, ShaderMaterial } from 'three'

/**
 * Round, soft-edged point sprites (instead of the default square pixels). `uTime` drifts each point
 * gently on the GPU using its `seed` attribute, so dust costs no CPU per frame.
 */
export function softPointsMaterial(opts: { color: string; size: number; opacity: number; drift?: number }): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(opts.color) },
      uSize: { value: opts.size },
      uOpacity: { value: opts.opacity },
      uTime: { value: 0 },
      uDrift: { value: opts.drift ?? 0 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uSize; uniform float uTime; uniform float uDrift; uniform float uPixelRatio;
      varying float vFade;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.13 + seed * 6.28) * uDrift;
        p.y += sin(uTime * 0.09 + seed * 11.0) * uDrift * 0.6;
        p.z += cos(uTime * 0.11 + seed * 4.0) * uDrift;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = uSize * uPixelRatio * (40.0 / max(d, 0.5));
        vFade = clamp(1.0 - d / 70.0, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity;
      varying float vFade;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(c));
        if (a <= 0.01) discard;
        gl_FragColor = vec4(uColor, a * uOpacity * vFade);
      }`,
  })
}
