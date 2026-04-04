import { useState, useCallback, useEffect, useRef } from 'react'
import { Graphics } from 'pixi.js'
import { useTick } from '@pixi/react'
import { useGameStore } from '../store/gameStore'
import { gameStart, gameWin, gameLose } from '../systems/audio'
import type { GamePhase } from './GameOverlay'

/** Canvas dimensions */
const CANVAS_W = 960
const CANVAS_H = 640

/** Track layout */
const NUM_LANES = 4
const TRACK_TOP = 100
const TRACK_BOTTOM = 540
const LANE_HEIGHT = (TRACK_BOTTOM - TRACK_TOP) / NUM_LANES
const START_X = 80
const FINISH_X = 880
const TRACK_LENGTH = FINISH_X - START_X

/** Race settings */
const COUNTDOWN_SECS = 3
const BASE_SPEED = 80 // px/s base speed
const CLICK_BOOST = 18 // px per click
const CLICK_BOOST_DECAY = 200 // px/s decay of accumulated boost velocity
const AI_SPEED_VARIANCE = 30 // +/- randomness in AI speed
const RARITY_BONUS: Record<string, number> = { common: 0, special: 12, rare: 24 }

/** Chick colors per lane */
const LANE_COLORS = [0xfdd835, 0xffb300, 0xff8a65, 0xa5d6a7]
const LANE_NAMES = ['Sunny', 'Goldie', 'Pepper', 'Mint']

interface RaceChick {
  lane: number
  name: string
  color: number
  x: number // progress in px from START_X
  baseSpeed: number
  speedVariation: number // current random speed offset
  variationTimer: number // time until next speed change
  bobPhase: number
  isPlayer: boolean
  finished: boolean
  finishOrder: number
}

function laneY(lane: number): number {
  return TRACK_TOP + lane * LANE_HEIGHT + LANE_HEIGHT / 2
}

/** Pixi component: draws the race track background */
function RaceTrack({ draw }: { draw: (g: Graphics) => void }) {
  return <pixiGraphics draw={draw} />
}

/** Pixi component: draws a single race chick */
function RaceChickSprite({ chick }: { chick: RaceChick }) {
  const cx = START_X + chick.x
  const cy = laneY(chick.lane)
  const bob = Math.sin(chick.bobPhase) * 4

  const drawChick = useCallback(
    (g: Graphics) => {
      g.clear()
      const color = chick.color

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
      g.ellipse(-4, bob + 2, 7, 5).fill(color === 0xfdd835 ? 0xffb300 : 0xfdd835)
      // Legs (running animation)
      const legPhase = chick.bobPhase * 2
      const leg1 = Math.sin(legPhase) * 5
      const leg2 = Math.sin(legPhase + Math.PI) * 5
      g.moveTo(-2, bob + 12).lineTo(-2 + leg1, bob + 20).stroke({ color: 0xff8f00, width: 2 })
      g.moveTo(4, bob + 12).lineTo(4 + leg2, bob + 20).stroke({ color: 0xff8f00, width: 2 })

      // Player indicator
      if (chick.isPlayer) {
        g.star(0, bob - 28, 5, 6, 3).fill({ color: 0xffd93d, alpha: 0.9 })
      }
    },
    [chick.color, chick.isPlayer, bob, chick.bobPhase],
  )

  return (
    <pixiContainer x={cx} y={cy}>
      <pixiGraphics draw={drawChick} />
    </pixiContainer>
  )
}

/** Full race Pixi layer */
export function ChickRacePixi({
  raceChicks,
  raceState,
  countdown,
  onClickTrack,
}: {
  raceChicks: RaceChick[]
  raceState: 'selecting' | 'countdown' | 'racing' | 'done'
  countdown: number
  onClickTrack: () => void
}) {
  const drawTrack = useCallback(
    (g: Graphics) => {
      g.clear()

      // Track background
      g.rect(0, TRACK_TOP - 20, CANVAS_W, TRACK_BOTTOM - TRACK_TOP + 40).fill(0xd2b48c)

      // Lane dividers
      for (let i = 0; i <= NUM_LANES; i++) {
        const y = TRACK_TOP + i * LANE_HEIGHT
        // Dashed line
        for (let dx = START_X; dx < FINISH_X; dx += 20) {
          g.moveTo(dx, y).lineTo(dx + 12, y).stroke({ color: 0xffffff, width: 1, alpha: 0.5 })
        }
      }

      // Start line
      g.rect(START_X - 3, TRACK_TOP - 10, 6, TRACK_BOTTOM - TRACK_TOP + 20).fill(0xffffff)

      // Finish line (checkered)
      const fSize = 10
      for (let row = 0; row < Math.ceil((TRACK_BOTTOM - TRACK_TOP + 20) / fSize); row++) {
        for (let col = 0; col < 2; col++) {
          const isBlack = (row + col) % 2 === 0
          g.rect(
            FINISH_X - 3 + col * fSize,
            TRACK_TOP - 10 + row * fSize,
            fSize,
            fSize,
          ).fill(isBlack ? 0x000000 : 0xffffff)
        }
      }

      // Lane labels
      // (We'll skip text in graphics; names shown via the overlay)
    },
    [],
  )

  return (
    <pixiContainer>
      <RaceTrack draw={drawTrack} />
      {/* Hit area for clicking to boost */}
      <pixiGraphics
        draw={(g: Graphics) => {
          g.clear()
          g.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0xffffff, alpha: 0.01 })
        }}
        eventMode="static"
        cursor="pointer"
        onPointerDown={onClickTrack}
      />
      {raceChicks.map((chick) => (
        <RaceChickSprite key={chick.lane} chick={chick} />
      ))}
    </pixiContainer>
  )
}

