import { useEffect, useCallback, useState } from 'react'
import { useGameStore, FOOD_COSTS } from '../../store/gameStore'
import type { FoodType } from '../../store/gameStore'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

const FOOD_OPTIONS: { type: FoodType; emoji: string; label: string }[] = [
  { type: 'grain', emoji: '🌾', label: '谷物' },
  { type: 'worm', emoji: '🐛', label: '虫子' },
  { type: 'treat', emoji: '🍬', label: '糖果' },
]

interface ToolbarProps {
  onAddEgg: () => void
}

const btnBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 64,
  minHeight: 48,
  padding: '8px 12px',
  fontSize: 13,
  fontFamily,
  borderRadius: 12,
  border: '2px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  color: '#5d4037',
  WebkitTapHighlightColor: 'transparent',
}

export function Toolbar({ onAddEgg }: ToolbarProps) {
  const selectedFood = useGameStore((s) => s.selectedFood)
  const feedingMode = useGameStore((s) => s.feedingMode)
  const coins = useGameStore((s) => s.coins)
  const chicks = useGameStore((s) => s.chicks)
  const currentGame = useGameStore((s) => s.currentGame)
  const setSelectedFood = useGameStore((s) => s.setSelectedFood)
  const setFeedingMode = useGameStore((s) => s.setFeedingMode)
  const startGame = useGameStore((s) => s.startGame)

  const [showGameMenu, setShowGameMenu] = useState(false)

  // Count non-egg chicks
  const playableChicks = chicks.filter(
    (c) => c.stage !== 'egg' && c.stage !== 'hatching',
  ).length
  const canPlay = playableChicks >= 3 && !currentGame

  // Escape key exits feeding mode and closes game menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (feedingMode) setFeedingMode(false)
        if (showGameMenu) setShowGameMenu(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [feedingMode, setFeedingMode, showGameMenu])

  const handleFoodClick = useCallback(
    (type: FoodType) => {
      if (selectedFood === type) {
        setSelectedFood(null)
      } else {
        setSelectedFood(type)
      }
    },
    [selectedFood, setSelectedFood],
  )

  // Hide toolbar when a mini-game is active
  if (currentGame) return null

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: 'rgba(255, 248, 225, 0.95)',
        borderTop: '2px solid rgba(245, 197, 66, 0.5)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 10,
        fontFamily,
      }}
    >
      {/* Add Egg button */}
      <button
        onClick={onAddEgg}
        style={{
          ...btnBase,
          background: '#fff8e1',
        }}
      >
        <span style={{ fontSize: 22 }}>🥚</span>
        <span style={{ fontSize: 11 }}>添加蛋</span>
      </button>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 40,
          background: 'rgba(0,0,0,0.1)',
          margin: '0 4px',
        }}
      />

      {/* Food buttons */}
      {FOOD_OPTIONS.map(({ type, emoji, label }) => {
        const cost = FOOD_COSTS[type]
        const isSelected = selectedFood === type
        const canAfford = coins >= cost
        return (
          <button
            key={type}
            onClick={() => handleFoodClick(type)}
            disabled={!canAfford}
            style={{
              ...btnBase,
              border: isSelected
                ? '2px solid #f5c542'
                : '2px solid transparent',
              background: isSelected
                ? '#ffe082'
                : canAfford
                  ? '#fff8e1'
                  : '#e8e8e8',
              color: canAfford ? '#5d4037' : '#bdbdbd',
              cursor: canAfford ? 'pointer' : 'not-allowed',
              fontWeight: isSelected ? 'bold' : 'normal',
              boxShadow: isSelected
                ? '0 2px 10px rgba(245, 197, 66, 0.4)'
                : '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            <span style={{ fontSize: 22 }}>{emoji}</span>
            <span style={{ fontSize: 11 }}>
              {label} ({cost})
            </span>
          </button>
        )
      })}

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 40,
          background: 'rgba(0,0,0,0.1)',
          margin: '0 4px',
        }}
      />

      {/* Clean button (placeholder) */}
      <button
        onClick={() => {}}
        disabled
        style={{
          ...btnBase,
          background: '#e8e8e8',
          color: '#bdbdbd',
          cursor: 'not-allowed',
        }}
      >
        <span style={{ fontSize: 22 }}>🧹</span>
        <span style={{ fontSize: 11 }}>清洁</span>
      </button>

      {/* Play button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => canPlay && setShowGameMenu((v) => !v)}
          disabled={!canPlay}
          style={{
            ...btnBase,
            background: canPlay ? '#fff8e1' : '#e8e8e8',
            color: canPlay ? '#5d4037' : '#bdbdbd',
            cursor: canPlay ? 'pointer' : 'not-allowed',
          }}
          title={
            !canPlay && playableChicks < 3
              ? '需要至少3只孵化的小鸡'
              : undefined
          }
        >
          <span style={{ fontSize: 22 }}>🎮</span>
          <span style={{ fontSize: 11 }}>游戏</span>
        </button>
        {showGameMenu && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 6,
              background: '#fff8e1',
              border: '2px solid rgba(245, 197, 66, 0.5)',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
              zIndex: 30,
              fontFamily,
            }}
          >
            <button
              onClick={() => {
                startGame('hideAndSeek')
                setShowGameMenu(false)
              }}
              style={{
                ...btnBase,
                background: '#ffe082',
                width: '100%',
                minWidth: 120,
              }}
            >
              <span style={{ fontSize: 18 }}>🐣</span>
              <span style={{ fontSize: 12 }}>躲猫猫</span>
            </button>
            <button
              onClick={() => {
                startGame('race')
                setShowGameMenu(false)
              }}
              style={{
                ...btnBase,
                background: '#ffe082',
                width: '100%',
                minWidth: 120,
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 18 }}>🏁</span>
              <span style={{ fontSize: 12 }}>小鸡赛跑</span>
            </button>
            <button
              onClick={() => {
                startGame('fetch')
                setShowGameMenu(false)
              }}
              style={{
                ...btnBase,
                background: '#ffe082',
                width: '100%',
                minWidth: 120,
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 18 }}>🎾</span>
              <span style={{ fontSize: 12 }}>丢球捡回</span>
            </button>
          </div>
        )}
      </div>

      {/* Feeding mode hint */}
      {feedingMode && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 12,
            color: '#795548',
            fontStyle: 'italic',
            fontFamily,
            background: 'rgba(255, 248, 225, 0.9)',
            padding: '2px 12px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
          }}
        >
          点击草地喂食 (Esc取消)
        </div>
      )}
    </div>
  )
}
