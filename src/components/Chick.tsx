import { useCallback, useEffect, useRef, useState } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import type { ChickData, LifeStage } from '../types/chick'
import { EGG_TIMER_INITIAL } from '../store/gameStore'

extend({ Graphics, Text, Container })

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
}

export function Chick({ data, onClick, onHatch }: ChickProps) {
  const scale = STAGE_SCALE[data.stage] ?? 1.0
  const isEgg = data.stage === 'egg' || data.stage === 'hatching'
  const isHatching = data.stage === 'hatching'
  const moodEmoji = MOOD_EMOJI[data.mood]

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

  return (
    <pixiContainer
      x={data.x}
      y={data.y + bounceOffsetRef.current}
      scale={scale}
      rotation={wobbleRef.current.rotation}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    >
      <pixiGraphics draw={drawShadow} />
      <pixiGraphics draw={drawBody} />
      {moodEmoji && (
        <pixiText
          text={moodEmoji}
          x={0}
          y={isEgg ? -36 : -32}
          anchor={0.5}
          style={{ fontSize: 16 }}
        />
      )}
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
  )
}
