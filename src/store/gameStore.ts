import { create } from 'zustand'
import type { ChickData } from '../types/chick'
import { createEgg, createCommonEgg, createSpecialEgg, createRareEgg, createMysteryEgg } from './chickFactory'
import { loadGame, saveGame as persistSave, startAutoSave } from '../systems/persistence'
import { advanceTime } from '../systems/timeSystem'
import type { DecorationType } from './shopData'
import { ACHIEVEMENTS, DEFAULT_ACHIEVEMENT_STATS } from './achievementData'
import type { AchievementStats } from './achievementData'

export type FoodType = 'grain' | 'worm' | 'treat' | 'rainbow_grain' | 'cake'

export interface FoodParticle {
  id: string
  type: FoodType
  x: number
  y: number
  scale: number // 1 = full, shrinks as eaten
  eaten: boolean
}

export const FOOD_COSTS: Record<FoodType, number> = {
  grain: 5,
  worm: 10,
  treat: 20,
  rainbow_grain: 40,
  cake: 30,
}

export const FOOD_EFFECTS: Record<FoodType, { hunger: number; growth: number; mood: number }> = {
  grain: { hunger: 20, growth: 5, mood: 0 },
  worm: { hunger: 30, growth: 10, mood: 0 },
  treat: { hunger: 15, growth: 5, mood: 20 },
  rainbow_grain: { hunger: 50, growth: 20, mood: 30 },
  cake: { hunger: 10, growth: 0, mood: 50 },
}

export const FOOD_COLORS: Record<FoodType, number> = {
  grain: 0xdaa520,  // golden
  worm: 0x8b4513,   // brown
  treat: 0xff69b4,  // pink
  rainbow_grain: 0xff6eb4,  // rainbow pink
  cake: 0xffdab9,   // peach
}

export interface PlacedDecoration {
  id: string
  type: DecorationType
  x: number
  y: number
}

export interface DirtSpot {
  id: string
  x: number
  y: number
}

import type { Rarity } from '../types/chick'

export const EGG_COIN_REWARD: Record<Rarity, number> = {
  common: 5,
  special: 10,
  rare: 20,
}

export const EGG_TIMER_INITIAL = 3000 // ~50 seconds at 60fps

let nextFoodId = 0

export type MiniGameType = 'hideAndSeek' | 'race' | 'fetch'

export interface EggLayEvent {
  chickId: string
  x: number
  y: number
  reward: number
  timestamp: number
}

interface GameState {
  chicks: ChickData[]
  coins: number
  gameTime: number // 0-1440, minutes in a day
  selectedChickId: string | null
  selectedFood: FoodType | null
  feedingMode: boolean
  foodParticles: FoodParticle[]
  currentGame: MiniGameType | null
  eggLayEvents: EggLayEvent[]
  decorations: PlacedDecoration[]
  dirtSpots: DirtSpot[]
  cleaningMode: boolean
  dirtSpawnTimer: number
  shopOpen: boolean
  achievementStats: AchievementStats
  unlockedAchievements: string[]
  pendingAchievementToast: { id: string; icon: string; name: string; reward: number } | null
  achievementPanelOpen: boolean

  // Actions
  addEgg: (x: number, y: number) => void
  selectChick: (id: string | null) => void
  updateChick: (id: string, updates: Partial<ChickData>) => void
  feedChick: (id: string) => void
  feedChickWithFood: (id: string, foodType: FoodType) => void
  petChick: (id: string) => void
  tick: (delta: number) => void
  setSelectedFood: (food: FoodType | null) => void
  setFeedingMode: (mode: boolean) => void
  scatterFood: (foodType: FoodType, x: number, y: number) => boolean
  removeFoodParticle: (id: string) => void
  shrinkFoodParticle: (id: string, amount: number) => void
  startGame: (game: MiniGameType) => void
  endGame: () => void
  addCoins: (amount: number) => void
  boostAllChickMood: (amount: number) => void
  clearEggLayEvents: () => void
  saveGame: () => void
  showSaveIndicator: boolean
  setShopOpen: (open: boolean) => void
  buyCommonEgg: (x: number, y: number) => boolean
  buySpecialEgg: (x: number, y: number) => boolean
  buyRareEgg: (x: number, y: number) => boolean
  buyMysteryEgg: (x: number, y: number) => boolean
  placeEggInCoop: (chickId: string, coopType: import('../types/chick').CoopType) => boolean
  rejectEggFromCoop: (chickId: string) => void
  buyDecoration: (type: DecorationType, price: number) => boolean
  buyPremiumFood: (foodType: FoodType, price: number) => boolean
  checkAchievements: () => void
  incrementStat: (stat: keyof AchievementStats, value?: number) => void
  recordGamePlayed: (gameType: string) => void
  clearAchievementToast: () => void
  setAchievementPanelOpen: (open: boolean) => void
  setCleaningMode: (mode: boolean) => void
  cleanDirtSpot: (id: string) => void
}

