import type { ChickData, ChickPersonality, PersonalityType, Rarity } from '../types/chick'

const BREEDS: Record<Rarity, string[]> = {
  common: ['white', 'yellow', 'brown'],
  special: ['spotted', 'striped', 'colorful'],
  rare: ['golden', 'rainbow', 'crystal'],
}

// 草地区域边界
const GRASS_X_MIN = 60
const GRASS_X_MAX = 1380
const GRASS_Y_MIN = 560
const GRASS_Y_MAX = 870

// 场景关键位置
const POND = { x: 1050, y: 720 }
const BUSH_AREAS = [
  { x: 100, y: 650 },
  { x: 1300, y: 700 },
  { x: 700, y: 820 },
  { x: 400, y: 680 },
  { x: 1100, y: 850 },
]
const GATHERING_POINTS = [
  { x: 720, y: 750 },
  { x: 400, y: 700 },
  { x: 1000, y: 780 },
]

function clampX(v: number): number {
  return Math.max(GRASS_X_MIN, Math.min(GRASS_X_MAX, v))
}
function clampY(v: number): number {
  return Math.max(GRASS_Y_MIN, Math.min(GRASS_Y_MAX, v))
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function rollRarity(): Rarity {
  const roll = Math.random()
  if (roll < 0.05) return 'rare' // 5%
  if (roll < 0.25) return 'special' // 20%
  return 'common' // 75%
}

const PERSONALITY_TYPES: PersonalityType[] = ['explorer', 'homebody', 'social', 'playful', 'lazy']

function generateRouteWaypoints(
  type: PersonalityType,
  homeX: number,
  homeY: number,
): { x: number; y: number }[] {
  const route: { x: number; y: number }[] = []

  switch (type) {
    case 'explorer': {
      // 4-5 points spread across the full map
      const count = 4 + Math.floor(Math.random() * 2)
      for (let i = 0; i < count; i++) {
        route.push({
          x: clampX(randRange(GRASS_X_MIN, GRASS_X_MAX)),
          y: clampY(randRange(GRASS_Y_MIN, GRASS_Y_MAX)),
        })
      }
      break
    }
    case 'homebody': {
      // 3-4 points clustered near home
      const count = 3 + Math.floor(Math.random() * 2)
      for (let i = 0; i < count; i++) {
        route.push({
          x: clampX(homeX + randRange(-120, 120)),
          y: clampY(homeY + randRange(-60, 60)),
        })
      }
      break
    }
    case 'social': {
      // 4 points including some gathering areas
      const gp1 = GATHERING_POINTS[Math.floor(Math.random() * GATHERING_POINTS.length)]
      const gp2 = GATHERING_POINTS[Math.floor(Math.random() * GATHERING_POINTS.length)]
      route.push({ x: gp1.x, y: gp1.y })
      route.push({
        x: clampX(homeX + randRange(-150, 150)),
        y: clampY(homeY + randRange(-80, 80)),
      })
      route.push({ x: gp2.x, y: gp2.y })
      route.push({
        x: clampX(homeX + randRange(-150, 150)),
        y: clampY(homeY + randRange(-80, 80)),
      })
      break
    }
    case 'playful': {
      // 4-5 points including pond and bush areas
      route.push({ x: POND.x, y: Math.max(GRASS_Y_MIN, POND.y) })
      const bush = BUSH_AREAS[Math.floor(Math.random() * BUSH_AREAS.length)]
      route.push({ x: bush.x, y: bush.y })
      route.push({
        x: clampX(randRange(GRASS_X_MIN, GRASS_X_MAX)),
        y: clampY(randRange(GRASS_Y_MIN, GRASS_Y_MAX)),
      })
      route.push({
        x: clampX(homeX + randRange(-200, 200)),
        y: clampY(homeY + randRange(-80, 80)),
      })
      if (Math.random() > 0.5) {
        const bush2 = BUSH_AREAS[Math.floor(Math.random() * BUSH_AREAS.length)]
        route.push({ x: bush2.x, y: bush2.y })
      }
      break
    }
    case 'lazy': {
      // 3 points, all very close to home
      for (let i = 0; i < 3; i++) {
        route.push({
          x: clampX(homeX + randRange(-60, 60)),
          y: clampY(homeY + randRange(-30, 30)),
        })
      }
      break
    }
  }
  return route
}

export function generatePersonality(): ChickPersonality {
  const type = PERSONALITY_TYPES[Math.floor(Math.random() * PERSONALITY_TYPES.length)]
  const homeX = randRange(GRASS_X_MIN, GRASS_X_MAX)
  const homeY = randRange(GRASS_Y_MIN, GRASS_Y_MAX)

  let wanderRadius: number
  let speedMult: number
  let activityLevel: number

  switch (type) {
    case 'explorer':
      wanderRadius = randRange(300, 500)
      speedMult = randRange(1.1, 1.4)
      activityLevel = randRange(1.2, 1.8)
      break
    case 'homebody':
      wanderRadius = randRange(80, 150)
      speedMult = randRange(0.8, 1.1)
      activityLevel = randRange(0.6, 1.0)
      break
    case 'social':
      wanderRadius = randRange(150, 300)
      speedMult = randRange(0.9, 1.1)
      activityLevel = randRange(0.9, 1.3)
      break
    case 'playful':
      wanderRadius = randRange(200, 400)
      speedMult = randRange(1.1, 1.4)
      activityLevel = randRange(1.5, 2.0)
      break
    case 'lazy':
      wanderRadius = randRange(60, 120)
      speedMult = randRange(0.6, 0.8)
      activityLevel = randRange(0.3, 0.6)
      break
  }

  const route = generateRouteWaypoints(type, homeX, homeY)

  return {
    type,
    homeX,
    homeY,
    wanderRadius,
    speedMult,
    activityLevel,
    route,
    routeIndex: 0,
  }
}

// Generate a unique id that works on plain HTTP (crypto.randomUUID requires HTTPS)
let _idCounter = 0
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `chick-${Date.now().toString(36)}-${(_idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function createEggWithRarity(x: number, y: number, rarity: Rarity): ChickData {
  const breeds = BREEDS[rarity]
  const breed = breeds[Math.floor(Math.random() * breeds.length)]

  return {
    id: genId(),
    name: '',
    breed,
    rarity,
    stage: 'egg',
    mood: 'normal',
    moodValue: 50,
    hunger: 50,
    x,
    y,
    targetX: x,
    targetY: y,
    direction: 'right',
    currentAction: 'idle',
    growthProgress: 0,
    birthTime: Date.now(),
    eggTimer: 3000,
    eggsLaid: 0,
    inCoop: false,
    coopType: null,
    feedsThisStage: 0,
    personality: generatePersonality(),
  }
}

export function createEgg(x: number, y: number): ChickData {
  return createEggWithRarity(x, y, rollRarity())
}

export function createCommonEgg(x: number, y: number): ChickData {
  return createEggWithRarity(x, y, 'common')
}

export function createSpecialEgg(x: number, y: number): ChickData {
  return createEggWithRarity(x, y, 'special')
}

export function createRareEgg(x: number, y: number): ChickData {
  return createEggWithRarity(x, y, 'rare')
}

export function createMysteryEgg(x: number, y: number): ChickData {
  // 50% common, 35% special, 15% rare
  const roll = Math.random()
  let rarity: Rarity
  if (roll < 0.15) rarity = 'rare'
  else if (roll < 0.50) rarity = 'special'
  else rarity = 'common'
  return createEggWithRarity(x, y, rarity)
}
