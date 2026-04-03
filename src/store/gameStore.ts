import { create } from 'zustand'
import type { ChickData } from '../types/chick'
import { createEgg } from './chickFactory'

interface GameState {
  chicks: ChickData[]
  coins: number
  selectedChickId: string | null

  // Actions
  addEgg: (x: number, y: number) => void
  selectChick: (id: string | null) => void
  updateChick: (id: string, updates: Partial<ChickData>) => void
  feedChick: (id: string) => void
  petChick: (id: string) => void
  tick: (delta: number) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  chicks: [],
  coins: 100,
  selectedChickId: null,

  addEgg: (x, y) =>
    set((state) => ({
      chicks: [...state.chicks, createEgg(x, y)],
    })),

  selectChick: (id) => set({ selectedChickId: id }),

  updateChick: (id, updates) =>
    set((state) => ({
      chicks: state.chicks.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  feedChick: (id) =>
    set((state) => ({
      chicks: state.chicks.map((c) =>
        c.id === id
          ? {
              ...c,
              hunger: Math.min(100, c.hunger + 30),
              moodValue: Math.min(100, c.moodValue + 10),
            }
          : c,
      ),
    })),

  petChick: (id) =>
    set((state) => ({
      chicks: state.chicks.map((c) =>
        c.id === id
          ? { ...c, moodValue: Math.min(100, c.moodValue + 15) }
          : c,
      ),
    })),

  tick: (delta) => {
    const state = get()
    const updated = state.chicks.map((chick) => {
      let { hunger, moodValue, growthProgress, stage, mood } = chick

      // Hunger decreases over time
      hunger = Math.max(0, hunger - 0.01 * delta)
      // Mood decreases slowly
      moodValue = Math.max(0, moodValue - 0.005 * delta)
      // Growth increases
      growthProgress = Math.min(100, growthProgress + 0.02 * delta)

      // Update mood label
      if (moodValue > 70) mood = 'happy'
      else if (moodValue > 40) mood = 'normal'
      else if (moodValue > 20) mood = 'bored'
      else mood = 'angry'

      // Stage progression
      if (growthProgress >= 100) {
        const stages = ['egg', 'hatching', 'baby', 'juvenile', 'adult'] as const
        const idx = stages.indexOf(stage)
        if (idx < stages.length - 1) {
          stage = stages[idx + 1]
          growthProgress = 0
        }
      }

      return { ...chick, hunger, moodValue, growthProgress, stage, mood }
    })
    set({ chicks: updated })
  },
}))
