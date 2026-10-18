import { visualVersion } from './v2/shapes'

/** Which look the 3D world renders. `?visual=v2` is the Phase 0 proof of concept; default is unchanged. */
export const VISUAL = typeof location === 'undefined' ? 'v1' : visualVersion(location.search)
export const V2 = VISUAL === 'v2'
