import { useCallback } from 'react'
import { Graphics } from 'pixi.js'

export interface BushPosition {
  x: number
  y: number
  scale: number
}

/** Bush positions exported for use by hide-and-seek (Task 11) */
export const BUSH_POSITIONS: BushPosition[] = [
  { x: 80, y: 460, scale: 1.0 },
  { x: 860, y: 490, scale: 1.2 },
  { x: 480, y: 580, scale: 0.9 },
]

function SingleBush({ pos }: { pos: BushPosition }) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      const s = pos.scale
      // Overlapping green circles to form a bush
      g.circle(-15 * s, 5 * s, 22 * s).fill(0x3a8c30)
      g.circle(15 * s, 5 * s, 22 * s).fill(0x3a8c30)
      g.circle(0, -8 * s, 24 * s).fill(0x4ca840)
      g.circle(-10 * s, 0, 18 * s).fill(0x5cb850)
      g.circle(10 * s, 0, 18 * s).fill(0x5cb850)
      // Small highlight
      g.circle(-5 * s, -12 * s, 8 * s).fill({ color: 0x6ed060, alpha: 0.6 })
    },
    [pos.scale],
  )

  return <pixiGraphics draw={draw} x={pos.x} y={pos.y} />
}

export function Bushes() {
  return (
    <pixiContainer>
      {BUSH_POSITIONS.map((pos, i) => (
        <SingleBush key={i} pos={pos} />
      ))}
    </pixiContainer>
  )
}
