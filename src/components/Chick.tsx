import { useCallback, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import type { ChickData } from '../types/chick'

extend({ Graphics, Text, Container })

const STAGE_SCALE: Record<string, number> = {
  egg: 0.6,
  hatching: 0.6,
  baby: 0.7,
  juvenile: 0.85,
  adult: 1.0,
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '❤️',
  bored: '💤',
  angry: '💢',
}

/** Bounce animation duration in frames (~0.3s at 60fps = 18 frames) */
const BOUNCE_DURATION = 18
const BOUNCE_HEIGHT = 12

interface ChickProps {
  data: ChickData
  onClick?: (data: ChickData) => void
}

export function Chick({ data, onClick }: ChickProps) {
  const scale = STAGE_SCALE[data.stage] ?? 1.0
  const isEgg = data.stage === 'egg' || data.stage === 'hatching'
  const moodEmoji = MOOD_EMOJI[data.mood]

  // Bounce animation state
  const bounceRef = useRef({ active: false, timer: 0 })
  const bounceOffsetRef = useRef(0)

  useTick((ticker) => {
    const b = bounceRef.current
    if (!b.active) return
    b.timer += ticker.deltaTime
    if (b.timer >= BOUNCE_DURATION) {
      b.active = false
      b.timer = 0
      bounceOffsetRef.current = 0
    } else {
      // Sine curve: up then back down
      const progress = b.timer / BOUNCE_DURATION
      bounceOffsetRef.current = -Math.sin(progress * Math.PI) * BOUNCE_HEIGHT
    }
  })

  const drawBody = useCallback(
    (g: Graphics) => {
      g.clear()

      if (isEgg) {
        // Egg: cream oval with gold spots
        g.ellipse(0, 0, 18, 24).fill(0xfff8dc)
        g.circle(-6, -8, 3).fill(0xffd700)
        g.circle(5, 2, 2.5).fill(0xffd700)
        g.circle(-3, 10, 2).fill(0xffd700)
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
    [isEgg, data.direction],
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
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    >
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
    </pixiContainer>
  )
}
