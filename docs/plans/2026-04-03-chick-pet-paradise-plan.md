# 小鸡宠物乐园 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based virtual pet paradise where users hatch, raise, and interact with cartoon chicks in a lively animated garden.

**Architecture:** React manages UI/state, Pixi.js renders the 2D game canvas with sprite animations and particle effects. Zustand stores game state (chicks, inventory, mood). The game loop runs via Pixi's ticker, updating chick AI behaviors each frame.

**Tech Stack:** React 18+, Pixi.js v8, @pixi/react, TypeScript, Zustand, Vite

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/App.css`

**Step 1: Initialize Vite + React + TypeScript project**

Run:
```bash
cd d:/Git/Linda
npm create vite@latest . -- --template react-ts
```

**Step 2: Install core dependencies**

Run:
```bash
npm install pixi.js @pixi/react zustand
npm install -D @types/node
```

**Step 3: Verify dev server starts**

Run:
```bash
npm run dev
```
Expected: Vite dev server starts on localhost, default React page renders.

**Step 4: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold project with Vite + React + TypeScript + Pixi.js"
```

---

## Task 2: Game Canvas & Basic Scene

**Files:**
- Create: `src/components/GameCanvas.tsx`
- Create: `src/components/Background.tsx`
- Modify: `src/App.tsx`

**Step 1: Create GameCanvas component with Pixi Stage**

```tsx
// src/components/GameCanvas.tsx
import { Stage, Container } from '@pixi/react'
import { Background } from './Background'

interface GameCanvasProps {
  width: number
  height: number
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  return (
    <Stage
      width={width}
      height={height}
      options={{ background: '#87CEEB' }}
    >
      <Container>
        <Background width={width} height={height} />
      </Container>
    </Stage>
  )
}
```

**Step 2: Create Background component with sky + grass**

```tsx
// src/components/Background.tsx
import { Graphics } from '@pixi/react'
import { useCallback } from 'react'

interface BackgroundProps {
  width: number
  height: number
}

export function Background({ width, height }: BackgroundProps) {
  const drawGround = useCallback((g: any) => {
    g.clear()
    // Sky gradient (solid for now)
    g.beginFill(0x87CEEB)
    g.drawRect(0, 0, width, height * 0.6)
    g.endFill()
    // Grass
    g.beginFill(0x7EC850)
    g.drawRect(0, height * 0.6, width, height * 0.4)
    g.endFill()
    // Darker grass strip
    g.beginFill(0x6AB840)
    g.drawRect(0, height * 0.6, width, 10)
    g.endFill()
  }, [width, height])

  return <Graphics draw={drawGround} />
}
```

**Step 3: Mount GameCanvas in App**

```tsx
// src/App.tsx
import { GameCanvas } from './components/GameCanvas'

function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#333' }}>
      <GameCanvas width={960} height={640} />
    </div>
  )
}

export default App
```

**Step 4: Verify sky + grass renders in browser**

Run: `npm run dev`
Expected: Blue sky top, green grass bottom, centered on dark background.

**Step 5: Commit**

```bash
git add src/components/GameCanvas.tsx src/components/Background.tsx src/App.tsx
git commit -m "feat: add game canvas with sky and grass background"
```

---

## Task 3: Chick Sprite & Basic Rendering

**Files:**
- Create: `src/assets/` (sprite images)
- Create: `src/components/Chick.tsx`
- Create: `src/types/chick.ts`
- Modify: `src/components/GameCanvas.tsx`

**Step 1: Define chick data types**

```ts
// src/types/chick.ts
export type LifeStage = 'egg' | 'hatching' | 'baby' | 'juvenile' | 'adult'
export type Rarity = 'common' | 'special' | 'rare'
export type Mood = 'happy' | 'normal' | 'bored' | 'angry'

export interface ChickData {
  id: string
  name: string
  breed: string
  rarity: Rarity
  stage: LifeStage
  mood: Mood
  moodValue: number      // 0-100
  hunger: number          // 0-100
  x: number
  y: number
  targetX: number
  targetY: number
  direction: 'left' | 'right'
  currentAction: 'idle' | 'walking' | 'eating' | 'sleeping' | 'playing' | 'chasing'
  growthProgress: number  // 0-100, triggers stage change at 100
  birthTime: number
}
```

