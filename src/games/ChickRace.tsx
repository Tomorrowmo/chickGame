import { useState, useCallback, useEffect, useRef } from 'react'
import { Graphics } from 'pixi.js'
import { useTick } from '@pixi/react'
import { useGameStore } from '../store/gameStore'
import { gameStart, gameWin, gameLose, pop } from '../systems/audio'
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

/** Effect particles */
interface SpeedSpark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface DustCloud {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

interface FloatingText {
  x: number
  y: number
  text: string
  life: number
  maxLife: number
  color: number
}

interface SpeedLine {
  x: number
  y: number
  length: number
  speed: number
  alpha: number
}

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: number
  size: number
  rotation: number
  rotSpeed: number
}

interface StarParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: number
}

function laneY(lane: number): number {
  return TRACK_TOP + lane * LANE_HEIGHT + LANE_HEIGHT / 2
}

/** Pixi component: draws the race track background */
function RaceTrack({ draw }: { draw: (g: Graphics) => void }) {
  return <pixiGraphics draw={draw} />
}

/** Pixi component: draws a single race chick */
function RaceChickSprite({
  chick,
  scaleXBoost,
  glowAlpha,
}: {
  chick: RaceChick
  scaleXBoost: number
  glowAlpha: number
}) {
  const cx = START_X + chick.x
  const cy = laneY(chick.lane)
  const bob = Math.sin(chick.bobPhase) * 4

  const drawChick = useCallback(
    (g: Graphics) => {
      g.clear()
      const color = chick.color

      // Glow effect for player on click
      if (chick.isPlayer && glowAlpha > 0) {
        g.circle(0, bob, 24).fill({ color: 0xffff00, alpha: glowAlpha * 0.4 })
        g.circle(0, bob, 18).fill({ color: 0xffff00, alpha: glowAlpha * 0.25 })
      }

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
    [chick.color, chick.isPlayer, bob, chick.bobPhase, glowAlpha],
  )

  return (
    <pixiContainer x={cx} y={cy} scale={{ x: 1 + scaleXBoost, y: 1 }}>
      <pixiGraphics draw={drawChick} />
    </pixiContainer>
  )
}

/** Pixi component: draws all race effects (sparks, dust, speed lines, celebrations) */
function RaceEffects({
  sparks,
  dustClouds,
  speedLines,
  floatingTexts,
  confetti,
  stars,
  winnerLane,
}: {
  sparks: SpeedSpark[]
  dustClouds: DustCloud[]
  speedLines: SpeedLine[]
  floatingTexts: FloatingText[]
  confetti: ConfettiParticle[]
  stars: StarParticle[]
  winnerLane: number
}) {
  const drawEffects = useCallback(
    (g: Graphics) => {
      g.clear()

      // Speed lines background
      for (const line of speedLines) {
        g.moveTo(line.x, line.y)
          .lineTo(line.x + line.length, line.y)
          .stroke({ color: 0xffffff, width: 1.5, alpha: line.alpha })
      }

      // Dust clouds
      for (const d of dustClouds) {
        const alpha = (d.life / d.maxLife) * 0.4
        g.circle(d.x, d.y, d.size * (1 + (1 - d.life / d.maxLife) * 0.5)).fill({
          color: 0x999999,
          alpha,
        })
      }

      // Speed sparks
      for (const s of sparks) {
        const alpha = s.life / s.maxLife
        // Draw as short lines radiating backward
        g.moveTo(s.x, s.y)
          .lineTo(s.x + s.vx * 3, s.y + s.vy * 3)
          .stroke({ color: 0xffdd00, width: 2, alpha })
      }

      // Confetti
      for (const c of confetti) {
        const alpha = c.life / c.maxLife
        g.rect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size * 0.6).fill({
          color: c.color,
          alpha,
        })
      }

      // Star particles (winner celebration)
      for (const s of stars) {
        const alpha = s.life / s.maxLife
        g.star(s.x, s.y, 4, s.size, s.size * 0.4, 0).fill({ color: s.color, alpha })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sparks.length, dustClouds.length, speedLines.length, confetti.length, stars.length, winnerLane],
  )

  return (
    <>
      <pixiGraphics draw={drawEffects} />
      {/* Floating texts rendered as pixiText for clarity */}
      {floatingTexts.map((ft, i) => (
        <pixiText
          key={i}
          text={ft.text}
          x={ft.x}
          y={ft.y}
          alpha={ft.life / ft.maxLife}
          style={{
            fontFamily: '"Comic Sans MS", cursive',
            fontSize: 18,
            fontWeight: 'bold',
            fill: ft.color,
            stroke: { color: 0x000000, width: 2 },
          }}
          anchor={{ x: 0.5, y: 0.5 }}
        />
      ))}
    </>
  )
}

/** Full race Pixi layer */
export function ChickRacePixi({
  raceChicks,
  raceState,
  countdown,
  onClickTrack,
  shakeOffset,
  playerScaleXBoost,
  playerGlowAlpha,
  sparks,
  dustClouds,
  speedLines,
  floatingTexts,
  confetti,
  stars,
  winnerLane,
}: {
  raceChicks: RaceChick[]
  raceState: 'selecting' | 'countdown' | 'racing' | 'done'
  countdown: number
  onClickTrack: () => void
  shakeOffset: { x: number; y: number }
  playerScaleXBoost: number
  playerGlowAlpha: number
  sparks: SpeedSpark[]
  dustClouds: DustCloud[]
  speedLines: SpeedLine[]
  floatingTexts: FloatingText[]
  confetti: ConfettiParticle[]
  stars: StarParticle[]
  winnerLane: number
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
    },
    [],
  )

  return (
    <pixiContainer x={shakeOffset.x} y={shakeOffset.y}>
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
      {/* Effects behind chicks */}
      <RaceEffects
        sparks={sparks}
        dustClouds={dustClouds}
        speedLines={speedLines}
        floatingTexts={floatingTexts}
        confetti={confetti}
        stars={stars}
        winnerLane={winnerLane}
      />
      {raceChicks.map((chick) => (
        <RaceChickSprite
          key={chick.lane}
          chick={chick}
          scaleXBoost={chick.isPlayer ? playerScaleXBoost : 0}
          glowAlpha={chick.isPlayer ? playerGlowAlpha : 0}
        />
      ))}
    </pixiContainer>
  )
}

