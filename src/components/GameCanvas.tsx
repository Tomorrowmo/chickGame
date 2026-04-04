import { useCallback } from 'react'
import { Application, extend, useTick } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import { Background } from './Background'
import { Chick } from './Chick'
import { ClickEffects } from './ClickEffects'
import { useGameStore } from '../store/gameStore'
import { useClickEffectsStore } from '../systems/clickEffects'
import { updateChickAI } from '../systems/chickAI'
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
function randomGrassX(width: number): number {
  const margin = 60
  return margin + Math.random() * (width - margin * 2)
}

/** Returns a random y position within the grass area (lower portion of screen) */
function randomGrassY(height: number): number {
  const grassTop = height * 0.55
  const grassBottom = height - 40
  return grassTop + Math.random() * (grassBottom - grassTop)
}

/** Inner component that drives the game loop via useTick (must be inside <Application>) */
function GameLoop() {
  const chicks = useGameStore((s) => s.chicks)
  const tick = useGameStore((s) => s.tick)
  const updateChick = useGameStore((s) => s.updateChick)

  useTick((ticker) => {
    const delta = ticker.deltaTime
    // Update hunger / mood / growth
    tick(delta)

    // Read cursor state for attraction logic
    const { cursorX, cursorY, cursorOnGrass } = useClickEffectsStore.getState()

    // Run AI for each chick
    for (const chick of chicks) {
      // Cursor-following: if cursor is on grass and chick is close, override target
      if (cursorOnGrass && chick.stage !== 'egg' && chick.stage !== 'hatching') {
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

export function GameCanvas({ width, height }: GameCanvasProps) {
  const chicks = useGameStore((s) => s.chicks)
  const addEgg = useGameStore((s) => s.addEgg)
  const selectChick = useGameStore((s) => s.selectChick)
  const petChick = useGameStore((s) => s.petChick)
  const updateChick = useGameStore((s) => s.updateChick)
  const addEffect = useClickEffectsStore((s) => s.addEffect)
  const setCursor = useClickEffectsStore((s) => s.setCursor)

  const grassY = height * GRASS_RATIO

  const handleAddEgg = useCallback(() => {
    addEgg(randomGrassX(width), randomGrassY(height))
  }, [addEgg, width, height])

  const handleChickClick = useCallback(
    (data: ChickData) => {
      selectChick(data.id)
      petChick(data.id)

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

      if (y > grassY) {
        // Clicked on grass area: sprout a flower
        addEffect('flower', x, y)
      } else {
        // Clicked on sky area: spawn a cloud or butterfly
        const type = Math.random() < 0.5 ? 'cloud' : 'butterfly'
        addEffect(type, x, y)
      }
    },
    [addEffect, grassY],
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
    <div style={{ position: 'relative', width, height }}>
      <Application width={width} height={height} background="#87CEEB">
        <pixiContainer
          eventMode="static"
          onPointerDown={handleBackgroundClick}
          onPointerMove={handlePointerMove}
          hitArea={{ contains: () => true }}
        >
          <GameLoop />
          <Background width={width} height={height} />
          <ClickEffects />
          {chicks.map((chick) => (
            <Chick key={chick.id} data={chick} onClick={handleChickClick} />
          ))}
        </pixiContainer>
      </Application>
      <button
        onClick={handleAddEgg}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '8px 16px',
          fontSize: 16,
          borderRadius: 8,
          border: 'none',
          background: '#f5c542',
          color: '#333',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        Add Egg
      </button>
    </div>
  )
}
