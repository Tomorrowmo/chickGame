import type { ChickData } from '../types/chick'

const GROUND_Y_MIN = 400 // grass area top
const GROUND_Y_MAX = 600
const WORLD_X_MIN = 50
const WORLD_X_MAX = 910

export function updateChickAI(
  chick: ChickData,
  delta: number,
): Partial<ChickData> {
  if (chick.stage === 'egg' || chick.stage === 'hatching') {
    return {} // Eggs don't move
  }

  const updates: Partial<ChickData> = {}

  // Random action change
  if (Math.random() < 0.005 * delta) {
    const actions = ['idle', 'walking', 'eating', 'sleeping'] as const
    const weights =
      chick.mood === 'happy'
        ? [0.2, 0.4, 0.2, 0.2]
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

    // Pick new target when starting to walk
    if (updates.currentAction === 'walking') {
      updates.targetX =
        WORLD_X_MIN + Math.random() * (WORLD_X_MAX - WORLD_X_MIN)
      updates.targetY =
        GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
    }
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
