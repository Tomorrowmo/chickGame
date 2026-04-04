/**
 * Day/Night cycle time system.
 *
 * Game time runs at 1 real minute = 1 game hour.
 * A full day cycle = 24 real minutes.
 * gameTime is stored as 0-1440 (minutes in a day).
 */

export type TimePhase =
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'sunset'
  | 'night'

/** Convert gameTime (0-1440) to a human-readable "HH:MM" string. */
export function formatGameTime(gameTime: number): string {
  const clamped = ((gameTime % 1440) + 1440) % 1440
  const hours = Math.floor(clamped / 60)
  const minutes = Math.floor(clamped % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/** Get the current time phase based on gameTime (0-1440). */
export function getTimePhase(gameTime: number): TimePhase {
  const hour = ((gameTime % 1440) + 1440) % 1440 / 60
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 19) return 'sunset'
  return 'night'
}

/** Advance game time by a pixi ticker delta (at 60fps, delta~1).
 *  1 real minute = 1 game hour => 1 real second = 1 game minute.
 *  At 60fps: each tick = 1/60 second = 1/60 game minute.
 */
export function advanceTime(gameTime: number, delta: number): number {
  // delta is in frames (1 = 1/60s at 60fps)
  // 1 real second = 1 game minute => 1 frame = 1/60 game minute
  const advance = delta / 60 // game minutes per frame
  return (gameTime + advance) % 1440
}

// ---- Color interpolation utilities ----

/** Extract r, g, b from a 0xRRGGBB number. */
function toRGB(color: number): [number, number, number] {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff]
}

