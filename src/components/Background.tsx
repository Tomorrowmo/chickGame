import { useCallback, useMemo } from 'react'
import { Graphics } from 'pixi.js'
import { useGameStore } from '../store/gameStore'
import { getSkyColor, getGrassColor, getGrassStripColor } from '../systems/timeSystem'

interface BackgroundProps {
  width: number
  height: number
}

/** Pre-generate stable random positions for paper texture dots */
function generateNoiseDots(count: number, w: number, h: number, seed: number) {
  const dots: { x: number; y: number; r: number; a: number }[] = []
  // Simple seeded pseudo-random
  let s = seed
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 0x7fffffff }
  for (let i = 0; i < count; i++) {
    dots.push({
      x: rand() * w,
      y: rand() * h,
      r: 0.5 + rand() * 1.2,
      a: 0.015 + rand() * 0.03,
    })
  }
  return dots
}

/** Pre-generate wheat cluster positions */
function generateWheatClusters(count: number, w: number, h: number, seed: number) {
  const clusters: { x: number; y: number; s: number }[] = []
  let st = seed
  const rand = () => { st = (st * 16807 + 0) % 2147483647; return (st & 0x7fffffff) / 0x7fffffff }
  for (let i = 0; i < count; i++) {
    clusters.push({
      x: rand() * w,
      y: h * 0.62 + rand() * (h * 0.32),
      s: 0.6 + rand() * 0.6,
    })
  }
  return clusters
}

/** Pre-generate grass tufts */
function generateGrassTufts(count: number, w: number, h: number, seed: number) {
  const tufts: { x: number; y: number; s: number }[] = []
  let st = seed
  const rand = () => { st = (st * 16807 + 0) % 2147483647; return (st & 0x7fffffff) / 0x7fffffff }
  for (let i = 0; i < count; i++) {
    tufts.push({
      x: rand() * w,
      y: h * 0.6 + rand() * (h * 0.38),
      s: 0.5 + rand() * 0.7,
    })
  }
  return tufts
}

