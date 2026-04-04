import { useEffect, useCallback } from 'react'
import { useGameStore, FOOD_COSTS } from '../../store/gameStore'
import type { FoodType } from '../../store/gameStore'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

const FOOD_OPTIONS: { type: FoodType; emoji: string; label: string }[] = [
  { type: 'grain', emoji: '🌾', label: 'Grain' },
  { type: 'worm', emoji: '🐛', label: 'Worm' },
  { type: 'treat', emoji: '🍬', label: 'Treat' },
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
  padding: '6px 10px',
  fontSize: 13,
  fontFamily,
  borderRadius: 12,
  border: '2px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  color: '#5d4037',
}

export function Toolbar({ onAddEgg }: ToolbarProps) {
  const selectedFood = useGameStore((s) => s.selectedFood)
  const feedingMode = useGameStore((s) => s.feedingMode)
  const coins = useGameStore((s) => s.coins)
  const setSelectedFood = useGameStore((s) => s.setSelectedFood)
  const setFeedingMode = useGameStore((s) => s.setFeedingMode)

  // Escape key exits feeding mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && feedingMode) {
        setFeedingMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [feedingMode, setFeedingMode])

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

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 8,
        padding: '10px 16px',
        background: 'rgba(255, 248, 225, 0.85)',
        borderTop: '2px solid rgba(245, 197, 66, 0.5)',
        borderRadius: '16px 16px 0 0',
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
        <span style={{ fontSize: 11 }}>Add Egg</span>
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
        <span style={{ fontSize: 11 }}>Clean</span>
      </button>

      {/* Play button (placeholder) */}
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
        <span style={{ fontSize: 22 }}>🎮</span>
        <span style={{ fontSize: 11 }}>Play</span>
      </button>

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
          Click grass to feed (Esc to cancel)
        </div>
      )}
    </div>
  )
}
