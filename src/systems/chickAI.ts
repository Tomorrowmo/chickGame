import type { ChickData } from '../types/chick'
import { COOP_POSITIONS, type CoopInfo } from '../components/scene/Coop'

/** Get the correct coop for a chick based on rarity */
function getCoopForChick(chick: ChickData): CoopInfo {
  return COOP_POSITIONS.find((c) => c.type === chick.rarity) ?? COOP_POSITIONS[0]
}

const GROUND_Y_MIN = 560 // grass area top (60% of 900)
const GROUND_Y_MAX = 870
const WORLD_X_MIN = 60
const WORLD_X_MAX = 1380

/** Pond position — will be scaled with the larger canvas */
const POND_X = 1050
const POND_Y = 720
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

function clampX(v: number): number {
  return Math.max(WORLD_X_MIN, Math.min(WORLD_X_MAX, v))
}

function clampY(v: number): number {
  return Math.max(GROUND_Y_MIN, Math.min(GROUND_Y_MAX, v))
}

/** Pick a walking target based on personality blend */
function pickWalkingTarget(
  chick: ChickData,
  otherChicks: ChickData[],
): { x: number; y: number } {
  const p = chick.personality
  const roll = Math.random()

  if (roll < 0.4) {
    // 40%: next route waypoint
    if (p.route.length > 0) {
      const wp = p.route[p.routeIndex % p.route.length]
      return { x: wp.x, y: wp.y }
    }
  } else if (roll < 0.7) {
    // 30%: random position within wanderRadius of home
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * p.wanderRadius
    return {
      x: clampX(p.homeX + Math.cos(angle) * dist),
      y: clampY(p.homeY + Math.sin(angle) * dist * 0.5),
    }
  } else if (roll < 0.9) {
    // 20%: fully random
    return {
      x: WORLD_X_MIN + Math.random() * (WORLD_X_MAX - WORLD_X_MIN),
      y: GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN),
    }
  } else {
    // 10%: toward nearest chick
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
      // Walk toward but offset slightly
      return {
        x: clampX(nearest.x + (Math.random() - 0.5) * 40),
        y: clampY(nearest.y + (Math.random() - 0.5) * 30),
      }
    }
  }

  // Fallback: random near home
  return {
    x: clampX(p.homeX + (Math.random() - 0.5) * p.wanderRadius),
    y: clampY(p.homeY + (Math.random() - 0.5) * p.wanderRadius * 0.5),
  }
}