const savedState = loadGame()

export const useGameStore = create<GameState>((set, get) => ({
  chicks: savedState?.chicks ?? [],
  coins: savedState?.coins ?? 100,
  gameTime: savedState?.gameTime ?? 480, // default 8:00 AM
  selectedChickId: savedState?.selectedChickId ?? null,
  selectedFood: null,
  feedingMode: false,
  foodParticles: [],
  currentGame: null,
  eggLayEvents: [],
  decorations: savedState?.decorations ?? [],
  dirtSpots: [],
  cleaningMode: false,
  dirtSpawnTimer: 0,
  shopOpen: false,
  showSaveIndicator: false,
  achievementStats: savedState?.achievementStats ?? { ...DEFAULT_ACHIEVEMENT_STATS },
  unlockedAchievements: savedState?.unlockedAchievements ?? [],
  pendingAchievementToast: null,
  achievementPanelOpen: false,

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

  feedChickWithFood: (id, foodType) =>
    set((state) => {
      const effects = FOOD_EFFECTS[foodType]
      return {
        chicks: state.chicks.map((c) =>
          c.id === id
            ? {
                ...c,
                hunger: Math.min(100, c.hunger + effects.hunger),
                growthProgress: Math.min(100, c.growthProgress + effects.growth),
                moodValue: Math.min(100, c.moodValue + effects.mood),
              }
            : c,
        ),
      }
    }),

  petChick: (id) => {
    set((state) => ({
      chicks: state.chicks.map((c) =>
        c.id === id
          ? { ...c, moodValue: Math.min(100, c.moodValue + 15) }
          : c,
      ),
    }))
    get().incrementStat('chicksClicked')
  },

  tick: (delta) => {
    const state = get()
    const newGameTime = advanceTime(state.gameTime, delta)
    const newEggLayEvents: EggLayEvent[] = []
    let coinGain = 0
    let newHatches = 0

    const updated = state.chicks.map((chick) => {
      let { hunger, moodValue, growthProgress, stage, mood, eggTimer, eggsLaid } = chick

      // Eggs that are NOT in a coop don't advance at all
      if ((chick.stage === 'egg' || chick.stage === 'hatching') && !chick.inCoop) {
        return chick
      }

      // Hunger decreases over time
      hunger = Math.max(0, hunger - 0.01 * delta)
      // Mood decreases slowly
      moodValue = Math.max(0, moodValue - 0.005 * delta)
      // Growth increases
      // Growth speed: eggs/hatching grow faster, other stages slower
      const isEggStage = stage === 'egg' || stage === 'hatching'
      const growthSpeed = isEggStage ? 0.08 : 0.04
      growthProgress = Math.min(100, growthProgress + growthSpeed * delta)

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
          const prevStage = stage
          stage = stages[idx + 1]
          growthProgress = 0
          if (prevStage === 'hatching' && stage === 'baby') {
            newHatches++
          }
        }
      }

      // Adult egg-laying economy
      if (stage === 'adult' && (mood === 'happy' || mood === 'normal')) {
        const speed = mood === 'happy' ? 1.5 : 1
        eggTimer = eggTimer - delta * speed
        if (eggTimer <= 0) {
          const reward = EGG_COIN_REWARD[chick.rarity]
          coinGain += reward
          eggsLaid += 1
          eggTimer = EGG_TIMER_INITIAL
          newEggLayEvents.push({
            chickId: chick.id,
            x: chick.x,
            y: chick.y,
            reward,
            timestamp: Date.now(),
          })
        }
      }

      return { ...chick, hunger, moodValue, growthProgress, stage, mood, eggTimer, eggsLaid }
    })

    // Dirt spot spawning: every ~3600 ticks (~60 seconds at 60fps), max 5
    const DIRT_SPAWN_INTERVAL = 3600
    const MAX_DIRT_SPOTS = 5
    let newDirtSpots = state.dirtSpots
    let newDirtTimer = state.dirtSpawnTimer + delta
    if (newDirtTimer >= DIRT_SPAWN_INTERVAL && state.dirtSpots.length < MAX_DIRT_SPOTS) {
      newDirtTimer = 0
      const margin = 80
      const grassTop = 570
      const grassBottom = 850
      const dx = margin + Math.random() * (1360 - margin)
      const dy = grassTop + Math.random() * (grassBottom - grassTop)
      newDirtSpots = [
        ...state.dirtSpots,
        { id: `dirt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, x: dx, y: dy },
      ]
    }

    const updates: Partial<GameState> = {
      chicks: updated,
      gameTime: newGameTime,
      dirtSpots: newDirtSpots,
      dirtSpawnTimer: newDirtTimer,
    }
    if (coinGain > 0) {
      updates.coins = state.coins + coinGain
    }
    if (newEggLayEvents.length > 0) {
      updates.eggLayEvents = [...state.eggLayEvents, ...newEggLayEvents]
    }
    set(updates as GameState)
    if (newEggLayEvents.length > 0) {
      get().incrementStat('totalEggsLaid', newEggLayEvents.length)
      get().incrementStat('totalCoinsFromEggs', coinGain)
    }
    if (newHatches > 0) {
      get().incrementStat('totalChicksHatched', newHatches)
    }
  },

  setSelectedFood: (food) =>
    set({ selectedFood: food, feedingMode: food !== null }),

  setFeedingMode: (mode) =>
    set({ feedingMode: mode, selectedFood: mode ? get().selectedFood : null }),

  scatterFood: (foodType, x, y) => {
    const state = get()
    const cost = FOOD_COSTS[foodType]
    if (state.coins < cost) return false

    const count = 5 + Math.floor(Math.random() * 4) // 5-8 particles
    const particles: FoodParticle[] = []
    for (let i = 0; i < count; i++) {
      particles.push({
        id: `food-${nextFoodId++}`,
        type: foodType,
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        scale: 1,
        eaten: false,
      })
    }

    set({
      coins: state.coins - cost,
      foodParticles: [...state.foodParticles, ...particles],
    })
    get().incrementStat('totalFeedCount')
    return true
  },

  removeFoodParticle: (id) =>
    set((state) => ({
      foodParticles: state.foodParticles.filter((f) => f.id !== id),
    })),

  shrinkFoodParticle: (id, amount) =>
    set((state) => ({
      foodParticles: state.foodParticles.map((f) =>
        f.id === id ? { ...f, scale: Math.max(0, f.scale - amount) } : f,
      ),
    })),

  startGame: (game) => {
    set({ currentGame: game, feedingMode: false, selectedFood: null })
    get().recordGamePlayed(game)
  },

  endGame: () => set({ currentGame: null }),

  addCoins: (amount) =>
    set((state) => ({ coins: state.coins + amount })),

  boostAllChickMood: (amount) =>
    set((state) => ({
      chicks: state.chicks.map((c) =>
        c.stage !== 'egg' && c.stage !== 'hatching'
          ? { ...c, moodValue: Math.min(100, c.moodValue + amount) }
          : c,
      ),
    })),

  clearEggLayEvents: () => set({ eggLayEvents: [] }),

  saveGame: () => {
    const { chicks, coins, selectedChickId, decorations, gameTime, achievementStats, unlockedAchievements } = get()
    persistSave({ chicks, coins, selectedChickId, decorations, gameTime, achievementStats, unlockedAchievements })
    set({ showSaveIndicator: true })
    setTimeout(() => useGameStore.setState({ showSaveIndicator: false }), 1500)
  },

  setShopOpen: (open) => set({ shopOpen: open }),

  buyCommonEgg: (x, y) => {
    const state = get()
    if (state.coins < 20) return false
    set({
      coins: state.coins - 20,
      chicks: [...state.chicks, createCommonEgg(x, y)],
    })
    get().incrementStat('totalShopPurchases')
    return true
  },

  buySpecialEgg: (x, y) => {
    const state = get()
    if (state.coins < 50) return false
    set({
      coins: state.coins - 50,
      chicks: [...state.chicks, createSpecialEgg(x, y)],
    })
    get().incrementStat('totalShopPurchases')
    return true
  },

  buyRareEgg: (x, y) => {
    const state = get()
    if (state.coins < 150) return false
    set({
      coins: state.coins - 150,
      chicks: [...state.chicks, createRareEgg(x, y)],
    })
    get().incrementStat('totalShopPurchases')
    return true
  },

  buyMysteryEgg: (x, y) => {
    const state = get()
    if (state.coins < 80) return false
    set({
      coins: state.coins - 80,
      chicks: [...state.chicks, createMysteryEgg(x, y)],
    })
    get().incrementStat('totalShopPurchases')
    return true
  },

  placeEggInCoop: (chickId, coopType) => {
    const state = get()
    const chick = state.chicks.find((c) => c.id === chickId)
    if (!chick || chick.stage !== 'egg') return false
    // Check rarity matches coop type
    if (chick.rarity !== coopType) return false
    set({
      chicks: state.chicks.map((c) =>
        c.id === chickId ? { ...c, inCoop: true, coopType } : c,
      ),
    })
    return true
  },

  rejectEggFromCoop: (chickId) => {
    // Egg bounces back — just a visual cue, no state change needed
    // The caller will handle showing the message
    void chickId
  },

  buyDecoration: (type, price) => {
    const state = get()
    if (state.coins < price) return false
    const decoration: PlacedDecoration = {
      id: `deco-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: 80 + Math.random() * 1280, // within game area
      y: 570 + Math.random() * 270, // on the grass
    }
    set({
      coins: state.coins - price,
      decorations: [...state.decorations, decoration],
    })
    get().incrementStat('totalShopPurchases')
    return true
  },

  checkAchievements: () => {
    const state = get()
    const { achievementStats, unlockedAchievements, chicks } = state
    const nonEggChicks = chicks.filter((c) => c.stage !== 'egg' && c.stage !== 'hatching')
    const context = {
      chickCount: nonEggChicks.length,
      hasSpecial: chicks.some((c) => c.rarity === 'special'),
      hasRare: chicks.some((c) => c.rarity === 'rare'),
      breedCount: new Set(nonEggChicks.map((c) => c.breed)).size,
    }

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedAchievements.includes(achievement.id)) continue
      if (achievement.check(achievementStats, context)) {
        set({
          unlockedAchievements: [...get().unlockedAchievements, achievement.id],
          coins: get().coins + achievement.reward,
          pendingAchievementToast: {
            id: achievement.id,
            icon: achievement.icon,
            name: achievement.name,
            reward: achievement.reward,
          },
        })
      }
    }
  },

  incrementStat: (stat, value = 1) => {
    const stats = get().achievementStats
    if (stat === 'gamesPlayed') return // use recordGamePlayed instead
    set({
      achievementStats: {
        ...stats,
        [stat]: (stats[stat] as number) + value,
      },
    })
    // Defer check to after state update
    setTimeout(() => get().checkAchievements(), 0)
  },

  recordGamePlayed: (gameType) => {
    const stats = get().achievementStats
    if (stats.gamesPlayed.includes(gameType)) return
    set({
      achievementStats: {
        ...stats,
        gamesPlayed: [...stats.gamesPlayed, gameType],
      },
    })
    setTimeout(() => get().checkAchievements(), 0)
  },

  clearAchievementToast: () => set({ pendingAchievementToast: null }),

  setAchievementPanelOpen: (open) => set({ achievementPanelOpen: open }),

  setCleaningMode: (mode) => set({ cleaningMode: mode, feedingMode: false, selectedFood: null }),

  cleanDirtSpot: (id) => {
    const state = get()
    const spot = state.dirtSpots.find((d) => d.id === id)
    if (!spot) return
    const remaining = state.dirtSpots.filter((d) => d.id !== id)
    const coinReward = 3
    let moodBoost = 0
    // If this was the last dirt spot, boost all chick mood
    if (remaining.length === 0) {
      moodBoost = 10
    }
    set({
      dirtSpots: remaining,
      coins: state.coins + coinReward,
      ...(moodBoost > 0
        ? {
            chicks: state.chicks.map((c) =>
              c.stage !== 'egg' && c.stage !== 'hatching'
                ? { ...c, moodValue: Math.min(100, c.moodValue + moodBoost) }
                : c,
            ),
          }
        : {}),
    })
  },

  buyPremiumFood: (foodType, price) => {
    const state = get()
    if (state.coins < price) return false
    // Scatter food in center of garden
    const cx = 400 + Math.random() * 200
    const cy = 420 + Math.random() * 100
    const count = 5 + Math.floor(Math.random() * 4)
    const particles: FoodParticle[] = []
    for (let i = 0; i < count; i++) {
      particles.push({
        id: `food-${nextFoodId++}`,
        type: foodType,
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 40,
        scale: 1,
        eaten: false,
      })
    }
    set({
      coins: state.coins - price,
      foodParticles: [...state.foodParticles, ...particles],
    })
    get().incrementStat('totalShopPurchases')
    get().incrementStat('totalFeedCount')
    return true
  },
}))

// Start auto-save
startAutoSave(
  () => {
    const { chicks, coins, selectedChickId, decorations, gameTime, achievementStats, unlockedAchievements } = useGameStore.getState()
    return { chicks, coins, selectedChickId, decorations, gameTime, achievementStats, unlockedAchievements }
  },
  () => {
    useGameStore.setState({ showSaveIndicator: true })
    setTimeout(() => useGameStore.setState({ showSaveIndicator: false }), 1500)
  },
)

// Save on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const { chicks, coins, selectedChickId, decorations, gameTime, achievementStats, unlockedAchievements } = useGameStore.getState()
    persistSave({ chicks, coins, selectedChickId, decorations, gameTime, achievementStats, unlockedAchievements })
  })
}
