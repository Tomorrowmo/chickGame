import { useState, useCallback, useRef } from 'react'
import { Graphics } from 'pixi.js'
import { useTick } from '@pixi/react'
import { useGameStore } from '../store/gameStore'
import { gameStart, gameWin } from '../systems/audio'
import type { GamePhase } from './GameOverlay'

/** Canvas dimensions */
const CANVAS_W = 1440
const CANVAS_H = 900
const GROUND_Y = 540

/** Throw settings */
const THROW_ORIGIN_X = 100
const THROW_ORIGIN_Y = GROUND_Y - 10
const GRAVITY = 600 // px/s^2
const BOUNCE_DAMPING = 0.4
const MAX_ROUNDS = 5
const BALL_RADIUS = 8

/** Chick settings */
const CHICK_SPEED = 220 // px/s
const CHICK_START_X = 80
const CHICK_Y = GROUND_Y + 10

const BALL_COLORS = [0xe53935, 0x1e88e5, 0xe53935, 0x1e88e5, 0xe53935]

type FetchState =
  | 'aiming'
  | 'flying'
  | 'bouncing'
  | 'landed'
  | 'chick_running_to'
  | 'chick_returning'
  | 'round_done'

interface BallState {
  x: number
  y: number
  vx: number
  vy: number
  landed: boolean
  bounced: boolean
}

interface ChickState {
  x: number
  hasBall: boolean
  bobPhase: number
}

/** Pixi layer for the fetch game */
export function FetchPixi({
  fetchState,
  ball,
  chick,
  round,
  dragStart,
  dragEnd,
  isDragging,
}: {
  fetchState: FetchState
  ball: BallState
  chick: ChickState
  round: number
  dragStart: { x: number; y: number } | null
  dragEnd: { x: number; y: number } | null
  isDragging: boolean
}) {
  const ballColor = BALL_COLORS[round % BALL_COLORS.length]

  const drawScene = useCallback(
    (g: Graphics) => {
      g.clear()

      // Ground line
      g.moveTo(0, GROUND_Y).lineTo(CANVAS_W, GROUND_Y).stroke({ color: 0x6d8c4e, width: 2 })

      // Throw origin marker
      g.circle(THROW_ORIGIN_X, THROW_ORIGIN_Y, 5).fill({ color: 0xffffff, alpha: 0.5 })

      // Distance markers every 100px
      for (let dx = 200; dx < CANVAS_W; dx += 100) {
        g.moveTo(dx, GROUND_Y - 4)
          .lineTo(dx, GROUND_Y + 4)
          .stroke({ color: 0xffffff, width: 1, alpha: 0.4 })
      }
    },
    [],
  )

  const drawTrajectory = useCallback(
    (g: Graphics) => {
      g.clear()
      if (!isDragging || !dragStart || !dragEnd) return

      const dx = dragStart.x - dragEnd.x
      const dy = dragStart.y - dragEnd.y
      const power = Math.min(Math.sqrt(dx * dx + dy * dy), 300)
      const angle = Math.atan2(dy, dx)

      // Discard downward throws
      if (Math.sin(angle) <= 0) return

      const vx = Math.cos(angle) * power * 2.5
      const vy = -Math.sin(angle) * power * 2.5

      // Draw dotted trajectory
      let sx = THROW_ORIGIN_X
      let sy = THROW_ORIGIN_Y
      let svx = vx
      let svy = vy
      const step = 0.03
      for (let t = 0; t < 2; t += step) {
        const nx = sx + svx * step
        const ny = sy + svy * step
        svy += GRAVITY * step
        if (ny >= GROUND_Y) break
        // Dotted: draw every other segment
        if (Math.floor(t / (step * 3)) % 2 === 0) {
          g.circle(nx, ny, 2).fill({ color: 0xffffff, alpha: 0.6 })
        }
        sx = nx
        sy = ny
        svx = svx
        svy = svy
      }
    },
    [isDragging, dragStart, dragEnd],
  )

  const drawBall = useCallback(
    (g: Graphics) => {
      g.clear()
      if (fetchState === 'aiming' && !isDragging) return
      // When chick has ball, don't draw standalone
      if (chick.hasBall) return

      g.circle(0, 0, BALL_RADIUS).fill(ballColor)
      // Shine
      g.circle(-2, -3, 2).fill({ color: 0xffffff, alpha: 0.6 })
    },
    [fetchState, isDragging, chick.hasBall, ballColor],
  )

  const bob = Math.sin(chick.bobPhase) * 3
  const drawChick = useCallback(
    (g: Graphics) => {
      g.clear()
      if (fetchState === 'aiming' || fetchState === 'flying' || fetchState === 'bouncing') return

      const color = 0xfdd835

      // Body
      g.circle(0, bob, 14).fill(color)
      // Head
      g.circle(10, bob - 10, 9).fill(color)
      // Beak
      g.moveTo(17, bob - 10)
        .lineTo(23, bob - 11)
        .lineTo(17, bob - 7)
        .fill(0xff8f00)
      // Eye
      g.circle(14, bob - 12, 2).fill(0x333333)
      // Wing
      g.ellipse(-4, bob + 2, 7, 5).fill(0xffb300)
      // Legs (running animation)
      const legPhase = chick.bobPhase * 2
      const leg1 = Math.sin(legPhase) * 5
      const leg2 = Math.sin(legPhase + Math.PI) * 5
      g.moveTo(-2, bob + 12).lineTo(-2 + leg1, bob + 20).stroke({ color: 0xff8f00, width: 2 })
      g.moveTo(4, bob + 12).lineTo(4 + leg2, bob + 20).stroke({ color: 0xff8f00, width: 2 })

      // Ball on chick if carrying
      if (chick.hasBall) {
        g.circle(10, bob - 22, BALL_RADIUS).fill(ballColor)
        g.circle(8, bob - 25, 2).fill({ color: 0xffffff, alpha: 0.6 })
      }
    },
    [fetchState, bob, chick.bobPhase, chick.hasBall, ballColor],
  )

  return (
    <pixiContainer>
      <pixiGraphics draw={drawScene} />
      <pixiGraphics draw={drawTrajectory} />
      <pixiContainer x={ball.x} y={ball.y}>
        <pixiGraphics draw={drawBall} />
      </pixiContainer>
      <pixiContainer x={chick.x} y={CHICK_Y}>
        <pixiGraphics draw={drawChick} />
      </pixiContainer>
    </pixiContainer>
  )
}

