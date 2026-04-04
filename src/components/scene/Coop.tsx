import { useCallback } from 'react'
import { Graphics } from 'pixi.js'
import type { CoopType } from '../../types/chick'

/** Multi-coop positions — used by AI for night behavior and egg placement */
export interface CoopInfo {
  type: CoopType
  x: number
  y: number
  label: string
}

export const COOP_POSITIONS: CoopInfo[] = [
  { type: 'common', x: 180, y: 730, label: '普通鸡舍' },
  { type: 'special', x: 720, y: 800, label: '花园鸡舍' },
  { type: 'rare', x: 1200, y: 750, label: '水晶鸡舍' },
]

/** Legacy export for compatibility */
export const COOP_POSITION = COOP_POSITIONS[0]

/** Get coop info by type */
export function getCoopByType(type: CoopType): CoopInfo {
  return COOP_POSITIONS.find((c) => c.type === type) ?? COOP_POSITIONS[0]
}

/** Check if a position is near any coop, returns the coop type or null */
export function findNearestCoop(x: number, y: number, maxDist = 60): CoopInfo | null {
  for (const coop of COOP_POSITIONS) {
    const dx = x - coop.x
    const dy = y - coop.y
    if (Math.sqrt(dx * dx + dy * dy) < maxDist) {
      return coop
    }
  }
  return null
}

function CommonCoop() {
  const draw = useCallback((g: Graphics) => {
    g.clear()
    const S = 2

    // Base / floor
    g.rect(-40 * S, 10 * S, 80 * S, 8 * S).fill(0xc8a24e)

    // Wooden walls
    g.rect(-35 * S, -25 * S, 70 * S, 35 * S).fill(0xb5651d)
    // Planks
    g.rect(-35 * S, -15 * S, 70 * S, 3 * S).fill(0x9e5418)
    g.rect(-35 * S, -5 * S, 70 * S, 3 * S).fill(0x9e5418)

    // Door
    g.rect(-14 * S, -18 * S, 28 * S, 38 * S).fill(0x3e2723)

    // Roof
    g.poly([-45 * S, -25 * S, 0, -50 * S, 45 * S, -25 * S]).fill(0xa0522d)
    g.poly([-45 * S, -25 * S, 0, -50 * S, 45 * S, -25 * S]).stroke({ color: 0x8b4513, width: 2 * S })

    // Straw
    g.moveTo(-30 * S, -35 * S).lineTo(-25 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })
    g.moveTo(-10 * S, -42 * S).lineTo(-5 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })
    g.moveTo(10 * S, -42 * S).lineTo(15 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })
    g.moveTo(30 * S, -35 * S).lineTo(25 * S, -25 * S).stroke({ color: 0xdaa520, width: 1 * S, alpha: 0.6 })

    // Hay at base
    for (let i = -30 * S; i <= 30 * S; i += 8 * S) {
      g.moveTo(i, 10 * S).lineTo(i + 3 * S, 15 * S).stroke({ color: 0xdaa520, width: 1.5 * S })
      g.moveTo(i + 4 * S, 10 * S).lineTo(i + 1 * S, 14 * S).stroke({ color: 0xc8a24e, width: 1 * S })
    }

    // Window
    g.rect(-28 * S, -20 * S, 10 * S, 8 * S).fill(0x87ceeb)
    g.rect(-28 * S, -20 * S, 10 * S, 8 * S).stroke({ color: 0x8b4513, width: 1 * S })
  }, [])

  const drawSign = useCallback((g: Graphics) => {
    g.clear()
    // Signpost
    g.rect(-2, -40, 4, 40).fill(0xd4a574)
    // Sign board
    g.rect(-30, -50, 60, 18).fill(0xd4a574)
    g.rect(-30, -50, 60, 18).stroke({ color: 0x8b4513, width: 1 })
  }, [])

  return (
    <>
      <pixiGraphics draw={draw} x={180} y={730} />
      <pixiGraphics draw={drawSign} x={220} y={720} />
      <pixiText
        text="普通鸡舍"
        x={220}
        y={678}
        anchor={0.5}
        style={{ fontSize: 11, fontWeight: 'bold', fill: 0x5d4037, fontFamily: 'sans-serif' }}
      />
    </>
  )
}

