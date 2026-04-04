import { useCallback } from 'react'
import type { Graphics } from 'pixi.js'
import { useClickEffectsStore, type SwipeTrailParticle } from '../systems/clickEffects'

/** Renders a single sparkle/dust particle in the swipe trail */
function TrailParticle({ particle }: { particle: SwipeTrailParticle }) {
  const progress = particle.age / particle.maxAge
  const alpha = 1 - progress
  const size = 4 * (1 - progress * 0.6)

  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      // Sparkle: small golden circle with a white highlight
      g.circle(0, 0, size).fill({ color: 0xffd700, alpha: alpha * 0.8 })
      g.circle(-1, -1, size * 0.4).fill({ color: 0xffffff, alpha: alpha * 0.5 })
    },
    [size, alpha],
  )

  return <pixiGraphics x={particle.x} y={particle.y} draw={draw} />
}

/** Renders the swipe trail sparkles */
export function SwipeTrail() {
  const trail = useClickEffectsStore((s) => s.swipeTrail)

  if (trail.length === 0) return null

  return (
    <pixiContainer zIndex={5}>
      {trail.map((p) => (
        <TrailParticle key={p.id} particle={p} />
      ))}
    </pixiContainer>
  )
}
