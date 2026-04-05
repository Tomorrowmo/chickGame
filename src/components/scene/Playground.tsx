import { useCallback, useRef, useState } from 'react'
import { useTick } from '@pixi/react'
import { Graphics } from 'pixi.js'
import { useGameStore } from '../../store/gameStore'
import {
  usePlaygroundStore,
  SWING_PIVOT,
  SWING_ROPE_LENGTH,
  SEESAW_FULCRUM_TOP,
  SEESAW_PLANK_HALF_LENGTH,
  SLIDE_LADDER_X,
  SLIDE_LADDER_BOTTOM_Y,
  SLIDE_LADDER_TOP_Y,
  SLIDE_TOP_PLATFORM,
  SLIDE_BOTTOM,
} from '../../systems/playgroundStore'

// ─── Drawing helpers ────────────────────────────────────────────────────────

function drawSwing(g: Graphics, swingAngle: number) {
  g.clear()
  // Horizontal top beam (static)
  g.rect(-60, -85, 120, 8).fill(0x8b5a2b)
  // Side posts
  g.rect(-62, -85, 6, 100).fill(0x6b4423)
  g.rect(56, -85, 6, 100).fill(0x6b4423)
  // Base feet
  g.rect(-80, 15, 40, 6).fill(0x6b4423)
  g.rect(40, 15, 40, 6).fill(0x6b4423)

  // Swing ropes + seat (rotated around top beam center)
  const cx = 0
  const cy = -80
  const rx = cx + Math.sin(swingAngle) * SWING_ROPE_LENGTH
  const ry = cy + Math.cos(swingAngle) * SWING_ROPE_LENGTH
  // Left rope
  g.moveTo(cx - 18, cy)
    .lineTo(rx - 18, ry)
    .stroke({ color: 0x5d3317, width: 3 })
  // Right rope
  g.moveTo(cx + 18, cy)
    .lineTo(rx + 18, ry)
    .stroke({ color: 0x5d3317, width: 3 })
  // Seat plank
  g.rect(rx - 22, ry - 3, 44, 6).fill(0x8b5a2b)
  g.rect(rx - 22, ry - 3, 44, 6).stroke({ color: 0x5d3317, width: 1 })
}

function drawSeesaw(g: Graphics, tilt: number) {
  g.clear()
  // Triangular fulcrum
  g.poly([-24, 0, 24, 0, 0, -32]).fill(0x8b5a2b)
  g.poly([-24, 0, 24, 0, 0, -32]).stroke({ color: 0x5d3317, width: 2 })
  // Plank (tilted)
  const len = SEESAW_PLANK_HALF_LENGTH
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  const lx = -len * cos
  const ly = -len * sin - 32
  const rx = len * cos
  const ry = len * sin - 32
  // plank as thick line using 4 corner polygon
  const nx = -sin * 6
  const ny = cos * 6
  g.poly([
    lx - nx, ly - ny,
    rx - nx, ry - ny,
    rx + nx, ry + ny,
    lx + nx, ly + ny,
  ]).fill(0xc68642)
  g.poly([
    lx - nx, ly - ny,
    rx - nx, ry - ny,
    rx + nx, ry + ny,
    lx + nx, ly + ny,
  ]).stroke({ color: 0x7a4a1f, width: 2 })
  // Handles
  g.circle(lx, ly, 4).fill(0x5d3317)
  g.circle(rx, ry, 4).fill(0x5d3317)
}

function drawSlide(g: Graphics) {
  g.clear()
  // Ladder rails
  const railLeft = -24
  const railRight = -12
  const top = -110
  const bot = 0
  g.rect(railLeft - 2, top, 4, bot - top).fill(0x8b5a2b)
  g.rect(railRight - 2, top, 4, bot - top).fill(0x8b5a2b)
  // Rungs
  for (let i = 0; i < 3; i++) {
    const y = top + 20 + i * 30
    g.rect(railLeft, y - 2, railRight - railLeft, 4).fill(0x6b4423)
  }
  // Top platform
  g.rect(-26, top - 10, 40, 6).fill(0xc68642)
  // Slide slope (curve using a polygon)
  // Start at top of platform (0, top-10), curve down-right to bottom (80, 60)
  const pts: number[] = []
  const segs = 16
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    // Ease-out curve
    const x = t * 90
    const y = top - 5 + (1 - Math.cos(t * Math.PI / 2)) * (60 - (top - 5))
    pts.push(x, y)
  }
  // Back side of slide (offset)
  for (let i = segs; i >= 0; i--) {
    const t = i / segs
    const x = t * 90
    const y = top - 5 + (1 - Math.cos(t * Math.PI / 2)) * (60 - (top - 5)) + 8
    pts.push(x, y)
  }
  g.poly(pts).fill(0xffa64d)
  g.poly(pts).stroke({ color: 0xcc6a1a, width: 2 })
  // Side rails of slide
  const railPts: number[] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const x = t * 90
    const y = top - 5 + (1 - Math.cos(t * Math.PI / 2)) * (60 - (top - 5)) - 3
    railPts.push(x, y)
  }
  for (let i = 1; i < railPts.length; i += 2) {
    // no-op, just building
  }
  // Base support
  g.rect(75, 55, 20, 10).fill(0x6b4423)
}

