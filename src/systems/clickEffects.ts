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

interface ClickEffectsState {
  effects: ClickEffect[]
  cursorX: number
  cursorY: number
  cursorOnGrass: boolean
  /** Timestamp of the last pond splash (Date.now()), 0 if none */
  pondSplashTime: number

  addEffect: (type: EffectType, x: number, y: number) => void
  tickEffects: (delta: number) => void
  setCursor: (x: number, y: number, onGrass: boolean) => void
  triggerPondSplash: () => void
}

let nextEffectId = 0

const MAX_AGE: Record<EffectType, number> = {
  heart: 60,
  flower: 90,
  cloud: 120,
  butterfly: 120,
  splash: 50,
}

export const useClickEffectsStore = create<ClickEffectsState>((set) => ({
  effects: [],
  cursorX: 0,
  cursorY: 0,
  cursorOnGrass: false,
  pondSplashTime: 0,

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
    })),

  setCursor: (x, y, onGrass) => set({ cursorX: x, cursorY: y, cursorOnGrass: onGrass }),

  triggerPondSplash: () => set({ pondSplashTime: Date.now() }),
}))
