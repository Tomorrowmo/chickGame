import { useCallback } from 'react'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

export type GamePhase = 'ready' | 'playing' | 'ended'

interface GameOverlayProps {
  title: string
  phase: GamePhase
  timeLeft: number
  score: number
  maxScore: number
  instructions: string
  onStart: () => void
  onPlayAgain: () => void
  onExit: () => void
}

const overlayBase: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily,
  color: '#fff',
  zIndex: 20,
  pointerEvents: 'auto',
}

const btnStyle: React.CSSProperties = {
  padding: '10px 28px',
  fontSize: 18,
  fontFamily,
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
  transition: 'transform 0.1s',
}

export function GameOverlay({
  title,
  phase,
  timeLeft,
  score,
  maxScore,
  instructions,
  onStart,
  onPlayAgain,
  onExit,
}: GameOverlayProps) {
  const handleStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onStart()
    },
    [onStart],
  )

  if (phase === 'ready') {
    return (
      <div
        style={{
          ...overlayBase,
          background: 'rgba(0,0,0,0.55)',
        }}
        onClick={handleStart}
      >
        <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 12 }}>
          {title}
        </div>
        <div style={{ fontSize: 16, marginBottom: 8, opacity: 0.85 }}>
          {instructions}
        </div>
        <div
          style={{
            fontSize: 22,
            marginTop: 20,
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 16,
            cursor: 'pointer',
          }}
        >
          Ready? Click to start!
        </div>
      </div>
    )
  }

  if (phase === 'playing') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          fontFamily,
          color: '#fff',
          zIndex: 20,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.4)',
          padding: '6px 24px',
          borderRadius: 14,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{title}</div>
        <div style={{ fontSize: 18 }}>
          Time: <span style={{ color: timeLeft <= 5 ? '#ff6b6b' : '#ffd93d', fontWeight: 'bold' }}>{timeLeft}s</span>
        </div>
        <div style={{ fontSize: 18 }}>
          Found: <span style={{ fontWeight: 'bold' }}>{score}/{maxScore}</span>
        </div>
      </div>
    )
  }

  // phase === 'ended'
  const allFound = score >= maxScore
  return (
    <div
      style={{
        ...overlayBase,
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
        Game Over!
      </div>
      <div style={{ fontSize: 22, marginBottom: 4 }}>
        You found {score} of {maxScore} chicks!
      </div>
      <div style={{ fontSize: 18, opacity: 0.8, marginBottom: 4 }}>
        Coins earned: +{score * 10}{allFound ? ' +20 bonus!' : ''}
      </div>
      {allFound && (
        <div style={{ fontSize: 16, color: '#ffd93d', marginBottom: 8 }}>
          Perfect! All chicks found!
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <button
          onClick={onPlayAgain}
          style={{
            ...btnStyle,
            background: '#4caf50',
            color: '#fff',
          }}
        >
          Play Again
        </button>
        <button
          onClick={onExit}
          style={{
            ...btnStyle,
            background: '#78909c',
            color: '#fff',
          }}
        >
          Exit
        </button>
      </div>
    </div>
  )
}
