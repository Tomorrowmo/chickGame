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

      // --- Carmela-style painterly sky ---
      // Base sky
      g.rect(0, 0, width, height * 0.6).fill(skyColor)

      // Soft watercolor overlays for texture
      g.rect(0, 0, width, height * 0.25).fill({ color: 0xa8d8ea, alpha: 0.15 })
      g.rect(width * 0.2, height * 0.05, width * 0.6, height * 0.15).fill({ color: 0xffefd5, alpha: 0.08 })
      g.rect(0, height * 0.35, width, height * 0.25).fill({ color: 0xffdab9, alpha: 0.1 })

      // --- Rolling hills (Carmela storybook style) ---
      // Far hill (darker green, gentle curve)
      g.moveTo(0, height * 0.58)
      g.bezierCurveTo(width * 0.15, height * 0.52, width * 0.35, height * 0.56, width * 0.5, height * 0.54)
      g.bezierCurveTo(width * 0.65, height * 0.52, width * 0.85, height * 0.57, width, height * 0.55)
      g.lineTo(width, height)
      g.lineTo(0, height)
      g.closePath()
      g.fill(0x6b9a3a)

      // Middle hill (base grass)
      g.moveTo(0, height * 0.6)
      g.bezierCurveTo(width * 0.1, height * 0.57, width * 0.25, height * 0.62, width * 0.4, height * 0.58)
      g.bezierCurveTo(width * 0.55, height * 0.55, width * 0.75, height * 0.6, width, height * 0.58)
      g.lineTo(width, height)
      g.lineTo(0, height)
      g.closePath()
      g.fill(grassColor)

      // Near foreground grass (warmer, lighter)
      g.moveTo(0, height * 0.75)
      g.bezierCurveTo(width * 0.2, height * 0.72, width * 0.4, height * 0.76, width * 0.6, height * 0.73)
      g.bezierCurveTo(width * 0.8, height * 0.7, width * 0.95, height * 0.74, width, height * 0.72)
      g.lineTo(width, height)
      g.lineTo(0, height)
      g.closePath()
      g.fill(0x8fbc5a)

      // Horizon strip for depth
      g.rect(0, height * 0.58, width, 6).fill({ color: grassStripColor, alpha: 0.5 })

      // --- Red barn silhouette on horizon ---
      const barnX = width * 0.82
      const barnY = height * 0.53
      // Barn body
      g.rect(barnX - 20, barnY - 18, 40, 22).fill({ color: 0xb22222, alpha: 0.6 })
      // Barn roof
      g.poly([barnX - 24, barnY - 18, barnX, barnY - 32, barnX + 24, barnY - 18]).fill({ color: 0x8b0000, alpha: 0.6 })
      // Barn door
      g.rect(barnX - 6, barnY - 8, 12, 12).fill({ color: 0x3e2723, alpha: 0.5 })
      // Silo
      g.rect(barnX + 22, barnY - 24, 8, 28).fill({ color: 0xa52a2a, alpha: 0.5 })
      g.circle(barnX + 26, barnY - 24, 4).fill({ color: 0xa52a2a, alpha: 0.5 })

      // --- Winding dirt path ---
      g.moveTo(width * 0.15, height)
      g.bezierCurveTo(width * 0.2, height * 0.85, width * 0.35, height * 0.78, width * 0.45, height * 0.72)
      g.bezierCurveTo(width * 0.55, height * 0.66, width * 0.6, height * 0.7, width * 0.7, height * 0.65)
      g.bezierCurveTo(width * 0.8, height * 0.6, width * 0.88, height * 0.62, width * 0.92, height * 0.58)
      g.lineTo(width * 0.95, height * 0.58)
      g.bezierCurveTo(width * 0.9, height * 0.64, width * 0.82, height * 0.62, width * 0.72, height * 0.67)
      g.bezierCurveTo(width * 0.62, height * 0.72, width * 0.57, height * 0.68, width * 0.47, height * 0.74)
      g.bezierCurveTo(width * 0.37, height * 0.8, width * 0.22, height * 0.87, width * 0.2, height)
      g.closePath()
      g.fill({ color: 0xd4a574, alpha: 0.5 })
      // Path edge highlights
      g.moveTo(width * 0.17, height)
      g.bezierCurveTo(width * 0.21, height * 0.86, width * 0.36, height * 0.79, width * 0.46, height * 0.73)
      g.stroke({ color: 0xc49a6c, width: 1.5, alpha: 0.3 })
    },
    [width, height, skyColor, grassColor, grassStripColor],
  )

  return <pixiGraphics draw={drawGround} />
}
