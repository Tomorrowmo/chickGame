import { useGameStore } from '../../store/gameStore'
import type { Rarity, Mood, LifeStage } from '../../types/chick'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9e9e9e',
  special: '#42a5f5',
  rare: '#ffd54f',
}

const MOOD_COLORS: Record<Mood, string> = {
  happy: '#66bb6a',
  normal: '#ffee58',
  bored: '#ffa726',
  angry: '#ef5350',
}

const STAGE_ICONS: Record<LifeStage, string> = {
  egg: '🥚',
  hatching: '🥚',
  baby: '🐣',
  juvenile: '🐥',
  adult: '🐔',
}

function StatBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 12,
          color: '#795548',
          marginBottom: 2,
          fontFamily,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: '100%',
          height: 10,
          background: 'rgba(0,0,0,0.1)',
          borderRadius: 5,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            background: color,
            borderRadius: 5,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

export function ChickInfoPanel() {
  const selectedChickId = useGameStore((s) => s.selectedChickId)
  const chicks = useGameStore((s) => s.chicks)
  const selectChick = useGameStore((s) => s.selectChick)

  if (!selectedChickId) return null

  const chick = chicks.find((c) => c.id === selectedChickId)
  if (!chick) return null

  const displayName = chick.name || chick.breed
  const rarityColor = RARITY_COLORS[chick.rarity]
  const moodColor = MOOD_COLORS[chick.mood]
  const stageIcon = STAGE_ICONS[chick.stage]

  // Hunger bar: green when full, red when empty
  const hungerColor =
    chick.hunger > 60
      ? '#66bb6a'
      : chick.hunger > 30
        ? '#ffa726'
        : '#ef5350'

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        right: 8,
        width: 200,
        padding: 14,
        background: 'rgba(255, 248, 225, 0.92)',
        border: '2px solid rgba(245, 197, 66, 0.6)',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontFamily,
        color: '#5d4037',
        zIndex: 10,
      }}
    >
      {/* Close button */}
      <button
        onClick={() => selectChick(null)}
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          background: 'none',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          color: '#9e9e9e',
          lineHeight: 1,
          padding: 0,
          minWidth: 44,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ✕
      </button>

      {/* Name and breed */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 4,
          paddingRight: 20,
        }}
      >
        {displayName}
      </div>
      {chick.name && (
        <div style={{ fontSize: 12, color: '#8d6e63', marginBottom: 4 }}>
          {chick.breed}
        </div>
      )}

      {/* Rarity */}
      <div
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 'bold',
          color: rarityColor,
          background: `${rarityColor}22`,
          padding: '2px 8px',
          borderRadius: 8,
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        {chick.rarity}
      </div>

      {/* Stage */}
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{stageIcon}</span>
        <span style={{ textTransform: 'capitalize' }}>{chick.stage}</span>
      </div>

      {/* Mood bar */}
      <StatBar
        label={`Mood: ${chick.mood}`}
        value={chick.moodValue}
        color={moodColor}
      />

      {/* Hunger bar */}
      <StatBar label="Hunger" value={chick.hunger} color={hungerColor} />

      {/* Growth bar */}
      <StatBar label="Growth" value={chick.growthProgress} color="#42a5f5" />

      {/* Action */}
      <div
        style={{
          fontSize: 11,
          color: '#8d6e63',
          marginTop: 4,
          fontStyle: 'italic',
          textTransform: 'capitalize',
        }}
      >
        {chick.currentAction}
      </div>
    </div>
  )
}