function GardenCoop() {
  const draw = useCallback((g: Graphics) => {
    g.clear()
    const S = 2

    // Base with flower border
    g.rect(-40 * S, 10 * S, 80 * S, 8 * S).fill(0xc8a24e)

    // Walls — lighter warm wood
    g.rect(-35 * S, -25 * S, 70 * S, 35 * S).fill(0xd4956a)
    // Plank lines
    g.rect(-35 * S, -15 * S, 70 * S, 3 * S).fill(0xc07850)
    g.rect(-35 * S, -5 * S, 70 * S, 3 * S).fill(0xc07850)

    // Door with flower arch
    g.rect(-14 * S, -18 * S, 28 * S, 38 * S).fill(0x3e2723)

    // Roof — green garden roof
    g.poly([-45 * S, -25 * S, 0, -50 * S, 45 * S, -25 * S]).fill(0x6b9a3a)
    g.poly([-45 * S, -25 * S, 0, -50 * S, 45 * S, -25 * S]).stroke({ color: 0x4a7a2a, width: 2 * S })

    // Flowers on roof
    const flowerColors = [0xff69b4, 0xff6347, 0xffd700, 0xff69b4, 0xffb6c1]
    for (let i = 0; i < 5; i++) {
      const fx = (-30 + i * 15) * S
      const fy = -38 * S + Math.abs(i - 2) * 3 * S
      g.circle(fx, fy, 4 * S).fill(flowerColors[i])
      g.circle(fx, fy, 2 * S).fill(0xffffff)
    }

    // Flower pots at base
    g.rect(-38 * S, 5 * S, 10 * S, 8 * S).fill(0xcd853f)
    g.circle(-33 * S, 2 * S, 4 * S).fill(0xff69b4)
    g.rect(28 * S, 5 * S, 10 * S, 8 * S).fill(0xcd853f)
    g.circle(33 * S, 2 * S, 4 * S).fill(0xffd700)

    // Window with flower box
    g.rect(18 * S, -20 * S, 12 * S, 8 * S).fill(0x87ceeb)
    g.rect(18 * S, -20 * S, 12 * S, 8 * S).stroke({ color: 0x8b4513, width: 1 * S })
    g.rect(17 * S, -12 * S, 14 * S, 4 * S).fill(0xcd853f)
    g.circle(21 * S, -14 * S, 3 * S).fill(0xff6347)
    g.circle(27 * S, -14 * S, 3 * S).fill(0xffb6c1)

    // Hay at base
    for (let i = -30 * S; i <= 30 * S; i += 8 * S) {
      g.moveTo(i, 10 * S).lineTo(i + 3 * S, 15 * S).stroke({ color: 0xdaa520, width: 1.5 * S })
    }
  }, [])

  const drawSign = useCallback((g: Graphics) => {
    g.clear()
    g.rect(-2, -40, 4, 40).fill(0xd4a574)
    g.rect(-30, -50, 60, 18).fill(0xd4a574)
    g.rect(-30, -50, 60, 18).stroke({ color: 0x6b9a3a, width: 1.5 })
    // Small flower on sign
    g.circle(22, -41, 4).fill(0xff69b4)
    g.circle(22, -41, 2).fill(0xffffff)
  }, [])

  return (
    <>
      <pixiGraphics draw={draw} x={720} y={800} />
      <pixiGraphics draw={drawSign} x={760} y={790} />
      <pixiText
        text="花园鸡舍"
        x={760}
        y={748}
        anchor={0.5}
        style={{ fontSize: 11, fontWeight: 'bold', fill: 0x4a7a2a, fontFamily: 'sans-serif' }}
      />
    </>
  )
}

