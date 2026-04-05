import { create } from 'zustand'

export type SlidePhase = 'climbing' | 'top' | 'sliding' | null

export interface PlaygroundState {
  swingRider: string | null
  seesawRiderLeft: string | null
  seesawRiderRight: string | null
  slideRider: string | null
  slidePhase: SlidePhase
  slideProgress: number // 0-1

  /** When rider mounted (ms since epoch) — used for auto timeout */
  swingMountTime: number
  seesawLeftMountTime: number
  seesawRightMountTime: number
  slideMountTime: number

  setSwingRider: (id: string | null) => void
  setSeesawRider: (side: 'left' | 'right', id: string | null) => void
  setSlideRider: (id: string | null, phase?: SlidePhase) => void
  setSlideProgress: (p: number) => void
  setSlidePhase: (phase: SlidePhase) => void
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  swingRider: null,
  seesawRiderLeft: null,
  seesawRiderRight: null,
  slideRider: null,
  slidePhase: null,
  slideProgress: 0,
  swingMountTime: 0,
  seesawLeftMountTime: 0,
  seesawRightMountTime: 0,
  slideMountTime: 0,

  setSwingRider: (id) =>
    set({ swingRider: id, swingMountTime: id ? Date.now() : 0 }),

  setSeesawRider: (side, id) =>
    set(
      side === 'left'
        ? { seesawRiderLeft: id, seesawLeftMountTime: id ? Date.now() : 0 }
        : { seesawRiderRight: id, seesawRightMountTime: id ? Date.now() : 0 },
    ),

  setSlideRider: (id, phase = id ? 'climbing' : null) =>
    set({
      slideRider: id,
      slidePhase: phase,
      slideProgress: 0,
      slideMountTime: id ? Date.now() : 0,
    }),

  setSlideProgress: (p) => set({ slideProgress: p }),
  setSlidePhase: (phase) => set({ slidePhase: phase }),
}))

// ─── Equipment positions (shared with AI / rendering) ──────────────────────

export const SWING_POS = { x: 350, y: 700 }
export const SEESAW_POS = { x: 550, y: 720 }
export const SLIDE_POS = { x: 900, y: 700 }

/** Swing pivot (top of ropes) */
export const SWING_PIVOT = { x: 350, y: 620 }
export const SWING_ROPE_LENGTH = 90

/** Seesaw dimensions */
export const SEESAW_PLANK_HALF_LENGTH = 90
export const SEESAW_FULCRUM_TOP = { x: 550, y: 720 }

/** Slide key points */
export const SLIDE_LADDER_X = 870
export const SLIDE_LADDER_BOTTOM_Y = 760
export const SLIDE_LADDER_TOP_Y = 650
export const SLIDE_TOP_PLATFORM = { x: 890, y: 640 }
export const SLIDE_BOTTOM = { x: 970, y: 760 }
