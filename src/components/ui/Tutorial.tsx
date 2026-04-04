import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'

const STORAGE_KEY = 'linda-tutorial-shown'
const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

// ============ Step definitions ============

interface TutorialStep {
  emoji: string
  title: string
  text: string
  /** Which part of the UI to highlight (CSS selector or area description) */
  highlight?: 'shop' | 'toolbar' | 'canvas' | 'chick' | 'coop'
  /** Position of the speech bubble */
  position: 'center' | 'bottom' | 'top' | 'left'
  /** Auto-advance condition check */
  checkDone?: (state: ReturnType<typeof useGameStore.getState>) => boolean
  /** Waiting for user action? */
  waitForAction?: boolean
  /** Character speaking */
  character: 'mama' | 'chick' | 'narrator'
}

const STEPS: TutorialStep[] = [
  {
    emoji: '🐔',
    title: '欢迎来到小鸡宠物乐园！',
    text: '我是鸡妈妈卡梅拉，让我带你认识这个乐园吧！',
    position: 'center',
    character: 'mama',
  },
  {
    emoji: '🏡',
    title: '这是我们的家',
    text: '看！乐园里有三个鸡舍——普通鸡舍、花园鸡舍和水晶鸡舍。不同品种的小鸡住在不同的家哦！',
    position: 'center',
    highlight: 'canvas',
    character: 'mama',
  },
  {
    emoji: '🛒',
    title: '去商店买个蛋吧！',
    text: '点击下面工具栏的「商店」按钮，用金币买一颗蛋。新手建议先买一颗普通蛋（20金币）试试！',
    position: 'bottom',
    highlight: 'shop',
    waitForAction: true,
    checkDone: (s) => s.chicks.some(c => c.stage === 'egg'),
    character: 'mama',
  },
  {
    emoji: '🥚',
    title: '太好了，你有蛋了！',
    text: '看到草地上那颗蛋了吗？它现在还不会孵化哦——你需要把它放进鸡舍！',
    position: 'center',
    character: 'mama',
  },
  {
    emoji: '👆',
    title: '长按蛋，拖到鸡舍！',
    text: '用手指（或鼠标）长按蛋约0.5秒，蛋会被你「拿起来」。然后拖到对应颜色的鸡舍门口放下。普通蛋 → 普通鸡舍，特殊蛋 → 花园鸡舍，稀有蛋 → 水晶鸡舍。',
    position: 'center',
    highlight: 'coop',
    waitForAction: true,
    checkDone: (s) => s.chicks.some(c => c.inCoop),
    character: 'mama',
  },
  {
    emoji: '🐣',
    title: '蛋开始孵化了！',
    text: '放进鸡舍的蛋会慢慢晃动、裂开，然后一只毛绒绒的小鸡就出生啦！耐心等一会儿~',
    position: 'center',
    character: 'mama',
  },
  {
    emoji: '❤️',
    title: '和小鸡互动',
    text: '点击小鸡——它会跳起来叫！长按可以抱起来蹭蹭。试试到处点画面，会有惊喜哦！',
    position: 'center',
    character: 'chick',
  },
  {
    emoji: '🌾',
    title: '别忘了喂食！',
    text: '工具栏有谷物、虫子、糖果。选一种食物，然后点击草地撒食。小鸡会跑过来抢着吃！',
    position: 'bottom',
    highlight: 'toolbar',
    character: 'mama',
  },
  {
    emoji: '💰',
    title: '小鸡长大会下蛋赚钱',
    text: '小鸡长大成年后，开心的鸡会定时下蛋，给你赚金币！保持心情好，金币来得更快哦~',
    position: 'center',
    character: 'narrator',
  },
  {
    emoji: '🎮',
    title: '还有更多好玩的！',
    text: '有了3只以上的鸡，就能玩迷你游戏——躲猫猫、赛跑、丢球！还有成就系统等你挑战。晚上小鸡会自己回窝睡觉，白天又出来玩~',
    position: 'center',
    character: 'narrator',
  },
  {
    emoji: '🌟',
    title: '准备好了吗？',
    text: '去商店买你的第一颗蛋，开始你的养鸡之旅吧！卡梅拉祝你玩得开心！',
    position: 'center',
    character: 'mama',
  },
]

// ============ Character configs ============

const CHARACTERS = {
  mama: {
    avatar: '🐔',
    name: '卡梅拉妈妈',
    bubbleColor: '#fff8e1',
    borderColor: '#f5c542',
    nameColor: '#d4890e',
  },
  chick: {
    avatar: '🐤',
    name: '小鸡仔',
    bubbleColor: '#fffde7',
    borderColor: '#ffcc02',
    nameColor: '#e6a800',
  },
  narrator: {
    avatar: '📖',
    name: '旁白',
    bubbleColor: '#f3e5f5',
    borderColor: '#ba68c8',
    nameColor: '#7b1fa2',
  },
}

// ============ Highlight overlay ============

function HighlightOverlay({ area }: { area?: string }) {
  if (!area) return null

  // Pulsing arrow pointing to the area
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    fontSize: 36,
    animation: 'tutorial-bounce 0.8s ease-in-out infinite',
    zIndex: 1002,
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
    pointerEvents: 'none',
  }

  switch (area) {
    case 'shop':
      return <div style={{ ...arrowStyle, bottom: 85, right: '38%' }}>👇</div>
    case 'toolbar':
      return <div style={{ ...arrowStyle, bottom: 85, left: '25%' }}>👇</div>
    case 'coop':
      return (
        <>
          <div style={{ ...arrowStyle, bottom: '35%', left: '12%' }}>👇</div>
          <div style={{ ...arrowStyle, bottom: '30%', left: '48%' }}>👇</div>
          <div style={{ ...arrowStyle, bottom: '35%', right: '18%' }}>👇</div>
        </>
      )
    default:
      return null
  }
}