/** Hit area for drag input */
export function FetchInputLayer({
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  onDragStart: (x: number, y: number) => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: () => void
}) {
  const dragging = useRef(false)

  const handleDown = useCallback(
    (e: import('pixi.js').FederatedPointerEvent) => {
      dragging.current = true
      const pos = e.global
      onDragStart(pos.x, pos.y)
    },
    [onDragStart],
  )

  const handleMove = useCallback(
    (e: import('pixi.js').FederatedPointerEvent) => {
      if (!dragging.current) return
      const pos = e.global
      onDragMove(pos.x, pos.y)
    },
    [onDragMove],
  )

  const handleUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    onDragEnd()
  }, [onDragEnd])

  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear()
        g.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0xffffff, alpha: 0.01 })
      }}
      eventMode="static"
      cursor="crosshair"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerUpOutside={handleUp}
    />
  )
}

/** Tick updater component */
function FetchUpdater({
  fetchState,
  setFetchState,
  ball,
  setBall,
  chick,
  setChick,
}: {
  fetchState: FetchState
  setFetchState: (s: FetchState) => void
  ball: BallState
  setBall: (fn: (prev: BallState) => BallState) => void
  chick: ChickState
  setChick: (fn: (prev: ChickState) => ChickState) => void
}) {
  useTick((ticker) => {
    const dt = ticker.deltaTime / 60

    if (fetchState === 'flying' || fetchState === 'bouncing') {
      setBall((prev) => {
        let { x, y, vx, vy, bounced } = prev

        vy += GRAVITY * dt
        x += vx * dt
        y += vy * dt

        // Clamp to canvas right edge
        if (x > CANVAS_W - BALL_RADIUS) {
          x = CANVAS_W - BALL_RADIUS
          vx = 0
        }

        // Ground collision
        if (y >= GROUND_Y) {
          y = GROUND_Y
          if (!bounced) {
            // First bounce
            vy = -vy * BOUNCE_DAMPING
            vx = vx * 0.7
            return { x, y, vx, vy, landed: false, bounced: true }
          } else {
            // Second hit: stop
            return { x, y: GROUND_Y, vx: 0, vy: 0, landed: true, bounced: true }
          }
        }

        // If bounced and speed is very low, land
        if (bounced && Math.abs(vy) < 5 && y >= GROUND_Y - 2) {
          return { x, y: GROUND_Y, vx: 0, vy: 0, landed: true, bounced: true }
        }

        return { x, y, vx, vy, landed: false, bounced }
      })

      // Check if ball landed to transition state
      // We read from the setter to avoid stale closure
      setBall((prev) => {
        if (prev.landed && fetchState !== 'landed') {
          // Use setTimeout to avoid state update during render
          setTimeout(() => setFetchState('landed'), 0)
        }
        return prev
      })
    }

    if (fetchState === 'landed') {
      // Transition to chick running
      setFetchState('chick_running_to')
    }

    if (fetchState === 'chick_running_to') {
      setChick((prev) => {
        const dx = ball.x - prev.x
        if (Math.abs(dx) < 10) {
          setTimeout(() => setFetchState('chick_returning'), 0)
          return { ...prev, x: ball.x, hasBall: true, bobPhase: prev.bobPhase + dt * 12 }
        }
        const dir = dx > 0 ? 1 : -1
        return {
          ...prev,
          x: prev.x + dir * CHICK_SPEED * dt,
          bobPhase: prev.bobPhase + dt * 12,
          hasBall: false,
        }
      })
    }

    if (fetchState === 'chick_returning') {
      setChick((prev) => {
        const targetX = CHICK_START_X
        const dx = targetX - prev.x
        if (Math.abs(dx) < 10) {
          setTimeout(() => setFetchState('round_done'), 0)
          return { ...prev, x: targetX, bobPhase: prev.bobPhase + dt * 12 }
        }
        const dir = dx > 0 ? 1 : -1
        return {
          ...prev,
          x: prev.x + dir * CHICK_SPEED * dt,
          bobPhase: prev.bobPhase + dt * 12,
        }
      })
    }
  })
  return null
}

