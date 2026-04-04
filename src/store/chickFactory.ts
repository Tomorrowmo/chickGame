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

export function createEgg(x: number, y: number): ChickData {
  const rarity = rollRarity()
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
