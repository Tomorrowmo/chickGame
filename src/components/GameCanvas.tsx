import { useCallback, useRef, useState } from 'react'
import { Application, extend, useTick } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import { Background } from './Background'
import { Sky } from './scene/Sky'
import { Clouds } from './scene/Cloud'
import { Pond } from './scene/Pond'
import { Bushes } from './scene/Bush'
import { Fence } from './scene/Fence'
import { Flowers } from './scene/Flowers'
import { Coop } from './scene/Coop'
import { Chick } from './Chick'
import { ClickEffects } from './ClickEffects'
import { HatchEffect } from './HatchEffect'
import { FoodParticles } from './FoodParticles'
import { SwipeTrail } from './SwipeTrail'
import { DirtSpots } from './DirtSpots'
import { HideAndSeekGame, HideAndSeekPixi } from '../games/HideAndSeek'
import { ChickRaceGame, ChickRacePixi, ChickRaceOverlay } from '../games/ChickRace'
import { FetchGame, FetchPixi, FetchInputLayer, FetchOverlay } from '../games/Fetch'
import { GameOverlay } from '../games/GameOverlay'
import { useGameStore, type PlacedDecoration } from '../store/gameStore'
import { useClickEffectsStore } from '../systems/clickEffects'
import { updateChickAI } from '../systems/chickAI'
import { chirp, feed, splash as splashSound } from '../systems/audio'
import type { ChickData } from '../types/chick'
import type { FederatedPointerEvent } from 'pixi.js'

extend({ Container, Graphics, Text })

interface GameCanvasProps {
  width: number
  height: number
}

const GRASS_RATIO = 0.6
const CURSOR_ATTRACT_RADIUS = 100

/** Pond ellipse for click detection (matches Pond.tsx defaults) */
const POND_X = 700
const POND_Y = 500
const POND_RX = 70
const POND_RY = 35

function isInsidePond(x: number, y: number): boolean {
  const dx = (x - POND_X) / POND_RX
  const dy = (y - POND_Y) / POND_RY
  return dx * dx + dy * dy <= 1
}

/** Shared held chick id so GameLoop can skip AI for held chicks */
let _heldChickId: string | null = null

/** Returns a random x position within the grass area */
export function randomGrassX(width: number): number {
  const margin = 60
  return margin + Math.random() * (width - margin * 2)
}

/** Returns a random y position within the grass area (lower portion of screen) */
export function randomGrassY(height: number): number {
  const grassTop = height * 0.55
  const grassBottom = height - 40
  return grassTop + Math.random() * (grassBottom - grassTop)
}

/** Inner component that drives the game loop via useTick (must be inside <Application>) */
const FOOD_DETECT_RADIUS = 200
const FOOD_EAT_RADIUS = 10

