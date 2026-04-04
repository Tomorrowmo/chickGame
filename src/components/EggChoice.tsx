import { useCallback, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import type { LaidEgg } from '../store/gameStore'
import { useGameStore } from '../store/gameStore'
import { pop, chirp } from '../systems/audio'

extend({ Graphics, Text, Container })

interface EggChoiceProps {
  egg: LaidEgg
  onClose: () => void
  onShowMessage: (text: string, x: number, y: number) => void
}

export function EggChoice({ egg, onClose, onShowMessage }: EggChoiceProps) {
  const sellLaidEgg = useGameStore((s) => s.sellLaidEgg)
  const hatchLaidEgg = useGameStore((s) => s.hatchLaidEgg)

  const animRef = useRef({ time: 0, dismissed: false })

  useTick((ticker) => {
    animRef.current.time += ticker.deltaTime
  })

  const handleSell = useCallback(() => {
    if (animRef.current.dismissed) return
    animRef.current.dismissed = true
    pop()
    sellLaidEgg(egg.id)
    onClose()
  }, [sellLaidEgg, egg.id, onClose])

  const handleHatch = useCallback(() => {
    if (animRef.current.dismissed) return
    animRef.current.dismissed = true
    chirp()
    hatchLaidEgg(egg.id)
    onClose()
    onShowMessage('长按蛋拖到鸡窝孵化!', egg.x, egg.y - 60)
  }, [hatchLaidEgg, egg.id, onClose, onShowMessage])

  const eggBounce = Math.sin(animRef.current.time * 0.15) * 3
  const posX = egg.x
  const posY = egg.y - 80

  // --- Draw functions ---

  const drawBackground = useCallback((g: Graphics) => {
    g.clear()
    // Shadow
    g.roundRect(-90, -45, 180, 90, 16).fill({ color: 0x000000, alpha: 0.1 })
    // Main panel
    g.roundRect(-92, -47, 180, 90, 16).fill({ color: 0xfffaf0, alpha: 0.95 })
    g.roundRect(-92, -47, 180, 90, 16).stroke({ color: 0xdeb887, width: 2.5 })
    // Title bar
    g.roundRect(-88, -43, 172, 22, 8).fill({ color: 0xfff3cd, alpha: 0.8 })
  }, [])

  const drawEggIcon = useCallback((g: Graphics) => {
    g.clear()
    g.circle(0, 0, 12).fill({ color: 0xffd700, alpha: 0.15 })
    g.ellipse(0, 0, 8, 12).fill(0xfff8dc)
    g.ellipse(0, 0, 8, 12).stroke({ color: 0xffd700, width: 1.5 })
    g.circle(-2, -2, 1.5).fill({ color: 0xffd700, alpha: 0.5 })
    g.circle(2, 1, 1).fill({ color: 0xffd700, alpha: 0.4 })
  }, [])

  const drawSellButton = useCallback((g: Graphics) => {
    g.clear()
    g.roundRect(-38, -18, 76, 36, 10).fill({ color: 0xffd700, alpha: 0.9 })
    g.roundRect(-38, -18, 76, 36, 10).stroke({ color: 0xdaa520, width: 2 })
    // Coin icon
    g.circle(-16, -2, 7).fill(0xffc107)
    g.circle(-16, -2, 7).stroke({ color: 0xe6a800, width: 1.5 })
    g.circle(-16, -2, 4).stroke({ color: 0xffe082, width: 1, alpha: 0.6 })
  }, [])

  const drawHatchButton = useCallback((g: Graphics) => {
    g.clear()
    g.roundRect(-38, -18, 76, 36, 10).fill({ color: 0x81c784, alpha: 0.9 })
    g.roundRect(-38, -18, 76, 36, 10).stroke({ color: 0x4caf50, width: 2 })
    // Nest icon (simple arc)
    g.arc(0, 2, 10, 0, Math.PI).fill(0x8d6e63)
    // Egg in nest
    g.ellipse(0, -2, 5, 7).fill(0xfff8dc)
    g.ellipse(0, -2, 5, 7).stroke({ color: 0xbdbdbd, width: 1 })
  }, [])

  return (
    <pixiContainer x={posX} y={posY + eggBounce} zIndex={200}>
      {/* Background panel */}
      <pixiGraphics draw={drawBackground} />

      {/* Title text */}
      <pixiText
        text="收获鸡蛋!"
        x={-2}
        y={-37}
        anchor={0.5}
        style={{ fontSize: 13, fontWeight: 'bold', fill: 0xd4890e, fontFamily: 'sans-serif' }}
      />

      {/* Bouncing egg icon */}
      <pixiGraphics draw={drawEggIcon} x={-2} y={-14 + eggBounce} />

      {/* Sell button (left) */}
      <pixiContainer
        x={-46}
        y={20}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleSell}
      >
        <pixiGraphics draw={drawSellButton} />
        <pixiText
          text={`+${egg.reward}`}
          x={6}
          y={-2}
          anchor={0.5}
          style={{ fontSize: 12, fontWeight: 'bold', fill: 0x8b6914, fontFamily: 'sans-serif' }}
        />
      </pixiContainer>

      {/* Hatch button (right) */}
      <pixiContainer
        x={46}
        y={20}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleHatch}
      >
        <pixiGraphics draw={drawHatchButton} />
        <pixiText
          text="放鸡窝"
          x={0}
          y={-2}
          anchor={0.5}
          style={{ fontSize: 11, fontWeight: 'bold', fill: 0x1b5e20, fontFamily: 'sans-serif' }}
        />
      </pixiContainer>
    </pixiContainer>
  )
}
