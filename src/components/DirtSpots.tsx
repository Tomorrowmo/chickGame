import { useCallback, useState } from 'react'
import { useTick } from '@pixi/react'
import type { Graphics } from 'pixi.js'
import { useGameStore, type DirtSpot } from '../store/gameStore'
import { useClickEffectsStore } from '../systems/clickEffects'

/** Sparkle burst when cleaning a dirt spot */
function CleanSparkle({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) {
  const [age, setAge] = useState(0)
  const maxAge = 30

  useTick((ticker) => {
    setAge((a) => {
      const next = a + ticker.deltaTime
      if (next >= maxAge) onComplete()
      return next
    })
  })

  const progress = age / maxAge
  const alpha = 1 - progress

  const drawSparkle = useCallback(
    (g: Graphics) => {
      g.clear()
      // Expanding sparkle burst
      const count = 8
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const dist = progress * 25
        const px = Math.cos(angle) * dist
        const py = Math.sin(angle) * dist
        const size = 3 - progress * 2
        if (size > 0.3) {
          g.circle(px, py, size).fill({ color: 0xffd700, alpha: alpha * 0.9 })
        }
      }
      // Center flash
      const flashSize = 6 * (1 - progress)
      if (flashSize > 0.5) {
        g.circle(0, 0, flashSize).fill({ color: 0xffffff, alpha: alpha * 0.7 })
      }
    },
    [progress, alpha],
  )

  return (
    <pixiContainer x={x} y={y} alpha={alpha}>
      <pixiGraphics draw={drawSparkle} />
    </pixiContainer>
  )
}

/** Renders a single dirt spot: 2-3 overlapping brown circles */
function DirtSpotRenderer({ spot }: { spot: DirtSpot }) {
  const cleaningMode = useGameStore((s) => s.cleaningMode)
  const cleanDirtSpot = useGameStore((s) => s.cleanDirtSpot)
  const addEffect = useClickEffectsStore((s) => s.addEffect)
  const [sparkle, setSparkle] = useState<{ x: number; y: number } | null>(null)
  const [cleaned, setCleaned] = useState(false)

  const drawDirt = useCallback((g: Graphics) => {
    g.clear()
    // 2-3 overlapping brownish blotches
    g.circle(-4, 2, 7).fill({ color: 0x8b6914, alpha: 0.6 })
    g.circle(5, -1, 6).fill({ color: 0x6b4f12, alpha: 0.55 })
    g.circle(1, 5, 5).fill({ color: 0x7a5c16, alpha: 0.5 })
  }, [])

  const handleClick = useCallback(() => {
    if (!cleaningMode || cleaned) return
    setCleaned(true)
    setSparkle({ x: spot.x, y: spot.y })
    addEffect('heart', spot.x, spot.y - 10)
    cleanDirtSpot(spot.id)
  }, [cleaningMode, cleaned, spot, cleanDirtSpot, addEffect])

  if (cleaned && !sparkle) return null

  return (
    <>
      {!cleaned && (
        <pixiGraphics
          x={spot.x}
          y={spot.y}
          draw={drawDirt}
          eventMode={cleaningMode ? 'static' : 'none'}
          cursor={cleaningMode ? 'pointer' : 'default'}
          onPointerDown={handleClick}
          hitArea={{ contains: (x: number, y: number) => x * x + y * y < 100 }}
        />
      )}
      {sparkle && (
        <CleanSparkle x={sparkle.x} y={sparkle.y} onComplete={() => setSparkle(null)} />
      )}
    </>
  )
}

/** Renders all dirt spots on the grass */
export function DirtSpots() {
  const dirtSpots = useGameStore((s) => s.dirtSpots)

  return (
    <pixiContainer zIndex={2}>
      {dirtSpots.map((spot) => (
        <DirtSpotRenderer key={spot.id} spot={spot} />
      ))}
    </pixiContainer>
  )
}
