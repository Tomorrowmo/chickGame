import { useGameStore, EGG_COIN_REWARD, EGG_TIMER_INITIAL } from '../../store/gameStore'
import type { Rarity, Mood, LifeStage } from '../../types/chick'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9e9e9e',
  special: '#42a5f5',
  rare: '#ffd54f',
}

const RARITY_LABELS: Record<Rarity, string> = {
  common: '普通',
  special: '特殊',
  rare: '稀有',
}

const MOOD_COLORS: Record<Mood, string> = {
  happy: '#66bb6a',
  normal: '#ffee58',
  bored: '#ffa726',
  angry: '#ef5350',
}

const MOOD_LABELS: Record<Mood, string> = {
  happy: '开心',
  normal: '普通',
  bored: '无聊',
  angry: '生气',
}

const STAGE_ICONS: Record<LifeStage, string> = {
  egg: '🥚',
  hatching: '🥚',
  baby: '🐣',
  juvenile: '🐥',
  adult: '🐔',
}

const STAGE_LABELS: Record<LifeStage, string> = {
  egg: '蛋',
  hatching: '破壳中',
  baby: '幼鸡',
  juvenile: '少年鸡',
  adult: '成年鸡',
}

const BREED_LABELS: Record<string, string> = {
  white: '小白',
  yellow: '小黄',
  brown: '小棕',
  spotted: '花斑',
  striped: '条纹',
  colorful: '彩色',
  golden: '金鸡',
  rainbow: '彩虹',
  crystal: '水晶',
}

const ACTION_LABELS: Record<string, string> = {
  idle: '发呆',
  walking: '散步',
  eating: '吃东西',
  sleeping: '睡觉',
  playing: '玩耍',
  chasing: '追逐',
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
  const sellChick = useGameStore((s) => s.sellChick)
  const getChickSellPrice = useGameStore((s) => s.getChickSellPrice)

  if (!selectedChickId) return null

  const chick = chicks.find((c) => c.id === selectedChickId)
  if (!chick) return null

  const sellPrice = getChickSellPrice(selectedChickId)

  const handleSell = () => {
    const name = chick.name || BREED_LABELS[chick.breed] || chick.breed
    if (confirm(`确定要把"${name}"卖掉吗？\n将获得 ${sellPrice} 金币`)) {
      sellChick(selectedChickId)
    }
  }

  const displayName = chick.name || BREED_LABELS[chick.breed] || chick.breed
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
          {BREED_LABELS[chick.breed] || chick.breed}
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
        }}
      >
        {RARITY_LABELS[chick.rarity]}
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
        <span>{STAGE_LABELS[chick.stage]}</span>
      </div>

      {/* Mood bar */}
      <StatBar
        label={`心情：${MOOD_LABELS[chick.mood]}`}
        value={chick.moodValue}
        color={moodColor}
      />

      {/* Hunger bar */}
      <StatBar label="饥饿度" value={chick.hunger} color={hungerColor} />

      {/* Growth bar */}
      <StatBar label="成长" value={chick.growthProgress} color="#42a5f5" />

      {/* Egg income section for adults */}
      {chick.stage === 'adult' && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 0',
            borderTop: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 'bold',
              color: '#5d4037',
              marginBottom: 6,
              fontFamily,
            }}
          >
            🥚 产蛋收入
          </div>
          <div style={{ fontSize: 12, color: '#795548', marginBottom: 4, fontFamily }}>
            每蛋收入：🪙{EGG_COIN_REWARD[chick.rarity]}
          </div>
          <div style={{ fontSize: 12, color: '#795548', marginBottom: 6, fontFamily }}>
            已产蛋：{chick.eggsLaid} 枚
          </div>
          <StatBar
            label="下一枚蛋"
            value={((EGG_TIMER_INITIAL - chick.eggTimer) / EGG_TIMER_INITIAL) * 100}
            color="#ffa726"
          />
          {(chick.mood === 'bored' || chick.mood === 'angry') && (
            <div style={{ fontSize: 11, color: '#ef5350', fontStyle: 'italic', fontFamily }}>
              心情不好，暂停产蛋
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <div
        style={{
          fontSize: 11,
          color: '#8d6e63',
          marginTop: 4,
          fontStyle: 'italic',
        }}
      >
        {ACTION_LABELS[chick.currentAction] || chick.currentAction}
      </div>

      {/* Sell button */}
      <button
        onClick={handleSell}
        style={{
          marginTop: 10,
          width: '100%',
          padding: '8px 10px',
          fontSize: 12,
          fontFamily,
          fontWeight: 'bold',
          color: '#5d4037',
          background: '#ffe082',
          border: '2px solid #f5c542',
          borderRadius: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'transform 0.1s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <span>💰 卖掉</span>
        <span style={{ color: '#d4890e' }}>+{sellPrice}</span>
      </button>
    </div>
  )
}
