// The touch joystick's shared state: written by the on-screen stick, read once per frame by the
// simulation. Kept outside React so moving the stick never re-renders anything.

/** Fraction of the stick's travel that is ignored, so a resting thumb never drifts. */
export const STICK_DEAD_ZONE = 0.18

export const touchStick = { x: 0, y: 0, active: false }

/**
 * Maps a thumb offset from the stick's centre (screen pixels, y down) to stick axes: x right, y forward,
 * with a dead zone and a smooth ramp from its edge to full speed at `radius`.
 */
export function stickFromDrag(dx: number, dy: number, radius: number): { x: number; y: number } {
  const d = Math.hypot(dx, dy)
  const raw = Math.min(1, d / radius)
  if (raw <= STICK_DEAD_ZONE || d === 0) return { x: 0, y: 0 }
  const m = (raw - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE)
  return { x: (dx / d) * m, y: (-dy / d) * m }
}

export function releaseTouchStick(): void {
  touchStick.x = 0
  touchStick.y = 0
  touchStick.active = false
}
