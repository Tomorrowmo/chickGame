import { useCallback, useEffect, useRef, useState } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import type { ChickData, LifeStage } from '../types/chick'
import { EGG_TIMER_INITIAL } from '../store/gameStore'

extend({ Graphics, Text, Container })

/** Long press threshold in ms */
const LONG_PRESS_MS = 500

const STAGE_SCALE: Record<string, number> = {
  egg: 0.6,
  hatching: 0.6,
  baby: 0.7,
  juvenile: 0.85,
  adult: 1.0,
}

/** Breed-specific body colors and sizes */
interface BreedAppearance {
  bodyColor: number
  beakColor: number
  eyeColor: number
  babyRadius: number
  adultRadius: number
}

const BREED_APPEARANCES: Record<string, BreedAppearance> = {
  white:    { bodyColor: 0xFFFAFA, beakColor: 0xFFA07A, eyeColor: 0x333333, babyRadius: 14, adultRadius: 18 },
  yellow:   { bodyColor: 0xFFD700, beakColor: 0xFF8C00, eyeColor: 0x000000, babyRadius: 15, adultRadius: 20 },
  brown:    { bodyColor: 0xCD853F, beakColor: 0x8B4513, eyeColor: 0x000000, babyRadius: 15, adultRadius: 19 },
  spotted:  { bodyColor: 0xFFFAFA, beakColor: 0xFF8C00, eyeColor: 0x000000, babyRadius: 15, adultRadius: 19 },
  striped:  { bodyColor: 0xFFD700, beakColor: 0xFF8C00, eyeColor: 0x000000, babyRadius: 14, adultRadius: 19 },
  colorful: { bodyColor: 0xFFD700, beakColor: 0xFF6347, eyeColor: 0x000000, babyRadius: 15, adultRadius: 20 },
  golden:   { bodyColor: 0xFFD700, beakColor: 0xDAA520, eyeColor: 0x8B0000, babyRadius: 16, adultRadius: 22 },
  rainbow:  { bodyColor: 0xFF6B6B, beakColor: 0xFF8C00, eyeColor: 0x4B0082, babyRadius: 16, adultRadius: 21 },
  crystal:  { bodyColor: 0xADD8E6, beakColor: 0x87CEEB, eyeColor: 0x4169E1, babyRadius: 14, adultRadius: 21 },
}

const DEFAULT_APPEARANCE: BreedAppearance = BREED_APPEARANCES.yellow

const MOOD_EMOJI: Record<string, string> = {
  happy: '\u2764\uFE0F',
  bored: '\uD83D\uDCA4',
  angry: '\uD83D\uDCA2',
}

/** Bounce animation duration in frames (~0.3s at 60fps = 18 frames) */
const BOUNCE_DURATION = 18
const BOUNCE_HEIGHT = 12

/** Wobble parameters */
const WOBBLE_AMPLITUDE = 0.1 // radians (~6 degrees)
const WOBBLE_SPEED = 12 // radians/sec for the wobble oscillation itself
const WOBBLE_BURST_DURATION = 18 // frames for one wobble burst

/** Hatching shake parameters */
const HATCH_SHAKE_AMPLITUDE = 0.2
const HATCH_SHAKE_SPEED = 25

interface ChickProps {
  data: ChickData
  onClick?: (data: ChickData) => void
  onHatch?: (data: ChickData) => void
  isHeld?: boolean
  onPickup?: (data: ChickData) => void
  onRelease?: (data: ChickData) => void
  holdCursorX?: number
  holdCursorY?: number
}

