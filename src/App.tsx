import { useEffect, useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { TopBar } from './components/ui/TopBar'
import { ChickInfoPanel } from './components/ui/ChickInfoPanel'
import { Toolbar } from './components/ui/Toolbar'
import { Shop } from './components/ui/Shop'
import { AchievementPanel, AchievementToast } from './components/ui/Achievements'
import { Tutorial } from './components/ui/Tutorial'
import './App.css'

const GAME_WIDTH = 1440
const GAME_HEIGHT = 900
const TOOLBAR_HEIGHT = 72

function useResponsiveScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      const totalH = GAME_HEIGHT + TOOLBAR_HEIGHT
      const s = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / totalH)
      setScale(s)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return scale
}

function App() {
  const [loading, setLoading] = useState(true)
  const scale = useResponsiveScale()

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-chick">🐣</div>
          <div className="loading-text">小鸡们正在准备中...</div>
          <div className="loading-subtext">小鸡宠物乐园加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Tutorial />
      <AchievementToast />
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        width: GAME_WIDTH,
        height: GAME_HEIGHT + TOOLBAR_HEIGHT,
        flexShrink: 0,
      }}>
        <div
          className="game-wrapper"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        >
          <GameCanvas width={GAME_WIDTH} height={GAME_HEIGHT} />
          <TopBar />
          <ChickInfoPanel />
          <Shop />
          <AchievementPanel />
        </div>
        <Toolbar />
      </div>
    </div>
  )
}

export default App
