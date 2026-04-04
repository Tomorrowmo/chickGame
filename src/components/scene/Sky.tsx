import { useCallback, useMemo, useRef } from 'react'
import { Graphics } from 'pixi.js'
import { useTick } from '@pixi/react'
import {
  getCelestialPosition,
  getStarAlpha,
  getNightTintAlpha,
} from '../../systems/timeSystem'
import { useGameStore } from '../../store/gameStore'

interface SkyProps {
  width: number
  height: number
}

// Pre-generate deterministic star positions
function generateStars(count: number, seed: number) {
  const stars: Array<{ x: number; y: number; size: number; twinkleSpeed: number }> = []
  let rng = seed
  const next = () => {
    rng = (rng * 16807) % 2147483647
    return (rng - 1) / 2147483646
  }
  for (let i = 0; i < count; i++) {
    stars.push({
      x: next(),
      y: next() * 0.55, // only in sky area (top 60%)
      size: 0.5 + next() * 1.5,
      twinkleSpeed: 0.5 + next() * 2,
    })
  }
  return stars
}

const STAR_DATA = generateStars(80, 42)

export function Sky({ width, height }: SkyProps) {
  const gameTime = useGameStore((s) => s.gameTime)
  const tickRef = useRef(0)

  useTick((ticker) => {
    tickRef.current += ticker.deltaTime
  })

  const starAlpha = getStarAlpha(gameTime)
  const nightTintAlpha = getNightTintAlpha(gameTime)
  const sun = getCelestialPosition(gameTime, 'sun')
  const moon = getCelestialPosition(gameTime, 'moon')

  const skyHeight = height * 0.6

  const drawCelestials = useCallback(
    (g: Graphics) => {
      g.clear()

      // Stars
      if (starAlpha > 0) {
        const time = tickRef.current
        for (const star of STAR_DATA) {
          const twinkle =
            0.4 + 0.6 * Math.abs(Math.sin(time * 0.02 * star.twinkleSpeed))
          const alpha = starAlpha * twinkle
          g.circle(star.x * width, star.y * height, star.size)
            .fill({ color: 0xffffff, alpha })
        }
      }

      // Sun
      if (sun.visible) {
        const sx = sun.x * width
        const sy = sun.y * skyHeight
        // Glow
        g.circle(sx, sy, 30).fill({ color: 0xffdd44, alpha: 0.3 })
        // Body
        g.circle(sx, sy, 18).fill(0xffdd00)
        // Bright center
        g.circle(sx, sy, 10).fill(0xffee66)
      }

      // Moon
      if (moon.visible) {
        const mx = moon.x * width
        const my = moon.y * skyHeight
        // Glow
        g.circle(mx, my, 22).fill({ color: 0xccccff, alpha: 0.2 })
        // Body
        g.circle(mx, my, 14).fill(0xe8e8f0)
        // Crescent shadow (offset circle to create crescent look)
        g.circle(mx + 5, my - 3, 11).fill({ color: 0x0c1445, alpha: 0.7 })
      }

      // Night tint overlay (blue moonlight)
      if (nightTintAlpha > 0) {
        g.rect(0, 0, width, height).fill({ color: 0x0a0a3a, alpha: nightTintAlpha })
      }
    },
    [width, height, skyHeight, starAlpha, nightTintAlpha, sun, moon],
  )

  return <pixiGraphics draw={drawCelestials} />
}
