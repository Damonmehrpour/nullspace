import type { Vec2 } from '../core/geometry'

/** Ground-plane point → three.js position at height y. */
export const at = (p: Vec2, y = 0): [number, number, number] => [p.x, y, p.z]

/** Yaw (rotation about +y) that points a mesh's local +x along the ground direction `angle`. */
export const yawFor = (angle: number) => -angle

/** Self-hosted font for 3D text (troika reads .woff, not .woff2). */
export { default as TITLE_FONT } from '@fontsource/archivo/files/archivo-latin-800-normal.woff?url'
