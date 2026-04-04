import { useCallback } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Text, Container } from 'pixi.js'
import { useClickEffectsStore, type ClickEffect } from '../systems/clickEffects'

extend({ Graphics, Text, Container })

/** Renders a single floating heart effect */
function HeartEffect({ effect }: { effect: ClickEffect }) {
  const progress = effect.age / effect.maxAge // 0 → 1
  const alpha = 1 - progress
  const yOffset = -progress * 40

  return (
    <pixiText
      text="❤️"
      x={effect.x}
      y={effect.y + yOffset}
      anchor={0.5}
      alpha={alpha}
      style={{ fontSize: 20 }}
    />
  )
}

/** Renders a sprouting flower effect */
function FlowerEffect({ effect }: { effect: ClickEffect }) {
  const progress = effect.age / effect.maxAge
  // Pop-up: scale springs from 0 to 1.2 then settles to 1
  const t = Math.min(progress * 4, 1) // quick pop over first 25% of life
  const scaleVal = t < 1 ? t * 1.2 : 1.0 + (1.0 - progress) * 0.2
  const alpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1

  const drawFlower = useCallback(
    (g: Graphics) => {
      g.clear()
      // Stem
      g.rect(-1, 0, 2, 12).fill(0x228b22)
      // Petals
      const petalColors = [0xff69b4, 0xff1493, 0xffb6c1, 0xff69b4, 0xff1493]
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5
        const px = Math.cos(angle) * 6
        const py = Math.sin(angle) * 6 - 2
        g.circle(px, py, 4).fill(petalColors[i])
      }
      // Center
      g.circle(0, -2, 3).fill(0xffff00)
    },
    [],
  )

  return (
    <pixiContainer x={effect.x} y={effect.y} scale={scaleVal} alpha={alpha}>
      <pixiGraphics draw={drawFlower} />
    </pixiContainer>
  )
}

/** Renders a drifting cloud effect */
function CloudEffect({ effect }: { effect: ClickEffect }) {
  const progress = effect.age / effect.maxAge
  const xOffset = progress * 60
  const alpha = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : Math.min(progress * 5, 1)

  const drawCloud = useCallback((g: Graphics) => {
    g.clear()
    g.circle(0, 0, 12).fill(0xffffff)
    g.circle(10, -3, 10).fill(0xffffff)
    g.circle(-10, -2, 9).fill(0xffffff)
    g.circle(5, 5, 8).fill(0xffffff)
  }, [])

  return (
    <pixiContainer x={effect.x + xOffset} y={effect.y} alpha={alpha}>
      <pixiGraphics draw={drawCloud} />
    </pixiContainer>
  )
}

/** Renders a butterfly effect */
function ButterflyEffect({ effect }: { effect: ClickEffect }) {
  const progress = effect.age / effect.maxAge
  // Drifting path with a slight sine wave
  const xOffset = Math.sin(effect.age * 0.1) * 30
  const yOffset = -progress * 50
  const alpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : Math.min(progress * 5, 1)

  const drawButterfly = useCallback(
    (g: Graphics) => {
      g.clear()
      // Wings - flapping via age
      const wingSpread = Math.abs(Math.sin(effect.age * 0.3)) * 6 + 2
      // Left wing
      g.ellipse(-wingSpread, 0, 5, 7).fill(0xff6eb4)
      // Right wing
      g.ellipse(wingSpread, 0, 5, 7).fill(0xff6eb4)
      // Body
      g.rect(-1, -4, 2, 8).fill(0x333333)
    },
    [effect.age],
  )

  return (
    <pixiContainer x={effect.x + xOffset} y={effect.y + yOffset} alpha={alpha}>
      <pixiGraphics draw={drawButterfly} />
    </pixiContainer>
  )
}

function EffectRenderer({ effect }: { effect: ClickEffect }) {
  switch (effect.type) {
    case 'heart':
      return <HeartEffect effect={effect} />
    case 'flower':
      return <FlowerEffect effect={effect} />
    case 'cloud':
      return <CloudEffect effect={effect} />
    case 'butterfly':
      return <ButterflyEffect effect={effect} />
  }
}

/** Ticks and renders all active click effects */
export function ClickEffects() {
  const effects = useClickEffectsStore((s) => s.effects)
  const tickEffects = useClickEffectsStore((s) => s.tickEffects)

  useTick((ticker) => {
    tickEffects(ticker.deltaTime)
  })

  return (
    <pixiContainer>
      {effects.map((effect) => (
        <EffectRenderer key={effect.id} effect={effect} />
      ))}
    </pixiContainer>
  )
}
