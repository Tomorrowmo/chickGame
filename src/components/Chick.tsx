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
          // Crack 1: jagged line from top-right
          g.moveTo(4, -18)
            .lineTo(2, -12)
            .lineTo(6, -8)
            .lineTo(3, -3)
            .stroke({ width: 1.5, color: 0x8b7d6b })

          // Crack 2: from left side
          g.moveTo(-14, -4)
            .lineTo(-9, -2)
            .lineTo(-11, 3)
            .lineTo(-6, 5)
            .stroke({ width: 1.5, color: 0x8b7d6b })

          // Crack 3: small crack from bottom
          g.moveTo(2, 16)
            .lineTo(0, 10)
            .lineTo(4, 7)
            .stroke({ width: 1, color: 0x8b7d6b })
        }
      } else {
        // Body: round yellow circle
        g.circle(0, 0, 20).fill(0xffd700)

        // Eye: black dot
        const eyeX = data.direction === 'right' ? 6 : -6
        g.circle(eyeX, -5, 3).fill(0x000000)

        // Beak: orange triangle pointing in direction
        const beakDir = data.direction === 'right' ? 1 : -1
        const beakBaseX = beakDir * 14
        g.poly([
          beakBaseX,
          -4,
          beakBaseX + beakDir * 10,
          0,
          beakBaseX,
          4,
        ]).fill(0xff8c00)

        // Feet: two small orange rectangles
        g.rect(-8, 18, 6, 4).fill(0xff8c00)
        g.rect(2, 18, 6, 4).fill(0xff8c00)
      }
    },
    [isEgg, isHatching, data.direction],
  )

  // Egg-laying floating text
  const [floatingText, setFloatingText] = useState<{ text: string; key: number } | null>(null)
  const floatingRef = useRef({ timer: 0, active: false })
  const prevEggsLaidRef = useRef(data.eggsLaid)

  useEffect(() => {
    if (data.eggsLaid > prevEggsLaidRef.current) {
      const reward = data.rarity === 'rare' ? 20 : data.rarity === 'special' ? 10 : 5
      setFloatingText({ text: `\uD83E\uDD5A+${reward}`, key: Date.now() })
      floatingRef.current = { timer: 0, active: true }
    }
    prevEggsLaidRef.current = data.eggsLaid
  }, [data.eggsLaid, data.rarity])

  const floatingOffsetRef = useRef(0)
  const floatingAlphaRef = useRef(1)

  useTick((ticker) => {
    const f = floatingRef.current
    if (f.active) {
      f.timer += ticker.deltaTime
      const duration = 90 // ~1.5s
      const progress = f.timer / duration
      floatingOffsetRef.current = -progress * 40
      floatingAlphaRef.current = 1 - progress
      if (f.timer >= duration) {
        f.active = false
        setFloatingText(null)
        floatingOffsetRef.current = 0
        floatingAlphaRef.current = 1
      }
    }
  })

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
    if (isEgg) {
      // Eggs can't be picked up, just do regular click
      handleClick()
      return
    }
    pointerDownRef.current = true

    // Start long press timer
    holdTimerRef.current = setTimeout(() => {
      if (pointerDownRef.current) {
        // Long press detected — pick up chick
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
  const finalRotation = isHeld
    ? heldNuzzleRef.current
    : wobbleRef.current.rotation + reluctantRotRef.current

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
        {floatingText && (
          <pixiText
            text={floatingText.text}
            x={0}
            y={-44 + floatingOffsetRef.current}
            anchor={0.5}
            alpha={floatingAlphaRef.current}
            style={{ fontSize: 14, fontWeight: 'bold', fill: 0xf5a623 }}
          />
        )}
      </pixiContainer>
    </>
  )
}
