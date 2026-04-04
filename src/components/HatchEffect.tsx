import { useCallback } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics, Container } from 'pixi.js'
import { useRef } from 'react'

extend({ Graphics, Container })

/** Duration of the hatch effect in frames (~1.5s at 60fps) */
const HATCH_DURATION = 90

interface SparkleParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: number
  rotation: number
  rotSpeed: number
}

interface ShellPiece {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotSpeed: number
  width: number
  height: number
}

function createParticles(): SparkleParticle[] {
  const particles: SparkleParticle[] = []
  const colors = [0xffd700, 0xffec8b, 0xffffff, 0xfffacd, 0xffa500]
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const speed = 1.5 + Math.random() * 2.5
    particles.push({
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    })
  }
  return particles
}

function createShellPieces(): ShellPiece[] {
  const pieces: ShellPiece[] = []
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const speed = 2 + Math.random() * 2
    pieces.push({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      width: 6 + Math.random() * 6,
      height: 4 + Math.random() * 4,
    })
  }
  return pieces
}

interface HatchEffectProps {
  x: number
  y: number
  onComplete: () => void
}

export function HatchEffect({ x, y, onComplete }: HatchEffectProps) {
  const ageRef = useRef(0)
  const particlesRef = useRef<SparkleParticle[]>(createParticles())
  const shellsRef = useRef<ShellPiece[]>(createShellPieces())
  const completedRef = useRef(false)

  useTick((ticker) => {
    if (completedRef.current) return
    ageRef.current += ticker.deltaTime

    const dt = ticker.deltaTime
    for (const p of particlesRef.current) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.rotSpeed * dt
    }
    for (const s of shellsRef.current) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vy += 0.05 * dt // gravity
      s.rotation += s.rotSpeed * dt
    }

    if (ageRef.current >= HATCH_DURATION && !completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  })

  const progress = Math.min(ageRef.current / HATCH_DURATION, 1)
  const alpha = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1

  const drawEffect = useCallback(
    (g: Graphics) => {
      g.clear()

      // Draw shell pieces (cream colored, like egg)
      for (const s of shellsRef.current) {
        g.rect(s.x - s.width / 2, s.y - s.height / 2, s.width, s.height)
          .fill(0xfff8dc)
          .stroke({ width: 1, color: 0xddd8b0 })
      }

      // Draw sparkle particles as 4-pointed stars
      for (const p of particlesRef.current) {
        const s = p.size
        g.star(p.x, p.y, 4, s, s * 0.4, p.rotation).fill(p.color)
      }
    },
    // Re-draw every frame by depending on a changing value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ageRef.current],
  )

  return (
    <pixiContainer x={x} y={y} alpha={alpha}>
      <pixiGraphics draw={drawEffect} />
    </pixiContainer>
  )
}