/** Get action weights based on personality and mood */
function getActionWeights(
  chick: ChickData,
): [number, number, number, number] {
  // [idle, walking, eating, sleeping]
  const pType = chick.personality.type

  // Base weights by personality
  let weights: [number, number, number, number]
  switch (pType) {
    case 'explorer':
      weights = [0.1, 0.55, 0.2, 0.15]
      break
    case 'homebody':
      weights = [0.35, 0.2, 0.25, 0.2]
      break
    case 'social':
      weights = [0.2, 0.4, 0.2, 0.2]
      break
    case 'playful':
      weights = [0.1, 0.4, 0.3, 0.2]
      break
    case 'lazy':
      weights = [0.35, 0.1, 0.15, 0.4]
      break
    default:
      weights = [0.3, 0.3, 0.2, 0.2]
  }

  // Mood adjustments
  if (chick.mood === 'happy') {
    weights[1] += 0.1 // more walking
    weights[0] -= 0.1
  } else if (chick.mood === 'angry') {
    weights[0] += 0.15
    weights[1] -= 0.15
  }

  return weights
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
  const p = chick.personality
  const speedMult = p.speedMult

  // === Pond splash attraction ===
  const splashActive = pondSplashTime != null && (Date.now() - pondSplashTime) < SPLASH_ATTRACT_DURATION
  if (splashActive && !night) {
    const distToPond = distBetween(chick, { x: POND_X, y: POND_Y })
    // Playful chicks are more attracted to splashes
    const attractRadius = p.type === 'playful' ? SPLASH_ATTRACT_RADIUS * 1.5 : SPLASH_ATTRACT_RADIUS
    if (distToPond < attractRadius && distToPond > 50) {
      const attractChance = p.type === 'playful' ? 0.05 : p.type === 'lazy' ? 0.01 : 0.03
      if (Math.random() < attractChance * delta) {
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

  // === Night behavior: walk to the correct coop based on rarity and sleep ===
  if (night) {
    const targetCoop = getCoopForChick(chick)
    const idHash = chick.id.charCodeAt(0) + chick.id.charCodeAt(chick.id.length - 1)
    const angle = (idHash % 12) * (Math.PI * 2 / 12)
    const offsetDist = 20 + (idHash % 40)
    const sleepX = targetCoop.x + Math.cos(angle) * offsetDist
    const sleepY = targetCoop.y + Math.sin(angle) * offsetDist * 0.5
    const distToSleep = distBetween(chick, { x: sleepX, y: sleepY })
    if (distToSleep > 10) {
      const dx = sleepX - chick.x
      const dy = sleepY - chick.y
      const dist = distToSleep
      const speed = 0.6 * delta * speedMult
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
    // Go to first route waypoint on waking
    if (p.route.length > 0) {
      const wp = p.route[0]
      updates.targetX = wp.x
      updates.targetY = wp.y
      updates.personality = { ...p, routeIndex: 1 % p.route.length }
    } else {
      updates.targetX = WORLD_X_MIN + Math.random() * (WORLD_X_MAX - WORLD_X_MIN)
      updates.targetY = GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
    }
    return updates
  }

  // === Daytime social behaviors ===

  const otherChicks = allChicks.filter(
    (c) => c.id !== chick.id && c.stage !== 'egg' && c.stage !== 'hatching',
  )

  // --- A. Chasing other chicks ---
  if (chick.currentAction === 'chasing') {
    const dx = chick.targetX - chick.x
    const dy = chick.targetY - chick.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 15) {
      const speed = 1.4 * delta * speedMult
      updates.x = chick.x + (dx / dist) * speed
      updates.y = chick.y + (dy / dist) * speed
      updates.direction = dx > 0 ? 'right' : 'left'
    } else {
      updates.currentAction = 'idle'
    }
    return updates
  }

  // --- Angry chick: sometimes face away from others, stay idle ---
  if (chick.mood === 'angry' && Math.random() < 0.01 * delta) {
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
      const dx = nearest.x - chick.x
      updates.direction = dx > 0 ? 'left' : 'right'
      updates.currentAction = 'idle'
      return updates
    }
  }

  // Random action change — frequency scaled by personality activityLevel
  const actionChangeChance = 0.005 * p.activityLevel
  if (Math.random() < actionChangeChance * delta) {

    // --- Social personality: follow nearby walking chicks more aggressively ---
    if (chick.currentAction === 'idle') {
      const followChance = p.type === 'social' ? 0.55 : 0.3
      if (Math.random() < followChance) {
        const followRadius = p.type === 'social' ? 200 : 120
        const walkingNearby = otherChicks.filter(
          (c) => c.currentAction === 'walking' && distBetween(chick, c) < followRadius,
        )
        if (walkingNearby.length > 0) {
          const leader = walkingNearby[Math.floor(Math.random() * walkingNearby.length)]
          updates.currentAction = 'walking'
          updates.targetX = clampX(leader.targetX + (Math.random() - 0.5) * 40)
          updates.targetY = clampY(leader.targetY + (Math.random() - 0.5) * 30)
          return updates
        }
      }
    }

    // --- Start chasing a nearby chick ---
    let chaseChance = chick.mood === 'happy' ? 0.15 : 0.05
    if (p.type === 'playful') chaseChance *= 2
    if (p.type === 'lazy') chaseChance *= 0.3
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

    // --- Water play: go toward pond if nearby ---
    const distToPond = distBetween(chick, { x: POND_X, y: POND_Y })
    let waterPlayChance = chick.mood === 'happy' ? 0.2 : 0.08
    if (p.type === 'playful') waterPlayChance *= 2
    if (p.type === 'lazy') waterPlayChance *= 0.3
    if (distToPond < POND_PLAY_RADIUS && Math.random() < waterPlayChance) {
      const angle = Math.random() * Math.PI * 2
      const edgeX = POND_X + Math.cos(angle) * 50
      const edgeY = POND_Y + Math.sin(angle) * 25
      updates.currentAction = 'walking'
      updates.targetX = edgeX
      updates.targetY = Math.max(GROUND_Y_MIN, edgeY)
      return updates
    }
    if (distToPond < 60 && chick.currentAction === 'idle' && Math.random() < 0.3) {
      updates.currentAction = 'eating' // bobbing = drinking
      return updates
    }

    // --- Default random action based on personality weights ---
    const actions = ['idle', 'walking', 'eating', 'sleeping'] as const
    const weights = getActionWeights(chick)

    let roll = Math.random()
    for (let i = 0; i < actions.length; i++) {
      roll -= weights[i]
      if (roll <= 0) {
        updates.currentAction = actions[i]
        break
      }
    }

    // Pick new target when starting to walk — use personality-based selection
    if (updates.currentAction === 'walking') {
      const target = pickWalkingTarget(chick, otherChicks)
      updates.targetX = target.x
      updates.targetY = target.y
    }
  }

  // Movement
  const action = updates.currentAction ?? chick.currentAction
  if (action === 'walking') {
    const dx = chick.targetX - chick.x
    const dy = chick.targetY - chick.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 2) {
      const speed = 0.8 * delta * speedMult
      updates.x = chick.x + (dx / dist) * speed
      updates.y = chick.y + (dy / dist) * speed
      updates.direction = dx > 0 ? 'right' : 'left'
    } else {
      // Reached destination — advance route waypoint
      updates.currentAction = 'idle'
      if (p.route.length > 0) {
        const nextIdx = (p.routeIndex + 1) % p.route.length
        updates.personality = { ...p, routeIndex: nextIdx }
      }
    }
  }

  // === Separation: AFTER movement, so it can't be overwritten ===
  const SEPARATION_RADIUS = 50
  const SEPARATION_FORCE = 2.0
  let sepX = 0
  let sepY = 0
  for (const other of otherChicks) {
    const dx = (updates.x ?? chick.x) - other.x
    const dy = (updates.y ?? chick.y) - other.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < SEPARATION_RADIUS && dist > 0.1) {
      const strength = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS
      sepX += (dx / dist) * strength * SEPARATION_FORCE * delta
      sepY += (dy / dist) * strength * SEPARATION_FORCE * delta
    }
  }
  if (sepX !== 0 || sepY !== 0) {
    const baseX = updates.x ?? chick.x
    const baseY = updates.y ?? chick.y
    updates.x = Math.max(WORLD_X_MIN, Math.min(WORLD_X_MAX, baseX + sepX))
    updates.y = Math.max(GROUND_Y_MIN, Math.min(GROUND_Y_MAX, baseY + sepY))
  }

  return updates
}