/** Game controller hook */
export function FetchGame() {
  const endGame = useGameStore((s) => s.endGame)
  const addCoins = useGameStore((s) => s.addCoins)
  const boostAllChickMood = useGameStore((s) => s.boostAllChickMood)

  const [phase, setPhase] = useState<GamePhase>('ready')
  const [fetchState, setFetchState] = useState<FetchState>('aiming')
  const [round, setRound] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [roundScore, setRoundScore] = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)

  const [ball, setBall] = useState<BallState>({
    x: THROW_ORIGIN_X,
    y: THROW_ORIGIN_Y,
    vx: 0,
    vy: 0,
    landed: false,
    bounced: false,
  })

  const [chick, setChick] = useState<ChickState>({
    x: CHICK_START_X,
    hasBall: false,
    bobPhase: 0,
  })

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleStart = useCallback(() => {
    setPhase('playing')
    setFetchState('aiming')
    setRound(0)
    setTotalScore(0)
    setStreak(0)
    setRoundScore(0)
    setBall({ x: THROW_ORIGIN_X, y: THROW_ORIGIN_Y, vx: 0, vy: 0, landed: false, bounced: false })
    setChick({ x: CHICK_START_X, hasBall: false, bobPhase: 0 })
    gameStart()
  }, [])

  const handleDragStart = useCallback(
    (x: number, y: number) => {
      if (fetchState !== 'aiming') return
      setDragStart({ x, y })
      setDragEnd({ x, y })
      setIsDragging(true)
    },
    [fetchState],
  )

  const handleDragMove = useCallback(
    (x: number, y: number) => {
      if (!isDragging) return
      setDragEnd({ x, y })
    },
    [isDragging],
  )

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false)
      return
    }
    setIsDragging(false)

    if (fetchState !== 'aiming') return

    const dx = dragStart.x - dragEnd.x
    const dy = dragStart.y - dragEnd.y
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 300)
    const angle = Math.atan2(dy, dx)

    // Must drag a minimum distance and aim upward
    if (power < 20 || Math.sin(angle) <= 0) {
      setDragStart(null)
      setDragEnd(null)
      return
    }

    const vx = Math.cos(angle) * power * 2.5
    const vy = -Math.sin(angle) * power * 2.5

    setBall({
      x: THROW_ORIGIN_X,
      y: THROW_ORIGIN_Y,
      vx,
      vy,
      landed: false,
      bounced: false,
    })
    setFetchState('flying')
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, fetchState])

  // When fetchState becomes 'round_done', compute score and advance
  const handleFetchStateChange = useCallback(
    (newState: FetchState) => {
      setFetchState(newState)

      if (newState === 'round_done') {
        // Compute throw distance
        const distance = Math.max(0, ball.x - THROW_ORIGIN_X)
        const distPoints = Math.round(distance / 5)
        const newStreak = streak + 1
        const multiplier = Math.min(newStreak, 5) // max 5x
        const score = distPoints * multiplier
        setRoundScore(score)
        setStreak(newStreak)
        setTotalScore((prev) => {
          const newTotal = prev + score
          const newRound = round + 1

          if (newRound >= MAX_ROUNDS) {
            // Game over
            const coins = Math.round(newTotal / 10)
            setCoinsEarned(coins)
            if (coins > 0) addCoins(coins)
            boostAllChickMood(10)
            setPhase('ended')
            gameWin()
          } else {
            // Next round after a short delay
            setTimeout(() => {
              setRound(newRound)
              setFetchState('aiming')
              setBall({
                x: THROW_ORIGIN_X,
                y: THROW_ORIGIN_Y,
                vx: 0,
                vy: 0,
                landed: false,
                bounced: false,
              })
              setChick({ x: CHICK_START_X, hasBall: false, bobPhase: 0 })
              setRoundScore(0)
            }, 1200)
          }
          return newTotal
        })
      }
    },
    [ball.x, streak, round, addCoins, boostAllChickMood],
  )

  const handlePlayAgain = useCallback(() => {
    handleStart()
  }, [handleStart])

  const handleExit = useCallback(() => {
    endGame()
  }, [endGame])

  return {
    phase,
    fetchState,
    round,
    totalScore,
    streak,
    roundScore,
    coinsEarned,
    ball,
    chick,
    dragStart,
    dragEnd,
    isDragging,
    handleStart,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleFetchStateChange,
    handlePlayAgain,
    handleExit,
    setBall,
    setChick,
    FetchUpdater,
  }
}