**Step 2: Create Chick component with placeholder graphics**

```tsx
// src/components/Chick.tsx
import { Container, Graphics, Text } from '@pixi/react'
import { useCallback } from 'react'
import { TextStyle } from 'pixi.js'
import type { ChickData } from '../types/chick'

interface ChickProps {
  chick: ChickData
  onClick?: (chick: ChickData) => void
}

export function Chick({ chick, onClick }: ChickProps) {
  // Placeholder: draw a simple cartoon chick shape
  const drawChick = useCallback((g: any) => {
    g.clear()
    const scale = chick.stage === 'egg' ? 0.6
      : chick.stage === 'baby' ? 0.7
      : chick.stage === 'juvenile' ? 0.85
      : 1.0

    if (chick.stage === 'egg') {
      // Egg shape
      g.beginFill(0xFFF8DC)
      g.drawEllipse(0, 0, 15 * scale, 20 * scale)
      g.endFill()
      // Spots
      g.beginFill(0xFFD700)
      g.drawCircle(-5, -5, 3)
      g.drawCircle(5, 3, 2)
      g.endFill()
    } else {
      // Body (yellow circle)
      g.beginFill(0xFFD700)
      g.drawCircle(0, 0, 18 * scale)
      g.endFill()
      // Eye
      const eyeX = chick.direction === 'right' ? 6 : -6
      g.beginFill(0x000000)
      g.drawCircle(eyeX, -6 * scale, 3 * scale)
      g.endFill()
      // Beak
      g.beginFill(0xFF8C00)
      const beakDir = chick.direction === 'right' ? 1 : -1
      g.moveTo(beakDir * 14 * scale, -2 * scale)
      g.lineTo(beakDir * 22 * scale, 0)
      g.lineTo(beakDir * 14 * scale, 4 * scale)
      g.closePath()
      g.endFill()
      // Feet
      g.beginFill(0xFF8C00)
      g.drawRect(-8 * scale, 14 * scale, 5, 4)
      g.drawRect(4 * scale, 14 * scale, 5, 4)
      g.endFill()
    }
  }, [chick.stage, chick.direction])

  const moodEmoji = chick.mood === 'happy' ? '❤️'
    : chick.mood === 'bored' ? '💤'
    : chick.mood === 'angry' ? '💢'
    : ''

  return (
    <Container
      x={chick.x}
      y={chick.y}
      interactive={true}
      pointerdown={() => onClick?.(chick)}
      cursor="pointer"
    >
      <Graphics draw={drawChick} />
      {moodEmoji && (
        <Text
          text={moodEmoji}
          x={0}
          y={-35}
          anchor={0.5}
          style={new TextStyle({ fontSize: 16 })}
        />
      )}
    </Container>
  )
}
```

**Step 3: Add a test chick to GameCanvas**

Update `GameCanvas.tsx` to render one test chick on the grass area.

**Step 4: Verify chick renders on screen**

Run: `npm run dev`
Expected: Yellow cartoon chick visible on the grass.

**Step 5: Commit**

```bash
git add src/types/chick.ts src/components/Chick.tsx src/components/GameCanvas.tsx
git commit -m "feat: add chick type definitions and placeholder chick sprite"
```

---

## Task 4: Game State Store (Zustand)

**Files:**
- Create: `src/store/gameStore.ts`
- Create: `src/store/chickFactory.ts`

**Step 1: Create chick factory for generating new chicks/eggs**