// ============ Step indicator dots ============

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background: i === current ? '#f5c542' : i < current ? '#ddd' : 'rgba(0,0,0,0.15)',
            transition: 'all 0.3s',
          }}
        />
      ))}
    </div>
  )
}

// ============ Main Tutorial Component ============

export function Tutorial() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY)
    } catch {
      return true
    }
  })

  const [step, setStep] = useState(0)
  const [showCharacter, setShowCharacter] = useState(false)

  // Animate character entrance
  useEffect(() => {
    if (visible) {
      setShowCharacter(false)
      const t = setTimeout(() => setShowCharacter(true), 100)
      return () => clearTimeout(t)
    }
  }, [step, visible])

  // Auto-advance when checkDone condition is met
  const currentStep = STEPS[step]
  useEffect(() => {
    if (!visible || !currentStep?.checkDone) return

    const interval = setInterval(() => {
      const state = useGameStore.getState()
      if (currentStep.checkDone!(state)) {
        setStep(s => s + 1)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [visible, step, currentStep])

  const handleNext = useCallback(() => {
    if (step >= STEPS.length - 1) {
      // Last step — dismiss
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch { /* ignore */ }
      setVisible(false)
    } else {
      setStep(s => s + 1)
    }
  }, [step])

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* ignore */ }
    setVisible(false)
  }, [])

  if (!visible) return null

  const stepData = STEPS[step]
  const char = CHARACTERS[stepData.character]
  const isWaiting = stepData.waitForAction && stepData.checkDone
  const isLastStep = step === STEPS.length - 1

  // Determine bubble position
  const bubblePositionStyle: React.CSSProperties = (() => {
    switch (stepData.position) {
      case 'bottom':
        return { bottom: 120, left: '50%', transform: 'translateX(-50%)' }
      case 'top':
        return { top: 60, left: '50%', transform: 'translateX(-50%)' }
      case 'left':
        return { top: '50%', left: 40, transform: 'translateY(-50%)' }
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
  })()

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes tutorial-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes tutorial-pop-in {
          0% { transform: scale(0.5) translateY(20px); opacity: 0; }
          60% { transform: scale(1.05) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes tutorial-avatar-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(-5deg); }
          75% { transform: translateY(-4px) rotate(5deg); }
        }
      `}</style>

      {/* Dark overlay — semi-transparent so player can see the game */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: isWaiting ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)',
          zIndex: 999,
          pointerEvents: isWaiting ? 'none' : 'auto',
          transition: 'background 0.3s',
        }}
      />

      {/* Highlight arrows */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1001, pointerEvents: 'none' }}>
        <HighlightOverlay area={stepData.highlight} />
      </div>

      {/* Speech bubble */}
      <div
        style={{
          position: 'fixed',
          ...bubblePositionStyle,
          zIndex: 1002,
          pointerEvents: 'auto',
          maxWidth: 480,
          width: '92%',
          animation: showCharacter ? 'tutorial-pop-in 0.4s ease-out forwards' : 'none',
          opacity: showCharacter ? 1 : 0,
        }}
      >
        {/* Character avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
        }}>
          <div style={{
            fontSize: 48,
            animation: 'tutorial-avatar-bounce 1.5s ease-in-out infinite',
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))',
          }}>
            {char.avatar}
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: char.nameColor,
            fontFamily,
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
          }}>
            {char.name}
          </div>
        </div>

        {/* Bubble body */}
        <div style={{
          background: char.bubbleColor,
          border: `3px solid ${char.borderColor}`,
          borderRadius: 20,
          padding: '20px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          position: 'relative',
        }}>
          {/* Step emoji + title */}
          <div style={{
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
            color: '#5d4037',
            fontFamily,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 28 }}>{stepData.emoji}</span>
            {stepData.title}
          </div>

          {/* Step text */}
          <div style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: '#6d4c41',
            fontFamily,
            marginBottom: 16,
          }}>
            {stepData.text}
          </div>

          {/* Buttons row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            {/* Skip button */}
            <button
              onClick={handleSkip}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                fontFamily,
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.15)',
                cursor: 'pointer',
                background: 'transparent',
                color: '#999',
                transition: 'all 0.15s',
              }}
            >
              跳过教程
            </button>

            {/* Next / action button */}
            {isWaiting ? (
              <div style={{
                fontSize: 13,
                color: '#f5a623',
                fontFamily,
                fontWeight: 'bold',
                animation: 'tutorial-bounce 1s ease-in-out infinite',
              }}>
                👆 快去试试吧！
              </div>
            ) : (
              <button
                onClick={handleNext}
                style={{
                  padding: '10px 28px',
                  fontSize: 16,
                  fontFamily,
                  fontWeight: 'bold',
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: isLastStep
                    ? 'linear-gradient(135deg, #f5c542, #ff9800)'
                    : '#f5c542',
                  color: '#5d4037',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                  transition: 'transform 0.1s',
                }}
              >
                {isLastStep ? '开始冒险！🌟' : '下一步 →'}
              </button>
            )}
          </div>

          {/* Step progress dots */}
          <StepDots current={step} total={STEPS.length} />
        </div>
      </div>
    </>
  )
}
