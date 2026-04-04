import { useCallback } from 'react'
import { Graphics } from 'pixi.js'

/** Chicken coop position — used by AI for night behavior */
export const COOP_POSITION = { x: 200, y: 730 }

export function Coop() {
  const draw = useCallback((g: Graphics) => {
    g.clear()

    const S = 2 // scale factor

    // Base / floor — straw-colored platform
    g.rect(-40 * S, 10 * S, 80 * S, 8 * S).fill(0xc8a24e)

    // Wooden walls
    g.rect(-35 * S, -25 * S, 70 * S, 35 * S).fill(0xb5651d)
    // Darker planks for texture
    g.rect(-35 * S, -15 * S, 70 * S, 3 * S).fill(0x9e5418)
    g.rect(-35 * S, -5 * S, 70 * S, 3 * S).fill(0x9e5418)

    // Door opening — large enough for chicks to walk in
    g.rect(-14 * S, -18 * S, 28 * S, 38 * S).fill(0x3e2723)

    // Sloped roof
    g.poly([-45 * S, -25 * S, 0, -50 * S, 45 * S, -25 * S]).fill(0xa0522d)
    // Roof edge highlight
    g.poly([-45 * S, -25 * S, 0, -50 * S, 45 * S, -25 * S]).stroke({ color: 0x8b4513, width: 2 * S })

    // Roof straw texture lines
    g.moveTo(-30 * S, -35 * S).lineTo(-25 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })
    g.moveTo(-10 * S, -42 * S).lineTo(-5 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })
    g.moveTo(10 * S, -42 * S).lineTo(15 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })
    g.moveTo(30 * S, -35 * S).lineTo(25 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })

    // Straw/hay at the base
    for (let i = -30 * S; i <= 30 * S; i += 8 * S) {
      g.moveTo(i, 10 * S).lineTo(i + 3 * S, 15 * S).stroke({ color: 0xdaa520, width: 1.5 * S })
      g.moveTo(i + 4 * S, 10 * S).lineTo(i + 1 * S, 14 * S).stroke({ color: 0xc8a24e, width: 1 * S })
    }

    // Small window on left side
    g.rect(-28 * S, -20 * S, 10 * S, 8 * S).fill(0x87ceeb)
    g.rect(-28 * S, -20 * S, 10 * S, 8 * S).stroke({ color: 0x8b4513, width: 1 * S })
  }, [])

  return <pixiGraphics draw={draw} x={COOP_POSITION.x} y={COOP_POSITION.y} />
}
