import type { ChickData, Rarity } from '../types/chick'

const BREEDS: Record<Rarity, string[]> = {
  common: ['white', 'yellow', 'brown'],
  special: ['spotted', 'striped', 'colorful'],
  rare: ['golden', 'rainbow', 'crystal'],
}

function rollRarity(): Rarity {
  const roll = Math.random()
  if (roll < 0.05) return 'rare' // 5%
  if (roll < 0.25) return 'special' // 20%
  return 'common' // 75%
}

function createEggWithRarity(x: number, y: number, rarity: Rarity): ChickData {
  const breeds = BREEDS[rarity]
  const breed = breeds[Math.floor(Math.random() * breeds.length)]

  return {
    id: crypto.randomUUID(),
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
  }
}

export function createEgg(x: number, y: number): ChickData {
  return createEggWithRarity(x, y, rollRarity())
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
