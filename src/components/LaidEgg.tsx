import { useCallback, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Container } from 'pixi.js'
import type { LaidEgg as LaidEggData } from '../store/gameStore'

extend({ Graphics, Container })

const LAID_EGG_LIFETIME_MS = 30000

const RARITY_COLORS: Record<string, { shell: number; spot: number; glow: number }> = {
  common: { shell: 0xfff8dc, spot: 0xdaa520, glow: 0xffd700 },
  special: { shell: 0xffe4e1, spot: 0xff69b4, glow: 0xff69b4 },
  rare: { shell: 0xe0f0ff, spot: 0x87ceeb, glow: 0x00bfff },
}

interface LaidEggProps {
  egg: LaidEggData
  onClick: (eggId: string) => void
}

export function LaidEgg({ egg, onClick }: LaidEggProps) {
  const animRef = useRef({ time: 0 })

  useTick((ticker) => {
    animRef.current.time += ticker.deltaTime
  })

  const elapsed = Date.now() - egg.createdAt
  const remaining = Math.max(0, 1 - elapsed / LAID_EGG_LIFETIME_MS)
  const colors = RARITY_COLORS[egg.rarity] ?? RARITY_COLORS.common

  // Wobble animation
  const wobble = Math.sin(animRef.current.time * 0.08) * 0.06

  // Fade as time runs out (start fading at 20% remaining)
  const alpha = remaining < 0.2 ? remaining / 0.2 : 1

  const handleClick = useCallback(() => {
    onClick(egg.id)
  }, [onClick, egg.id])

  // Draw the egg shape
  const drawEgg = useCallback(
    (g: Graphics) => {
      g.clear()
      // Glow/pulse
      const pulseSize = 1 + Math.sin(animRef.current.time * 0.1) * 0.15
      g.ellipse(0, 0, 14 * pulseSize, 8 * pulseSize).fill({
        color: colors.glow,
        alpha: 0.15 * alpha,
      })
      // Shadow
      g.ellipse(0, 10, 12, 4).fill({ color: 0x000000, alpha: 0.15 * alpha })
      // Egg body
      g.ellipse(0, 0, 10, 14).fill({ color: colors.shell, alpha: alpha })
      g.ellipse(0, 0, 10, 14).stroke({ color: colors.spot, width: 1.5, alpha: alpha })
      // Spots
      g.circle(-3, -4, 2).fill({ color: colors.spot, alpha: 0.5 * alpha })
      g.circle(4, 1, 1.5).fill({ color: colors.spot, alpha: 0.4 * alpha })
      g.circle(-1, 5, 1.5).fill({ color: colors.spot, alpha: 0.3 * alpha })
    },
    [colors, alpha],
  )

  // Draw countdown ring (pie chart)
  const drawTimerRing = useCallback(
    (g: Graphics) => {
      g.clear()
      if (remaining <= 0) return
      const radius = 18
      // Background ring
      g.circle(0, 0, radius).stroke({ color: 0x000000, alpha: 0.1, width: 3 })
      // Remaining arc
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + remaining * Math.PI * 2
      // Draw filled arc
      g.moveTo(0, 0)
      g.arc(0, 0, radius, startAngle, endAngle)
      g.lineTo(0, 0)
      const timerColor = remaining > 0.3 ? 0x4caf50 : remaining > 0.15 ? 0xff9800 : 0xf44336
      g.fill({ color: timerColor, alpha: 0.25 * alpha })
      g.moveTo(0, 0)
      g.arc(0, 0, radius, startAngle, endAngle)
      g.lineTo(0, 0)
      g.stroke({ color: timerColor, alpha: 0.6 * alpha, width: 2 })
    },
    [remaining, alpha],
  )

  return (
    <pixiContainer
      x={egg.x}
      y={egg.y}
      rotation={wobble}
      zIndex={50}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    >
      <pixiGraphics draw={drawTimerRing} />
      <pixiGraphics draw={drawEgg} />
    </pixiContainer>
  )
}
