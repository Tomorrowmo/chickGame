export interface AchievementDef {
  id: string
  icon: string
  name: string
  description: string
  reward: number
  category: 'collection' | 'economy' | 'interaction'
  check: (stats: AchievementStats, context: AchievementContext) => boolean
  progress?: (stats: AchievementStats, context: AchievementContext) => { current: number; target: number }
}

export interface AchievementStats {
  totalEggsLaid: number
  totalChicksHatched: number
  totalFeedCount: number
  totalShopPurchases: number
  gamesPlayed: string[] // MiniGameType values
  racesWon: number
  chicksClicked: number
  totalCoinsFromEggs: number
}

export interface AchievementContext {
  chickCount: number
  hasSpecial: boolean
  hasRare: boolean
  breedCount: number
}

export const DEFAULT_ACHIEVEMENT_STATS: AchievementStats = {
  totalEggsLaid: 0,
  totalChicksHatched: 0,
  totalFeedCount: 0,
  totalShopPurchases: 0,
  gamesPlayed: [],
  racesWon: 0,
  chicksClicked: 0,
  totalCoinsFromEggs: 0,
}

export const ALL_BREEDS = ['white', 'yellow', 'brown', 'spotted', 'striped', 'colorful', 'golden', 'rainbow', 'crystal']

export const ACHIEVEMENTS: AchievementDef[] = [
  // Collection achievements
  {
    id: 'first_egg',
    icon: '🥚',
    name: '第一颗蛋',
    description: '孵化你的第一颗蛋',
    reward: 20,
    category: 'collection',
    check: (stats) => stats.totalChicksHatched >= 1,
    progress: (stats) => ({ current: Math.min(stats.totalChicksHatched, 1), target: 1 }),
  },
  {
    id: 'small_flock',
    icon: '🐤',
    name: '鸡群初成',
    description: '拥有5只小鸡',
    reward: 50,
    category: 'collection',
    check: (_stats, ctx) => ctx.chickCount >= 5,
    progress: (_stats, ctx) => ({ current: Math.min(ctx.chickCount, 5), target: 5 }),
  },
  {
    id: 'big_family',
    icon: '🐓',
    name: '大家庭',
    description: '拥有10只小鸡',
    reward: 100,
    category: 'collection',
    check: (_stats, ctx) => ctx.chickCount >= 10,
    progress: (_stats, ctx) => ({ current: Math.min(ctx.chickCount, 10), target: 10 }),
  },
  {
    id: 'special_find',
    icon: '✨',
    name: '特殊发现',
    description: '获得一只特殊品质的小鸡',
    reward: 30,
    category: 'collection',
    check: (_stats, ctx) => ctx.hasSpecial,
  },
  {
    id: 'rare_treasure',
    icon: '💎',
    name: '稀世珍鸡',
    description: '获得一只稀有品质的小鸡',
    reward: 80,
    category: 'collection',
    check: (_stats, ctx) => ctx.hasRare,
  },
  {
    id: 'breed_collector',
    icon: '🌈',
    name: '全品种收集',
    description: '收集全部9种品种',
    reward: 200,
    category: 'collection',
    check: (_stats, ctx) => ctx.breedCount >= 9,
    progress: (_stats, ctx) => ({ current: Math.min(ctx.breedCount, 9), target: 9 }),
  },

  // Economy achievements
  {
    id: 'little_rich',
    icon: '💰',
    name: '小富翁',
    description: '从鸡蛋中累计获得100金币',
    reward: 30,
    category: 'economy',
    check: (stats) => stats.totalCoinsFromEggs >= 100,
    progress: (stats) => ({ current: Math.min(stats.totalCoinsFromEggs, 100), target: 100 }),
  },
  {
    id: 'big_rich',
    icon: '🏦',
    name: '大富翁',
    description: '从鸡蛋中累计获得500金币',
    reward: 100,
    category: 'economy',
    check: (stats) => stats.totalCoinsFromEggs >= 500,
    progress: (stats) => ({ current: Math.min(stats.totalCoinsFromEggs, 500), target: 500 }),
  },
  {
    id: 'shopping_pro',
    icon: '🛒',
    name: '购物达人',
    description: '在商店购买5次',
    reward: 50,
    category: 'economy',
    check: (stats) => stats.totalShopPurchases >= 5,
    progress: (stats) => ({ current: Math.min(stats.totalShopPurchases, 5), target: 5 }),
  },

  // Interaction achievements
  {
    id: 'first_touch',
    icon: '❤️',
    name: '初次互动',
    description: '第一次点击小鸡',
    reward: 10,
    category: 'interaction',
    check: (stats) => stats.chicksClicked >= 1,
    progress: (stats) => ({ current: Math.min(stats.chicksClicked, 1), target: 1 }),
  },
  {
    id: 'game_master',
    icon: '🎮',
    name: '游戏达人',
    description: '玩过全部3种小游戏',
    reward: 50,
    category: 'interaction',
    check: (stats) => stats.gamesPlayed.length >= 3,
    progress: (stats) => ({ current: Math.min(stats.gamesPlayed.length, 3), target: 3 }),
  },
  {
    id: 'champion',
    icon: '🏆',
    name: '冠军',
    description: '在赛跑中获得第一名',
    reward: 40,
    category: 'interaction',
    check: (stats) => stats.racesWon >= 1,
    progress: (stats) => ({ current: Math.min(stats.racesWon, 1), target: 1 }),
  },
  {
    id: 'master_chef',
    icon: '🍽️',
    name: '大厨',
    description: '喂食小鸡20次',
    reward: 30,
    category: 'interaction',
    check: (stats) => stats.totalFeedCount >= 20,
    progress: (stats) => ({ current: Math.min(stats.totalFeedCount, 20), target: 20 }),
  },
]
