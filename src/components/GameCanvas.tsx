import { Application, extend } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import { Background } from './Background'
import { Chick } from './Chick'
import type { ChickData } from '../types/chick'

extend({ Container, Graphics, Text })

interface GameCanvasProps {
  width: number
  height: number
}

const TEST_CHICKS: ChickData[] = [
  {
    id: 'test-1',
    name: 'Sunny',
    breed: 'leghorn',
    rarity: 'common',
    stage: 'egg',
    mood: 'normal',
    moodValue: 60,
    hunger: 30,
    x: 200,
    y: 450,
    targetX: 200,
    targetY: 450,
    direction: 'right',
    currentAction: 'idle',
    growthProgress: 20,
    birthTime: Date.now(),
  },
  {
    id: 'test-2',
    name: 'Peep',
    breed: 'silkie',
    rarity: 'special',
    stage: 'baby',
    mood: 'happy',
    moodValue: 90,
    hunger: 50,
    x: 400,
    y: 480,
    targetX: 400,
    targetY: 480,
    direction: 'right',
    currentAction: 'idle',
    growthProgress: 45,
    birthTime: Date.now() - 60000,
  },
  {
    id: 'test-3',
    name: 'Clucky',
    breed: 'plymouth',
    rarity: 'rare',
    stage: 'adult',
    mood: 'bored',
    moodValue: 30,
    hunger: 70,
    x: 600,
    y: 500,
    targetX: 600,
    targetY: 500,
    direction: 'left',
    currentAction: 'idle',
    growthProgress: 100,
    birthTime: Date.now() - 300000,
  },
]

export function GameCanvas({ width, height }: GameCanvasProps) {
  return (
    <Application width={width} height={height} background="#87CEEB">
      <pixiContainer>
        <Background width={width} height={height} />
        {TEST_CHICKS.map((chick) => (
          <Chick key={chick.id} data={chick} />
        ))}
      </pixiContainer>
    </Application>
  )
}
