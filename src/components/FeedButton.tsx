import { useEffect } from 'react'
import { useGameStore, FOOD_COSTS } from '../store/gameStore'
import type { FoodType } from '../store/gameStore'

const FOOD_OPTIONS: { type: FoodType; emoji: string; label: string }[] = [
  { type: 'grain', emoji: '\u{1F33E}', label: 'Grain' },
  { type: 'worm', emoji: '\u{1F41B}', label: 'Worm' },
  { type: 'treat', emoji: '\u{1F36C}', label: 'Treat' },
]

export function FeedButton() {
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

  const handleFoodClick = (type: FoodType) => {
    if (selectedFood === type) {
      // Toggle off
      setSelectedFood(null)
    } else {
      setSelectedFood(type)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
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
              padding: '6px 12px',
              fontSize: 14,
              borderRadius: 8,
              border: isSelected ? '2px solid #333' : '2px solid transparent',
              background: isSelected
                ? '#ffe082'
                : canAfford
                  ? '#fff8e1'
                  : '#e0e0e0',
              color: canAfford ? '#333' : '#999',
              cursor: canAfford ? 'pointer' : 'not-allowed',
              fontWeight: isSelected ? 'bold' : 'normal',
              boxShadow: isSelected
                ? '0 2px 8px rgba(0,0,0,0.3)'
                : '0 1px 4px rgba(0,0,0,0.15)',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 64,
            }}
          >
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <span style={{ fontSize: 11 }}>
              {label} ({cost})
            </span>
          </button>
        )
      })}
      {feedingMode && (
        <span
          style={{
            fontSize: 12,
            color: '#666',
            marginLeft: 4,
            fontStyle: 'italic',
          }}
        >
          Click grass to feed (Esc to cancel)
        </span>
      )}
    </div>
  )
}
