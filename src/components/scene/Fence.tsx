import { useCallback, useRef } from 'react'
import { Graphics } from 'pixi.js'

interface FenceProps {
  width?: number
  height?: number
}

const POST_SPACING = 80
const POST_WIDTH = 8
const POST_HEIGHT = 50
const RAIL_HEIGHT = 3
const FENCE_Y = 860 // near bottom of canvas (900)

export function Fence({ width = 960 }: FenceProps) {
  // Generate irregular post variations once (stable across renders)
  const variationsRef = useRef<{ heightVar: number; lean: number }[] | null>(null)
  if (!variationsRef.current) {
    const numPosts = Math.floor(width / POST_SPACING) + 1
    variationsRef.current = Array.from({ length: numPosts }, () => ({
      heightVar: (Math.random() - 0.5) * 12, // -6 to +6 height variation
      lean: (Math.random() - 0.5) * 0.06, // slight lean angle
    }))
  }
  const variations = variationsRef.current

  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      const darkWood = 0xd4a574 // warm amber for Carmela style
      const lightWood = 0xc49a6c

      const numPosts = Math.floor(width / POST_SPACING) + 1

      // Horizontal rails (two rails) — slightly wavy
      const rail1Y = FENCE_Y - POST_HEIGHT + 12
      const rail2Y = FENCE_Y - POST_HEIGHT + 32
      // Draw rails as segmented lines for rustic feel
      for (let i = 0; i < numPosts - 1; i++) {
        const x1 = i * POST_SPACING
        const x2 = (i + 1) * POST_SPACING
        const v1 = variations[i]
        const v2 = variations[i + 1]
        const y1off = v1.heightVar * 0.3
        const y2off = v2.heightVar * 0.3
        g.moveTo(x1, rail1Y + y1off).lineTo(x2, rail1Y + y2off).stroke({ color: lightWood, width: RAIL_HEIGHT })
        g.moveTo(x1, rail2Y + y1off).lineTo(x2, rail2Y + y2off).stroke({ color: lightWood, width: RAIL_HEIGHT })
      }

      // Vertical posts with irregular heights and slight lean
      for (let i = 0; i < numPosts; i++) {
        const px = i * POST_SPACING
        const v = variations[i]
        const h = POST_HEIGHT + v.heightVar
        const leanOffset = v.lean * h

        // Post body (leaning slightly)
        g.moveTo(px - POST_WIDTH / 2, FENCE_Y)
        g.lineTo(px - POST_WIDTH / 2 + leanOffset, FENCE_Y - h)
        g.lineTo(px + POST_WIDTH / 2 + leanOffset, FENCE_Y - h)
        g.lineTo(px + POST_WIDTH / 2, FENCE_Y)
        g.closePath()
        g.fill(darkWood)

        // Pointed top
        g.moveTo(px - POST_WIDTH / 2 - 1 + leanOffset, FENCE_Y - h)
          .lineTo(px + leanOffset, FENCE_Y - h - 8)
          .lineTo(px + POST_WIDTH / 2 + 1 + leanOffset, FENCE_Y - h)
          .fill(darkWood)
      }
    },
    [width, variations],
  )

  return <pixiGraphics draw={draw} />
}
