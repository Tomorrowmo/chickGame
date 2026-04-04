import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENTS } from '../../store/achievementData'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

// ---- Toast Notification ----

interface ToastData {
  id: string
  icon: string
  name: string
  reward: number
}

export function AchievementToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const pendingToast = useGameStore((s) => s.pendingAchievementToast)
  const clearToast = useGameStore((s) => s.clearAchievementToast)

  useEffect(() => {
    if (pendingToast) {
      const toastId = `${pendingToast.id}-${Date.now()}`
      setToasts((prev) => [...prev, { ...pendingToast, id: toastId }])
      clearToast()
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId))
      }, 3000)
    }
  }, [pendingToast, clearToast])

  if (toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: 'linear-gradient(135deg, #fff8e1, #ffe082)',
            border: '2px solid #f5c542',
            borderRadius: 14,
            padding: '12px 20px',
            fontFamily,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            animation: 'achievementSlideIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 220,
          }}
        >
          <span style={{ fontSize: 28 }}>{toast.icon}</span>
          <div>
            <div style={{ fontWeight: 'bold', color: '#5d4037', fontSize: 14 }}>
              成就解锁！
            </div>
            <div style={{ color: '#795548', fontSize: 13 }}>{toast.name}</div>
            <div style={{ color: '#4caf50', fontSize: 12, fontWeight: 'bold' }}>
              +{toast.reward} 🪙
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes achievementSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ---- Achievement Panel ----

const CATEGORY_LABELS: Record<string, string> = {
  collection: '收集成就',
  economy: '经济成就',
  interaction: '互动成就',
}

export function AchievementPanel() {
  const achievementPanelOpen = useGameStore((s) => s.achievementPanelOpen)
  const setAchievementPanelOpen = useGameStore((s) => s.setAchievementPanelOpen)
  const unlockedAchievements = useGameStore((s) => s.unlockedAchievements)
  const achievementStats = useGameStore((s) => s.achievementStats)
  const chicks = useGameStore((s) => s.chicks)

  if (!achievementPanelOpen) return null

  // Build context for progress display
  const nonEggChicks = chicks.filter((c) => c.stage !== 'egg' && c.stage !== 'hatching')
  const context = {
    chickCount: nonEggChicks.length,
    hasSpecial: chicks.some((c) => c.rarity === 'special'),
    hasRare: chicks.some((c) => c.rarity === 'rare'),
    breedCount: new Set(nonEggChicks.map((c) => c.breed)).size,
  }

  const categories = ['collection', 'economy', 'interaction'] as const
  const unlockedCount = unlockedAchievements.length
  const totalCount = ACHIEVEMENTS.length

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily,
      }}
      onClick={() => setAchievementPanelOpen(false)}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #fff8e1, #fffde7)',
          borderRadius: 20,
          border: '3px solid #f5c542',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          width: '85%',
          maxWidth: 560,
          maxHeight: '85%',
          overflow: 'auto',
          padding: '20px 24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🏆</span>
            <span style={{ fontSize: 20, fontWeight: 'bold', color: '#5d4037' }}>
              成就
            </span>
            <span style={{ fontSize: 13, color: '#8d6e63', background: '#ffe082', padding: '2px 10px', borderRadius: 10 }}>
              {unlockedCount}/{totalCount}
            </span>
          </div>
          <button
            onClick={() => setAchievementPanelOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#8d6e63',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Achievement categories */}
        {categories.map((cat) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === cat)
          return (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#8d6e63', marginBottom: 8, borderBottom: '1px solid #ffe082', paddingBottom: 4 }}>
                {CATEGORY_LABELS[cat]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((achievement) => {
                  const unlocked = unlockedAchievements.includes(achievement.id)
                  const prog = !unlocked && achievement.progress
                    ? achievement.progress(achievementStats, context)
                    : null

                  return (
                    <div
                      key={achievement.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: unlocked ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0,0,0,0.04)',
                        border: unlocked ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(0,0,0,0.06)',
                        opacity: unlocked ? 1 : 0.7,
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        fontSize: 26,
                        filter: unlocked ? 'none' : 'grayscale(1)',
                        minWidth: 36,
                        textAlign: 'center',
                      }}>
                        {unlocked ? achievement.icon : '🔒'}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 'bold', color: '#5d4037', fontSize: 13 }}>
                            {achievement.name}
                          </span>
                          {unlocked && <span style={{ fontSize: 14 }}>✅</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#8d6e63', marginTop: 2 }}>
                          {achievement.description}
                        </div>
                        {/* Progress bar */}
                        {prog && (
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              flex: 1,
                              height: 6,
                              background: '#e0e0e0',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${(prog.current / prog.target) * 100}%`,
                                height: '100%',
                                background: '#f5c542',
                                borderRadius: 3,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: 10, color: '#8d6e63', whiteSpace: 'nowrap' }}>
                              {prog.current}/{prog.target}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Reward */}
                      <div style={{
                        fontSize: 11,
                        color: unlocked ? '#4caf50' : '#bdbdbd',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}>
                        +{achievement.reward} 🪙
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
