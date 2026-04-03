import { GameCanvas } from './components/GameCanvas'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <GameCanvas width={960} height={640} />
    </div>
  )
}

export default App
