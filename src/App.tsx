import { useCallback } from 'react'
import { GameCanvas, randomGrassX, randomGrassY } from './components/GameCanvas'
import { TopBar } from './components/ui/TopBar'
import { ChickInfoPanel } from './components/ui/ChickInfoPanel'
import { Toolbar } from './components/ui/Toolbar'
import { useGameStore } from './store/gameStore'
import './App.css'

const GAME_WIDTH = 960
const GAME_HEIGHT = 640

function App() {
  const addEgg = useGameStore((s) => s.addEgg)

  const handleAddEgg = useCallback(() => {
    addEgg(randomGrassX(GAME_WIDTH), randomGrassY(GAME_HEIGHT))
  }, [addEgg])

  return (
    <div className="app-container">
      <div style={{ position: 'relative', width: GAME_WIDTH, height: GAME_HEIGHT }}>
        <GameCanvas width={GAME_WIDTH} height={GAME_HEIGHT} />
        <TopBar />
        <ChickInfoPanel />
        <Toolbar onAddEgg={handleAddEgg} />
      </div>
    </div>
  )
}

export default App
