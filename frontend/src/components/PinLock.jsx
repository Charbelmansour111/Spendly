import { useState } from 'react'

const SHAKE_CSS = `
@keyframes pinShake {
  0%,100% { transform:translateX(0)   }
  20%,60%  { transform:translateX(-7px) }
  40%,80%  { transform:translateX(7px)  }
}
`

export default function PinLock({ children, storageKey = 'spendly_networth_pin' }) {
  const stored  = () => localStorage.getItem(storageKey)
  const session = () => sessionStorage.getItem(storageKey + '_ok') === '1'

  // phase: setup | confirm | enter
  const [phase,   setPhase]   = useState(() => session() ? 'unlocked' : stored() ? 'enter' : 'setup')
  const [pin,     setPin]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [shake,   setShake]   = useState(false)

  if (phase === 'unlocked') return children

  const current = phase === 'confirm' ? confirm : pin

  const unlock = () => {
    sessionStorage.setItem(storageKey + '_ok', '1')
    setPhase('unlocked')
  }

  const boom = (msg) => {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 550)
  }

  const press = (d) => {
    setError('')
    if (phase === 'setup') {
      const next = pin + d
      if (next.length > 4) return
      setPin(next)
      if (next.length === 4) { setPhase('confirm'); setConfirm('') }

    } else if (phase === 'confirm') {
      const next = confirm + d
      if (next.length > 4) return
      setConfirm(next)
      if (next.length === 4) {
        if (next === pin) {
          localStorage.setItem(storageKey, next)
          unlock()
        } else {
          boom("PINs don't match — try again")
          setPin(''); setConfirm(''); setPhase('setup')
        }
      }

    } else {
      const next = pin + d
      if (next.length > 4) return
      setPin(next)
      if (next.length === 4) {
        if (next === stored()) {
          unlock()
        } else {
          boom('Wrong PIN')
          setTimeout(() => setPin(''), 550)
        }
      }
    }
  }

  const del = () => {
    setError('')
    if (phase === 'confirm') setConfirm(c => c.slice(0, -1))
    else setPin(p => p.slice(0, -1))
  }

  const resetPin = () => {
    if (!window.confirm("This will clear your PIN — you'll need to create a new one. Continue?")) return
    localStorage.removeItem(storageKey)
    sessionStorage.removeItem(storageKey + '_ok')
    setPin(''); setConfirm(''); setError(''); setPhase('setup')
  }

  const heading  = phase === 'setup'   ? 'Create a PIN'
                 : phase === 'confirm' ? 'Confirm your PIN'
                 : 'Enter your PIN'
  const subtext  = phase === 'setup'   ? 'Protect your net worth with a 4-digit PIN'
                 : phase === 'confirm' ? 'Type the same PIN to confirm'
                 : 'Net worth is PIN-protected'

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <style>{SHAKE_CSS}</style>

      {/* Icon + heading */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">{phase === 'enter' ? '🔐' : '🔑'}</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{heading}</h2>
        <p className="text-sm text-gray-400 mt-1">{subtext}</p>
        {error && (
          <p className="text-red-500 text-sm font-semibold mt-3">{error}</p>
        )}
      </div>

      {/* PIN dots */}
      <div className="flex gap-5 mb-10"
           style={{ animation: shake ? 'pinShake 0.55s ease' : 'none' }}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150 ${
            i < current.length
              ? 'bg-violet-600 scale-125 shadow-md shadow-violet-400/40'
              : 'bg-gray-200 dark:bg-gray-600'
          }`}/>
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3" style={{ width: 240 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))}
            className="h-16 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-xl font-semibold text-gray-800 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-90 transition-all select-none">
            {n}
          </button>
        ))}
        <div />
        <button onClick={() => press('0')}
          className="h-16 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-xl font-semibold text-gray-800 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-90 transition-all select-none">
          0
        </button>
        <button onClick={del}
          className="h-16 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all flex items-center justify-center select-none">
          ⌫
        </button>
      </div>

      {/* Reset (only on enter) */}
      {phase === 'enter' && (
        <button onClick={resetPin}
          className="mt-8 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2 transition">
          Forgot PIN? Reset it
        </button>
      )}
    </div>
  )
}