```ts
// src/store/chickFactory.ts
import type { ChickData, Rarity } from '../types/chick'

const BREEDS: Record<Rarity, string[]> = {
  common: ['white', 'yellow', 'brown'],
  special: ['spotted', 'striped', 'colorful'],
  rare: ['golden', 'rainbow', 'crystal'],
}

function rollRarity(): Rarity {
  const roll = Math.random()
  if (roll < 0.05) return 'rare'       // 5%
  if (roll < 0.25) return 'special'    // 20%
  return 'common'                       // 75%
}

export function createEgg(x: number, y: number): ChickData {
  const rarity = rollRarity()
  const breeds = BREEDS[rarity]
  const breed = breeds[Math.floor(Math.random() * breeds.length)]

  return {
    id: crypto.randomUUID(),
    name: '',
    breed,
    rarity,
    stage: 'egg',
    mood: 'normal',
    moodValue: 50,
    hunger: 50,
    x,
    y,
    targetX: x,
    targetY: y,
    direction: 'right',
    currentAction: 'idle',
    growthProgress: 0,
    birthTime: Date.now(),
  }
}
```

**Step 2: Create game store with Zustand**

```ts
// src/store/gameStore.ts
import { create } from 'zustand'
import type { ChickData } from '../types/chick'
import { createEgg } from './chickFactory'

interface GameState {
  chicks: ChickData[]
  coins: number
  selectedChickId: string | null

  // Actions
  addEgg: (x: number, y: number) => void
  selectChick: (id: string | null) => void
  updateChick: (id: string, updates: Partial<ChickData>) => void
  feedChick: (id: string) => void
  petChick: (id: string) => void
  tick: (delta: number) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  chicks: [],
  coins: 100,
  selectedChickId: null,

  addEgg: (x, y) => set(state => ({
    chicks: [...state.chicks, createEgg(x, y)],
  })),

  selectChick: (id) => set({ selectedChickId: id }),

  updateChick: (id, updates) => set(state => ({
    chicks: state.chicks.map(c => c.id === id ? { ...c, ...updates } : c),
  })),

  feedChick: (id) => set(state => ({
    chicks: state.chicks.map(c =>
      c.id === id
        ? { ...c, hunger: Math.min(100, c.hunger + 30), moodValue: Math.min(100, c.moodValue + 10) }
        : c
    ),
  })),

  petChick: (id) => set(state => ({
    chicks: state.chicks.map(c =>
      c.id === id
        ? { ...c, moodValue: Math.min(100, c.moodValue + 15) }
        : c
    ),
  })),

  tick: (delta) => {
    const state = get()
    const updated = state.chicks.map(chick => {
      let { hunger, moodValue, growthProgress, stage, mood } = chick

      // Hunger decreases over time
      hunger = Math.max(0, hunger - 0.01 * delta)
      // Mood decreases slowly
      moodValue = Math.max(0, moodValue - 0.005 * delta)
      // Growth increases
      growthProgress = Math.min(100, growthProgress + 0.02 * delta)

      // Update mood label
      if (moodValue > 70) mood = 'happy'
      else if (moodValue > 40) mood = 'normal'
      else if (moodValue > 20) mood = 'bored'
      else mood = 'angry'

      // Stage progression
      if (growthProgress >= 100) {
        const stages = ['egg', 'hatching', 'baby', 'juvenile', 'adult'] as const
        const idx = stages.indexOf(stage)
        if (idx < stages.length - 1) {
          stage = stages[idx + 1]
          growthProgress = 0
        }
      }

      return { ...chick, hunger, moodValue, growthProgress, stage, mood }
    })
    set({ chicks: updated })
  },
}))
```

**Step 3: Verify store works by connecting to GameCanvas**

Wire store into GameCanvas: render chicks from store, add a button to spawn egg.

**Step 4: Commit**

```bash
git add src/store/gameStore.ts src/store/chickFactory.ts
git commit -m "feat: add Zustand game store with chick lifecycle and mood system"
```

---

## Task 5: Chick AI — Autonomous Behaviors

**Files:**
- Create: `src/systems/chickAI.ts`
- Modify: `src/components/GameCanvas.tsx` (add ticker)

**Step 1: Create chick AI behavior system**

