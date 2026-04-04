import { useCallback, useEffect, useState } from 'react'
import { GameCanvas, randomGrassX, randomGrassY } from './components/GameCanvas'
import { TopBar } from './components/ui/TopBar'
import { ChickInfoPanel } from './components/ui/ChickInfoPanel'
import { Toolbar } from './components/ui/Toolbar'
import { useGameStore } from './store/gameStore'
import './App.css'

const GAME_WIDTH = 960
const GAME_HEIGHT = 640
const PADDING = 24

function useResponsiveScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      const maxW = window.innerWidth - PADDING * 2
      const maxH = window.innerHeight - PADDING * 2
      const s = Math.min(maxW / GAME_WIDTH, maxH / GAME_HEIGHT, 1)
      setScale(s)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return scale
}

function App() {
  const addEgg = useGameStore((s) => s.addEgg)
  const [loading, setLoading] = useState(true)
  const scale = useResponsiveScale()

  useEffect(() => {
    // Simulate a brief loading period for the app to initialize
    const timer = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  const handleAddEgg = useCallback(() => {
    addEgg(randomGrassX(GAME_WIDTH), randomGrassY(GAME_HEIGHT))
  }, [addEgg])

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-chick">🐣</div>
          <div className="loading-text">小鸡们正在准备中...</div>
          <div className="loading-subtext">The chicks are getting ready...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div
        className="game-wrapper"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <GameCanvas width={GAME_WIDTH} height={GAME_HEIGHT} />
        <TopBar />
        <ChickInfoPanel />
        <Toolbar onAddEgg={handleAddEgg} />
      </div>
    </div>
  )
}

export default App
