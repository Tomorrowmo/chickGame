import { useCallback } from 'react'
import { Graphics } from 'pixi.js'
import { useGameStore } from '../store/gameStore'
import { getSkyColor, getGrassColor, getGrassStripColor } from '../systems/timeSystem'

interface BackgroundProps {
  width: number
  height: number
}

export function Background({ width, height }: BackgroundProps) {
  const gameTime = useGameStore((s) => s.gameTime)

  const skyColor = getSkyColor(gameTime)
  const grassColor = getGrassColor(gameTime)
  const grassStripColor = getGrassStripColor(gameTime)

  const drawGround = useCallback(
    (g: Graphics) => {
      g.clear()
      // Sky
      g.rect(0, 0, width, height * 0.6).fill(skyColor)
      // Grass
      g.rect(0, height * 0.6, width, height * 0.4).fill(grassColor)
      // Darker grass strip at the horizon
      g.rect(0, height * 0.6, width, 10).fill(grassStripColor)
    },
    [width, height, skyColor, grassColor, grassStripColor],
  )

  return <pixiGraphics draw={drawGround} />
}
