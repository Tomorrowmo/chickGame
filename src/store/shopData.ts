import type { FoodType } from './gameStore'

export type ShopCategory = 'eggs' | 'decorations' | 'food'

export type DecorationType = 'sunflower' | 'mushroom' | 'rock' | 'birdhouse'

export interface ShopItem {
  id: string
  category: ShopCategory
  name: string
  icon: string
  price: number
  description: string
}

export interface EggShopItem extends ShopItem {
  category: 'eggs'
  eggType: 'special' | 'rare' | 'mystery'
}

export interface DecorationShopItem extends ShopItem {
  category: 'decorations'
  decorationType: DecorationType
}

export interface FoodShopItem extends ShopItem {
  category: 'food'
  foodType: FoodType
}

export type AnyShopItem = EggShopItem | DecorationShopItem | FoodShopItem

export const SHOP_ITEMS: AnyShopItem[] = [
  // Special Eggs
  {
    id: 'egg-special',
    category: 'eggs',
    name: '特殊蛋',
    icon: '🥚',
    price: 50,
    description: '保证孵出特殊品种的小鸡！',
    eggType: 'special',
  },
  {
    id: 'egg-rare',
    category: 'eggs',
    name: '稀有蛋',
    icon: '🥚',
    price: 150,
    description: '保证孵出稀有品种的小鸡！',
    eggType: 'rare',
  },
  {
    id: 'egg-mystery',
    category: 'eggs',
    name: '神秘蛋',
    icon: '🥚',
    price: 80,
    description: '可能孵出任何品种！（50%普通/35%特殊/15%稀有）',
    eggType: 'mystery',
  },

  // Decorations
  {
    id: 'deco-sunflower',
    category: 'decorations',
    name: '向日葵',
    icon: '🌻',
    price: 30,
    description: '在花园里种一朵向日葵',
    decorationType: 'sunflower',
  },
  {
    id: 'deco-mushroom',
    category: 'decorations',
    name: '蘑菇',
    icon: '🍄',
    price: 20,
    description: '在花园里放一个蘑菇',
    decorationType: 'mushroom',
  },
  {
    id: 'deco-rock',
    category: 'decorations',
    name: '石头',
    icon: '🪨',
    price: 15,
    description: '在花园里放一块装饰石',
    decorationType: 'rock',
  },
  {
    id: 'deco-birdhouse',
    category: 'decorations',
    name: '鸟窝',
    icon: '🏠',
    price: 60,
    description: '在花园里放一个小鸟窝',
    decorationType: 'birdhouse',
  },

  // Premium Food
  {
    id: 'food-rainbow',
    category: 'food',
    name: '彩虹谷物',
    icon: '🌈',
    price: 40,
    description: '饥饿+50，成长+20，心情+30',
    foodType: 'rainbow_grain',
  },
  {
    id: 'food-cake',
    category: 'food',
    name: '蛋糕',
    icon: '🍰',
    price: 30,
    description: '饥饿+10，心情+50',
    foodType: 'cake',
  },
]

export const SHOP_CATEGORIES: { key: ShopCategory; label: string; icon: string }[] = [
  { key: 'eggs', label: '新蛋', icon: '🥚' },
  { key: 'decorations', label: '装饰', icon: '🌸' },
  { key: 'food', label: '食物', icon: '🍽' },
]
