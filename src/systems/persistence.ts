import type { ChickData } from '../types/chick'

const SAVE_KEY = 'linda-game-save'
const SAVE_VERSION = 2
const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

interface SaveData {
  version: number
  chicks: ChickData[]
  coins: number
  selectedChickId: string | null
  savedAt: number
}

export interface PersistentState {
  chicks: ChickData[]
  coins: number
  selectedChickId: string | null
}

export function saveGame(state: PersistentState): void {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      chicks: state.chicks,
      coins: state.coins,
      selectedChickId: state.selectedChickId,
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

    return {
      chicks: data.chicks,
      coins: data.coins,
      selectedChickId: data.selectedChickId ?? null,
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
