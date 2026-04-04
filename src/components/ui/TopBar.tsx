import { useState, useCallback, useRef, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { isMuted, toggleMute } from '../../systems/audio'
import { formatGameTime, getTimePhase } from '../../systems/timeSystem'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

export function TopBar() {
  const coins = useGameStore((s) => s.coins)
  const chicks = useGameStore((s) => s.chicks)
  const gameTime = useGameStore((s) => s.gameTime)
  const showSaveIndicator = useGameStore((s) => s.showSaveIndicator)
  const [muted, setMuted] = useState(isMuted)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const phase = getTimePhase(gameTime)
  const timeStr = formatGameTime(gameTime)
  const timeIcon = (phase === 'night' || phase === 'sunset') ? '\u{1F319}' : '\u{2600}\u{FE0F}'

  const handleToggleMute = useCallback(() => {
    toggleMute()
    setMuted(isMuted())
  }, [])

  const handleResetTutorial = useCallback(() => {
    localStorage.removeItem('linda-tutorial-shown')
    window.location.reload()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!settingsOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen])

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
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          animation: coins < 10 ? 'coinPulse 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <span style={{ fontSize: 20 }}>🪙</span>
        <span style={{ fontWeight: 'bold', color: coins < 10 ? '#ef5350' : undefined }}>{coins}</span>
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
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 20 }}>{timeIcon}</span>
        <span style={{ fontWeight: 'bold' }}>{timeStr}</span>
      </span>
      <span
        role="button"
        onClick={handleToggleMute}
        style={{
          fontSize: 20,
          cursor: 'pointer',
          pointerEvents: 'auto',
          opacity: 0.8,
          marginLeft: 4,
          minWidth: 44,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}
        title={muted ? '取消静音' : '静音'}
      >
        {muted ? '🔇' : '🔊'}
      </span>
      <div
        ref={settingsRef}
        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        <span
          role="button"
          onClick={() => setSettingsOpen((v) => !v)}
          style={{
            fontSize: 20,
            cursor: 'pointer',
            pointerEvents: 'auto',
            opacity: 0.8,
            marginLeft: 4,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
          title="设置"
        >
          ⚙️
        </span>
        {settingsOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'rgba(255, 248, 225, 0.95)',
              border: '1px solid rgba(245, 197, 66, 0.5)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '4px 0',
              minWidth: 160,
              zIndex: 20,
              pointerEvents: 'auto',
              fontFamily,
            }}
          >
            <div
              role="button"
              onClick={handleResetTutorial}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 14,
                color: '#5d4037',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245, 197, 66, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              重新看教程
            </div>
          </div>
        )}
      </div>
      {showSaveIndicator && (
        <span
          style={{
            fontSize: 12,
            opacity: 0.7,
            fontStyle: 'italic',
            marginLeft: 4,
          }}
        >
          保存中...
        </span>
      )}
    </div>
  )
}