// ─── Mini chick sprite ──────────────────────────────────────────────────────

function drawMiniChick(g: Graphics, color: number, facing: 1 | -1) {
  g.clear()
  // Body
  g.circle(0, 0, 10).fill(color)
  // Head
  g.circle(6 * facing, -7, 7).fill(color)
  // Eye
  g.circle(8 * facing, -8, 1.5).fill(0x000000)
  // Beak
  g.poly([
    11 * facing, -7,
    15 * facing, -6,
    11 * facing, -5,
  ]).fill(0xff8c00)
  // Feet
  g.rect(-4, 8, 2, 4).fill(0xff8c00)
  g.rect(3, 8, 2, 4).fill(0xff8c00)
}

// ─── Position helpers ───────────────────────────────────────────────────────

export function getSwingSeatPosition(swingAngle: number): { x: number; y: number } {
  // The top beam in local drawSwing coords is at cy = -80
  // Seat = pivot.y + (-80) + cos(angle) * ropeLength
  return {
    x: SWING_PIVOT.x + Math.sin(swingAngle) * SWING_ROPE_LENGTH,
    y: SWING_PIVOT.y - 80 + Math.cos(swingAngle) * SWING_ROPE_LENGTH,
  }
}

export function getSeesawEndPosition(tilt: number, side: 'left' | 'right'): { x: number; y: number } {
  const sign = side === 'left' ? -1 : 1
  const len = SEESAW_PLANK_HALF_LENGTH
  return {
    x: SEESAW_FULCRUM_TOP.x + sign * len * Math.cos(tilt),
    y: SEESAW_FULCRUM_TOP.y - 32 + sign * len * Math.sin(tilt) - 10,
  }
}

