export type LifeStage = 'egg' | 'hatching' | 'baby' | 'juvenile' | 'adult'
export type Rarity = 'common' | 'special' | 'rare'
export type Mood = 'happy' | 'normal' | 'bored' | 'angry'

export type CoopType = 'common' | 'special' | 'rare'

export interface ChickData {
  id: string
  name: string
  breed: string
  rarity: Rarity
  stage: LifeStage
  mood: Mood
  moodValue: number // 0-100
  hunger: number // 0-100
  x: number
  y: number
  targetX: number
  targetY: number
  direction: 'left' | 'right'
  currentAction:
    | 'idle'
    | 'walking'
    | 'eating'
    | 'sleeping'
    | 'playing'
    | 'chasing'
  growthProgress: number // 0-100, triggers stage change at 100
  birthTime: number
  eggTimer: number // countdown frames until next egg (adult only)
  eggsLaid: number // total eggs laid by this chick
  inCoop: boolean // whether egg is placed in a coop (only eggs hatch when inCoop)
  coopType: CoopType | null // which coop the egg is in
}