function GameLoop() {
  const chicks = useGameStore((s) => s.chicks)
  const tick = useGameStore((s) => s.tick)
  const updateChick = useGameStore((s) => s.updateChick)
  const currentGame = useGameStore((s) => s.currentGame)
  const gameTime = useGameStore((s) => s.gameTime)

  useTick((ticker) => {
    const delta = ticker.deltaTime

    // When a mini-game is active, pause normal AI and stat ticking
    if (currentGame) return

    // Update hunger / mood / growth
    tick(delta)

    // Read cursor state for attraction logic
    const { cursorX, cursorY, cursorOnGrass, swipeActive, swipeTargetX, swipeTargetY } = useClickEffectsStore.getState()

    // Get food particles for chick-food interaction
    const { foodParticles, removeFoodParticle, feedChickWithFood } =
      useGameStore.getState()

    // Get latest chicks for AI (includes tick updates)
    const latestChicks = useGameStore.getState().chicks

    // Get held chick id (skip AI for held chicks)
    const heldId = _heldChickId

    // Track how many chicks are following the cursor this tick (max 2)
    let cursorFollowers = 0
    const MAX_CURSOR_FOLLOWERS = 2

    // Run AI for each chick
    for (const chick of latestChicks) {
      if (chick.stage === 'egg' || chick.stage === 'hatching') continue
      if (chick.id === heldId) continue // skip AI for held chick

      // Check for nearby food particles first
      let chasingFood = false
      if (foodParticles.length > 0) {
        // Find closest uneaten food
        let closestFood = null
        let closestDist = Infinity
        for (const food of foodParticles) {
          if (food.eaten || food.scale <= 0) continue
          const dx = food.x - chick.x
          const dy = food.y - chick.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < FOOD_DETECT_RADIUS && dist < closestDist) {
            closestDist = dist
            closestFood = food
          }
        }

        if (closestFood) {
          if (closestDist < FOOD_EAT_RADIUS) {
            // Chick reached food - eat it
            feedChickWithFood(chick.id, closestFood.type)
            removeFoodParticle(closestFood.id)
            // Pecking motion: small y offset
            updateChick(chick.id, {
              currentAction: 'eating',
            })
          } else {
            // Chase the food
            const dx = closestFood.x - chick.x
            const dy = closestFood.y - chick.y
            const dist = closestDist
            const speed = 1.5 * delta
            updateChick(chick.id, {
              x: chick.x + (dx / dist) * speed,
              y: chick.y + (dy / dist) * speed,
              targetX: closestFood.x,
              targetY: closestFood.y,
              direction: dx > 0 ? 'right' : 'left',
              currentAction: 'chasing',
            })
          }
          chasingFood = true
        }
      }

      if (chasingFood) continue

      // Swipe chase: chicks get excited and chase toward swipe target
      if (swipeActive) {
        const dx = swipeTargetX - chick.x
        const dy = swipeTargetY - chick.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 300 && dist > 10) {
          const speed = 1.8 * delta
          updateChick(chick.id, {
            x: chick.x + (dx / dist) * speed,
            y: chick.y + (dy / dist) * speed,
            currentAction: 'chasing',
            targetX: swipeTargetX,
            targetY: swipeTargetY,
            direction: dx > 0 ? 'right' : 'left',
          })
          continue // skip normal AI for this chick
        }
      }

      // Cursor-following: max 2 chicks, only occasionally re-evaluate (not every frame)
      if (cursorOnGrass && cursorFollowers < MAX_CURSOR_FOLLOWERS && Math.random() < 0.002) {
        const dx = cursorX - chick.x
        const dy = cursorY - chick.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CURSOR_ATTRACT_RADIUS && dist > 5) {
          const followChance =
            chick.mood === 'happy' ? 0.2 :
            chick.mood === 'normal' ? 0.05 :
            0
          if (followChance > 0 && Math.random() < followChance) {
            updateChick(chick.id, {
              currentAction: 'walking',
              targetX: cursorX,
              targetY: cursorY,
              direction: dx > 0 ? 'right' : 'left',
            })
            cursorFollowers++
            continue
          }
        }
      }

      const { pondSplashTime } = useClickEffectsStore.getState()
      const updates = updateChickAI(chick, delta, latestChicks, gameTime, pondSplashTime)
      if (Object.keys(updates).length > 0) {
        updateChick(chick.id, updates)
      }
    }
  })

  return null
}

function drawDecoration(g: import('pixi.js').Graphics, deco: PlacedDecoration) {
  g.clear()
  switch (deco.type) {
    case 'sunflower':
      // Stem
      g.rect(-2, -20, 4, 20).fill(0x228b22)
      // Petals
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const px = Math.cos(angle) * 10
        const py = -20 + Math.sin(angle) * 10
        g.circle(px, py, 5).fill(0xffd700)
      }
      // Center
      g.circle(0, -20, 5).fill(0x8b4513)
      break
    case 'mushroom':
      // Stem
      g.rect(-4, -8, 8, 12).fill(0xfaebd7)
      // Cap
      g.circle(0, -8, 10).fill(0xff6347)
      // Dots
      g.circle(-4, -10, 2).fill(0xffffff)
      g.circle(4, -10, 2).fill(0xffffff)
      g.circle(0, -14, 2).fill(0xffffff)
      break
    case 'rock':
      // Simple rock shape using overlapping ellipses
      g.ellipse(0, 0, 12, 8).fill(0x808080)
      g.ellipse(-3, -2, 8, 6).fill(0x999999)
      break
    case 'birdhouse':
      // Post
      g.rect(-2, -5, 4, 25).fill(0x8b4513)
      // House body
      g.rect(-12, -20, 24, 18).fill(0xdeb887)
      // Roof
      g.poly([-15, -20, 0, -30, 15, -20]).fill(0xa0522d)
      // Door hole
      g.circle(0, -13, 4).fill(0x3e2723)
      break
  }
}

function Decorations() {
  const decorations = useGameStore((s) => s.decorations)
  return (
    <>
      {decorations.map((deco) => (
        <pixiGraphics
          key={deco.id}
          x={deco.x}
          y={deco.y}
          draw={(g: import('pixi.js').Graphics) => drawDecoration(g, deco)}
        />
      ))}
    </>
  )
}

