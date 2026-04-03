import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { Background } from './Background'

extend({ Container, Graphics })

interface GameCanvasProps {
  width: number
  height: number
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  return (
    <Application width={width} height={height} background="#87CEEB">
      <pixiContainer>
        <Background width={width} height={height} />
      </pixiContainer>
    </Application>
  )
}
