import { useCallback } from 'react'
import { Graphics } from 'pixi.js'

/** Chicken coop position — used by AI for night behavior */
export const COOP_POSITION = { x: 150, y: 520 }

export function Coop() {
  const draw = useCallback((g: Graphics) => {
    g.clear()

    // Base / floor — straw-colored platform
    g.rect(-40, 10, 80, 8).fill(0xc8a24e)

    // Wooden walls
    g.rect(-35, -25, 70, 35).fill(0xb5651d)
    // Darker planks for texture
    g.rect(-35, -15, 70, 3).fill(0x9e5418)
    g.rect(-35, -5, 70, 3).fill(0x9e5418)

    // Door opening
    g.rect(-8, -10, 16, 20).fill(0x3e2723)

    // Sloped roof
    g.poly([-45, -25, 0, -50, 45, -25]).fill(0xa0522d)
    // Roof edge highlight
    g.poly([-45, -25, 0, -50, 45, -25]).stroke({ color: 0x8b4513, width: 2 })

    // Roof straw texture lines
    g.moveTo(-30, -35).lineTo(-25, -25).stroke({ color: 0xdaa520, width: 1, alpha: 0.6 })
    g.moveTo(-10, -42).lineTo(-5, -25).stroke({ color: 0xdaa520, width: 1, alpha: 0.6 })
    g.moveTo(10, -42).lineTo(15, -25).stroke({ color: 0xdaa520, width: 1, alpha: 0.6 })
    g.moveTo(30, -35).lineTo(25, -25).stroke({ color: 0xdaa520, width: 1, alpha: 0.6 })

    // Straw/hay at the base
    for (let i = -30; i <= 30; i += 8) {
      g.moveTo(i, 10).lineTo(i + 3, 15).stroke({ color: 0xdaa520, width: 1.5 })
      g.moveTo(i + 4, 10).lineTo(i + 1, 14).stroke({ color: 0xc8a24e, width: 1 })
    }

    // Small window on left side
    g.rect(-28, -20, 10, 8).fill(0x87ceeb)
    g.rect(-28, -20, 10, 8).stroke({ color: 0x8b4513, width: 1 })
  }, [])

  return <pixiGraphics draw={draw} x={COOP_POSITION.x} y={COOP_POSITION.y} />
}
