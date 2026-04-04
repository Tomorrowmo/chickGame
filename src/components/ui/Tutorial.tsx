import { useState } from 'react'

const STORAGE_KEY = 'linda-tutorial-shown'
const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

export function Tutorial() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY)
    } catch {
      return true
    }
  })

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        fontFamily,
      }}
    >
      <div
        style={{
          background: '#fff8e1',
          borderRadius: 24,
          padding: '36px 40px',
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          color: '#5d4037',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>🐣</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 20,
            color: '#f5a623',
          }}
        >
          欢迎来到小鸡宠物乐园！
        </div>
        <div
          style={{
            textAlign: 'left',
            fontSize: 15,
            lineHeight: 2,
            marginBottom: 24,
          }}
        >
          <div>1. 点击"添加蛋"孵化你的第一只小鸡</div>
          <div>2. 点击小鸡可以跟它互动</div>
          <div>3. 用食物喂养小鸡让它长大</div>
          <div>4. 等小鸡长大后可以玩迷你游戏</div>
        </div>
        <button
          onClick={dismiss}
          style={{
            padding: '12px 40px',
            fontSize: 18,
            fontFamily,
            fontWeight: 'bold',
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            background: '#f5c542',
            color: '#5d4037',
            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
            transition: 'transform 0.1s',
          }}
        >
          开始游戏
        </button>
      </div>
    </div>
  )
}
