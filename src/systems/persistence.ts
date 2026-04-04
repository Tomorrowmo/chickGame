import type { ChickData } from '../types/chick'
import type { PlacedDecoration } from '../store/gameStore'
import type { AchievementStats } from '../store/achievementData'
import { DEFAULT_ACHIEVEMENT_STATS } from '../store/achievementData'

const SAVE_KEY = 'linda-game-save'
const SAVE_VERSION = 6
const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

interface SaveData {
  version: number
  chicks: ChickData[]
  coins: number
  selectedChickId: string | null
  decorations: PlacedDecoration[]
  gameTime: number
  achievementStats: AchievementStats
  unlockedAchievements: string[]
  savedAt: number
}

export interface PersistentState {
  chicks: ChickData[]
  coins: number
  selectedChickId: string | null
  decorations: PlacedDecoration[]
  gameTime: number
  achievementStats: AchievementStats
  unlockedAchievements: string[]
}

export function saveGame(state: PersistentState): void {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      chicks: state.chicks,
      coins: state.coins,
      selectedChickId: state.selectedChickId,
      decorations: state.decorations,
      gameTime: state.gameTime,
      achievementStats: state.achievementStats,
      unlockedAchievements: state.unlockedAchievements,
      savedAt: Date.now(),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    console.warn('[persistence] Failed to save game')
  }
}

export function loadGame(): PersistentState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null

    const data: SaveData = JSON.parse(raw)

    // Validate structure
    if (
      typeof data !== 'object' ||
      data === null ||
      typeof data.version !== 'number' ||
      !Array.isArray(data.chicks) ||
      typeof data.coins !== 'number'
    ) {
      console.warn('[persistence] Invalid save data, clearing')
      localStorage.removeItem(SAVE_KEY)
      return null
    }

    // Migrate from v1: add eggTimer and eggsLaid fields
    if (data.version < 2) {
      data.chicks = data.chicks.map((c: ChickData) => ({
        ...c,
        eggTimer: c.eggTimer ?? 3000,
        eggsLaid: c.eggsLaid ?? 0,
      }))
      data.version = 2
    }

    // Migrate from v2: add decorations
    if (data.version < 3) {
      data.decorations = data.decorations ?? []
      data.version = 3
    }

    // Migrate from v3: add gameTime
    if (data.version < 4) {
      data.gameTime = data.gameTime ?? 480 // default to 8:00 AM
      data.version = 4
    }

    // Migrate from v4: add achievements
    if (data.version < 5) {
      data.achievementStats = data.achievementStats ?? { ...DEFAULT_ACHIEVEMENT_STATS }
      data.unlockedAchievements = data.unlockedAchievements ?? []
      // Ensure gamesPlayed is an array (not a Set)
      if (data.achievementStats && !Array.isArray(data.achievementStats.gamesPlayed)) {
        data.achievementStats.gamesPlayed = []
      }
      data.version = 5
    }

    // Migrate from v5: add inCoop and coopType to chicks
    if (data.version < 6) {
      data.chicks = data.chicks.map((c: ChickData) => ({
        ...c,
        inCoop: (c as Record<string, unknown>).inCoop ?? (c.stage !== 'egg' && c.stage !== 'hatching'),
        coopType: (c as Record<string, unknown>).coopType ?? (c.stage !== 'egg' && c.stage !== 'hatching' ? c.rarity : null),
      }))
      data.version = 6
    }

    return {
      chicks: data.chicks,
      coins: data.coins,
      selectedChickId: data.selectedChickId ?? null,
      decorations: data.decorations ?? [],
      gameTime: data.gameTime ?? 480,
      achievementStats: data.achievementStats ?? { ...DEFAULT_ACHIEVEMENT_STATS },
      unlockedAchievements: data.unlockedAchievements ?? [],
    }
  } catch {
    console.warn('[persistence] Corrupted save data, clearing')
    localStorage.removeItem(SAVE_KEY)
    return null
  }
}

let autoSaveTimer: ReturnType<typeof setInterval> | null = null

export function startAutoSave(getState: () => PersistentState, onSave?: () => void): void {
  stopAutoSave()
  autoSaveTimer = setInterval(() => {
    saveGame(getState())
    onSave?.()
  }, AUTO_SAVE_INTERVAL)
}

export function stopAutoSave(): void {
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}