/** Race game controller hook */
export function ChickRaceGame() {
  const endGame = useGameStore((s) => s.endGame)
  const addCoins = useGameStore((s) => s.addCoins)
  const boostAllChickMood = useGameStore((s) => s.boostAllChickMood)

  const [phase, setPhase] = useState<GamePhase>('ready')
  const [raceState, setRaceState] = useState<'selecting' | 'countdown' | 'racing' | 'done'>('selecting')
  const [selectedLane, setSelectedLane] = useState<number>(0)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS)
  const [raceChicks, setRaceChicks] = useState<RaceChick[]>([])
  const [finishOrder, setFinishOrder] = useState<number[]>([]) // lane indices in finish order
  const [playerPlace, setPlayerPlace] = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)

  const boostRef = useRef(0) // accumulated click boost velocity
  const finishCountRef = useRef(0)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const initChicks = useCallback((playerLane: number) => {
    const chicks: RaceChick[] = []
    for (let i = 0; i < NUM_LANES; i++) {
      const rarityKey = i === playerLane ? 'common' : ['common', 'special', 'rare'][Math.floor(Math.random() * 3)]
      chicks.push({
        lane: i,
        name: LANE_NAMES[i],
        color: LANE_COLORS[i],
        x: 0,
        baseSpeed: BASE_SPEED + (RARITY_BONUS[rarityKey] ?? 0) + (Math.random() - 0.5) * 20,
        speedVariation: 0,
        variationTimer: 0.5 + Math.random(),
        bobPhase: Math.random() * Math.PI * 2,
        isPlayer: i === playerLane,
        finished: false,
        finishOrder: 0,
      })
    }
    return chicks
  }, [])

  const handleStart = useCallback(() => {
    setPhase('playing')
    setRaceState('selecting')
    setSelectedLane(0)
    setRaceChicks(initChicks(0))
    setFinishOrder([])
    setPlayerPlace(0)
    setCoinsEarned(0)
    boostRef.current = 0
    finishCountRef.current = 0
    gameStart()
  }, [initChicks])

  const handleSelectLane = useCallback((lane: number) => {
    if (raceState !== 'selecting') return
    setSelectedLane(lane)
    setRaceChicks(initChicks(lane))
  }, [raceState, initChicks])

  const handleConfirmSelection = useCallback(() => {
    if (raceState !== 'selecting') return
    setRaceState('countdown')
    setCountdown(COUNTDOWN_SECS)

    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
          setRaceState('racing')
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [raceState])

  const handleClickTrack = useCallback(() => {
    if (raceState === 'racing') {
      boostRef.current += CLICK_BOOST
    }
  }, [raceState])

  // Race tick
  function RaceUpdater() {
    useTick((ticker) => {
      if (raceState !== 'racing') return
      const dt = ticker.deltaTime / 60 // seconds

      // Decay player boost
      boostRef.current = Math.max(0, boostRef.current - CLICK_BOOST_DECAY * dt)

      setRaceChicks((prev) => {
        let newFinishCount = finishCountRef.current
        const order = [...finishOrder]

        const next = prev.map((chick) => {
          if (chick.finished) return chick

          let { x, speedVariation, variationTimer, bobPhase } = chick

          // Update speed variation for AI chicks
          variationTimer -= dt
          if (variationTimer <= 0) {
            speedVariation = (Math.random() - 0.5) * AI_SPEED_VARIANCE * 2
            variationTimer = 0.5 + Math.random() * 1.5
          }

          // Calculate speed
          let speed = chick.baseSpeed + speedVariation
          if (chick.isPlayer) {
            speed = BASE_SPEED + boostRef.current
          }

          x += speed * dt
          bobPhase += speed * dt * 0.15

          // Check finish
          let finished = false
          let finishOrd = 0
          if (x >= TRACK_LENGTH) {
            x = TRACK_LENGTH
            finished = true
            newFinishCount++
            finishOrd = newFinishCount
            order.push(chick.lane)
          }

          return { ...chick, x, speedVariation, variationTimer, bobPhase, finished, finishOrder: finishOrd }
        })

        if (newFinishCount !== finishCountRef.current) {
          finishCountRef.current = newFinishCount
          setFinishOrder(order)

          // Check if player finished
          const playerChick = next.find((c) => c.isPlayer)
          if (playerChick?.finished && playerPlace === 0) {
            setPlayerPlace(playerChick.finishOrder)
          }

          // All done?
          if (newFinishCount >= NUM_LANES) {
            setRaceState('done')
          }
        }

        return next
      })
    })
    return null
  }

  // When race ends, award rewards
  useEffect(() => {
    if (raceState !== 'done' || playerPlace === 0) return
    let coins = 0
    if (playerPlace === 1) coins = 30
    else if (playerPlace === 2) coins = 15
    else if (playerPlace === 3) coins = 5

    setCoinsEarned(coins)
    if (coins > 0) addCoins(coins)
    boostAllChickMood(10)
    setPhase('ended')
    if (playerPlace === 1) {
      gameWin()
    } else {
      gameLose()
    }
  }, [raceState, playerPlace, addCoins, boostAllChickMood])

  const handlePlayAgain = useCallback(() => {
    handleStart()
  }, [handleStart])

  const handleExit = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    endGame()
  }, [endGame])

  // Cleanup
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [])

  return {
    phase,
    raceState,
    selectedLane,
    countdown,
    raceChicks,
    finishOrder,
    playerPlace,
    coinsEarned,
    handleStart,
    handleSelectLane,
    handleConfirmSelection,
    handleClickTrack,
    handlePlayAgain,
    handleExit,
    RaceUpdater,
  }
}

