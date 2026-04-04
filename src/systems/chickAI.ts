import type { ChickData } from '../types/chick'
import { COOP_POSITION } from '../components/scene/Coop'

const GROUND_Y_MIN = 400 // grass area top
const GROUND_Y_MAX = 600
const WORLD_X_MIN = 50
const WORLD_X_MAX = 910

/** Pond is at approximately (700, 500) */
const POND_X = 700
const POND_Y = 500
const POND_PLAY_RADIUS = 80

/** How long (ms) a pond splash stays "attractive" to chicks */
const SPLASH_ATTRACT_DURATION = 3000
/** Radius within which chicks are attracted to a splash */
const SPLASH_ATTRACT_RADIUS = 250

/** Night is 20:00 (1200 min) to 5:00 (300 min) */
function isNight(gameTime: number): boolean {
  return gameTime >= 1200 || gameTime < 300
}

/** Dawn is 5:00-6:00 (300-360 min) */
function isDawn(gameTime: number): boolean {
  return gameTime >= 300 && gameTime < 360
}

function distBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function updateChickAI(
  chick: ChickData,
  delta: number,
  allChicks: ChickData[],
  gameTime: number,
  pondSplashTime?: number,
): Partial<ChickData> {
  if (chick.stage === 'egg' || chick.stage === 'hatching') {
    return {} // Eggs don't move
  }

  const updates: Partial<ChickData> = {}
  const night = isNight(gameTime)
  const dawn = isDawn(gameTime)

  // === Pond splash attraction ===
  const splashActive = pondSplashTime != null && (Date.now() - pondSplashTime) < SPLASH_ATTRACT_DURATION
  if (splashActive && !night) {
    const distToPond = distBetween(chick, { x: POND_X, y: POND_Y })
    if (distToPond < SPLASH_ATTRACT_RADIUS && distToPond > 50) {
      // High chance to run toward the pond
      if (Math.random() < 0.03 * delta) {
        const angle = Math.atan2(chick.y - POND_Y, chick.x - POND_X)
        const edgeX = POND_X + Math.cos(angle) * 50
        const edgeY = POND_Y + Math.sin(angle) * 25
        updates.currentAction = 'walking'
        updates.targetX = edgeX
        updates.targetY = Math.max(GROUND_Y_MIN, edgeY)
        updates.direction = (POND_X - chick.x) > 0 ? 'right' : 'left'
        return updates
      }
    }
    // Chicks already at the pond edge: play/bob in water
    if (distToPond <= 60 && chick.currentAction === 'idle') {
      if (Math.random() < 0.05 * delta) {
        updates.currentAction = 'eating' // bobbing = playing in water
        return updates
      }
    }
  }

  // === Night behavior: walk to coop and sleep ===
  if (night) {
    const distToCoop = distBetween(chick, COOP_POSITION)
    if (distToCoop > 20) {
      // Walk toward the coop
      const dx = COOP_POSITION.x - chick.x
      const dy = COOP_POSITION.y - chick.y
      const dist = distToCoop
      const speed = 0.6 * delta
      updates.x = chick.x + (dx / dist) * speed
      updates.y = chick.y + (dy / dist) * speed
      updates.direction = dx > 0 ? 'right' : 'left'
      updates.currentAction = 'walking'
    } else {
      updates.currentAction = 'sleeping'
    }
    return updates
  }

  // === Dawn: wake up and scatter ===
  if (dawn && chick.currentAction === 'sleeping') {
    updates.currentAction = 'walking'
    updates.targetX = WORLD_X_MIN + Math.random() * (WORLD_X_MAX - WORLD_X_MIN)
    updates.targetY = GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
    return updates
  }

  // === Daytime social behaviors ===

  const otherChicks = allChicks.filter(
    (c) => c.id !== chick.id && c.stage !== 'egg' && c.stage !== 'hatching',
  )

  // --- A. Chasing other chicks ---
  if (chick.currentAction === 'chasing') {
    // Continue chasing toward target
    const dx = chick.targetX - chick.x
    const dy = chick.targetY - chick.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 15) {
      const speed = 1.4 * delta
      updates.x = chick.x + (dx / dist) * speed
      updates.y = chick.y + (dy / dist) * speed
      updates.direction = dx > 0 ? 'right' : 'left'
    } else {
      // Caught up, go idle
      updates.currentAction = 'idle'
    }
    return updates
  }

  // --- Angry chick: sometimes face away from others, stay idle ---
  if (chick.mood === 'angry' && Math.random() < 0.01 * delta) {
    // Turn away from nearest chick (look grumpy)
    if (otherChicks.length > 0) {
      let nearest = otherChicks[0]
      let nearDist = distBetween(chick, nearest)
      for (const other of otherChicks) {
        const d = distBetween(chick, other)
        if (d < nearDist) {
          nearest = other
          nearDist = d
        }
      }
      // Face AWAY from the nearest chick
      const dx = nearest.x - chick.x
      updates.direction = dx > 0 ? 'left' : 'right'
      updates.currentAction = 'idle'
      return updates
    }
  }

  // Random action change
  if (Math.random() < 0.005 * delta) {
    // --- B. Group behavior: follow a nearby walking chick ---
    if (chick.currentAction === 'idle' && Math.random() < 0.3) {
      const walkingNearby = otherChicks.filter(
        (c) => c.currentAction === 'walking' && distBetween(chick, c) < 120,
      )
      if (walkingNearby.length > 0) {
        const leader = walkingNearby[Math.floor(Math.random() * walkingNearby.length)]
        // Walk in similar direction as leader, with slight offset
        updates.currentAction = 'walking'
        updates.targetX = leader.targetX + (Math.random() - 0.5) * 40
        updates.targetY = leader.targetY + (Math.random() - 0.5) * 30
        // Clamp to bounds
        updates.targetX = Math.max(WORLD_X_MIN, Math.min(WORLD_X_MAX, updates.targetX))
        updates.targetY = Math.max(GROUND_Y_MIN, Math.min(GROUND_Y_MAX, updates.targetY))
        return updates
      }
    }

    // --- A. Start chasing a nearby chick (happy chicks more likely) ---
    const chaseChance = chick.mood === 'happy' ? 0.15 : 0.05
    if (Math.random() < chaseChance && otherChicks.length > 0) {
      const nearby = otherChicks.filter((c) => distBetween(chick, c) < 150)
      if (nearby.length > 0) {
        const target = nearby[Math.floor(Math.random() * nearby.length)]
        updates.currentAction = 'chasing'
        updates.targetX = target.x
        updates.targetY = target.y
        updates.direction = target.x > chick.x ? 'right' : 'left'
        return updates
      }
    }

    // --- C. Water play: go toward pond if nearby ---
    const distToPond = distBetween(chick, { x: POND_X, y: POND_Y })
    const waterPlayChance = chick.mood === 'happy' ? 0.2 : 0.08
    if (distToPond < POND_PLAY_RADIUS && Math.random() < waterPlayChance) {
      // Walk to pond edge and "play" (eating action = bobbing)
      const angle = Math.random() * Math.PI * 2
      const edgeX = POND_X + Math.cos(angle) * 50
      const edgeY = POND_Y + Math.sin(angle) * 25
      updates.currentAction = 'walking'
      updates.targetX = edgeX
      updates.targetY = Math.max(GROUND_Y_MIN, edgeY)
      return updates
    }
    // If near pond edge and idle, start playing/eating (drinking)
    if (distToPond < 60 && chick.currentAction === 'idle' && Math.random() < 0.3) {
      updates.currentAction = 'eating' // bobbing = drinking
      return updates
    }

    // --- Default random action ---
    const actions = ['idle', 'walking', 'eating', 'sleeping'] as const
    const weights =
      chick.mood === 'happy'
        ? [0.15, 0.45, 0.25, 0.15]
        : chick.mood === 'angry'
          ? [0.5, 0.1, 0.1, 0.3]
          : [0.3, 0.3, 0.2, 0.2]

    let roll = Math.random()
    for (let i = 0; i < actions.length; i++) {
      roll -= weights[i]
      if (roll <= 0) {
        updates.currentAction = actions[i]
        break
      }
    }

    // Pick new target when starting to walk — prefer positions away from clusters
    if (updates.currentAction === 'walking') {
      let bestX = WORLD_X_MIN + Math.random() * (WORLD_X_MAX - WORLD_X_MIN)
      let bestY = GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
      let bestMinDist = 0
      // Try a few random candidates and pick the one farthest from nearest chick
      for (let attempt = 0; attempt < 5; attempt++) {
        const cx = WORLD_X_MIN + Math.random() * (WORLD_X_MAX - WORLD_X_MIN)
        const cy = GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
        let minDist = Infinity
        for (const other of otherChicks) {
          const d = Math.sqrt((cx - other.x) ** 2 + (cy - other.y) ** 2)
          if (d < minDist) minDist = d
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist
          bestX = cx
          bestY = cy
        }
      }
      updates.targetX = bestX
      updates.targetY = bestY
    }
  }

  // === Separation: push away from chicks that are too close ===
  const SEPARATION_RADIUS = 60
  const SEPARATION_FORCE = 0.8
  let sepX = 0
  let sepY = 0
  for (const other of otherChicks) {
    const dx = chick.x - other.x
    const dy = chick.y - other.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < SEPARATION_RADIUS && dist > 0.1) {
      // Push away proportional to how close
      const strength = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS
      sepX += (dx / dist) * strength * SEPARATION_FORCE * delta
      sepY += (dy / dist) * strength * SEPARATION_FORCE * delta
    }
  }
  if (sepX !== 0 || sepY !== 0) {
    const newX = Math.max(WORLD_X_MIN, Math.min(WORLD_X_MAX, (updates.x ?? chick.x) + sepX))
    const newY = Math.max(GROUND_Y_MIN, Math.min(GROUND_Y_MAX, (updates.y ?? chick.y) + sepY))
    updates.x = newX
    updates.y = newY
  }

  // Movement
  const action = updates.currentAction ?? chick.currentAction
  if (action === 'walking') {
    const dx = chick.targetX - chick.x
    const dy = chick.targetY - chick.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 2) {
      const speed = 0.8 * delta
      updates.x = chick.x + (dx / dist) * speed
      updates.y = chick.y + (dy / dist) * speed
      updates.direction = dx > 0 ? 'right' : 'left'
    } else {
      updates.currentAction = 'idle'
    }
  }

  return updates
}
