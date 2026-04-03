import { useCallback } from 'react'
import { Application, extend, useTick } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import { Background } from './Background'
import { Chick } from './Chick'
import { useGameStore } from '../store/gameStore'
import { updateChickAI } from '../systems/chickAI'
import type { ChickData } from '../types/chick'

extend({ Container, Graphics, Text })

interface GameCanvasProps {
  width: number
  height: number
}

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

    // Run AI for each chick
    for (const chick of chicks) {
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

  const handleAddEgg = useCallback(() => {
    addEgg(randomGrassX(width), randomGrassY(height))
  }, [addEgg, width, height])

  const handleChickClick = useCallback(
    (data: ChickData) => {
      selectChick(data.id)
    },
    [selectChick],
  )

  return (
    <div style={{ position: 'relative', width, height }}>
      <Application width={width} height={height} background="#87CEEB">
        <pixiContainer>
          <GameLoop />
          <Background width={width} height={height} />
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