export function Background({ width, height }: BackgroundProps) {
  const gameTime = useGameStore((s) => s.gameTime)

  const skyColor = getSkyColor(gameTime)
  const grassColor = getGrassColor(gameTime)
  const grassStripColor = getGrassStripColor(gameTime)

  // Stable pre-generated random data
  const noiseDots = useMemo(() => generateNoiseDots(300, width, height, 42), [width, height])
  const wheatClusters = useMemo(() => generateWheatClusters(18, width, height, 137), [width, height])
  const grassTufts = useMemo(() => generateGrassTufts(35, width, height, 271), [width, height])

  const drawGround = useCallback(
    (g: Graphics) => {
      g.clear()

      // --- Carmela-style painterly sky with warm watercolor bands ---
      // Base sky (shifted warmer: toward teal)
      g.rect(0, 0, width, height * 0.6).fill(skyColor)

      // Overlapping semi-transparent gradient bands
      // Upper sky: cool blue wash
      g.rect(0, 0, width, height * 0.2).fill({ color: 0x8ec8d8, alpha: 0.12 })
      // Mid sky: warm golden haze
      g.rect(0, height * 0.12, width, height * 0.18).fill({ color: 0xffefd5, alpha: 0.1 })
      // Horizon band: pink/orange glow (Carmela sunset warmth)
      g.rect(0, height * 0.38, width, height * 0.12).fill({ color: 0xffb088, alpha: 0.15 })
      g.rect(0, height * 0.42, width, height * 0.1).fill({ color: 0xffc0a0, alpha: 0.1 })
      // Very subtle amber wash across whole sky
      g.rect(0, height * 0.25, width, height * 0.2).fill({ color: 0xf5d8a0, alpha: 0.06 })

      // --- Paper texture: many tiny dots for subtle noise ---
      for (const dot of noiseDots) {
        g.circle(dot.x, dot.y, dot.r).fill({ color: 0x8b7d6b, alpha: dot.a })
      }

      // --- Distant tree silhouettes on horizon ---
      const treePositions = [0.08, 0.18, 0.32, 0.48, 0.62, 0.78, 0.9]
      for (const tx of treePositions) {
        const treeX = width * tx
        const treeY = height * 0.54
        const treeH = 30 + (tx * 20) % 15
        // Trunk
        g.rect(treeX - 2, treeY - treeH * 0.4, 4, treeH * 0.5).fill({ color: 0x5a4a3a, alpha: 0.3 })
        // Round canopy (imperfect, slightly wonky)
        g.circle(treeX + 1, treeY - treeH * 0.55, 10 + (tx * 40) % 8).fill({ color: 0x4a6a2a, alpha: 0.3 })
        g.circle(treeX - 4, treeY - treeH * 0.45, 7 + (tx * 30) % 6).fill({ color: 0x3d5a22, alpha: 0.25 })
      }

      // --- Rolling hills (Carmela storybook, warm olive greens) ---
      // Far hill (sage/olive tone)
      g.moveTo(0, height * 0.58)
      g.bezierCurveTo(width * 0.12, height * 0.51, width * 0.28, height * 0.56, width * 0.42, height * 0.53)
      g.bezierCurveTo(width * 0.56, height * 0.50, width * 0.72, height * 0.55, width * 0.85, height * 0.52)
      g.bezierCurveTo(width * 0.92, height * 0.54, width * 0.98, height * 0.56, width, height * 0.55)
      g.lineTo(width, height)
      g.lineTo(0, height)
      g.closePath()
      g.fill(0x6b8a3a)

      // Second far hill (overlapping, darker olive)
      g.moveTo(0, height * 0.56)
      g.bezierCurveTo(width * 0.2, height * 0.54, width * 0.35, height * 0.58, width * 0.5, height * 0.55)
      g.bezierCurveTo(width * 0.7, height * 0.53, width * 0.9, height * 0.57, width, height * 0.56)
      g.lineTo(width, height)
      g.lineTo(0, height)
      g.closePath()
      g.fill({ color: 0x5d7a32, alpha: 0.5 })

      // Middle hill (base grass, warm green)
      g.moveTo(0, height * 0.6)
      g.bezierCurveTo(width * 0.08, height * 0.57, width * 0.22, height * 0.62, width * 0.38, height * 0.58)
      g.bezierCurveTo(width * 0.52, height * 0.55, width * 0.68, height * 0.61, width * 0.82, height * 0.57)
      g.bezierCurveTo(width * 0.92, height * 0.59, width * 0.98, height * 0.6, width, height * 0.58)
      g.lineTo(width, height)
      g.lineTo(0, height)
      g.closePath()
      g.fill(grassColor)

      // Near foreground grass (warmer, lighter olive)
      g.moveTo(0, height * 0.75)
      g.bezierCurveTo(width * 0.15, height * 0.71, width * 0.35, height * 0.76, width * 0.55, height * 0.72)
      g.bezierCurveTo(width * 0.75, height * 0.69, width * 0.9, height * 0.74, width, height * 0.72)
      g.lineTo(width, height)
      g.lineTo(0, height)
      g.closePath()
      g.fill(0x8fb85a)

      // Horizon depth strip
      g.rect(0, height * 0.57, width, 4).fill({ color: grassStripColor, alpha: 0.4 })

      // --- Red barn silhouette on horizon (rustic red) ---
      const barnX = width * 0.82
      const barnY = height * 0.52
      // Barn body
      g.rect(barnX - 22, barnY - 20, 44, 24).fill({ color: 0xa52a2a, alpha: 0.55 })
      // Barn roof (hand-drawn feel: slightly asymmetric)
      g.poly([barnX - 26, barnY - 20, barnX + 1, barnY - 36, barnX + 27, barnY - 20]).fill({ color: 0x7b1a1a, alpha: 0.55 })
      // Barn door
      g.rect(barnX - 6, barnY - 9, 12, 13).fill({ color: 0x3e2723, alpha: 0.45 })
      // Silo
      g.rect(barnX + 24, barnY - 28, 9, 32).fill({ color: 0x8b3a3a, alpha: 0.45 })
      g.circle(barnX + 28.5, barnY - 28, 4.5).fill({ color: 0x8b3a3a, alpha: 0.45 })

      // --- Winding dirt path (more visible, warm amber) ---
      g.moveTo(width * 0.13, height)
      g.bezierCurveTo(width * 0.18, height * 0.84, width * 0.32, height * 0.77, width * 0.43, height * 0.71)
      g.bezierCurveTo(width * 0.53, height * 0.65, width * 0.58, height * 0.69, width * 0.68, height * 0.64)
      g.bezierCurveTo(width * 0.78, height * 0.59, width * 0.86, height * 0.61, width * 0.91, height * 0.57)
      g.lineTo(width * 0.96, height * 0.57)
      g.bezierCurveTo(width * 0.91, height * 0.63, width * 0.84, height * 0.63, width * 0.73, height * 0.67)
      g.bezierCurveTo(width * 0.63, height * 0.72, width * 0.56, height * 0.68, width * 0.46, height * 0.74)
      g.bezierCurveTo(width * 0.36, height * 0.8, width * 0.22, height * 0.87, width * 0.21, height)
      g.closePath()
      g.fill({ color: 0xc9956a, alpha: 0.55 })
      // Path edge highlight
      g.moveTo(width * 0.16, height)
      g.bezierCurveTo(width * 0.2, height * 0.85, width * 0.34, height * 0.78, width * 0.44, height * 0.72)
      g.stroke({ color: 0xb8865c, width: 1.5, alpha: 0.35 })
      // Inner path texture dots
      g.moveTo(width * 0.19, height)
      g.bezierCurveTo(width * 0.22, height * 0.86, width * 0.35, height * 0.79, width * 0.45, height * 0.73)
      g.stroke({ color: 0xdab088, width: 1, alpha: 0.2 })

      // --- Wheat field patches (golden clusters) ---
      for (const wc of wheatClusters) {
        const ws = wc.s
        // Each wheat cluster: 3-5 golden stalks
        for (let j = -2; j <= 2; j++) {
          const sx = wc.x + j * 3 * ws
          const sh = 12 * ws + Math.abs(j) * 2
          // Stalk
          g.moveTo(sx, wc.y).lineTo(sx + j * 0.5, wc.y - sh).stroke({ color: 0xc8a84e, width: 1, alpha: 0.6 })
          // Wheat head (small ellipse at top)
          g.ellipse(sx + j * 0.5, wc.y - sh - 2 * ws, 1.5 * ws, 3 * ws).fill({ color: 0xdab86a, alpha: 0.7 })
        }
      }

      // --- Grass tufts scattered across ground ---
      for (const tuft of grassTufts) {
        const ts = tuft.s
        // 2-3 blades of grass
        g.moveTo(tuft.x, tuft.y).lineTo(tuft.x - 3 * ts, tuft.y - 8 * ts).stroke({ color: 0x5a8a30, width: 1.2, alpha: 0.4 })
        g.moveTo(tuft.x, tuft.y).lineTo(tuft.x + 1 * ts, tuft.y - 10 * ts).stroke({ color: 0x6a9a3a, width: 1, alpha: 0.45 })
        g.moveTo(tuft.x, tuft.y).lineTo(tuft.x + 4 * ts, tuft.y - 7 * ts).stroke({ color: 0x5a8a30, width: 1.2, alpha: 0.35 })
      }
    },
    [width, height, skyColor, grassColor, grassStripColor, noiseDots, wheatClusters, grassTufts],
  )

  return <pixiGraphics draw={drawGround} />
}
