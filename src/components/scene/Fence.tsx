import { useCallback } from 'react'
import { Graphics } from 'pixi.js'

interface FenceProps {
  width?: number
  height?: number
}

const POST_SPACING = 80
const POST_WIDTH = 8
const POST_HEIGHT = 50
const RAIL_HEIGHT = 3
const FENCE_Y = 600 // near bottom of canvas (640)

export function Fence({ width = 960 }: FenceProps) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      const darkWood = 0x8b4513
      const lightWood = 0xdeb887

      const numPosts = Math.floor(width / POST_SPACING) + 1

      // Horizontal rails (two rails)
      const rail1Y = FENCE_Y - POST_HEIGHT + 12
      const rail2Y = FENCE_Y - POST_HEIGHT + 32
      g.rect(0, rail1Y, width, RAIL_HEIGHT).fill(lightWood)
      g.rect(0, rail2Y, width, RAIL_HEIGHT).fill(lightWood)

      // Vertical posts
      for (let i = 0; i < numPosts; i++) {
        const px = i * POST_SPACING
        // Post body
        g.rect(px - POST_WIDTH / 2, FENCE_Y - POST_HEIGHT, POST_WIDTH, POST_HEIGHT).fill(darkWood)
        // Pointed top
        g.moveTo(px - POST_WIDTH / 2 - 1, FENCE_Y - POST_HEIGHT)
          .lineTo(px, FENCE_Y - POST_HEIGHT - 8)
          .lineTo(px + POST_WIDTH / 2 + 1, FENCE_Y - POST_HEIGHT)
          .fill(darkWood)
      }
    },
    [width],
  )

  return <pixiGraphics draw={draw} />
}
