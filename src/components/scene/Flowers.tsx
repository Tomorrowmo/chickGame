import { useCallback, useRef } from 'react'
import { useTick } from '@pixi/react'
import { Graphics } from 'pixi.js'

interface FlowerConfig {
  x: number
  y: number
  petalColor: number
  size: number
}

const FLOWERS: FlowerConfig[] = [
  { x: 200, y: 660, petalColor: 0xff6b8a, size: 1.0 },
  { x: 450, y: 760, petalColor: 0xffdb58, size: 0.8 },
  { x: 750, y: 640, petalColor: 0xff8c42, size: 1.1 },
  { x: 300, y: 810, petalColor: 0xc77dff, size: 0.9 },
  { x: 1200, y: 740, petalColor: 0xff6b8a, size: 0.85 },
  { x: 900, y: 830, petalColor: 0xffdb58, size: 1.0 },
  { x: 600, y: 870, petalColor: 0xc77dff, size: 0.75 },
  { x: 1350, y: 680, petalColor: 0xff8c42, size: 0.9 },
]

function SingleFlower({ config }: { config: FlowerConfig }) {
  const angleRef = useRef(Math.random() * Math.PI * 2)

  useTick((ticker) => {
    angleRef.current += ticker.deltaTime * 0.03
  })

  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      const s = config.size
      // Gentle sway rotation
      const sway = Math.sin(angleRef.current) * 0.1

      // Green stem
      const stemTopX = Math.sin(sway) * 8 * s
      g.moveTo(0, 0)
        .lineTo(stemTopX, -20 * s)
        .stroke({ color: 0x3a8c30, width: 2 * s })

      // Petals (small circles around center)
      const cx = stemTopX
      const cy = -20 * s
      const pr = 4 * s // petal radius
      const pd = 5 * s // petal distance from center
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + sway
        g.circle(cx + Math.cos(a) * pd, cy + Math.sin(a) * pd, pr).fill(config.petalColor)
      }
      // Center
      g.circle(cx, cy, 3 * s).fill(0xffed4a)
    },
    [config.size, config.petalColor],
  )

  return <pixiGraphics draw={draw} x={config.x} y={config.y} />
}

export function Flowers() {
  return (
    <pixiContainer>
      {FLOWERS.map((cfg, i) => (
        <SingleFlower key={i} config={cfg} />
      ))}
    </pixiContainer>
  )
}
