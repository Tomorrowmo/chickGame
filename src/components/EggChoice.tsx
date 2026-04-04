import { useCallback, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import type { PendingEgg } from '../store/gameStore'
import { useGameStore } from '../store/gameStore'
import { pop, chirp } from '../systems/audio'

extend({ Graphics, Text, Container })

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
    pop()
    sellPendingEgg(egg.id)
  }, [sellPendingEgg, egg.id])

  const handleHatch = useCallback(() => {
    if (animRef.current.dismissed) return
    animRef.current.dismissed = true
    chirp()
    hatchPendingEgg(egg.id)
  }, [hatchPendingEgg, egg.id])

  const eggBounce = Math.sin(animRef.current.time * 0.15) * 5
  const posX = egg.x
  const posY = egg.y - 90

  // --- Draw functions ---

  const drawBackground = useCallback((g: Graphics) => {
    g.clear()
    // Main panel with warm shadow
    g.roundRect(-80, -50, 160, 100, 16).fill({ color: 0x000000, alpha: 0.1 })
    g.roundRect(-82, -52, 160, 100, 16).fill({ color: 0xFFFAF0, alpha: 0.95 })
    g.roundRect(-82, -52, 160, 100, 16).stroke({ color: 0xDEB887, width: 2.5 })
    // Title bar
    g.roundRect(-78, -48, 152, 22, 8).fill({ color: 0xFFF3CD, alpha: 0.8 })
  }, [])

  const drawEggIcon = useCallback((g: Graphics) => {
    g.clear()
    // Egg with glow
    g.circle(0, 0, 14).fill({ color: 0xFFD700, alpha: 0.15 })
    g.ellipse(0, 0, 10, 14).fill(0xFFF8DC)
    g.ellipse(0, 0, 10, 14).stroke({ color: 0xFFD700, width: 1.5 })
    // Spots
    g.circle(-3, -3, 2).fill({ color: 0xFFD700, alpha: 0.5 })
    g.circle(3, 2, 1.5).fill({ color: 0xFFD700, alpha: 0.4 })
  }, [])

  const drawSellButton = useCallback((g: Graphics) => {
    g.clear()
    // Rounded rect button
    g.roundRect(-30, -18, 60, 36, 10).fill({ color: 0xFFD700, alpha: 0.9 })
    g.roundRect(-30, -18, 60, 36, 10).stroke({ color: 0xDAA520, width: 2 })
    // Coin icon
    g.circle(0, -4, 8).fill(0xFFC107)
    g.circle(0, -4, 8).stroke({ color: 0xE6A800, width: 1.5 })
    g.circle(0, -4, 5).stroke({ color: 0xFFE082, width: 1, alpha: 0.6 })
  }, [])

  const drawHatchButton = useCallback((g: Graphics) => {
    g.clear()
    // Rounded rect button
    g.roundRect(-30, -18, 60, 36, 10).fill({ color: 0x81C784, alpha: 0.9 })
    g.roundRect(-30, -18, 60, 36, 10).stroke({ color: 0x4CAF50, width: 2 })
    // Egg cracking icon
    g.ellipse(0, -5, 7, 10).fill(0xFFF8DC)
    g.ellipse(0, -5, 7, 10).stroke({ color: 0xBDBDBD, width: 1 })
    // Crack line
    g.moveTo(-5, -5).lineTo(-1, -3).lineTo(-4, 0).lineTo(0, 2).stroke({ color: 0x795548, width: 1 })
  }, [])

  return (
    <pixiContainer x={posX} y={posY} zIndex={100}>
      {/* Background panel */}
      <pixiGraphics draw={drawBackground} />

      {/* Title text */}
      <pixiText
        text="下蛋啦！"
        x={-2}
        y={-42}
        anchor={0.5}
        style={{ fontSize: 13, fontWeight: 'bold', fill: 0xD4890E, fontFamily: 'sans-serif' }}
      />

      {/* Bouncing egg icon */}
      <pixiGraphics draw={drawEggIcon} x={0} y={-18 + eggBounce} />

      {/* Sell button (left) */}
      <pixiContainer
        x={-38}
        y={22}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleSell}
      >
        <pixiGraphics draw={drawSellButton} />
        <pixiText
          text={`+${egg.reward}`}
          x={0}
          y={10}
          anchor={0.5}
          style={{ fontSize: 11, fontWeight: 'bold', fill: 0x8B6914, fontFamily: 'sans-serif' }}
        />
      </pixiContainer>

      {/* Hatch button (right) */}
      <pixiContainer
        x={38}
        y={22}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleHatch}
      >
        <pixiGraphics draw={drawHatchButton} />
        <pixiText
          text="孵化"
          x={0}
          y={10}
          anchor={0.5}
          style={{ fontSize: 11, fontWeight: 'bold', fill: 0x1B5E20, fontFamily: 'sans-serif' }}
        />
      </pixiContainer>
    </pixiContainer>
  )
}
