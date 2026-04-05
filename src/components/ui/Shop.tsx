import { useState, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { randomGrassX, randomGrassY } from '../GameCanvas'
import {
  SHOP_ITEMS,
  SHOP_CATEGORIES,
  type ShopCategory,
  type AnyShopItem,
  type EggShopItem,
  type DecorationShopItem,
  type FoodShopItem,
} from '../../store/shopData'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

const GAME_WIDTH = 1440
const GAME_HEIGHT = 900

export function Shop() {
  const shopOpen = useGameStore((s) => s.shopOpen)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const coins = useGameStore((s) => s.coins)
  const buyCommonEgg = useGameStore((s) => s.buyCommonEgg)
  const buySpecialEgg = useGameStore((s) => s.buySpecialEgg)
  const buyRareEgg = useGameStore((s) => s.buyRareEgg)
  const buyMysteryEgg = useGameStore((s) => s.buyMysteryEgg)
  const buyDecoration = useGameStore((s) => s.buyDecoration)
  const buyPremiumFood = useGameStore((s) => s.buyPremiumFood)

  const [activeTab, setActiveTab] = useState<ShopCategory>('eggs')
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null)

  const showMessage = useCallback((msg: string) => {
    setPurchaseMessage(msg)
    setTimeout(() => setPurchaseMessage(null), 1500)
  }, [])

  const handleBuy = useCallback(
    (item: AnyShopItem) => {
      if (coins < item.price) {
        showMessage('金币不足！')
        return
      }

      let success = false
      if (item.category === 'eggs') {
        const eggItem = item as EggShopItem
        const x = randomGrassX(GAME_WIDTH)
        const y = randomGrassY(GAME_HEIGHT)
        if (eggItem.eggType === 'common') success = buyCommonEgg(x, y)
        else if (eggItem.eggType === 'special') success = buySpecialEgg(x, y)
        else if (eggItem.eggType === 'rare') success = buyRareEgg(x, y)
        else if (eggItem.eggType === 'mystery') success = buyMysteryEgg(x, y)
      } else if (item.category === 'decorations') {
        const decoItem = item as DecorationShopItem
        success = buyDecoration(decoItem.decorationType, item.price)
      } else if (item.category === 'food') {
        const foodItem = item as FoodShopItem
        success = buyPremiumFood(foodItem.foodType, item.price)
      }

      if (success) {
        showMessage(`成功购买 ${item.name}！`)
      }
    },
    [coins, buyCommonEgg, buySpecialEgg, buyRareEgg, buyMysteryEgg, buyDecoration, buyPremiumFood, showMessage],
  )

  if (!shopOpen) return null

  const filteredItems = SHOP_ITEMS.filter((item) => item.category === activeTab)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 280,
        height: '100%',
        background: 'rgba(255, 248, 225, 0.97)',
        borderRight: '3px solid rgba(245, 197, 66, 0.6)',
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.15)',
        zIndex: 20,
        fontFamily,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(245, 197, 66, 0.3)',
          borderBottom: '2px solid rgba(245, 197, 66, 0.4)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#5d4037' }}>
          🛒 商店
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#795548', fontWeight: 'bold' }}>
            🪙 {coins}
          </span>
          <button
            onClick={() => setShopOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#795548',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid rgba(245, 197, 66, 0.3)',
        }}
      >
        {SHOP_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              borderBottom:
                activeTab === cat.key
                  ? '3px solid #f5c542'
                  : '3px solid transparent',
              background:
                activeTab === cat.key
                  ? 'rgba(245, 197, 66, 0.2)'
                  : 'transparent',
              cursor: 'pointer',
              fontFamily,
              fontSize: 13,
              fontWeight: activeTab === cat.key ? 'bold' : 'normal',
              color: '#5d4037',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
        }}
      >
        {filteredItems.map((item) => {
          const canAfford = coins >= item.price
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                marginBottom: 8,
                background: canAfford ? '#fff' : '#f5f5f5',
                borderRadius: 12,
                border: '2px solid rgba(245, 197, 66, 0.3)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                opacity: canAfford ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#5d4037',
                    marginBottom: 2,
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#8d6e63',
                    lineHeight: 1.3,
                  }}
                >
                  {item.description}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#f57f17',
                    fontWeight: 'bold',
                    marginTop: 2,
                  }}
                >
                  🪙 {item.price}
                </div>
              </div>
              <button
                onClick={() => handleBuy(item)}
                disabled={!canAfford}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: canAfford ? '#f5c542' : '#ccc',
                  color: canAfford ? '#5d4037' : '#999',
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 'bold',
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                  boxShadow: canAfford
                    ? '0 2px 6px rgba(245, 197, 66, 0.4)'
                    : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                购买
              </button>
            </div>
          )
        })}
      </div>

      {/* Purchase message toast */}
      {purchaseMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(93, 64, 55, 0.9)',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily,
            whiteSpace: 'nowrap',
            zIndex: 25,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {purchaseMessage}
        </div>
      )}
    </div>
  )
}
