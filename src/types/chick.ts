export type LifeStage = 'egg' | 'hatching' | 'baby' | 'juvenile' | 'adult'
export type Rarity = 'common' | 'special' | 'rare'
export type Mood = 'happy' | 'normal' | 'bored' | 'angry'

export type CoopType = 'common' | 'special' | 'rare'

export type PersonalityType = 'explorer' | 'homebody' | 'social' | 'playful' | 'lazy'

export interface ChickPersonality {
  /** 移动风格: explorer=探索者, homebody=宅家, social=社交, playful=爱玩, lazy=懒惰 */
  type: PersonalityType
  /** 偏好区域中心X */
  homeX: number
  /** 偏好区域中心Y */
  homeY: number
  /** 活动半径 */
  wanderRadius: number
  /** 速度倍率 (0.6-1.4) */
  speedMult: number
  /** 活跃度 (0.5=安静, 2.0=多动) */
  activityLevel: number
  /** 巡逻路线点 3-5个 */
  route: { x: number; y: number }[]
  /** 当前路线点索引 */
  routeIndex: number
}

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
  eggFed: boolean // egg must be fed at least once before it can hatch
  personality: ChickPersonality
}
