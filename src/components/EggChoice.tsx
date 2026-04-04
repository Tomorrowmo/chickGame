import { useCallback, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import type { PendingEgg } from '../store/gameStore'
import { useGameStore } from '../store/gameStore'

extend({ Graphics, Text, Container })

/** Auto-dismiss after 15 seconds */
const AUTO_DISMISS_MS = 15000

interface EggChoiceProps {
  egg: PendingEgg
}

export function EggChoice({ egg }: EggChoiceProps) {
  const sellPendingEgg = useGameStore((s) => s.sellPendingEgg)
  const hatchPendingEgg = useGameStore((s) => s.hatchPendingEgg)

  const animRef = useRef({ time: 0, dismissed: false })
  const dismissTimerRef = useRef(egg.createdAt)

  useTick((ticker) => {
    animRef.current.time += ticker.deltaTime
    if (!animRef.current.dismissed && Date.now() - dismissTimerRef.current > AUTO_DISMISS_MS) {
      animRef.current.dismissed = true
      sellPendingEgg(egg.id)
    }
  })

  const handleSell = useCallback(() => {
    if (animRef.current.dismissed) return
    animRef.current.dismissed = true
    sellPendingEgg(egg.id)
  }, [sellPendingEgg, egg.id])

  const handleHatch = useCallback(() => {
    if (animRef.current.dismissed) return
    animRef.current.dismissed = true
    hatchPendingEgg(egg.id)
  }, [hatchPendingEgg, egg.id])

  const eggBounce = Math.sin(animRef.current.time * 0.15) * 4
  const posX = egg.x
  const posY = egg.y - 70

  // Draw a coin icon (golden circle with $ lines)
  const drawCoinIcon = useCallback((g: Graphics) => {
    g.clear()
    g.circle(0, 0, 7).fill(0xFFD700)
    g.circle(0, 0, 7).stroke({ color: 0xDAA520, width: 1.5 })
    // Dollar sign as two lines
    g.moveTo(0, -4).lineTo(0, 4).stroke({ color: 0x8B6914, width: 1.5 })
    g.moveTo(-3, -2).lineTo(3, -2).stroke({ color: 0x8B6914, width: 1 })
    g.moveTo(-3, 2).lineTo(3, 2).stroke({ color: 0x8B6914, width: 1 })
  }, [])

  // Draw a small chick icon (yellow circle + beak)
  const drawChickIcon = useCallback((g: Graphics) => {
    g.clear()
    // Body
    g.circle(0, 0, 7).fill(0xFFD700)
    // Eye
    g.circle(2, -2, 1.5).fill(0x000000)
    // Beak
    g.poly([5, -1, 9, 0, 5, 2]).fill(0xFF8C00)
  }, [])

  const drawSellButton = useCallback((g: Graphics) => {
    g.clear()
    g.circle(0, 0, 22).fill({ color: 0xFFD700, alpha: 0.9 })
    g.circle(0, 0, 22).stroke({ color: 0xDAA520, width: 2 })
  }, [])

  const drawHatchButton = useCallback((g: Graphics) => {
    g.clear()
    g.circle(0, 0, 22).fill({ color: 0x7EC850, alpha: 0.9 })
    g.circle(0, 0, 22).stroke({ color: 0x5A9E3A, width: 2 })
  }, [])

  const drawEggIcon = useCallback((g: Graphics) => {
    g.clear()
    g.ellipse(0, 0, 8, 11).fill(0xFFF8DC)
    g.ellipse(0, 0, 8, 11).stroke({ color: 0xFFD700, width: 1 })
  }, [])

  const drawBackground = useCallback((g: Graphics) => {
    g.clear()
    g.roundRect(-60, -38, 120, 78, 14).fill({ color: 0xFFFAF0, alpha: 0.92 })
    g.roundRect(-60, -38, 120, 78, 14).stroke({ color: 0xDEB887, width: 2 })
  }, [])

  return (
    <pixiContainer x={posX} y={posY} zIndex={100}>
      {/* Background panel */}
      <pixiGraphics draw={drawBackground} />

      {/* Bouncing egg icon at top */}
      <pixiGraphics draw={drawEggIcon} x={0} y={-22 + eggBounce} />

      {/* Sell button (left) */}
      <pixiContainer
        x={-26}
        y={10}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleSell}
      >
        <pixiGraphics draw={drawSellButton} />
        <pixiGraphics draw={drawCoinIcon} x={0} y={-6} />
        <pixiText
          text={`+${egg.reward}`}
          x={0}
          y={8}
          anchor={0.5}
          style={{ fontSize: 10, fontWeight: 'bold', fill: 0x8B6914, fontFamily: 'sans-serif' }}
        />
      </pixiContainer>

      {/* Hatch button (right) */}
      <pixiContainer
        x={26}
        y={10}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleHatch}
      >
        <pixiGraphics draw={drawHatchButton} />
        <pixiGraphics draw={drawChickIcon} x={0} y={-4} />
        <pixiText
          text="孵化"
          x={0}
          y={8}
          anchor={0.5}
          style={{ fontSize: 10, fontWeight: 'bold', fill: 0x3A7D2C, fontFamily: 'sans-serif' }}
        />
      </pixiContainer>
    </pixiContainer>
  )
}
