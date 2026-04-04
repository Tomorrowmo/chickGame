import { create } from 'zustand'

export type EffectType = 'heart' | 'flower' | 'cloud' | 'butterfly' | 'splash'

export interface ClickEffect {
  id: string
  type: EffectType
  x: number
  y: number
  age: number // frames since creation
  maxAge: number // auto-remove after this many frames
}

/** A single sparkle/dust particle in a swipe trail */
export interface SwipeTrailParticle {
  id: string
  x: number
  y: number
  age: number
  maxAge: number
}

interface ClickEffectsState {
  effects: ClickEffect[]
  cursorX: number
  cursorY: number
  cursorOnGrass: boolean
  /** Timestamp of the last pond splash (Date.now()), 0 if none */
  pondSplashTime: number

  /** Swipe chase state */
  swipeTrail: SwipeTrailParticle[]
  swipeTargetX: number
  swipeTargetY: number
  swipeActive: boolean // true when a swipe was recently detected

  addEffect: (type: EffectType, x: number, y: number) => void
  tickEffects: (delta: number) => void
  setCursor: (x: number, y: number, onGrass: boolean) => void
  triggerPondSplash: () => void
  addSwipeTrail: (x: number, y: number) => void
  setSwipeTarget: (x: number, y: number) => void
  clearSwipe: () => void
}

let nextEffectId = 0
let nextSwipeId = 0

const MAX_AGE: Record<EffectType, number> = {
  heart: 60,
  flower: 90,
  cloud: 120,
  butterfly: 120,
  splash: 50,
}

const SWIPE_TRAIL_MAX_AGE = 30

export const useClickEffectsStore = create<ClickEffectsState>((set) => ({
  effects: [],
  cursorX: 0,
  cursorY: 0,
  cursorOnGrass: false,
  pondSplashTime: 0,
  swipeTrail: [],
  swipeTargetX: 0,
  swipeTargetY: 0,
  swipeActive: false,

  addEffect: (type, x, y) =>
    set((state) => ({
      effects: [
        ...state.effects,
        {
          id: `effect-${nextEffectId++}`,
          type,
          x,
          y,
          age: 0,
          maxAge: MAX_AGE[type],
        },
      ],
    })),

  tickEffects: (delta) =>
    set((state) => ({
      effects: state.effects
        .map((e) => ({ ...e, age: e.age + delta }))
        .filter((e) => e.age < e.maxAge),
      swipeTrail: state.swipeTrail
        .map((p) => ({ ...p, age: p.age + delta }))
        .filter((p) => p.age < p.maxAge),
      // Clear swipe active flag once all trail particles are gone
      swipeActive: state.swipeActive && state.swipeTrail.some((p) => p.age + delta < p.maxAge),
    })),

  setCursor: (x, y, onGrass) => set({ cursorX: x, cursorY: y, cursorOnGrass: onGrass }),

  triggerPondSplash: () => set({ pondSplashTime: Date.now() }),

  addSwipeTrail: (x, y) =>
    set((state) => ({
      swipeTrail: [
        ...state.swipeTrail,
        {
          id: `swipe-${nextSwipeId++}`,
          x,
          y,
          age: 0,
          maxAge: SWIPE_TRAIL_MAX_AGE,
        },
      ],
    })),

  setSwipeTarget: (x, y) => set({ swipeTargetX: x, swipeTargetY: y, swipeActive: true }),

  clearSwipe: () => set({ swipeActive: false }),
}))