/** HTML overlay for the race (selection, countdown, results) */
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

export function ChickRaceOverlay({
  phase,
  raceState,
  selectedLane,
  countdown,
  playerPlace,
  coinsEarned,
  onStart,
  onSelectLane,
  onConfirmSelection,
  onPlayAgain,
  onExit,
}: {
  phase: GamePhase
  raceState: 'selecting' | 'countdown' | 'racing' | 'done'
  selectedLane: number
  countdown: number
  playerPlace: number
  coinsEarned: number
  onStart: () => void
  onSelectLane: (lane: number) => void
  onConfirmSelection: () => void
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
          Chick Race
        </div>
        <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.85 }}>
          Pick your chick and click rapidly to boost its speed!
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
          Ready? Click to start!
        </div>
      </div>
    )
  }

  if (phase === 'playing' && raceState === 'selecting') {
    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.45)' }}>
        <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>
          Pick Your Chick!
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {LANE_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => onSelectLane(i)}
              style={{
                ...btnStyle,
                background: selectedLane === i ? '#ffd93d' : 'rgba(255,255,255,0.2)',
                color: selectedLane === i ? '#5d4037' : '#fff',
                border: selectedLane === i ? '3px solid #ff8f00' : '3px solid transparent',
                fontSize: 16,
                padding: '12px 20px',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: `#${LANE_COLORS[i].toString(16).padStart(6, '0')}`,
                  margin: '0 auto 6px',
                }}
              />
              {name}
            </button>
          ))}
        </div>
        <button
          onClick={onConfirmSelection}
          style={{ ...btnStyle, background: '#4caf50', color: '#fff' }}
        >
          Go!
        </button>
      </div>
    )
  }

  if (phase === 'playing' && raceState === 'countdown') {
    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            textShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          {countdown > 0 ? countdown : 'GO!'}
        </div>
      </div>
    )
  }

  if (phase === 'playing' && raceState === 'racing') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily,
          color: '#fff',
          zIndex: 20,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.4)',
          padding: '6px 24px',
          borderRadius: 14,
          fontSize: 18,
          fontWeight: 'bold',
        }}
      >
        Click rapidly to boost your chick!
      </div>
    )
  }

  if (phase === 'ended') {
    const placeText =
      playerPlace === 1
        ? '1st'
        : playerPlace === 2
          ? '2nd'
          : playerPlace === 3
            ? '3rd'
            : `${playerPlace}th`

    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
          Race Over!
        </div>
        <div style={{ fontSize: 24, marginBottom: 4 }}>
          Your chick came in {placeText} place!
        </div>
        {coinsEarned > 0 && (
          <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 4 }}>
            Coins earned: +{coinsEarned}
          </div>
        )}
        {playerPlace === 1 && (
          <div style={{ fontSize: 16, color: '#ffd93d', marginBottom: 8 }}>
            Winner winner, chicken dinner!
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <button
            onClick={onPlayAgain}
            style={{ ...btnStyle, background: '#4caf50', color: '#fff' }}
          >
            Play Again
          </button>
          <button
            onClick={onExit}
            style={{ ...btnStyle, background: '#78909c', color: '#fff' }}
          >
            Exit
          </button>
        </div>
      </div>
    )
  }

  return null
}
