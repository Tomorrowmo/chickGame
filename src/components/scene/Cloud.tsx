import { useCallback, useRef } from 'react'
import { useTick } from '@pixi/react'
import { Graphics } from 'pixi.js'

interface CloudConfig {
  startX: number
  y: number
  speed: number
  scale: number
}

const CLOUDS: CloudConfig[] = [
  { startX: 100, y: 60, speed: 0.3, scale: 1.0 },
  { startX: 450, y: 30, speed: 0.2, scale: 1.3 },
  { startX: 750, y: 90, speed: 0.4, scale: 0.8 },
]

const CANVAS_WIDTH = 960

function SingleCloud({ config }: { config: CloudConfig }) {
  const xRef = useRef(config.startX)

  useTick((ticker) => {
    xRef.current -= config.speed * ticker.deltaTime
    if (xRef.current < -160 * config.scale) {
      xRef.current = CANVAS_WIDTH + 80
    }
  })

  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      const s = config.scale
      // Fluffy cloud: overlapping white/light-gray circles
      g.circle(0, 0, 30 * s).fill(0xf0f0f0)
      g.circle(25 * s, -10 * s, 35 * s).fill(0xffffff)
      g.circle(55 * s, -5 * s, 28 * s).fill(0xf5f5f5)
      g.circle(80 * s, 0, 25 * s).fill(0xf0f0f0)
      g.circle(35 * s, 5 * s, 25 * s).fill(0xffffff)
    },
    [config.scale],
  )

  return (
    <pixiGraphics
      draw={draw}
      x={xRef.current}
      y={config.y}
      alpha={0.85}
    />
  )
}

export function Clouds() {
  return (
    <pixiContainer>
      {CLOUDS.map((cfg, i) => (
        <SingleCloud key={i} config={cfg} />
      ))}
    </pixiContainer>
  )
}