export function Chick({ data, onClick, onHatch, isHeld, onPickup, onRelease, holdCursorX, holdCursorY }: ChickProps) {
  const scale = STAGE_SCALE[data.stage] ?? 1.0
  const isEgg = data.stage === 'egg' || data.stage === 'hatching'
  const isHatching = data.stage === 'hatching'
  const moodEmoji = MOOD_EMOJI[data.mood]

  // Long press detection refs
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerDownRef = useRef(false)

  // Held chick animation state
  const heldAnimRef = useRef({ time: 0, nuzzleActive: false, nuzzleStart: 0 })
  const heldBobRef = useRef(0)
  const heldNuzzleRef = useRef(0)
  /** Smoothed position for held chick (slight lag) */
  const smoothPosRef = useRef({ x: data.x, y: data.y })
  /** Hearts floating while held */
  const [heldHearts, setHeldHearts] = useState<{ id: number; offset: number }[]>([])
  const heartTimerRef = useRef(0)

  // Drop animation state
  const dropAnimRef = useRef({ active: false, timer: 0, startY: 0, targetY: 0 })
  const dropBounceRef = useRef(0)
  // Reluctant wobble after drop
  const reluctantRef = useRef({ active: false, timer: 0 })
  const reluctantRotRef = useRef(0)

  // Bounce animation state
  const bounceRef = useRef({ active: false, timer: 0 })
  const bounceOffsetRef = useRef(0)

  // Wobble animation state
  const wobbleRef = useRef({
    timer: 0,        // time since last wobble
    interval: 180,   // frames between wobbles (recalculated)
    burstTimer: -1,  // -1 = not wobbling, 0+ = in wobble burst
    rotation: 0,
  })

  // Track stage changes for hatch detection
  const prevStageRef = useRef<LifeStage>(data.stage)

  useEffect(() => {
    const prev = prevStageRef.current
    prevStageRef.current = data.stage

    // Detect transition from egg/hatching to baby
    if ((prev === 'egg' || prev === 'hatching') && data.stage === 'baby') {
      onHatch?.(data)
    }
  }, [data.stage, data, onHatch])

  useTick((ticker) => {
    const dt = ticker.deltaTime

    // --- Bounce ---
    const b = bounceRef.current
    if (b.active) {
      b.timer += dt
      if (b.timer >= BOUNCE_DURATION) {
        b.active = false
        b.timer = 0
        bounceOffsetRef.current = 0
      } else {
        const progress = b.timer / BOUNCE_DURATION
        bounceOffsetRef.current = -Math.sin(progress * Math.PI) * BOUNCE_HEIGHT
      }
    }

    // --- Wobble (egg stage only) ---
    const w = wobbleRef.current
    if (isEgg) {
      if (isHatching) {
        // Hatching: violent shaking
        w.rotation =
          Math.sin(w.timer * HATCH_SHAKE_SPEED * 0.1) * HATCH_SHAKE_AMPLITUDE
        w.timer += dt
      } else {
        // Normal egg wobble: periodic bursts
        // Recalculate interval based on growthProgress
        // At 0%: ~180 frames (3s). At 90%+: ~18 frames (0.3s)
        const t = data.growthProgress / 100
        w.interval = 180 - t * 162 // 180 → 18

        if (w.burstTimer < 0) {
          // Not currently wobbling — count up to next burst
          w.timer += dt
          if (w.timer >= w.interval) {
            w.timer = 0
            w.burstTimer = 0 // start wobble burst
          }
          // Smoothly return rotation to 0
          w.rotation *= 0.85
        } else {
          // In wobble burst
          w.burstTimer += dt
          if (w.burstTimer >= WOBBLE_BURST_DURATION) {
            w.burstTimer = -1 // end burst
            w.rotation = 0
          } else {
            const burstProgress = w.burstTimer / WOBBLE_BURST_DURATION
            w.rotation =
              Math.sin(burstProgress * WOBBLE_SPEED) * WOBBLE_AMPLITUDE *
              (1 - burstProgress) // dampen towards end
          }
        }
      }
    } else {
      w.rotation = 0
    }

    // --- Held chick animations ---
    if (isHeld) {
      const h = heldAnimRef.current
      h.time += dt / 60 // convert to seconds

      // Gentle bob up and down
      heldBobRef.current = Math.sin(h.time * 3) * 4

      // Smooth position tracking (slight lag)
      const targetX = holdCursorX ?? data.x
      const targetY = (holdCursorY ?? data.y) - 40 // lift above cursor
      const lerp = 0.12
      smoothPosRef.current.x += (targetX - smoothPosRef.current.x) * lerp
      smoothPosRef.current.y += (targetY - smoothPosRef.current.y) * lerp

      // Nuzzle: after 2 seconds of being held, start side-to-side rotation
      if (h.time > 2) {
        if (!h.nuzzleActive) {
          h.nuzzleActive = true
          h.nuzzleStart = h.time
        }
        const nuzzleT = h.time - h.nuzzleStart
        heldNuzzleRef.current = Math.sin(nuzzleT * 6) * 0.15 * Math.min(1, nuzzleT)
      } else {
        heldNuzzleRef.current = 0
      }

      // Periodically spawn hearts
      heartTimerRef.current += dt
      if (heartTimerRef.current > 40) { // ~0.67s at 60fps
        heartTimerRef.current = 0
        setHeldHearts((prev) => {
          const next = [...prev, { id: Date.now(), offset: 0 }]
          return next.slice(-3) // max 3 hearts
        })
      }
    } else {
      // Reset held state
      heldAnimRef.current.time = 0
      heldAnimRef.current.nuzzleActive = false
      heldBobRef.current = 0
      heldNuzzleRef.current = 0
      heartTimerRef.current = 0
      if (heldHearts.length > 0) setHeldHearts([])
    }

    // --- Drop bounce animation ---
    const drop = dropAnimRef.current
    if (drop.active) {
      drop.timer += dt
      const duration = 20 // frames
      if (drop.timer >= duration) {
        drop.active = false
        drop.timer = 0
        dropBounceRef.current = 0
        // Start reluctant wobble
        reluctantRef.current = { active: true, timer: 0 }
      } else {
        const progress = drop.timer / duration
        // Bounce: fall down then small bounce up
        dropBounceRef.current = -Math.sin(progress * Math.PI) * 8 * (1 - progress)
      }
    }

    // --- Reluctant wobble after being put down ---
    const rel = reluctantRef.current
    if (rel.active) {
      rel.timer += dt
      const duration = 40 // frames (~0.67s)
      if (rel.timer >= duration) {
        rel.active = false
        rel.timer = 0
        reluctantRotRef.current = 0
      } else {
        const progress = rel.timer / duration
        reluctantRotRef.current = Math.sin(progress * 20) * 0.12 * (1 - progress)
      }
    }
  })

  const drawShadow = useCallback(
    (g: Graphics) => {
      g.clear()
      // Shadow ellipse below the chick/egg
      const shadowWidth = isEgg ? 16 : 22
      const shadowY = isEgg ? 24 : 22
      g.ellipse(0, shadowY, shadowWidth, 6).fill({ color: 0x000000, alpha: 0.15 })
    },
    [isEgg],
  )

  const breed = data.breed
  const appearance = BREED_APPEARANCES[breed] ?? DEFAULT_APPEARANCE
  const isBaby = data.stage === 'baby'
  const bodyRadius = isBaby ? appearance.babyRadius : appearance.adultRadius

  const drawBody = useCallback(
    (g: Graphics) => {
      g.clear()

      if (isEgg) {
        // Egg: cream oval with gold spots
        g.ellipse(0, 0, 18, 24).fill(0xfff8dc)
        g.circle(-6, -8, 3).fill(0xffd700)
        g.circle(5, 2, 2.5).fill(0xffd700)
        g.circle(-3, 10, 2).fill(0xffd700)

        // Draw cracks when hatching
        if (isHatching) {
          g.moveTo(4, -18)
            .lineTo(2, -12)
            .lineTo(6, -8)
            .lineTo(3, -3)
            .stroke({ width: 1.5, color: 0x8b7d6b })
          g.moveTo(-14, -4)
            .lineTo(-9, -2)
            .lineTo(-11, 3)
            .lineTo(-6, 5)
            .stroke({ width: 1.5, color: 0x8b7d6b })
          g.moveTo(2, 16)
            .lineTo(0, 10)
            .lineTo(4, 7)
            .stroke({ width: 1, color: 0x8b7d6b })
        }
      } else {
        const r = bodyRadius
        const dir = data.direction === 'right' ? 1 : -1

        // --- Breed-specific body drawing ---
        if (breed === 'colorful') {
          // Rainbow/multicolor body: 3 color arcs
          g.arc(0, 0, r, -Math.PI / 2, Math.PI / 6).fill(0xFF4444)
          g.moveTo(0, 0)
          g.arc(0, 0, r, Math.PI / 6, 5 * Math.PI / 6).fill(0x4488FF)
          g.moveTo(0, 0)
          g.arc(0, 0, r, 5 * Math.PI / 6, 3 * Math.PI / 2).fill(0x44CC44)
          // Overlay a slightly smaller circle for smooth center
          g.circle(0, 0, r * 0.55).fill(0xFFE066)
        } else if (breed === 'rainbow') {
          // Rainbow gradient appearance: concentric colored rings
          const rainbowColors = [0xFF0000, 0xFF8800, 0xFFFF00, 0x00CC00, 0x0066FF, 0x8800FF]
          for (let i = rainbowColors.length - 1; i >= 0; i--) {
            const ringR = r * (0.4 + 0.6 * (i + 1) / rainbowColors.length)
            g.circle(0, 0, ringR).fill({ color: rainbowColors[i], alpha: 0.7 })
          }
          g.circle(0, 0, r * 0.35).fill(0xFFFFFF)
        } else if (breed === 'crystal') {
          // Semi-transparent light blue body with white shimmer highlights
          g.circle(0, 0, r).fill({ color: appearance.bodyColor, alpha: 0.6 })
          g.circle(0, 0, r).stroke({ color: 0xFFFFFF, width: 1.5, alpha: 0.5 })
          // Shimmer highlights
          g.circle(-r * 0.3, -r * 0.3, r * 0.2).fill({ color: 0xFFFFFF, alpha: 0.7 })
          g.circle(r * 0.15, -r * 0.1, r * 0.12).fill({ color: 0xFFFFFF, alpha: 0.5 })
          g.circle(-r * 0.1, r * 0.2, r * 0.08).fill({ color: 0xE0F0FF, alpha: 0.6 })
        } else {
          // Standard round body
          g.circle(0, 0, r).fill(appearance.bodyColor)

          // White chick: light gray outline for visibility
          if (breed === 'white') {
            g.circle(0, 0, r).stroke({ color: 0xD3D3D3, width: 1.5 })
          }
        }

        // --- Spotted: brown spots on body ---
        if (breed === 'spotted') {
          g.circle(-r * 0.35, -r * 0.2, r * 0.15).fill(0x8B6914)
          g.circle(r * 0.25, -r * 0.35, r * 0.12).fill(0x8B6914)
          g.circle(r * 0.1, r * 0.25, r * 0.13).fill(0x8B6914)
          g.circle(-r * 0.2, r * 0.35, r * 0.1).fill(0x8B6914)
        }

        // --- Striped: darker horizontal stripes ---
        if (breed === 'striped') {
          for (let sy = -1; sy <= 1; sy++) {
            const stripeY = sy * r * 0.35
            const halfW = Math.sqrt(Math.max(0, r * r - stripeY * stripeY)) * 0.9
            g.rect(-halfW, stripeY - 2, halfW * 2, 4).fill({ color: 0xCC8800, alpha: 0.5 })
          }
        }

        // --- Golden: crown/crest on head + sparkle ---
        if (breed === 'golden') {
          // Small crown on top
          const crownY = -r - 2
          g.poly([
            -8, crownY,
            -5, crownY - 10,
            -2, crownY - 4,
            0, crownY - 12,
            2, crownY - 4,
            5, crownY - 10,
            8, crownY,
          ]).fill(0xFFD700)
          g.poly([
            -8, crownY,
            -5, crownY - 10,
            -2, crownY - 4,
            0, crownY - 12,
            2, crownY - 4,
            5, crownY - 10,
            8, crownY,
          ]).stroke({ color: 0xDAA520, width: 1 })
          // Sparkle dots
          g.circle(r * 0.5, -r * 0.5, 2).fill({ color: 0xFFFFFF, alpha: 0.9 })
          g.circle(-r * 0.4, r * 0.3, 1.5).fill({ color: 0xFFFFFF, alpha: 0.7 })
        }

        // Eye — sleeping chicks get closed eyes (horizontal line)
        const eyeX = dir * r * 0.3
        const isSleeping = data.currentAction === 'sleeping'
        if (isSleeping) {
          // Closed eye: small horizontal line
          g.moveTo(eyeX - r * 0.12, -r * 0.25)
            .lineTo(eyeX + r * 0.12, -r * 0.25)
            .stroke({ color: appearance.eyeColor, width: 1.5 })
        } else {
          g.circle(eyeX, -r * 0.25, r * 0.15).fill(appearance.eyeColor)
          // Tiny eye highlight for life
          g.circle(eyeX + r * 0.05, -r * 0.3, r * 0.05).fill({ color: 0xffffff, alpha: 0.8 })
        }

        // Blush circles on cheeks for happy chicks
        if (data.mood === 'happy' && !isSleeping) {
          const blushX = dir * r * 0.55
          g.circle(blushX, -r * 0.05, r * 0.14).fill({ color: 0xff8fa0, alpha: 0.35 })
        }

        // Baby feather tufts (fluffy tufts on top for baby chicks)
        if (isBaby) {
          // 3 small feather lines on top of head
          g.moveTo(-2, -r - 1).lineTo(-4, -r - 8).stroke({ color: appearance.bodyColor, width: 2 })
          g.moveTo(1, -r - 1).lineTo(2, -r - 10).stroke({ color: appearance.bodyColor, width: 1.8 })
          g.moveTo(4, -r - 1).lineTo(7, -r - 7).stroke({ color: appearance.bodyColor, width: 1.5 })
        }

        // Beak
        const beakBaseX = dir * r * 0.7
        const beakSize = r * 0.5
        g.poly([
          beakBaseX, -r * 0.2,
          beakBaseX + dir * beakSize, 0,
          beakBaseX, r * 0.2,
        ]).fill(appearance.beakColor)

        // Feet
        const footW = r * 0.3
        const footH = r * 0.2
        g.rect(-r * 0.4, r * 0.9, footW, footH).fill(appearance.beakColor)
        g.rect(r * 0.1, r * 0.9, footW, footH).fill(appearance.beakColor)
      }
    },
    [isEgg, isHatching, data.direction, data.currentAction, data.mood, breed, isBaby, bodyRadius, appearance],
  )

  // Egg-laying is now handled by the LaidEgg + EggChoice components (laidEggs system)

  // Egg progress indicator for adults
  const isAdult = data.stage === 'adult'
  const eggProgress = isAdult ? 1 - data.eggTimer / EGG_TIMER_INITIAL : 0
  const showEggIndicator = isAdult && eggProgress > 0.6

  const drawEggIndicator = useCallback(
    (g: Graphics) => {
      g.clear()
      if (!showEggIndicator) return
      // Small egg icon that grows with progress
      const indicatorScale = 0.3 + (eggProgress - 0.6) / 0.4 * 0.7 // 0.3 to 1.0
      g.ellipse(0, 0, 6 * indicatorScale, 8 * indicatorScale).fill({ color: 0xfff8dc, alpha: 0.9 })
      g.ellipse(0, 0, 6 * indicatorScale, 8 * indicatorScale).stroke({ width: 1, color: 0xffd700, alpha: 0.8 })
    },
    [showEggIndicator, eggProgress],
  )

  const handleClick = useCallback(() => {
    // Trigger bounce animation
    bounceRef.current.active = true
    bounceRef.current.timer = 0
    onClick?.(data)
  }, [onClick, data])

  const handlePointerDown = useCallback(() => {
    if (isEgg && data.inCoop) {
      // Eggs already in a coop can't be picked up, just do regular click
      handleClick()
      return
    }
    pointerDownRef.current = true

    // Start long press timer
    holdTimerRef.current = setTimeout(() => {
      if (pointerDownRef.current) {
        // Long press detected — pick up chick or egg
        smoothPosRef.current = { x: data.x, y: data.y }
        heldAnimRef.current = { time: 0, nuzzleActive: false, nuzzleStart: 0 }
        onPickup?.(data)
      }
    }, LONG_PRESS_MS)
  }, [isEgg, handleClick, data, onPickup])

  const handlePointerUp = useCallback(() => {
    const wasDown = pointerDownRef.current
    pointerDownRef.current = false

    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    if (isHeld) {
      // Release held chick — trigger drop animation
      dropAnimRef.current = { active: true, timer: 0, startY: 0, targetY: 0 }
      reluctantRef.current = { active: false, timer: 0 }
      onRelease?.(data)
    } else if (wasDown) {
      // Short press — regular click
      handleClick()
    }
  }, [isHeld, data, onRelease, handleClick])

  // Compute final position: normal, held (tracking cursor), or dropping
  const posX = isHeld ? smoothPosRef.current.x : data.x
  const posY = isHeld
    ? smoothPosRef.current.y + heldBobRef.current
    : data.y + bounceOffsetRef.current + dropBounceRef.current
  const finalScale = isHeld ? scale * 1.2 : scale
  // Walking tilt: slight lean in walking direction
  const walkTilt = (!isEgg && !isHeld && data.currentAction === 'walking')
    ? (data.direction === 'right' ? 0.08 : -0.08)
    : 0
  const finalRotation = isHeld
    ? heldNuzzleRef.current
    : wobbleRef.current.rotation + reluctantRotRef.current + walkTilt

  // Draw ground shadow at original position when held
  const drawHeldShadow = useCallback(
    (g: Graphics) => {
      g.clear()
      g.ellipse(0, 22, 18, 5).fill({ color: 0x000000, alpha: 0.1 })
    },
    [],
  )

  return (
    <>
      {/* Shadow stays on ground when chick is held */}
      {isHeld && (
        <pixiGraphics
          draw={drawHeldShadow}
          x={data.x}
          y={data.y}
        />
      )}
      <pixiContainer
        x={posX}
        y={posY}
        scale={finalScale}
        rotation={finalRotation}
        eventMode="static"
        cursor={isHeld ? 'grabbing' : 'pointer'}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerUpOutside={handlePointerUp}
        zIndex={isHeld ? 9999 : 0}
      >
        <pixiGraphics draw={drawShadow} />
        <pixiGraphics draw={drawBody} />
        {/* Held chick shows hearts emoji instead of mood */}
        {isHeld ? (
          <pixiText
            text="❤️"
            x={0}
            y={-32}
            anchor={0.5}
            style={{ fontSize: 16 }}
          />
        ) : moodEmoji ? (
          <pixiText
            text={moodEmoji}
            x={0}
            y={isEgg ? -36 : -32}
            anchor={0.5}
            style={{ fontSize: 16 }}
          />
        ) : null}
        {/* Floating hearts while held */}
        {isHeld && heldHearts.map((h, i) => (
          <pixiText
            key={h.id}
            text="💕"
            x={-8 + i * 8}
            y={-44 - i * 12}
            anchor={0.5}
            alpha={0.7}
            style={{ fontSize: 12 }}
          />
        ))}
        {showEggIndicator && (
          <pixiGraphics draw={drawEggIndicator} x={18} y={-18} />
        )}
      </pixiContainer>
    </>
  )
}
