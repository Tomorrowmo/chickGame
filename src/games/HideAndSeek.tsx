import { useState, useCallback, useEffect, useRef } from 'react'
import { Graphics } from 'pixi.js'
import { BUSH_POSITIONS } from '../components/scene/Bush'
import { useGameStore } from '../store/gameStore'
import { gameStart, gameWin, gameLose } from '../systems/audio'
import type { GamePhase } from './GameOverlay'

/** A chick hidden behind a bush */
interface HiddenChick {
  id: number
  bushIndex: number
  /** Offset from the bush center where the peek shape appears */
  peekOffsetX: number
  peekOffsetY: number
  /** Which part peeks out: 'head' (top) or 'tail' (side) */
  peekType: 'head' | 'tail'
  found: boolean
  /** Animation progress when found (0..1) */
  foundAnim: number
}

const GAME_DURATION = 30
const NUM_CHICKS = 5 // will be clamped to available bushes * 2 max
const PEEK_HIT_RADIUS = 18

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateHiddenChicks(): HiddenChick[] {
  const count = Math.min(NUM_CHICKS, BUSH_POSITIONS.length * 2)
  const chicks: HiddenChick[] = []

  // Distribute chicks across bushes, max 2 per bush
  const bushIndices: number[] = []
  for (let b = 0; b < BUSH_POSITIONS.length; b++) {
    bushIndices.push(b, b) // each bush can hold 2
  }
  const shuffled = shuffleArray(bushIndices).slice(0, count)

  // Track how many chicks are placed at each bush for offset variety
  const bushCount: Record<number, number> = {}

  for (let i = 0; i < count; i++) {
    const bi = shuffled[i]
    const bush = BUSH_POSITIONS[bi]
    const s = bush.scale
    bushCount[bi] = (bushCount[bi] || 0) + 1
    const slot = bushCount[bi]

    const isHead = slot === 1 // first chick peeks head, second peeks tail
    const peekType: 'head' | 'tail' = isHead ? 'head' : 'tail'

    let peekOffsetX: number
    let peekOffsetY: number
    if (peekType === 'head') {
      // Peek from top of bush
      peekOffsetX = (Math.random() - 0.5) * 14 * s
      peekOffsetY = -30 * s + Math.random() * 4
    } else {
      // Peek from side
      const side = Math.random() < 0.5 ? -1 : 1
      peekOffsetX = side * (28 * s + Math.random() * 6)
      peekOffsetY = (Math.random() - 0.5) * 12 * s
    }

    chicks.push({
      id: i,
      bushIndex: bi,
      peekOffsetX,
      peekOffsetY,
      peekType,
      found: false,
      foundAnim: 0,
    })
  }

  return chicks
}

/** Pixi component: draws the peeking shapes and found-chick animations */
function HiddenChickSprite({
  chick,
  onClick,
}: {
  chick: HiddenChick
  onClick: (id: number) => void
}) {
  const bush = BUSH_POSITIONS[chick.bushIndex]
  const cx = bush.x + chick.peekOffsetX
  const cy = bush.y + chick.peekOffsetY

  const drawPeek = useCallback(
    (g: Graphics) => {
      g.clear()
      if (chick.found) return // don't draw peek when found

      if (chick.peekType === 'head') {
        // Small yellow circle (head) with tiny orange beak
        g.circle(0, 0, 7).fill(0xfdd835)
        g.circle(0, -8, 5).fill(0xfdd835) // top of head
        // tiny beak
        g.moveTo(4, 0).lineTo(9, -1).lineTo(4, 2).fill(0xff8f00)
        // eye dot
        g.circle(2, -2, 1.5).fill(0x333333)
      } else {
        // Tail feather: small fan of yellow/orange
        g.moveTo(0, 0).lineTo(-6, -8).lineTo(2, -6).lineTo(6, -10).lineTo(4, 0).fill(0xfdd835)
        g.moveTo(0, 0).lineTo(-4, -6).lineTo(4, -8).lineTo(2, 0).fill(0xffb300)
      }
    },
    [chick.found, chick.peekType],
  )

  const drawFound = useCallback(
    (g: Graphics) => {
      g.clear()
      if (!chick.found) return
      const t = chick.foundAnim
      const jumpY = -40 * Math.sin(t * Math.PI) // arc jump
      const s = 0.5 + t * 0.5 // scale up

      // Body
      g.circle(0, jumpY, 14 * s).fill(0xfdd835)
      // Head
      g.circle(0, jumpY - 14 * s, 9 * s).fill(0xfdd835)
      // Beak
      g.moveTo(7 * s, jumpY - 14 * s)
        .lineTo(13 * s, jumpY - 15 * s)
        .lineTo(7 * s, jumpY - 11 * s)
        .fill(0xff8f00)
      // Eye
      g.circle(3 * s, jumpY - 16 * s, 2 * s).fill(0x333333)
      // Wing
      g.ellipse(-6 * s, jumpY - 2 * s, 7 * s, 5 * s).fill(0xffb300)

      // Happy marks (sparkles) when animation is progressing
      if (t > 0.3) {
        const sparkAlpha = Math.min(1, (t - 0.3) * 3)
        g.star(12, jumpY - 30, 4, 3, 1.5).fill({ color: 0xffd93d, alpha: sparkAlpha })
        g.star(-14, jumpY - 24, 4, 2.5, 1.2).fill({ color: 0xffd93d, alpha: sparkAlpha })
      }
    },
    [chick.found, chick.foundAnim],
  )

  const handleClick = useCallback(() => {
    if (!chick.found) onClick(chick.id)
  }, [chick.found, chick.id, onClick])

  return (
    <pixiContainer x={cx} y={cy}>
      <pixiGraphics draw={drawPeek} />
      <pixiGraphics draw={drawFound} />
      {/* Invisible hit area */}
      {!chick.found && (
        <pixiGraphics
          draw={(g: Graphics) => {
            g.clear()
            g.circle(0, 0, PEEK_HIT_RADIUS).fill({ color: 0xffffff, alpha: 0.01 })
          }}
          eventMode="static"
          cursor="pointer"
          onPointerDown={handleClick}
        />
      )}
    </pixiContainer>
  )
}