interface ActiveHatchEffect {
  id: string
  x: number
  y: number
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  const chicks = useGameStore((s) => s.chicks)
  const selectChick = useGameStore((s) => s.selectChick)
  const petChick = useGameStore((s) => s.petChick)
  const updateChick = useGameStore((s) => s.updateChick)
  const feedingMode = useGameStore((s) => s.feedingMode)
  const selectedFood = useGameStore((s) => s.selectedFood)
  const scatterFood = useGameStore((s) => s.scatterFood)
  const currentGame = useGameStore((s) => s.currentGame)
  const cleaningMode = useGameStore((s) => s.cleaningMode)
  const addEffect = useClickEffectsStore((s) => s.addEffect)
  const setCursor = useClickEffectsStore((s) => s.setCursor)
  const triggerPondSplash = useClickEffectsStore((s) => s.triggerPondSplash)
  const addSwipeTrail = useClickEffectsStore((s) => s.addSwipeTrail)
  const setSwipeTarget = useClickEffectsStore((s) => s.setSwipeTarget)

  // Hide-and-seek game state (hook is always called, but only active when currentGame === 'hideAndSeek')
  const hideAndSeek = HideAndSeekGame()
  // Chick race game state (hook is always called, but only active when currentGame === 'race')
  const chickRace = ChickRaceGame()
  // Fetch game state (hook is always called, but only active when currentGame === 'fetch')
  const fetchGame = FetchGame()

  // Held chick state
  const [heldChickId, setHeldChickId] = useState<string | null>(null)
  const cursorPosRef = useRef({ x: 0, y: 0 })
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  // Swipe detection state
  const prevPointerRef = useRef({ x: 0, y: 0 })

  const [hatchEffects, setHatchEffects] = useState<ActiveHatchEffect[]>([])

  const handleHatch = useCallback((data: ChickData) => {
    const id = `hatch-${data.id}-${Date.now()}`
    setHatchEffects((prev) => [...prev, { id, x: data.x, y: data.y }])
  }, [])

