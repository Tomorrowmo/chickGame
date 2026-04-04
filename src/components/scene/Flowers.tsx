import { useCallback, useRef } from 'react'
import { useTick } from '@pixi/react'
import { Graphics } from 'pixi.js'

type FlowerType = 'daisy' | 'poppy' | 'dandelion' | 'simple'

interface FlowerConfig {
  x: number
  y: number
  petalColor: number
  size: number
  type: FlowerType
}

const FLOWERS: FlowerConfig[] = [
  // Daisies (white petals, yellow center)
  { x: 200, y: 660, petalColor: 0xfff8f0, size: 1.0, type: 'daisy' },
  { x: 900, y: 830, petalColor: 0xfff8f0, size: 0.85, type: 'daisy' },
  { x: 1100, y: 700, petalColor: 0xfff0e8, size: 0.9, type: 'daisy' },
  // Poppies (red, larger)
  { x: 450, y: 760, petalColor: 0xdd3333, size: 0.9, type: 'poppy' },
  { x: 1350, y: 680, petalColor: 0xcc2222, size: 1.0, type: 'poppy' },
  { x: 680, y: 850, petalColor: 0xdd4444, size: 0.8, type: 'poppy' },
  // Dandelions (yellow puffs)
  { x: 750, y: 640, petalColor: 0xffed4a, size: 1.1, type: 'dandelion' },
  { x: 300, y: 810, petalColor: 0xffe844, size: 0.75, type: 'dandelion' },
  { x: 1200, y: 740, petalColor: 0xfff066, size: 0.9, type: 'dandelion' },
  // Simple flowers (the original style)
  { x: 600, y: 870, petalColor: 0xc77dff, size: 0.75, type: 'simple' },
  { x: 1000, y: 780, petalColor: 0xff8c42, size: 0.8, type: 'simple' },
  { x: 150, y: 780, petalColor: 0xff6b8a, size: 0.7, type: 'simple' },
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
      const sway = Math.sin(angleRef.current) * 0.1

      // Green stem
      const stemTopX = Math.sin(sway) * 8 * s
      const stemH = config.type === 'poppy' ? 26 : 20
      g.moveTo(0, 0)
        .lineTo(stemTopX, -stemH * s)
        .stroke({ color: 0x3a8c30, width: 2 * s })

      // Small leaf on stem
      const leafY = -stemH * s * 0.4
      const leafX = stemTopX * 0.4
      g.moveTo(leafX, leafY)
      g.bezierCurveTo(leafX - 6 * s, leafY - 3 * s, leafX - 6 * s, leafY + 3 * s, leafX, leafY)
      g.fill({ color: 0x4a9a3a, alpha: 0.7 })

      const cx = stemTopX
      const cy = -stemH * s

      if (config.type === 'daisy') {
        // Daisy: elongated white petals in a ring
        const petalCount = 8
        const pd = 5 * s
        const pw = 2.5 * s
        const ph = 5 * s
        for (let i = 0; i < petalCount; i++) {
          const a = (i / petalCount) * Math.PI * 2 + sway
          const px = cx + Math.cos(a) * pd
          const py = cy + Math.sin(a) * pd
          g.ellipse(px, py, pw, ph).fill(config.petalColor)
        }
        // Yellow center
        g.circle(cx, cy, 3.5 * s).fill(0xffcc00)
        g.circle(cx, cy, 3.5 * s).stroke({ color: 0xe6b800, width: 0.5 })
      } else if (config.type === 'poppy') {
        // Poppy: 4 large overlapping red petals, organic shapes
        const pr = 6 * s
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + sway + 0.3
          const px = cx + Math.cos(a) * pr * 0.5
          const py = cy + Math.sin(a) * pr * 0.5
          g.circle(px, py, pr).fill({ color: config.petalColor, alpha: 0.85 })
        }
        // Dark center
        g.circle(cx, cy, 2.5 * s).fill(0x222222)
      } else if (config.type === 'dandelion') {
        // Dandelion: fluffy yellow puff ball
        const puffR = 5 * s
        // Multiple small circles for fluffy look
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + sway * 0.5
          const dist = puffR * (0.3 + (i % 3) * 0.25)
          const dx = cx + Math.cos(a) * dist
          const dy = cy + Math.sin(a) * dist
          g.circle(dx, dy, 2.5 * s).fill({ color: config.petalColor, alpha: 0.8 })
        }
        // Center
        g.circle(cx, cy, 2 * s).fill(0xf5c800)
      } else {
        // Simple: original 5-petal style
        const pr = 4 * s
        const pd = 5 * s
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + sway
          g.circle(cx + Math.cos(a) * pd, cy + Math.sin(a) * pd, pr).fill(config.petalColor)
        }
        g.circle(cx, cy, 3 * s).fill(0xffed4a)
      }
    },
    [config.size, config.petalColor, config.type],
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
