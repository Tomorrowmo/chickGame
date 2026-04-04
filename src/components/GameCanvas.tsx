import { useCallback, useState } from 'react'
import { Application, extend, useTick } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import { Background } from './Background'
import { Clouds } from './scene/Cloud'
import { Pond } from './scene/Pond'
import { Bushes } from './scene/Bush'
import { Fence } from './scene/Fence'
import { Flowers } from './scene/Flowers'
import { Chick } from './Chick'
import { ClickEffects } from './ClickEffects'
import { HatchEffect } from './HatchEffect'
import { FoodParticles } from './FoodParticles'
import { HideAndSeekGame, HideAndSeekPixi } from '../games/HideAndSeek'
import { ChickRaceGame, ChickRacePixi, ChickRaceOverlay } from '../games/ChickRace'
import { FetchGame, FetchPixi, FetchInputLayer, FetchOverlay } from '../games/Fetch'
import { GameOverlay } from '../games/GameOverlay'
import { useGameStore, type PlacedDecoration } from '../store/gameStore'
import { useClickEffectsStore } from '../systems/clickEffects'
import { updateChickAI } from '../systems/chickAI'
import { chirp, feed } from '../systems/audio'
import type { ChickData } from '../types/chick'
import type { FederatedPointerEvent } from 'pixi.js'

extend({ Container, Graphics, Text })

interface GameCanvasProps {
  width: number
  height: number
}

const GRASS_RATIO = 0.6
const CURSOR_ATTRACT_RADIUS = 100

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

  useTick((ticker) => {
    const delta = ticker.deltaTime

    // When a mini-game is active, pause normal AI and stat ticking
    if (currentGame) return

    // Update hunger / mood / growth
    tick(delta)

    // Read cursor state for attraction logic
    const { cursorX, cursorY, cursorOnGrass } = useClickEffectsStore.getState()

    // Get food particles for chick-food interaction
    const { foodParticles, removeFoodParticle, feedChickWithFood } =
      useGameStore.getState()

    // Run AI for each chick
    for (const chick of chicks) {
      if (chick.stage === 'egg' || chick.stage === 'hatching') continue

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

      // Cursor-following: if cursor is on grass and chick is close, override target
      if (cursorOnGrass) {
        const dx = cursorX - chick.x
        const dy = cursorY - chick.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CURSOR_ATTRACT_RADIUS && dist > 5) {
          updateChick(chick.id, {
            currentAction: 'walking',
            targetX: cursorX,
            targetY: cursorY,
            direction: dx > 0 ? 'right' : 'left',
          })
          continue // skip normal AI for this chick
        }
      }

      const updates = updateChickAI(chick, delta)
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
  const addEffect = useClickEffectsStore((s) => s.addEffect)
  const setCursor = useClickEffectsStore((s) => s.setCursor)

  // Hide-and-seek game state (hook is always called, but only active when currentGame === 'hideAndSeek')
  const hideAndSeek = HideAndSeekGame()
  // Chick race game state (hook is always called, but only active when currentGame === 'race')
  const chickRace = ChickRaceGame()
  // Fetch game state (hook is always called, but only active when currentGame === 'fetch')
  const fetchGame = FetchGame()

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

  /** Handle clicks on the background (not on a chick) */
  const handleBackgroundClick = useCallback(
    (e: FederatedPointerEvent) => {
      const pos = e.global
      const x = pos.x
      const y = pos.y

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
    [addEffect, grassY, feedingMode, selectedFood, scatterFood],
  )

  /** Track cursor position for chick attraction */
  const handlePointerMove = useCallback(
    (e: FederatedPointerEvent) => {
      const pos = e.global
      setCursor(pos.x, pos.y, pos.y > grassY)
    },
    [setCursor, grassY],
  )

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        cursor: feedingMode ? 'crosshair' : 'default',
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
          onPointerMove={handlePointerMove}
          hitArea={{ contains: () => true }}
        >
          <GameLoop />
          <Background width={width} height={height} />
          <Clouds />
          <Pond />
          <Fence width={width} />
          <Flowers />
          <Bushes />
          <Decorations />
          <ClickEffects />
          <FoodParticles />
          {chicks.map((chick) => (
            <Chick
              key={chick.id}
              data={chick}
              onClick={handleChickClick}
              onHatch={handleHatch}
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