/** Pixi layer rendered inside the game canvas */
export function HideAndSeekPixi({
  hiddenChicks,
  onClickChick,
}: {
  hiddenChicks: HiddenChick[]
  onClickChick: (id: number) => void
}) {
  return (
    <pixiContainer>
      {hiddenChicks.map((c) => (
        <HiddenChickSprite key={c.id} chick={c} onClick={onClickChick} />
      ))}
    </pixiContainer>
  )
}

/** Full hide-and-seek game controller (renders both Pixi children and HTML overlay) */
export function HideAndSeekGame() {
  const endGame = useGameStore((s) => s.endGame)
  const addCoins = useGameStore((s) => s.addCoins)
  const boostAllChickMood = useGameStore((s) => s.boostAllChickMood)

  const [phase, setPhase] = useState<GamePhase>('ready')
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [hiddenChicks, setHiddenChicks] = useState<HiddenChick[]>(() =>
    generateHiddenChicks(),
  )
  const [score, setScore] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)

  const totalChicks = hiddenChicks.length

  const awardRewards = useCallback(
    (finalScore: number) => {
      const coins = finalScore * 10 + (finalScore >= totalChicks ? 20 : 0)
      addCoins(coins)
      boostAllChickMood(15)
    },
    [totalChicks, addCoins, boostAllChickMood],
  )

  const finishGame = useCallback(
    (finalScore: number) => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      awardRewards(finalScore)
      setPhase('ended')
      if (finalScore >= totalChicks) {
        gameWin()
      } else {
        gameLose()
      }
    },
    [awardRewards, totalChicks],
  )

  // Animate found chicks
  useEffect(() => {
    if (phase !== 'playing') return
    let running = true
    const animate = (time: number) => {
      if (!running) return
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0
      lastTimeRef.current = time

      setHiddenChicks((prev) => {
        let changed = false
        const next = prev.map((c) => {
          if (c.found && c.foundAnim < 1) {
            changed = true
            return { ...c, foundAnim: Math.min(1, c.foundAnim + dt * 2) }
          }
          return c
        })
        return changed ? next : prev
      })
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      running = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      lastTimeRef.current = 0
    }
  }, [phase])

  const handleStart = useCallback(() => {
    setPhase('playing')
    setTimeLeft(GAME_DURATION)
    setScore(0)
    setHiddenChicks(generateHiddenChicks())
    gameStart()

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Time's up - will be handled by effect
          return 0
        }
        return t - 1
      })
    }, 1000)
  }, [])

  // End game when time runs out
  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) {
      finishGame(score)
    }
  }, [timeLeft, phase, score, finishGame])

  const handleClickChick = useCallback(
    (id: number) => {
      if (phase !== 'playing') return
      setHiddenChicks((prev) => {
        const chick = prev.find((c) => c.id === id)
        if (!chick || chick.found) return prev
        return prev.map((c) => (c.id === id ? { ...c, found: true, foundAnim: 0 } : c))
      })
      setScore((prev) => {
        const next = prev + 1
        if (next >= totalChicks) {
          // All found! End with a short delay so the player sees the last animation
          setTimeout(() => finishGame(next), 600)
        }
        return next
      })
    },
    [phase, totalChicks, finishGame],
  )

  const handlePlayAgain = useCallback(() => {
    handleStart()
  }, [handleStart])

  const handleExit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    endGame()
  }, [endGame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return {
    phase,
    timeLeft,
    score,
    totalChicks,
    hiddenChicks,
    handleStart,
    handleClickChick,
    handlePlayAgain,
    handleExit,
  }
}

