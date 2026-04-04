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

  // Animation state
  const animRef = useRef({ time: 0, dismissed: false })

  // Auto-dismiss timer
  const dismissTimerRef = useRef(egg.createdAt)

  useTick((ticker) => {
    animRef.current.time += ticker.deltaTime
    // Auto-dismiss after timeout (defaults to sell)
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

  // Bouncing egg icon
  const eggBounce = Math.sin(animRef.current.time * 0.15) * 4

  // Position above the chicken
  const posX = egg.x
  const posY = egg.y - 70

  const drawSellButton = useCallback(
    (g: Graphics) => {
      g.clear()
      // Golden circle background
      g.circle(0, 0, 20).fill({ color: 0xFFD700, alpha: 0.9 })
      g.circle(0, 0, 20).stroke({ color: 0xDAA520, width: 2 })
    },
    [],
  )

  const drawHatchButton = useCallback(
    (g: Graphics) => {
      g.clear()
      // Green circle background
      g.circle(0, 0, 20).fill({ color: 0x7EC850, alpha: 0.9 })
      g.circle(0, 0, 20).stroke({ color: 0x5A9E3A, width: 2 })
    },
    [],
  )

  const drawEggIcon = useCallback(
    (g: Graphics) => {
      g.clear()
      // Small egg shape
      g.ellipse(0, 0, 8, 11).fill(0xFFF8DC)
      g.ellipse(0, 0, 8, 11).stroke({ color: 0xFFD700, width: 1 })
    },
    [],
  )

  const drawBackground = useCallback(
    (g: Graphics) => {
      g.clear()
      // Rounded rect background panel
      g.roundRect(-55, -35, 110, 70, 12).fill({ color: 0xFFFAF0, alpha: 0.92 })
      g.roundRect(-55, -35, 110, 70, 12).stroke({ color: 0xDEB887, width: 2 })
    },
    [],
  )

  return (
    <pixiContainer x={posX} y={posY} zIndex={100}>
      {/* Background panel */}
      <pixiGraphics draw={drawBackground} />

      {/* Bouncing egg icon at top */}
      <pixiGraphics draw={drawEggIcon} x={0} y={-20 + eggBounce} />

      {/* Sell button (left) */}
      <pixiContainer
        x={-25}
        y={12}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleSell}
      >
        <pixiGraphics draw={drawSellButton} />
        <pixiText
          text={`+${egg.reward}`}
          x={0}
          y={-2}
          anchor={0.5}
          style={{ fontSize: 11, fontWeight: 'bold', fill: 0x8B6914 }}
        />
        <pixiText
          text="\uD83D\uDCB0"
          x={0}
          y={-14}
          anchor={0.5}
          style={{ fontSize: 12 }}
        />
      </pixiContainer>

      {/* Hatch button (right) */}
      <pixiContainer
        x={25}
        y={12}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleHatch}
      >
        <pixiGraphics draw={drawHatchButton} />
        <pixiText
          text="\uD83D\uDC23"
          x={0}
          y={-2}
          anchor={0.5}
          style={{ fontSize: 16 }}
        />
      </pixiContainer>

      {/* Labels below buttons */}
      <pixiText
        text="\u6362\u91D1\u5E01"
        x={-25}
        y={36}
        anchor={0.5}
        style={{ fontSize: 9, fill: 0x8B6914, fontWeight: 'bold' }}
      />
      <pixiText
        text="\u5B75\u5C0F\u9E21"
        x={25}
        y={36}
        anchor={0.5}
        style={{ fontSize: 9, fill: 0x3A7D2C, fontWeight: 'bold' }}
      />
    </pixiContainer>
  )
}
