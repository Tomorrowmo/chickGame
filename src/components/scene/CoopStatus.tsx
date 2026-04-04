import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import { COOP_POSITIONS } from './Coop'
import { useGameStore } from '../../store/gameStore'

extend({ Graphics, Text, Container })

function CoopStatusCard({ x, y, eggCount, chickCount }: { x: number; y: number; eggCount: number; chickCount: number }) {
  const drawBg = useCallback(
    (g: Graphics) => {
      g.clear()
      // Card background
      g.roundRect(-28, -12, 56, 24, 8).fill({ color: 0x000000, alpha: 0.35 })
      g.roundRect(-28, -12, 56, 24, 8).stroke({ color: 0xffffff, width: 1, alpha: 0.3 })
    },
    [],
  )

  // Draw a small egg icon
  const drawEggIcon = useCallback((g: Graphics) => {
    g.clear()
    g.ellipse(0, 0, 4, 6).fill(0xfff8dc)
    g.ellipse(0, 0, 4, 6).stroke({ color: 0xdaa520, width: 1 })
  }, [])

  // Draw a small chick icon
  const drawChickIcon = useCallback((g: Graphics) => {
    g.clear()
    // Body
    g.circle(0, 2, 5).fill(0xffd700)
    // Head
    g.circle(0, -4, 3.5).fill(0xffd700)
    // Beak
    g.poly([3, -4, 6, -3.5, 3, -3]).fill(0xff8c00)
    // Eye
    g.circle(1, -5, 1).fill(0x000000)
  }, [])

  if (eggCount === 0 && chickCount === 0) return null

  return (
    <pixiContainer x={x} y={y - 75} zIndex={40}>
      <pixiGraphics draw={drawBg} />
      {/* Egg count (left side) */}
      <pixiGraphics draw={drawEggIcon} x={-16} y={0} />
      <pixiText
        text={`${eggCount}`}
        x={-6}
        y={0}
        anchor={{ x: 0, y: 0.5 }}
        style={{ fontSize: 11, fontWeight: 'bold', fill: 0xffffff, fontFamily: 'sans-serif' }}
      />
      {/* Chick count (right side) */}
      <pixiGraphics draw={drawChickIcon} x={10} y={0} />
      <pixiText
        text={`${chickCount}`}
        x={20}
        y={0}
        anchor={{ x: 0, y: 0.5 }}
        style={{ fontSize: 11, fontWeight: 'bold', fill: 0xffffff, fontFamily: 'sans-serif' }}
      />
    </pixiContainer>
  )
}

export function CoopStatus() {
  const chicks = useGameStore((s) => s.chicks)

  return (
    <>
      {COOP_POSITIONS.map((coop) => {
        const eggCount = chicks.filter(
          (c) => c.inCoop && c.coopType === coop.type && (c.stage === 'egg' || c.stage === 'hatching'),
        ).length
        const chickCount = chicks.filter(
          (c) =>
            c.rarity === coop.type &&
            c.stage !== 'egg' &&
            c.stage !== 'hatching',
        ).length
        return (
          <CoopStatusCard
            key={coop.type}
            x={coop.x}
            y={coop.y}
            eggCount={eggCount}
            chickCount={chickCount}
          />
        )
      })}
    </>
  )
}