```ts
// src/systems/chickAI.ts
import type { ChickData } from '../types/chick'

const GROUND_Y_MIN = 400  // grass area top
const GROUND_Y_MAX = 600
const WORLD_X_MIN = 50
const WORLD_X_MAX = 910

export function updateChickAI(chick: ChickData, delta: number): Partial<ChickData> {
  if (chick.stage === 'egg' || chick.stage === 'hatching') {
    return {} // Eggs don't move
  }

  const updates: Partial<ChickData> = {}

  // Random action change
  if (Math.random() < 0.005 * delta) {
    const actions = ['idle', 'walking', 'eating', 'sleeping'] as const
    const weights = chick.mood === 'happy'
      ? [0.2, 0.4, 0.2, 0.2]
      : chick.mood === 'angry'
      ? [0.5, 0.1, 0.1, 0.3]
      : [0.3, 0.3, 0.2, 0.2]

    let roll = Math.random()
    for (let i = 0; i < actions.length; i++) {
      roll -= weights[i]
      if (roll <= 0) {
        updates.currentAction = actions[i]
        break
      }
    }

    // Pick new target when starting to walk
    if (updates.currentAction === 'walking') {
      updates.targetX = WORLD_X_MIN + Math.random() * (WORLD_X_MAX - WORLD_X_MIN)
      updates.targetY = GROUND_Y_MIN + Math.random() * (GROUND_Y_MAX - GROUND_Y_MIN)
    }
  }

  // Movement
  const action = updates.currentAction ?? chick.currentAction
  if (action === 'walking') {
    const dx = chick.targetX - chick.x
    const dy = chick.targetY - chick.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 2) {
      const speed = 0.8 * delta
      updates.x = chick.x + (dx / dist) * speed
      updates.y = chick.y + (dy / dist) * speed
      updates.direction = dx > 0 ? 'right' : 'left'
    } else {
      updates.currentAction = 'idle'
    }
  }

  return updates
}
```

**Step 2: Integrate AI into game loop via Pixi ticker**

Add `useTick` hook in GameCanvas to call `tick()` and `updateChickAI()` each frame.

**Step 3: Verify chicks wander around the grass**

Run: `npm run dev`, spawn a few chicks, watch them walk around autonomously.

**Step 4: Commit**

```bash
git add src/systems/chickAI.ts src/components/GameCanvas.tsx
git commit -m "feat: add chick AI with autonomous wandering and mood-based behaviors"
```

---

## Task 6: Click Interactions & Reactions

**Files:**
- Create: `src/components/ClickEffects.tsx`
- Create: `src/systems/clickEffects.ts`
- Modify: `src/components/Chick.tsx` (add bounce/heart animation)
- Modify: `src/components/GameCanvas.tsx` (handle ground clicks)

**Step 1: Add chick click reaction — bounce + heart particle**

When clicking a chick:
- Chick does a small bounce animation (y offset spring)
- Heart emoji floats up and fades out
- Mood value increases
- Nearby chicks turn to look

**Step 2: Add ground click effects**

- Click on grass: small flower sprouts with pop animation
- Click on sky: cloud or butterfly drifts across
- Click on water area: splash particles

**Step 3: Add cursor-following behavior**

Nearby chicks become curious and follow the mouse cursor when it moves over the grass.

**Step 4: Verify all click interactions work**

Run: `npm run dev`
Expected: Clicking chick = bounce + heart. Clicking grass = flower. Chicks follow cursor.

**Step 5: Commit**

```bash
git add src/components/ClickEffects.tsx src/systems/clickEffects.ts src/components/Chick.tsx src/components/GameCanvas.tsx
git commit -m "feat: add click interactions - chick reactions, ground effects, cursor following"
```

---

## Task 7: Egg Hatching Animation

**Files:**
- Modify: `src/components/Chick.tsx` (add egg wobble + crack animation)
- Create: `src/components/HatchEffect.tsx`

**Step 1: Add egg wobble animation**

Eggs periodically wobble (rotate left/right) with increasing frequency as growth nears 100%.

**Step 2: Add cracking + hatching sequence**

When egg reaches growth 100%:
1. Egg cracks appear (drawn lines on egg)
2. Egg splits open with particle burst
3. Tiny chick appears with sparkle effect
4. Stage transitions to 'baby'

