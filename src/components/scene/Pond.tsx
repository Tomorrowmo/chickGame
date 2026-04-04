import { useCallback, useRef } from 'react'
import { useTick } from '@pixi/react'
import { Graphics } from 'pixi.js'

interface PondProps {
  x?: number
  y?: number
}

export function Pond({ x = 700, y = 500 }: PondProps) {
  const shimmerRef = useRef(0)

  useTick((ticker) => {
    shimmerRef.current += ticker.deltaTime * 0.02
    if (shimmerRef.current > 1) shimmerRef.current -= 1
  })

  const draw = useCallback((g: Graphics) => {
    g.clear()
    // Water body - oval
    g.ellipse(0, 0, 70, 35).fill({ color: 0x4a90d9, alpha: 0.8 })
    // Slightly darker rim
    g.ellipse(0, 0, 70, 35).stroke({ color: 0x3a7bc8, width: 2, alpha: 0.5 })
    // Inner lighter area
    g.ellipse(-5, -3, 50, 22).fill({ color: 0x5ba0e8, alpha: 0.4 })

    // Shimmer highlight - moves across the surface
    const shimX = -50 + shimmerRef.current * 100
    g.ellipse(shimX, -5, 18, 8).fill({ color: 0xffffff, alpha: 0.35 })
    g.ellipse(shimX + 25, -2, 10, 5).fill({ color: 0xffffff, alpha: 0.2 })
  }, [])

  return <pixiGraphics draw={draw} x={x} y={y} />
}
