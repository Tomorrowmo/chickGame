import { useState, useCallback, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'

const fontFamily = '"Comic Sans MS", "Chalkboard SE", cursive'

// 默认密码 — 可修改
const PARENT_PASSWORD = '2580'

interface ParentPanelProps {
  open: boolean
  onClose: () => void
}

export function ParentPanel({ open, onClose }: ParentPanelProps) {
  const coins = useGameStore((s) => s.coins)
  const addCoins = useGameStore((s) => s.addCoins)
  const chicks = useGameStore((s) => s.chicks)

  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)
  const [amount, setAmount] = useState('10')
  const [reason, setReason] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const passwordInputRef = useRef<HTMLInputElement>(null)

  // Reset state every time panel opens, and focus the password input
  useEffect(() => {
    if (open) {
      setPassword('')
      setUnlocked(false)
      setError(false)
      setAmount('10')
      setReason('')
      // Delay focus to ensure the input is fully mounted
      const t = setTimeout(() => {
        passwordInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Re-focus when user returns to tab (handles browser tab switch)
  useEffect(() => {
    if (!open || unlocked) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        passwordInputRef.current?.focus()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [open, unlocked])

  const handleUnlockSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (password.trim() === PARENT_PASSWORD) {
        setUnlocked(true)
        setError(false)
      } else {
        setError(true)
        setPassword('')
        passwordInputRef.current?.focus()
      }
    },
    [password],
  )

  const handleAward = useCallback(
    (delta: number) => {
      if (delta === 0) return
      addCoins(delta)
      const prefix = delta > 0 ? '+' : ''
      const msg = reason
        ? `${prefix}${delta} 金币 · ${reason}`
        : `${prefix}${delta} 金币 已到账`
      setToast(msg)
      setAmount('10')
      setReason('')
      setTimeout(() => setToast(null), 2000)
    },
    [addCoins, reason],
  )

  const handleCustomAward = useCallback(() => {
    const n = parseInt(amount, 10)
    if (!isNaN(n)) handleAward(n)
  }, [amount, handleAward])

  if (!open) return null

  const chickCount = chicks.length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          background: '#fff8e1',
          borderRadius: 20,
          padding: 28,
          width: 380,
          maxWidth: '92%',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
          border: '3px solid #d4890e',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 14,
            fontSize: 20,
            color: '#8b6914',
            cursor: 'pointer',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ×
        </div>

        {!unlocked ? (
          // === Password screen ===
          <form onSubmit={handleUnlockSubmit}>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#d4890e', marginBottom: 6, textAlign: 'center' }}>
              👨‍👩‍👧 家长模式
            </div>
            <div style={{ fontSize: 13, color: '#8b6914', marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>
              请输入家长密码解锁<br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>（仅家长可见）</span>
            </div>
            <input
              ref={passwordInputRef}
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              placeholder="请输入密码"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 18,
                fontFamily,
                borderRadius: 10,
                border: error ? '2px solid #e53935' : '2px solid #d4890e',
                background: '#fff',
                boxSizing: 'border-box',
                marginBottom: 8,
                textAlign: 'center',
                letterSpacing: 4,
                outline: 'none',
              }}
            />
            {error && (
              <div style={{ fontSize: 12, color: '#e53935', textAlign: 'center', marginBottom: 8 }}>
                密码错误，请重试
              </div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 16,
                fontFamily,
                fontWeight: 'bold',
                color: '#fff',
                background: 'linear-gradient(135deg, #f5c542, #e8a623)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                marginTop: 8,
                boxShadow: '0 3px 8px rgba(212, 137, 14, 0.3)',
              }}
            >
              解锁
            </button>
          </form>
        ) : (
          // === Parent dashboard ===
          <>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#d4890e', marginBottom: 4, textAlign: 'center' }}>
              👨‍👩‍👧 家长模式
            </div>
            <div style={{ fontSize: 12, color: '#8b6914', marginBottom: 16, textAlign: 'center' }}>
              给孩子的表现奖励金币吧！
            </div>

            {/* Status */}
            <div
              style={{
                background: '#fff3cd',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 18,
                display: 'flex',
                justifyContent: 'space-around',
                fontSize: 14,
                color: '#5d4037',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, opacity: 0.7 }}>当前金币</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#d4890e' }}>🪙 {coins}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, opacity: 0.7 }}>小鸡总数</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#4caf50' }}>🐤 {chickCount}</div>
              </div>
            </div>

            {/* Quick award buttons */}
            <div style={{ fontSize: 13, color: '#5d4037', marginBottom: 8, fontWeight: 'bold' }}>
              快捷奖励
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[10, 20, 50, 100, 200, 500].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleAward(n)}
                  style={{
                    padding: '10px 0',
                    fontSize: 15,
                    fontFamily,
                    fontWeight: 'bold',
                    color: '#5d4037',
                    background: '#ffe082',
                    border: '2px solid #f5c542',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  +{n}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div style={{ fontSize: 13, color: '#5d4037', marginBottom: 8, fontWeight: 'bold' }}>
              自定义金额
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="金额"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: 15,
                  fontFamily,
                  borderRadius: 10,
                  border: '2px solid #d4890e',
                  background: '#fff',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCustomAward}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontFamily,
                  fontWeight: 'bold',
                  color: '#fff',
                  background: '#4caf50',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                确认
              </button>
            </div>

            {/* Optional reason */}
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="奖励原因（可选，如：认真写作业）"
              maxLength={30}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                fontFamily,
                borderRadius: 10,
                border: '1px solid #deb887',
                background: '#fffef5',
                boxSizing: 'border-box',
                marginBottom: 8,
                outline: 'none',
              }}
            />

            {toast && (
              <div
                style={{
                  marginTop: 6,
                  padding: '10px 14px',
                  background: '#c8e6c9',
                  color: '#1b5e20',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                ✨ {toast}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