/** Pack r, g, b into a 0xRRGGBB number. */
function fromRGB(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

/** Linearly interpolate between two colors. t in [0,1]. */
export function lerpColor(a: number, b: number, t: number): number {
  const [ar, ag, ab] = toRGB(a)
  const [br, bg, bb] = toRGB(b)
  const clamped = Math.max(0, Math.min(1, t))
  return fromRGB(
    Math.round(ar + (br - ar) * clamped),
    Math.round(ag + (bg - ag) * clamped),
    Math.round(ab + (bb - ab) * clamped),
  )
}

// ---- Sky and grass color computation ----

const SKY_NIGHT = 0x0c1445
const SKY_DAWN_ORANGE = 0xffb347
const SKY_DAY = 0x87ceeb
const SKY_NOON = 0x9dd8f0
const SKY_AFTERNOON = 0xd4a853
const SKY_SUNSET_RED = 0xff6b6b
const SKY_SUNSET_INDIGO = 0x4b0082

const GRASS_NIGHT = 0x3a5a2a
const GRASS_DAWN = 0x5a8a3a
const GRASS_DAY = 0x7ec850

/** Get the sky color for the given gameTime. */
export function getSkyColor(gameTime: number): number {
  const hour = ((gameTime % 1440) + 1440) % 1440 / 60

  // Night: 19-5
  if (hour >= 21 || hour < 4) return SKY_NIGHT
  // Late night -> pre-dawn (4-5): night to dark
  if (hour >= 4 && hour < 5) {
    const t = (hour - 4) / 1
    return lerpColor(SKY_NIGHT, 0x1a2766, t)
  }
  // Dawn (5-7): dark blue -> orange -> blue
  if (hour >= 5 && hour < 6) {
    const t = hour - 5
    return lerpColor(0x1a2766, SKY_DAWN_ORANGE, t)
  }
  if (hour >= 6 && hour < 7) {
    const t = hour - 6
    return lerpColor(SKY_DAWN_ORANGE, SKY_DAY, t)
  }
  // Morning (7-11): sky blue
  if (hour >= 7 && hour < 11) return SKY_DAY
  // Noon (11-14): slightly lighter/brighter
  if (hour >= 11 && hour < 14) {
    const t = (hour - 11) / 3
    // Ease into noon blue and back
    const midT = t < 0.5 ? t * 2 : (1 - t) * 2
    return lerpColor(SKY_DAY, SKY_NOON, midT)
  }
  // Afternoon (14-17): warm golden
  if (hour >= 14 && hour < 17) {
    const t = (hour - 14) / 3
    return lerpColor(SKY_DAY, SKY_AFTERNOON, t)
  }
  // Sunset (17-19): red to indigo
  if (hour >= 17 && hour < 18) {
    const t = hour - 17
    return lerpColor(SKY_AFTERNOON, SKY_SUNSET_RED, t)
  }
  if (hour >= 18 && hour < 19) {
    const t = hour - 18
    return lerpColor(SKY_SUNSET_RED, SKY_SUNSET_INDIGO, t)
  }
  // Dusk (19-21): indigo to night
  if (hour >= 19 && hour < 21) {
    const t = (hour - 19) / 2
    return lerpColor(SKY_SUNSET_INDIGO, SKY_NIGHT, t)
  }

  return SKY_DAY
}

/** Get the grass color for the given gameTime. */
export function getGrassColor(gameTime: number): number {
  const hour = ((gameTime % 1440) + 1440) % 1440 / 60

  if (hour >= 21 || hour < 4) return GRASS_NIGHT
  if (hour >= 4 && hour < 6) {
    const t = (hour - 4) / 2
    return lerpColor(GRASS_NIGHT, GRASS_DAWN, t)
  }
  if (hour >= 6 && hour < 8) {
    const t = (hour - 6) / 2
    return lerpColor(GRASS_DAWN, GRASS_DAY, t)
  }
  if (hour >= 8 && hour < 17) return GRASS_DAY
  if (hour >= 17 && hour < 19) {
    const t = (hour - 17) / 2
    return lerpColor(GRASS_DAY, GRASS_DAWN, t)
  }
  if (hour >= 19 && hour < 21) {
    const t = (hour - 19) / 2
    return lerpColor(GRASS_DAWN, GRASS_NIGHT, t)
  }
  return GRASS_DAY
}

/** Get the darker grass strip color (horizon line). */
export function getGrassStripColor(gameTime: number): number {
  const base = getGrassColor(gameTime)
  // Darken by ~10%
  const [r, g, b] = toRGB(base)
  return fromRGB(
    Math.max(0, Math.round(r * 0.88)),
    Math.max(0, Math.round(g * 0.88)),
    Math.max(0, Math.round(b * 0.88)),
  )
}

/** Get a night tint alpha (0 = no tint, up to 0.25 at deep night). */
export function getNightTintAlpha(gameTime: number): number {
  const hour = ((gameTime % 1440) + 1440) % 1440 / 60

  if (hour >= 21 || hour < 4) return 0.25
  if (hour >= 4 && hour < 6) {
    const t = (hour - 4) / 2
    return 0.25 * (1 - t)
  }
  if (hour >= 19 && hour < 21) {
    const t = (hour - 19) / 2
    return 0.25 * t
  }
  return 0
}

/** Check if it is night (for stars visibility). */
export function isNight(gameTime: number): boolean {
  const hour = ((gameTime % 1440) + 1440) % 1440 / 60
  return hour >= 19 || hour < 6
}

/** Get star alpha (0-1) based on time. Smooth fade in/out. */
export function getStarAlpha(gameTime: number): number {
  const hour = ((gameTime % 1440) + 1440) % 1440 / 60
  if (hour >= 20 || hour < 4) return 1
  if (hour >= 19 && hour < 20) return hour - 19
  if (hour >= 4 && hour < 6) return 1 - (hour - 4) / 2
  return 0
}

/** Get sun/moon arc position. Returns { x: 0-1, y: 0-1 } where x goes left to right,
 *  y is height (0=top, 1=horizon). For sun: visible 6-18. For moon: visible 19-5. */
export function getCelestialPosition(
  gameTime: number,
  type: 'sun' | 'moon',
): { x: number; y: number; visible: boolean } {
  const hour = ((gameTime % 1440) + 1440) % 1440 / 60

  if (type === 'sun') {
    // Sun visible from 6 to 18
    if (hour < 6 || hour > 18) return { x: 0.5, y: 1, visible: false }
    const t = (hour - 6) / 12 // 0 at 6:00, 1 at 18:00
    const x = t
    // Parabolic arc: highest at noon (t=0.5)
    const y = 1 - 4 * t * (1 - t) // 1 at edges, 0 at peak - but we want 0=top
    return { x, y: y * 0.8 + 0.05, visible: true }
  } else {
    // Moon visible from 19 to 5 (10-hour window)
    let t: number
    if (hour >= 19) {
      t = (hour - 19) / 10
    } else if (hour < 5) {
      t = (hour + 5) / 10
    } else {
      return { x: 0.5, y: 1, visible: false }
    }
    const x = t
    const y = 1 - 4 * t * (1 - t)
    return { x, y: y * 0.8 + 0.05, visible: true }
  }
}
