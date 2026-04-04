import { useCallback } from 'react'
import { useGameStore, FOOD_COLORS } from '../store/gameStore'
import type { Graphics as PixiGraphics } from 'pixi.js'

export function FoodParticles() {
  const foodParticles = useGameStore((s) => s.foodParticles)

  const drawParticle = useCallback(
    (g: PixiGraphics, color: number, scale: number) => {
      g.clear()
      g.circle(0, 0, 4 * scale)
      g.fill({ color, alpha: 0.9 })
      // Small highlight
      g.circle(-1 * scale, -1 * scale, 1.5 * scale)
      g.fill({ color: 0xffffff, alpha: 0.4 })
    },
    [],
  )

  return (
    <>
      {foodParticles.map((particle) => {
        if (particle.scale <= 0) return null
        const color = FOOD_COLORS[particle.type]
        return (
          <pixiGraphics
            key={particle.id}
            x={particle.x}
            y={particle.y}
            draw={(g: PixiGraphics) => drawParticle(g, color, particle.scale)}
          />
        )
      })}
    </>
  )
}
