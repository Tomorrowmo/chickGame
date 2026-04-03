import { useCallback } from 'react'
import { Graphics } from 'pixi.js'

interface BackgroundProps {
  width: number
  height: number
}

export function Background({ width, height }: BackgroundProps) {
  const drawGround = useCallback(
    (g: Graphics) => {
      g.clear()
      // Sky
      g.rect(0, 0, width, height * 0.6).fill(0x87ceeb)
      // Grass
      g.rect(0, height * 0.6, width, height * 0.4).fill(0x7ec850)
      // Darker grass strip at the horizon
      g.rect(0, height * 0.6, width, 10).fill(0x6ab840)
    },
    [width, height],
  )

  return <pixiGraphics draw={drawGround} />
}