**Step 3: Verify hatching looks good**

Speed up growth temporarily to test the full hatching sequence.

**Step 4: Commit**

```bash
git add src/components/Chick.tsx src/components/HatchEffect.tsx
git commit -m "feat: add egg wobble and hatching animation with particle effects"
```

---

## Task 8: Feeding System

**Files:**
- Create: `src/components/FeedButton.tsx`
- Create: `src/components/FoodParticles.tsx`
- Modify: `src/store/gameStore.ts` (add food inventory)

**Step 1: Create food UI panel**

Bottom toolbar with food options: grain, worm, special treat. Each costs coins.

**Step 2: Create food scattering animation**

Click ground while food selected: food particles scatter on the ground. Nearby chicks run to eat with pecking animation.

**Step 3: Connect feeding to hunger + growth**

Eating increases hunger value and contributes to growth progress. Special food has higher effect.

**Step 4: Verify feeding flow end-to-end**

Spawn chick → select food → click ground → chicks run to eat → hunger/growth increases.

**Step 5: Commit**

```bash
git add src/components/FeedButton.tsx src/components/FoodParticles.tsx src/store/gameStore.ts
git commit -m "feat: add feeding system with food scattering and chick eating behavior"
```

---

## Task 9: UI Overlay — Status Panel & Controls

**Files:**
- Create: `src/components/ui/TopBar.tsx` (coins, chick count)
- Create: `src/components/ui/ChickInfoPanel.tsx` (selected chick details)
- Create: `src/components/ui/Toolbar.tsx` (action buttons)
- Modify: `src/App.tsx`

**Step 1: Create top bar with stats**

Display: coin count, total chick count, time of day.

**Step 2: Create chick info panel**

When a chick is selected, show: name, breed, rarity, stage, mood bar, hunger bar, growth bar.

**Step 3: Create bottom toolbar**

Buttons: Add Egg, Feed, Clean, Play (mini-games). Each button with cute icon.

**Step 4: Style everything with cartoon theme**

Rounded corners, warm colors, playful fonts, subtle shadows.

**Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add UI overlay with stats bar, chick info panel, and action toolbar"
```

---

## Task 10: Scene Decorations & Ambiance

**Files:**
- Create: `src/components/scene/Pond.tsx`
- Create: `src/components/scene/Bush.tsx`
- Create: `src/components/scene/Fence.tsx`
- Create: `src/components/scene/Cloud.tsx`
- Modify: `src/components/Background.tsx`

**Step 1: Add animated clouds drifting across sky**

2-3 clouds at different speeds and heights, looping.

**Step 2: Add pond with water shimmer effect**

Oval blue area with subtle animated shine. Chicks can go drink/play near it.

**Step 3: Add bushes and fence**

Decorative bushes where chicks can hide (for hide-and-seek game later). Fence around the park border.

**Step 4: Add flowers that sway**

Pre-placed flowers with gentle sway animation.

**Step 5: Commit**

```bash
git add src/components/scene/
git commit -m "feat: add scene decorations - clouds, pond, bushes, fence, flowers"
```

---

## Task 11: Mini-Game — Hide and Seek

**Files:**
- Create: `src/games/HideAndSeek.tsx`
- Create: `src/games/GameOverlay.tsx`
- Modify: `src/store/gameStore.ts` (add mini-game state)

**Step 1: Create game overlay container**

Semi-transparent overlay that activates during mini-games with timer and score.

**Step 2: Implement hide-and-seek logic**

- 3-5 chicks hide behind bushes/objects (only tail/head peeking out)
- Player clicks to find them within time limit
- Found chicks pop out with happy animation
- Score based on speed + chicks found

**Step 3: Add rewards**

Completing game gives coins + mood boost to all chicks.

**Step 4: Commit**

```bash
git add src/games/
git commit -m "feat: add hide-and-seek mini-game with rewards"
```

---

## Task 12: Mini-Game — Chick Race

**Files:**
- Create: `src/games/ChickRace.tsx`
- Modify: `src/games/GameOverlay.tsx`

**Step 1: Create race track view**

Horizontal lanes, each with a chick. Finish line on the right.

**Step 2: Implement race mechanics**

- Player picks their chick
- Rapid clicking/tapping gives speed boost to chosen chick
- Other chicks have random speed
- Different breeds have different base speeds

**Step 3: Add race rewards and result screen**

Win = coins + mood boost. Fun result animation.

**Step 4: Commit**

```bash
git add src/games/ChickRace.tsx src/games/GameOverlay.tsx
git commit -m "feat: add chick race mini-game"
```

---

## Task 13: Mini-Game — Fetch

**Files:**
- Create: `src/games/Fetch.tsx`

**Step 1: Implement ball throw mechanic**

Click and drag to aim, release to throw. Ball arcs through air.

**Step 2: Chick runs to fetch**

Selected chick runs to ball, picks it up, runs back. Speed varies by breed.

**Step 3: Score and rewards**

Points for distance thrown. Streak bonus. Coins reward.

**Step 4: Commit**

```bash
git add src/games/Fetch.tsx
git commit -m "feat: add ball fetch mini-game"
```

---

## Task 14: Sound Effects & Background Music

**Files:**
- Create: `src/systems/audio.ts`
- Create: `src/assets/sounds/` (placeholder descriptions)
- Modify: `src/components/ui/TopBar.tsx` (add mute button)

**Step 1: Create audio manager**

Simple audio system: background music + sound effects with volume control and mute toggle.

**Step 2: Add sound triggers**

- Chick click: "叽叽" chirp sound
- Feeding: scatter + pecking sounds
- Hatching: crack + fanfare
- Mini-game: start/win/lose jingles
- Ambient: gentle nature sounds

**Step 3: Add mute button to UI**

Speaker icon in top bar to toggle sound.

**Step 4: Commit**

```bash
git add src/systems/audio.ts src/components/ui/TopBar.tsx
git commit -m "feat: add sound effects system with ambient audio and interaction sounds"
```

---

## Task 15: Persistence — Save/Load Game

**Files:**
- Create: `src/systems/persistence.ts`
- Modify: `src/store/gameStore.ts`

**Step 1: Implement localStorage save/load**

Auto-save game state every 30 seconds. Load on app start.

**Step 2: Add save indicator in UI**

Small "saving..." text that flashes briefly on auto-save.

**Step 3: Verify persistence works**

Save → refresh page → all chicks and state restored.

**Step 4: Commit**

```bash
git add src/systems/persistence.ts src/store/gameStore.ts
git commit -m "feat: add auto-save/load with localStorage"
```

---

## Task 16: Polish & Responsive Design

**Files:**
- Modify: `src/App.tsx`, `src/App.css`
- Modify: `src/components/GameCanvas.tsx`
- Modify: `src/components/ui/*`

**Step 1: Make canvas responsive**

Scale game canvas to fit screen while maintaining aspect ratio.

**Step 2: Mobile touch support**

Ensure all click interactions work with touch events on mobile browsers.

**Step 3: Loading screen**

Cute loading animation while assets load.

**Step 4: Final visual polish**

- Smooth all animations
- Add subtle shadows under chicks
- Ensure consistent cartoon style across all UI

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add responsive design, mobile support, and visual polish"
```

---

## Summary

| Task | Description | Priority |
|------|-------------|----------|
| 1 | Project scaffolding | P0 |
| 2 | Game canvas & background | P0 |
| 3 | Chick sprite & rendering | P0 |
| 4 | Game state store | P0 |
| 5 | Chick AI behaviors | P0 |
| 6 | Click interactions | P0 |
| 7 | Egg hatching animation | P0 |
| 8 | Feeding system | P0 |
| 9 | UI overlay & controls | P0 |
| 10 | Scene decorations | P0 |
| 11 | Mini-game: Hide & Seek | P1 |
| 12 | Mini-game: Chick Race | P1 |
| 13 | Mini-game: Fetch | P1 |
| 14 | Sound effects | P1 |
| 15 | Save/Load | P0 |
| 16 | Polish & responsive | P0 |