  const removeHatchEffect = useCallback((id: string) => {
    setHatchEffects((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const grassY = height * GRASS_RATIO

  const handleChickClick = useCallback(
    (data: ChickData) => {
      selectChick(data.id)
      petChick(data.id)
      chirp()

      // Spawn a heart effect at the chick position
      addEffect('heart', data.x, data.y - 20)

      // Nearby chicks turn to look at the clicked chick
      const allChicks = useGameStore.getState().chicks
      for (const other of allChicks) {
        if (other.id === data.id) continue
        if (other.stage === 'egg' || other.stage === 'hatching') continue
        const dx = data.x - other.x
        const dy = data.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          updateChick(other.id, {
            direction: dx > 0 ? 'right' : 'left',
          })
        }
      }
    },
    [selectChick, petChick, addEffect, updateChick],
  )

  /** Handle chick pickup (long press) */
  const handleChickPickup = useCallback(
    (data: ChickData) => {
      setHeldChickId(data.id)
      _heldChickId = data.id
      chirp()
      addEffect('heart', data.x, data.y - 20)
    },
    [addEffect],
  )

  /** Handle chick release (pointer up while holding) */
  const handleChickRelease = useCallback(
    (data: ChickData) => {
      if (!heldChickId) return
      const pos = cursorPosRef.current

      // Clamp to grass area
      const margin = 60
      const grassTop = height * 0.55
      const grassBottom = height - 40
      const clampedX = Math.max(margin, Math.min(width - margin, pos.x))
      const clampedY = Math.max(grassTop, Math.min(grassBottom, pos.y))

      // Update chick position and boost mood (+20)
      const chick = useGameStore.getState().chicks.find((c) => c.id === data.id)
      const newMood = Math.min(100, (chick?.moodValue ?? 50) + 20)
      updateChick(data.id, {
        x: clampedX,
        y: clampedY,
        targetX: clampedX,
        targetY: clampedY,
        moodValue: newMood,
      })

      // Nearby chicks look up curiously
      const allChicks = useGameStore.getState().chicks
      for (const other of allChicks) {
        if (other.id === data.id) continue
        if (other.stage === 'egg' || other.stage === 'hatching') continue
        const dx = clampedX - other.x
        const dy = clampedY - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          updateChick(other.id, {
            direction: dx > 0 ? 'right' : 'left',
          })
        }
      }

      setHeldChickId(null)
      _heldChickId = null
    },
    [heldChickId, height, width, updateChick],
  )

  /** Handle background pointer up — releases held chick if clicking on background */
  const handleBackgroundPointerUp = useCallback(
    (_e: FederatedPointerEvent) => {
      if (heldChickId) {
        const chick = chicks.find((c) => c.id === heldChickId)
        if (chick) {
          handleChickRelease(chick)
        }
      }
    },
    [heldChickId, chicks, handleChickRelease],
  )

  /** Handle clicks on the background (not on a chick) */
  const handleBackgroundClick = useCallback(
    (e: FederatedPointerEvent) => {
      // Don't trigger background effects while holding a chick
      if (heldChickId) return

      const pos = e.global
      const x = pos.x
      const y = pos.y

      // Pond splash: detect click inside the pond ellipse
      if (isInsidePond(x, y)) {
        addEffect('splash', x, y)
        triggerPondSplash()
        splashSound()

        // Attract nearby chicks toward the pond (+5 mood for chicks already close)
        const allChicks = useGameStore.getState().chicks
        for (const chick of allChicks) {
          if (chick.stage === 'egg' || chick.stage === 'hatching') continue
          const dx = POND_X - chick.x
          const dy = POND_Y - chick.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            // Walk toward pond edge
            const angle = Math.atan2(chick.y - POND_Y, chick.x - POND_X)
            const edgeX = POND_X + Math.cos(angle) * 55
            const edgeY = POND_Y + Math.sin(angle) * 30
            updateChick(chick.id, {
              currentAction: 'walking',
              targetX: edgeX,
              targetY: Math.max(400, edgeY),
              direction: dx > 0 ? 'right' : 'left',
              moodValue: Math.min(100, chick.moodValue + 5),
            })
          }
        }
        return
      }

      // Feeding mode: scatter food on grass
      if (feedingMode && selectedFood && y > grassY) {
        scatterFood(selectedFood, x, y)
        feed()
        return
      }

      if (y > grassY) {
        // Clicked on grass area: sprout a flower
        addEffect('flower', x, y)
      } else {
        // Clicked on sky area: spawn a cloud or butterfly
        const type = Math.random() < 0.5 ? 'cloud' : 'butterfly'
        addEffect(type, x, y)
      }
    },
    [addEffect, grassY, feedingMode, selectedFood, scatterFood, heldChickId, triggerPondSplash, updateChick],
  )

  /** Track cursor position for chick attraction, held chick, and swipe detection */
  const SWIPE_VELOCITY_THRESHOLD = 8
  const handlePointerMove = useCallback(
    (e: FederatedPointerEvent) => {
      const pos = e.global
      const x = pos.x
      const y = pos.y
      setCursor(x, y, y > grassY)
      cursorPosRef.current = { x, y }
      if (heldChickId) {
        setCursorPos({ x, y })
      }

      // Swipe detection: compute distance from previous pointer position
      const prev = prevPointerRef.current
      const dx = x - prev.x
      const dy = y - prev.y
      const velocity = Math.sqrt(dx * dx + dy * dy)
      prevPointerRef.current = { x, y }

      if (velocity > SWIPE_VELOCITY_THRESHOLD && y > grassY) {
        // It's a swipe on grass - spawn trail particles and set swipe target
        addSwipeTrail(x, y)
        setSwipeTarget(x, y)
      }
    },
    [setCursor, grassY, heldChickId, addSwipeTrail, setSwipeTarget],
  )

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        cursor: cleaningMode ? 'crosshair' : feedingMode ? 'crosshair' : 'default',
      }}
    >
      <div style={{
        position: 'relative',
        zIndex: 1,
        pointerEvents: (currentGame && (
          (currentGame === 'hideAndSeek' && hideAndSeek.phase !== 'playing') ||
          (currentGame === 'race' && chickRace.phase !== 'playing') ||
          (currentGame === 'fetch' && fetchGame.phase !== 'playing')
        )) ? 'none' : 'auto',
      }}>
      <Application width={width} height={height} background="#87CEEB">
        <pixiContainer
          eventMode="static"
          onPointerDown={handleBackgroundClick}
          onPointerUp={handleBackgroundPointerUp}
          onPointerMove={handlePointerMove}
          hitArea={{ contains: () => true }}
          sortableChildren
        >
          <GameLoop />
          <Background width={width} height={height} />
          <Sky width={width} height={height} />
          <Clouds />
          <Pond />
          <Fence width={width} />
          <Flowers />
          <Bushes />
          <Coop />
          <Decorations />
          <ClickEffects />
          <FoodParticles />
          <SwipeTrail />
          <DirtSpots />
          {chicks.map((chick) => (
            <Chick
              key={chick.id}
              data={chick}
              onClick={handleChickClick}
              onHatch={handleHatch}
              isHeld={heldChickId === chick.id}
              onPickup={handleChickPickup}
              onRelease={handleChickRelease}
              holdCursorX={heldChickId === chick.id ? cursorPos.x : undefined}
              holdCursorY={heldChickId === chick.id ? cursorPos.y : undefined}
            />
          ))}
          {hatchEffects.map((effect) => (
            <HatchEffect
              key={effect.id}
              x={effect.x}
              y={effect.y}
              onComplete={() => removeHatchEffect(effect.id)}
            />
          ))}
          {currentGame === 'hideAndSeek' && (
            <HideAndSeekPixi
              hiddenChicks={hideAndSeek.hiddenChicks}
              onClickChick={hideAndSeek.handleClickChick}
            />
          )}
          {currentGame === 'race' && (
            <>
              <chickRace.RaceUpdater />
              <ChickRacePixi
                raceChicks={chickRace.raceChicks}
                raceState={chickRace.raceState}
                countdown={chickRace.countdown}
                onClickTrack={chickRace.handleClickTrack}
                shakeOffset={chickRace.shakeOffset}
                playerScaleXBoost={chickRace.playerScaleXBoost}
                playerGlowAlpha={chickRace.playerGlowAlpha}
                sparks={chickRace.sparks}
                dustClouds={chickRace.dustClouds}
                speedLines={chickRace.speedLines}
                floatingTexts={chickRace.floatingTexts}
                confetti={chickRace.confetti}
                stars={chickRace.stars}
                winnerLane={chickRace.winnerLane}
              />
            </>
          )}
          {currentGame === 'fetch' && (
            <>
              <fetchGame.FetchUpdater
                fetchState={fetchGame.fetchState}
                setFetchState={fetchGame.handleFetchStateChange}
                ball={fetchGame.ball}
                setBall={fetchGame.setBall}
                chick={fetchGame.chick}
                setChick={fetchGame.setChick}
              />
              <FetchPixi
                fetchState={fetchGame.fetchState}
                ball={fetchGame.ball}
                chick={fetchGame.chick}
                round={fetchGame.round}
                dragStart={fetchGame.dragStart}
                dragEnd={fetchGame.dragEnd}
                isDragging={fetchGame.isDragging}
              />
              <FetchInputLayer
                onDragStart={fetchGame.handleDragStart}
                onDragMove={fetchGame.handleDragMove}
                onDragEnd={fetchGame.handleDragEnd}
              />
            </>
          )}
        </pixiContainer>
      </Application>
      </div>
      {currentGame === 'hideAndSeek' && (
        <GameOverlay
          title="躲猫猫"
          phase={hideAndSeek.phase}
          timeLeft={hideAndSeek.timeLeft}
          score={hideAndSeek.score}
          maxScore={hideAndSeek.totalChicks}
          instructions="找到躲在灌木丛后面偷看的小鸡！"
          onStart={hideAndSeek.handleStart}
          onPlayAgain={hideAndSeek.handlePlayAgain}
          onExit={hideAndSeek.handleExit}
        />
      )}
      {currentGame === 'race' && (
        <ChickRaceOverlay
          phase={chickRace.phase}
          raceState={chickRace.raceState}
          selectedLane={chickRace.selectedLane}
          countdown={chickRace.countdown}
          playerPlace={chickRace.playerPlace}
          coinsEarned={chickRace.coinsEarned}
          onStart={chickRace.handleStart}
          onSelectLane={chickRace.handleSelectLane}
          onConfirmSelection={chickRace.handleConfirmSelection}
          onPlayAgain={chickRace.handlePlayAgain}
          onExit={chickRace.handleExit}
        />
      )}
      {currentGame === 'fetch' && (
        <FetchOverlay
          phase={fetchGame.phase}
          fetchState={fetchGame.fetchState}
          round={fetchGame.round}
          totalScore={fetchGame.totalScore}
          streak={fetchGame.streak}
          roundScore={fetchGame.roundScore}
          coinsEarned={fetchGame.coinsEarned}
          onStart={fetchGame.handleStart}
          onPlayAgain={fetchGame.handlePlayAgain}
          onExit={fetchGame.handleExit}
        />
      )}
    </div>
  )
}