function CrystalCoop() {
  const draw = useCallback((g: Graphics) => {
    g.clear()
    const S = 2

    // Base — crystal platform
    g.rect(-40 * S, 10 * S, 80 * S, 8 * S).fill({ color: 0xb0c4de, alpha: 0.8 })

    // Walls — crystal/ice blue
    g.rect(-35 * S, -25 * S, 70 * S, 35 * S).fill({ color: 0xadd8e6, alpha: 0.7 })
    // Shimmer lines
    g.rect(-35 * S, -18 * S, 70 * S, 2 * S).fill({ color: 0xffffff, alpha: 0.3 })
    g.rect(-35 * S, -8 * S, 70 * S, 2 * S).fill({ color: 0xffffff, alpha: 0.3 })
    g.rect(-35 * S, 2 * S, 70 * S, 2 * S).fill({ color: 0xffffff, alpha: 0.3 })

    // Door — darker crystal
    g.rect(-14 * S, -18 * S, 28 * S, 38 * S).fill({ color: 0x4169e1, alpha: 0.5 })

    // Roof — pointed crystal shape
    g.poly([-45 * S, -25 * S, -15 * S, -55 * S, 0, -45 * S, 15 * S, -55 * S, 45 * S, -25 * S])
      .fill({ color: 0x87ceeb, alpha: 0.8 })
    g.poly([-45 * S, -25 * S, -15 * S, -55 * S, 0, -45 * S, 15 * S, -55 * S, 45 * S, -25 * S])
      .stroke({ color: 0xffffff, width: 2 * S, alpha: 0.6 })

    // Crystal sparkles
    const sparklePositions = [
      { x: -25 * S, y: -45 * S }, { x: 25 * S, y: -45 * S },
      { x: 0, y: -40 * S }, { x: -30 * S, y: -10 * S },
      { x: 30 * S, y: -15 * S }, { x: -20 * S, y: 5 * S },
      { x: 20 * S, y: 0 },
    ]
    for (const sp of sparklePositions) {
      g.circle(sp.x, sp.y, 2 * S).fill({ color: 0xffffff, alpha: 0.9 })
      // Small cross sparkle
      g.moveTo(sp.x - 3 * S, sp.y).lineTo(sp.x + 3 * S, sp.y).stroke({ color: 0xffffff, width: 1, alpha: 0.6 })
      g.moveTo(sp.x, sp.y - 3 * S).lineTo(sp.x, sp.y + 3 * S).stroke({ color: 0xffffff, width: 1, alpha: 0.6 })
    }

    // Crystal window
    g.poly([-28 * S, -20 * S, -23 * S, -26 * S, -18 * S, -20 * S, -23 * S, -14 * S])
      .fill({ color: 0xe0f0ff, alpha: 0.8 })
    g.poly([-28 * S, -20 * S, -23 * S, -26 * S, -18 * S, -20 * S, -23 * S, -14 * S])
      .stroke({ color: 0xffffff, width: 1 * S, alpha: 0.5 })
  }, [])

  const drawSign = useCallback((g: Graphics) => {
    g.clear()
    g.rect(-2, -40, 4, 40).fill({ color: 0xb0c4de, alpha: 0.8 })
    // Diamond-shaped sign
    g.poly([-25, -41, 0, -55, 25, -41, 0, -27]).fill({ color: 0xadd8e6, alpha: 0.8 })
    g.poly([-25, -41, 0, -55, 25, -41, 0, -27]).stroke({ color: 0xffffff, width: 1, alpha: 0.6 })
  }, [])

  return (
    <>
      <pixiGraphics draw={draw} x={1200} y={750} />
      <pixiGraphics draw={drawSign} x={1240} y={740} />
      <pixiText
        text="水晶鸡舍"
        x={1240}
        y={693}
        anchor={0.5}
        style={{ fontSize: 11, fontWeight: 'bold', fill: 0x4169e1, fontFamily: 'sans-serif' }}
      />
    </>
  )
}

export function Coop() {
  return (
    <>
      <CommonCoop />
      <GardenCoop />
      <CrystalCoop />
    </>
  )
}