export function getSlideRiderPosition(
  phase: 'climbing' | 'top' | 'sliding' | null,
  progress: number,
): { x: number; y: number } {
  if (phase === 'climbing') {
    const y = SLIDE_LADDER_BOTTOM_Y + (SLIDE_LADDER_TOP_Y - SLIDE_LADDER_BOTTOM_Y) * progress
    return { x: SLIDE_LADDER_X, y: y - 12 }
  }
  if (phase === 'top') {
    return { x: SLIDE_TOP_PLATFORM.x, y: SLIDE_TOP_PLATFORM.y - 12 }
  }
  if (phase === 'sliding') {
    const t = progress
    const x = SLIDE_TOP_PLATFORM.x + (SLIDE_BOTTOM.x - SLIDE_TOP_PLATFORM.x) * t
    const y =
      SLIDE_TOP_PLATFORM.y +
      (1 - Math.cos((t * Math.PI) / 2)) * (SLIDE_BOTTOM.y - SLIDE_TOP_PLATFORM.y) - 12
    return { x, y }
  }
  return { x: SLIDE_LADDER_X, y: SLIDE_LADDER_BOTTOM_Y - 12 }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Playground() {
  const [swingAngle, setSwingAngle] = useState(0)
  const [seesawTilt, setSeesawTilt] = useState(0)
  const timeRef = useRef(0)

  const swingRider = usePlaygroundStore((s) => s.swingRider)
  const seesawLeft = usePlaygroundStore((s) => s.seesawRiderLeft)
  const seesawRight = usePlaygroundStore((s) => s.seesawRiderRight)
  const slideRider = usePlaygroundStore((s) => s.slideRider)
  const slidePhase = usePlaygroundStore((s) => s.slidePhase)
  const slideProgress = usePlaygroundStore((s) => s.slideProgress)
  const setSlideProgress = usePlaygroundStore((s) => s.setSlideProgress)
  const setSlidePhase = usePlaygroundStore((s) => s.setSlidePhase)

  const chicks = useGameStore((s) => s.chicks)

  useTick((ticker) => {
    timeRef.current += ticker.deltaTime
    const t = timeRef.current
    // Swing swings faster when there's a rider
    const swingAmp = swingRider ? 0.6 : 0.15
    setSwingAngle(Math.sin(t * 0.05) * swingAmp)
    // Seesaw tilt
    const seesawAmp = seesawLeft || seesawRight ? 0.35 : 0.1
    setSeesawTilt(Math.sin(t * 0.04) * seesawAmp)

    // Slide phase progression
    if (slideRider) {
      if (slidePhase === 'climbing') {
        const next = slideProgress + 0.012 * ticker.deltaTime
        if (next >= 1) {
          setSlideProgress(0)
          setSlidePhase('top')
        } else {
          setSlideProgress(next)
        }
      } else if (slidePhase === 'top') {
        const next = slideProgress + 0.02 * ticker.deltaTime
        if (next >= 1) {
          setSlideProgress(0)
          setSlidePhase('sliding')
        } else {
          setSlideProgress(next)
        }
      } else if (slidePhase === 'sliding') {
        const next = slideProgress + 0.025 * ticker.deltaTime
        if (next >= 1) {
          setSlideProgress(1)
        } else {
          setSlideProgress(next)
        }
      }
    }
  })

  const drawSwingCb = useCallback(
    (g: Graphics) => drawSwing(g, swingAngle),
    [swingAngle],
  )
  const drawSeesawCb = useCallback(
    (g: Graphics) => drawSeesaw(g, seesawTilt),
    [seesawTilt],
  )
  const drawSlideCb = useCallback((g: Graphics) => drawSlide(g), [])

  // Compute rider positions
  const swingSeat = getSwingSeatPosition(swingAngle)
  const seesawLeftPos = getSeesawEndPosition(seesawTilt, 'left')
  const seesawRightPos = getSeesawEndPosition(seesawTilt, 'right')
  const slidePos = getSlideRiderPosition(slidePhase, slideProgress)

  const chickById = (id: string | null) => (id ? chicks.find((c) => c.id === id) : undefined)
  const swingChick = chickById(swingRider)
  const seesawLChick = chickById(seesawLeft)
  const seesawRChick = chickById(seesawRight)
  const slideChick = chickById(slideRider)

  const chickColor = (id: string | undefined) => {
    if (!id) return 0xffd54a
    // vary by rarity
    const rarity = chicks.find((c) => c.id === id)?.rarity
    if (rarity === 'rare') return 0xffa726
    if (rarity === 'special') return 0xfff59d
    return 0xffd54a
  }

  return (
    <pixiContainer>
      {/* Swing */}
      <pixiGraphics draw={drawSwingCb} x={SWING_PIVOT.x} y={SWING_PIVOT.y} />
      {/* Seesaw */}
      <pixiGraphics draw={drawSeesawCb} x={SEESAW_FULCRUM_TOP.x} y={SEESAW_FULCRUM_TOP.y} />
      {/* Slide */}
      <pixiGraphics draw={drawSlideCb} x={SLIDE_TOP_PLATFORM.x} y={SLIDE_LADDER_BOTTOM_Y} />

      {/* Mini chicks on equipment */}
      {swingChick && (
        <pixiGraphics
          x={swingSeat.x}
          y={swingSeat.y - 10}
          draw={(g: Graphics) => drawMiniChick(g, chickColor(swingChick.id), 1)}
        />
      )}
      {seesawLChick && (
        <pixiGraphics
          x={seesawLeftPos.x}
          y={seesawLeftPos.y}
          draw={(g: Graphics) => drawMiniChick(g, chickColor(seesawLChick.id), 1)}
        />
      )}
      {seesawRChick && (
        <pixiGraphics
          x={seesawRightPos.x}
          y={seesawRightPos.y}
          draw={(g: Graphics) => drawMiniChick(g, chickColor(seesawRChick.id), -1)}
        />
      )}
      {slideChick && (
        <pixiGraphics
          x={slidePos.x}
          y={slidePos.y}
          draw={(g: Graphics) => drawMiniChick(g, chickColor(slideChick.id), 1)}
        />
      )}
    </pixiContainer>
  )
}