/** Commentary messages */
const ENCOURAGE_MSGS = ['加油！', '冲冲冲！', '太快了！', '再快一点！']
const LEADING_MSGS = ['领先了！', '保持住！']
const BEHIND_MSGS = ['快追上去！', '别放弃！', '还有机会！']
const NEAR_FINISH_MSG = '终点就在眼前！'

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Race game controller hook */
export function ChickRaceGame() {
  const endGame = useGameStore((s) => s.endGame)
  const addCoins = useGameStore((s) => s.addCoins)
  const boostAllChickMood = useGameStore((s) => s.boostAllChickMood)
  const incrementStat = useGameStore((s) => s.incrementStat)

  const [phase, setPhase] = useState<GamePhase>('ready')
  const [raceState, setRaceState] = useState<'selecting' | 'countdown' | 'racing' | 'done'>('selecting')
  const [selectedLane, setSelectedLane] = useState<number>(0)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS)
  const [raceChicks, setRaceChicks] = useState<RaceChick[]>([])
  const [finishOrder, setFinishOrder] = useState<number[]>([]) // lane indices in finish order
  const [playerPlace, setPlayerPlace] = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)

  // Effect states
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 })
  const [playerScaleXBoost, setPlayerScaleXBoost] = useState(0)
  const [playerGlowAlpha, setPlayerGlowAlpha] = useState(0)
  const [sparks, setSparks] = useState<SpeedSpark[]>([])
  const [dustClouds, setDustClouds] = useState<DustCloud[]>([])
  const [speedLines, setSpeedLines] = useState<SpeedLine[]>([])
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([])
  const [stars, setStars] = useState<StarParticle[]>([])
  const [winnerLane, setWinnerLane] = useState(-1)

  const boostRef = useRef(0) // accumulated click boost velocity
  const finishCountRef = useRef(0)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Effect refs for mutation in tick
  const shakeDecayRef = useRef(0)
  const scaleBoostDecayRef = useRef(0)
  const glowDecayRef = useRef(0)
  const sparksRef = useRef<SpeedSpark[]>([])
  const dustRef = useRef<DustCloud[]>([])
  const speedLinesRef = useRef<SpeedLine[]>([])
  const floatingTextsRef = useRef<FloatingText[]>([])
  const confettiRef = useRef<ConfettiParticle[]>([])
  const starsRef = useRef<StarParticle[]>([])
  const dustTimerRef = useRef(0)
  const commentaryTimerRef = useRef(0)
  const clickCountRef = useRef(0)
  const clickWindowRef = useRef(0)
  const nearFinishShownRef = useRef(false)
  const winCelebrationDoneRef = useRef(false)

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
    sparksRef.current = []
    dustRef.current = []
    speedLinesRef.current = []
    floatingTextsRef.current = []
    confettiRef.current = []
    starsRef.current = []
    nearFinishShownRef.current = false
    winCelebrationDoneRef.current = false
    setWinnerLane(-1)
    setSparks([])
    setDustClouds([])
    setSpeedLines([])
    setFloatingTexts([])
    setConfetti([])
    setStars([])
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

  const spawnClickEffects = useCallback((playerChick: RaceChick) => {
    const cx = START_X + playerChick.x
    const cy = laneY(playerChick.lane)

    // Spawn sparks behind the chick
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.2 // backward
      const speed = 2 + Math.random() * 3
      sparksRef.current.push({
        x: cx - 10,
        y: cy + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15,
        maxLife: 15,
      })
    }

    // Trigger glow
    glowDecayRef.current = 10
    // Trigger scale stretch
    scaleBoostDecayRef.current = 8
    // Trigger screen shake
    shakeDecayRef.current = 6
  }, [])

  const handleClickTrack = useCallback(() => {
    if (raceState === 'racing') {
      boostRef.current += CLICK_BOOST
      pop()

      // Track click speed for commentary
      clickCountRef.current++
      clickWindowRef.current = 1.0 // reset window

      // Spawn click effects on player chick
      setRaceChicks((prev) => {
        const player = prev.find((c) => c.isPlayer)
        if (player) spawnClickEffects(player)
        return prev
      })
    }
  }, [raceState, spawnClickEffects])

  // Race tick
  function RaceUpdater() {
    useTick((ticker) => {
      if (raceState !== 'racing' && raceState !== 'done') return
      const dt = ticker.deltaTime / 60 // seconds
      const dtFrames = ticker.deltaTime

      // === Update effects ===

      // Screen shake decay
      if (shakeDecayRef.current > 0) {
        shakeDecayRef.current -= dtFrames
        const intensity = Math.max(0, shakeDecayRef.current) * 0.6
        setShakeOffset({
          x: (Math.random() - 0.5) * intensity,
          y: (Math.random() - 0.5) * intensity,
        })
      } else {
        setShakeOffset({ x: 0, y: 0 })
      }

      // Scale stretch decay
      if (scaleBoostDecayRef.current > 0) {
        scaleBoostDecayRef.current -= dtFrames
        setPlayerScaleXBoost(Math.max(0, scaleBoostDecayRef.current / 8) * 0.3)
      } else {
        setPlayerScaleXBoost(0)
      }

      // Glow decay
      if (glowDecayRef.current > 0) {
        glowDecayRef.current -= dtFrames
        setPlayerGlowAlpha(Math.max(0, glowDecayRef.current / 10))
      } else {
        setPlayerGlowAlpha(0)
      }

      // Update sparks
      let sparksChanged = false
      for (const s of sparksRef.current) {
        s.x += s.vx * dtFrames
        s.y += s.vy * dtFrames
        s.life -= dtFrames
      }
      const prevSparkLen = sparksRef.current.length
      sparksRef.current = sparksRef.current.filter((s) => s.life > 0)
      if (sparksRef.current.length !== prevSparkLen) sparksChanged = true
      if (sparksChanged || sparksRef.current.length > 0) {
        setSparks([...sparksRef.current])
      }

      // Update dust clouds
      for (const d of dustRef.current) {
        d.x += d.vx * dtFrames
        d.y += d.vy * dtFrames
        d.life -= dtFrames
      }
      dustRef.current = dustRef.current.filter((d) => d.life > 0)

      // Update speed lines
      for (const sl of speedLinesRef.current) {
        sl.x -= sl.speed * dtFrames
        sl.alpha -= 0.02 * dtFrames
      }
      speedLinesRef.current = speedLinesRef.current.filter((sl) => sl.x + sl.length > 0 && sl.alpha > 0)

      // Update floating texts
      for (const ft of floatingTextsRef.current) {
        ft.y -= 0.8 * dtFrames
        ft.life -= dtFrames
      }
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life > 0)
      setFloatingTexts([...floatingTextsRef.current])

      // Update confetti
      for (const c of confettiRef.current) {
        c.x += c.vx * dtFrames
        c.y += c.vy * dtFrames
        c.vy += 0.03 * dtFrames // gravity
        c.rotation += c.rotSpeed * dtFrames
        c.life -= dtFrames
      }
      confettiRef.current = confettiRef.current.filter((c) => c.life > 0)
      setConfetti([...confettiRef.current])

      // Update stars
      for (const s of starsRef.current) {
        s.x += s.vx * dtFrames
        s.y += s.vy * dtFrames
        s.vy += 0.02 * dtFrames
        s.life -= dtFrames
      }
      starsRef.current = starsRef.current.filter((s) => s.life > 0)
      setStars([...starsRef.current])

      if (raceState !== 'racing') {
        setDustClouds([...dustRef.current])
        setSpeedLines([...speedLinesRef.current])
        return
      }

      // Decay player boost
      boostRef.current = Math.max(0, boostRef.current - CLICK_BOOST_DECAY * dt)

      // Click window timer for commentary
      if (clickWindowRef.current > 0) {
        clickWindowRef.current -= dt
        if (clickWindowRef.current <= 0) {
          clickCountRef.current = 0
        }
      }

      // Commentary timer
      commentaryTimerRef.current -= dt

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

          // Spawn dust clouds for running chicks
          dustTimerRef.current -= dt
          if (dustTimerRef.current <= 0) {
            dustTimerRef.current = 0.08
            const intensity = speed / BASE_SPEED
            if (Math.random() < Math.min(intensity * 0.4, 0.9)) {
              const cy = laneY(chick.lane)
              dustRef.current.push({
                x: START_X + x - 12,
                y: cy + 12 + (Math.random() - 0.5) * 6,
                vx: -0.3 - Math.random() * 0.5,
                vy: -0.1 - Math.random() * 0.3,
                life: 20 + Math.random() * 10,
                maxLife: 30,
                size: 3 + Math.random() * 3,
              })
            }
          }

          // Speed lines when going fast
          if (speed > BASE_SPEED * 0.9) {
            if (Math.random() < 0.15) {
              speedLinesRef.current.push({
                x: CANVAS_W,
                y: TRACK_TOP + Math.random() * (TRACK_BOTTOM - TRACK_TOP),
                length: 30 + Math.random() * 60,
                speed: 4 + Math.random() * 6,
                alpha: 0.15 + Math.random() * 0.15,
              })
            }
          }

          // Check finish
          let finished = false
          let finishOrd = 0
          if (x >= TRACK_LENGTH) {
            x = TRACK_LENGTH
            finished = true
            newFinishCount++
            finishOrd = newFinishCount
            order.push(chick.lane)

            // Winner celebration
            if (newFinishCount === 1) {
              setWinnerLane(chick.lane)
              // Spawn star particles around winner
              const wx = START_X + TRACK_LENGTH
              const wy = laneY(chick.lane)
              for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2
                const spd = 1.5 + Math.random() * 2
                starsRef.current.push({
                  x: wx,
                  y: wy,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd - 1,
                  life: 50 + Math.random() * 20,
                  maxLife: 70,
                  size: 4 + Math.random() * 4,
                  color: [0xffd700, 0xffec8b, 0xffa500, 0xffffff][Math.floor(Math.random() * 4)],
                })
              }
            }
          }

          return { ...chick, x, speedVariation, variationTimer, bobPhase, finished, finishOrder: finishOrd }
        })

        // Commentary logic
        if (commentaryTimerRef.current <= 0) {
          const player = next.find((c) => c.isPlayer)
          if (player && !player.finished) {
            const playerProgress = player.x / TRACK_LENGTH
            const positions = next
              .filter((c) => !c.finished)
              .sort((a, b) => b.x - a.x)
            const playerRank = positions.findIndex((c) => c.isPlayer) + 1

            let msg: string | null = null
            let color = 0xffffff

            // Near finish line
            if (playerProgress > 0.8 && !nearFinishShownRef.current) {
              msg = NEAR_FINISH_MSG
              color = 0xff4444
              nearFinishShownRef.current = true
              commentaryTimerRef.current = 2.0
            }
            // Fast clicking
            else if (clickCountRef.current >= 3) {
              msg = randomFrom(ENCOURAGE_MSGS)
              color = 0xffdd00
              commentaryTimerRef.current = 1.5
            }
            // Leading
            else if (playerRank === 1 && playerProgress > 0.2) {
              msg = randomFrom(LEADING_MSGS)
              color = 0x66ff66
              commentaryTimerRef.current = 3.0
            }
            // Behind
            else if (playerRank >= 3) {
              msg = randomFrom(BEHIND_MSGS)
              color = 0xff8866
              commentaryTimerRef.current = 2.5
            }

            if (msg) {
              floatingTextsRef.current.push({
                x: START_X + player.x + 10,
                y: laneY(player.lane) - 40,
                text: msg,
                life: 50,
                maxLife: 50,
                color,
              })
            }
          }
        }

        if (newFinishCount !== finishCountRef.current) {
          finishCountRef.current = newFinishCount
          setFinishOrder(order)

          // Check if player finished
          const playerChick = next.find((c) => c.isPlayer)
          if (playerChick?.finished && playerPlace === 0) {
            setPlayerPlace(playerChick.finishOrder)

            // If player wins, spawn confetti
            if (playerChick.finishOrder === 1 && !winCelebrationDoneRef.current) {
              winCelebrationDoneRef.current = true
              const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffdd00, 0xff88ff, 0x44ffff]
              for (let i = 0; i < 40; i++) {
                confettiRef.current.push({
                  x: CANVAS_W / 2 + (Math.random() - 0.5) * 400,
                  y: -20 - Math.random() * 60,
                  vx: (Math.random() - 0.5) * 4,
                  vy: 1 + Math.random() * 2,
                  life: 80 + Math.random() * 40,
                  maxLife: 120,
                  color: colors[Math.floor(Math.random() * colors.length)],
                  size: 4 + Math.random() * 6,
                  rotation: Math.random() * Math.PI * 2,
                  rotSpeed: (Math.random() - 0.5) * 0.3,
                })
              }

              // Big winner text
              floatingTextsRef.current.push({
                x: CANVAS_W / 2,
                y: CANVAS_H / 2 - 40,
                text: '冠军！',
                life: 90,
                maxLife: 90,
                color: 0xffd700,
              })
            }
          }

          // All done?
          if (newFinishCount >= NUM_LANES) {
            setRaceState('done')
          }
        }

        return next
      })

      setDustClouds([...dustRef.current])
      setSpeedLines([...speedLinesRef.current])
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
      incrementStat('racesWon')
      gameWin()
    } else {
      gameLose()
    }
  }, [raceState, playerPlace, addCoins, boostAllChickMood, incrementStat])

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
    // Effect states
    shakeOffset,
    playerScaleXBoost,
    playerGlowAlpha,
    sparks,
    dustClouds,
    speedLines,
    floatingTexts,
    confetti,
    stars,
    winnerLane,
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
          小鸡赛跑
        </div>
        <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.85 }}>
          选择你的小鸡，疯狂点击加速！
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

  if (phase === 'playing' && raceState === 'selecting') {
    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.45)' }}>
        <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>
          选择你的小鸡！
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
          出发！
        </button>
      </div>
    )
  }

  if (phase === 'playing' && raceState === 'countdown') {
    const isGo = countdown === 0
    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
        <div
          key={countdown} // re-mount for animation reset
          style={{
            fontSize: isGo ? 96 : 88,
            fontWeight: 'bold',
            color: isGo ? '#ff3333' : '#ffcc00',
            textShadow: isGo
              ? '0 0 40px rgba(255,50,50,0.8), 0 4px 16px rgba(0,0,0,0.5)'
              : '0 0 30px rgba(255,200,0,0.6), 0 4px 16px rgba(0,0,0,0.5)',
            animation: 'countdown-pulse 0.8s ease-out',
          }}
        >
          {isGo ? '出发！' : countdown}
        </div>
        <style>{`
          @keyframes countdown-pulse {
            0% { transform: scale(2); opacity: 0.3; }
            30% { opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
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
        疯狂点击加速！
      </div>
    )
  }

  if (phase === 'ended') {
    const placeText = `第${playerPlace}名`

    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
          比赛结束！
        </div>
        <div style={{ fontSize: 24, marginBottom: 4 }}>
          你的小鸡获得了{placeText}！
        </div>
        {coinsEarned > 0 && (
          <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 4 }}>
            获得金币：+{coinsEarned}
          </div>
        )}
        {playerPlace === 1 && (
          <div style={{ fontSize: 16, color: '#ffd93d', marginBottom: 8 }}>
            大吉大利，今晚吃鸡！
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

  return null
}
