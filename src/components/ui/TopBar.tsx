import { useState, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { isMuted, toggleMute } from '../../systems/audio'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

export function TopBar() {
  const coins = useGameStore((s) => s.coins)
  const chicks = useGameStore((s) => s.chicks)
  const showSaveIndicator = useGameStore((s) => s.showSaveIndicator)
  const [muted, setMuted] = useState(isMuted)

  const handleToggleMute = useCallback(() => {
    toggleMute()
    setMuted(isMuted())
  }, [])

  const chickCount = chicks.filter(
    (c) => c.stage !== 'egg' && c.stage !== 'hatching',
  ).length
  const eggCount = chicks.filter(
    (c) => c.stage === 'egg' || c.stage === 'hatching',
  ).length

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        padding: '8px 16px',
        background: 'rgba(255, 248, 225, 0.85)',
        borderBottom: '2px solid rgba(245, 197, 66, 0.5)',
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        fontFamily,
        fontSize: 16,
        color: '#5d4037',
        zIndex: 10,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 20 }}>🪙</span>
        <span style={{ fontWeight: 'bold' }}>{coins}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 20 }}>🐤</span>
        <span style={{ fontWeight: 'bold' }}>{chickCount}</span>
      </span>
      {eggCount > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 20 }}>🥚</span>
          <span style={{ fontWeight: 'bold' }}>{eggCount}</span>
        </span>
      )}
      <span
        role="button"
        onClick={handleToggleMute}
        style={{
          fontSize: 20,
          cursor: 'pointer',
          pointerEvents: 'auto',
          opacity: 0.8,
          marginLeft: 4,
        }}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </span>
      {showSaveIndicator && (
        <span
          style={{
            fontSize: 12,
            opacity: 0.7,
            fontStyle: 'italic',
            marginLeft: 4,
          }}
        >
          Saving...
        </span>
      )}
    </div>
  )
}