/** HTML overlay for fetch game */
const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

const overlayBase: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily,
  color: '#fff',
  zIndex: 20,
  pointerEvents: 'auto',
}

const btnStyle: React.CSSProperties = {
  padding: '10px 28px',
  fontSize: 18,
  fontFamily,
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
  transition: 'transform 0.1s',
}

export function FetchOverlay({
  phase,
  fetchState,
  round,
  totalScore,
  streak,
  roundScore,
  coinsEarned,
  onStart,
  onPlayAgain,
  onExit,
}: {
  phase: GamePhase
  fetchState: FetchState
  round: number
  totalScore: number
  streak: number
  roundScore: number
  coinsEarned: number
  onStart: () => void
  onPlayAgain: () => void
  onExit: () => void
}) {
  if (phase === 'ready') {
    return (
      <div
        style={{ ...overlayBase, background: 'rgba(0,0,0,0.55)' }}
        onClick={onStart}
      >
        <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 12 }}>
          丢球捡回！
        </div>
        <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.85 }}>
          拖拽瞄准，松开投掷！小鸡会帮你捡回来！
        </div>
        <div style={{ fontSize: 14, marginBottom: 8, opacity: 0.7 }}>
          投得越远分数越高，连续捡回可以获得倍数加成！
        </div>
        <div
          style={{
            fontSize: 22,
            marginTop: 20,
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 16,
            cursor: 'pointer',
          }}
        >
          准备好了吗？点击开始！
        </div>
      </div>
    )
  }

  if (phase === 'playing') {
    return (
      <>
        {/* HUD bar */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            fontFamily,
            color: '#fff',
            zIndex: 20,
            pointerEvents: 'none',
            background: 'rgba(0,0,0,0.4)',
            padding: '6px 24px',
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>丢球捡回！</div>
          <div style={{ fontSize: 18 }}>
            第{round + 1}轮/共{MAX_ROUNDS}轮
          </div>
          <div style={{ fontSize: 18 }}>
            分数：<span style={{ fontWeight: 'bold', color: '#ffd93d' }}>{totalScore}</span>
          </div>
          {streak > 1 && (
            <div style={{ fontSize: 16, color: '#ff9800' }}>
              {streak}x 连击！
            </div>
          )}
        </div>

        {/* Aiming hint */}
        {fetchState === 'aiming' && (
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily,
              color: '#fff',
              zIndex: 20,
              pointerEvents: 'none',
              background: 'rgba(0,0,0,0.35)',
              padding: '6px 18px',
              borderRadius: 10,
              fontSize: 15,
            }}
          >
            拖拽瞄准，松开投掷！
          </div>
        )}

        {/* Round score popup */}
        {fetchState === 'round_done' && roundScore > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily,
              color: '#ffd93d',
              zIndex: 20,
              pointerEvents: 'none',
              fontSize: 32,
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            +{roundScore} pts!
          </div>
        )}
      </>
    )
  }

  // phase === 'ended'
  return (
    <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.6)' }}>
      <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
        游戏结束！
      </div>
      <div style={{ fontSize: 24, marginBottom: 4 }}>
        总分：{totalScore}
      </div>
      <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 4 }}>
        获得金币：+{coinsEarned}
      </div>
      {streak >= MAX_ROUNDS && (
        <div style={{ fontSize: 16, color: '#ffd93d', marginBottom: 8 }}>
          完美连击！太厉害了！
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <button
          onClick={onPlayAgain}
          style={{ ...btnStyle, background: '#4caf50', color: '#fff' }}
        >
          再来一次
        </button>
        <button
          onClick={onExit}
          style={{ ...btnStyle, background: '#78909c', color: '#fff' }}
        >
          退出
        </button>
      </div>
    </div>
  )
}
