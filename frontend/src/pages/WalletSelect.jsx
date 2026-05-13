import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { verifyWalletPin } from '../utils/walletSession'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

function PinPad({ wallet, onSuccess, onClose }) {
  const [digits, setDigits] = useState([])
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(false)

  const token = localStorage.getItem('token')
  const color = getWalletColor(wallet.color)

  async function handleDigit(d) {
    if (locked || loading) return
    const next = [...digits, d]
    setDigits(next)
    setError('')

    if (next.length === 4) {
      setLoading(true)
      const pin = next.join('')
      const result = await verifyWalletPin(wallet.id, pin, token)
      setLoading(false)
      if (result.ok) {
        onSuccess()
      } else {
        setDigits([])
        if (result.locked) {
          setLocked(true)
          setError(result.message || 'Too many attempts. Try again later.')
        } else {
          setError(result.attemptsLeft != null
            ? `Wrong PIN — ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? 's' : ''} left`
            : 'Incorrect PIN')
        }
      }
    }
  }

  function handleBack() {
    setDigits(d => d.slice(0, -1))
    setError('')
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#141414] rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
        {/* Avatar header */}
        <div className={`bg-linear-to-br ${color.gradient} p-6 flex flex-col items-center gap-3`}>
          <div className="w-20 h-20 rounded-full bg-white/20 overflow-hidden ring-4 ring-white/30">
            <img
              src={getAvatarUrl(wallet)}
              alt={wallet.name}
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{wallet.name}</p>
            <p className="text-white/70 text-sm">Enter PIN to unlock</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Dots */}
          <div className="flex justify-center gap-4">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  i < digits.length
                    ? `bg-${wallet.color || 'violet'}-400`
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-red-400 text-sm font-medium">{error}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {keys.map((k, i) => (
              <button
                key={i}
                onClick={() => {
                  if (k === '⌫') handleBack()
                  else if (k !== '') handleDigit(k)
                }}
                disabled={locked || loading || k === ''}
                className={`
                  h-14 rounded-xl text-xl font-semibold transition-all
                  ${k === '' ? 'invisible' : ''}
                  ${locked || loading
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'}
                `}
              >
                {loading && k === '0' ? '...' : k}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function WalletCard({ wallet, onClick }) {
  const color = getWalletColor(wallet.color)
  const isFamily = wallet.is_total_wallet

  return (
    <button
      onClick={onClick}
      className="group relative aspect-2/3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:ring-2 hover:ring-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-linear-to-br ${color.gradient} opacity-90`} />

      {/* Family shimmer overlay */}
      {isFamily && (
        <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent" />
      )}

      {/* Avatar */}
      <div className="absolute inset-0 flex items-center justify-center pt-4">
        <div className="w-20 h-20 rounded-full bg-white/20 overflow-hidden ring-2 ring-white/30">
          <img
            src={getAvatarUrl(wallet)}
            alt={wallet.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      </div>

      {/* Lock icon */}
      <div className="absolute top-3 right-3 text-white/70 text-base">
        {isFamily ? '👨‍👩‍👧‍👦' : '🔒'}
      </div>

      {/* Name */}
      <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/60 to-transparent p-3">
        <p className="text-white font-semibold text-sm text-center truncate">{wallet.name}</p>
        {isFamily && (
          <p className="text-white/60 text-xs text-center">Family Overview</p>
        )}
      </div>
    </button>
  )
}

export default function WalletSelect() {
  const navigate = useNavigate()
  const location = useLocation()
  const { wallets, loading, refreshWallets, activateWallet } = useWallet()
  const [pinTarget, setPinTarget] = useState(null)

  const token = localStorage.getItem('token')
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return }
    refreshWallets()
  }, [token, navigate, refreshWallets])

  function handleCardClick(wallet) {
    setPinTarget(wallet)
  }

  function handlePinSuccess() {
    activateWallet(pinTarget)
    setPinTarget(null)
    const dest = pinTarget.is_total_wallet ? '/family' : from
    navigate(dest, { replace: true })
  }

  const personalWallets = wallets.filter(w => !w.is_total_wallet)
  const familyWallet = wallets.find(w => w.is_total_wallet)

  if (!token) return null

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <img src="/vite.svg" alt="Spendly" className="w-8 h-8" />
          <span className="text-2xl font-bold text-white tracking-tight">Spendly</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
          className="text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pb-10">
        <h1 className="text-2xl font-semibold text-white/90 mt-6 mb-2">Who's managing today?</h1>
        <p className="text-white/40 text-sm mb-8">Select a wallet to continue</p>

        {loading && (
          <div className="flex items-center gap-2 text-white/40 mt-10">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <span>Loading wallets...</span>
          </div>
        )}

        {!loading && wallets.length === 0 && (
          <div className="w-full max-w-sm text-center space-y-8 mt-4">
            {/* Hero */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-2xl shadow-violet-900/50 mb-4">
                <span className="text-5xl">💳</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome to Wallets</h2>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">
                Create separate wallets for each family member.<br/>Every wallet has its own data, protected by a PIN.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 text-left">
              {[
                { icon: '🔒', title: 'PIN-protected privacy', desc: 'Each wallet is locked with a 4–6 digit PIN.' },
                { icon: '👨‍👩‍👧‍👦', title: 'Family Overview', desc: 'One combined view of all wallets — totals only, no details.' },
                { icon: '🎨', title: '100+ avatars & 10 colors', desc: 'Personalize each wallet with a unique look.' },
                { icon: '📊', title: 'Isolated data', desc: 'Expenses, budgets, goals — all per wallet.' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                  <span className="text-xl mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <p className="text-white/50 text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/create-wallet')}
              className="w-full py-4 bg-violet-600 hover:bg-violet-500 rounded-2xl text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-violet-900/40"
            >
              Create My First Wallet
            </button>
          </div>
        )}

        {!loading && wallets.length > 0 && (
          <>
            {/* Personal wallets grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-2xl">
              {personalWallets.map(w => (
                <WalletCard key={w.id} wallet={w} onClick={() => handleCardClick(w)} />
              ))}

              {/* Family wallet */}
              {familyWallet && (
                <WalletCard wallet={familyWallet} onClick={() => handleCardClick(familyWallet)} />
              )}

              {/* Add wallet card */}
              {personalWallets.length < 10 && (
                <button
                  onClick={() => navigate('/create-wallet')}
                  className="aspect-2/3 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 group"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                    <span className="text-2xl text-white/60 group-hover:text-white/90">+</span>
                  </div>
                  <span className="text-white/50 text-xs font-medium group-hover:text-white/70">Add Wallet</span>
                </button>
              )}
            </div>

            {/* Manage link */}
            <button
              onClick={() => navigate('/profile', { state: { tab: 'wallets' } })}
              className="mt-8 text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              Manage Wallets
            </button>
          </>
        )}
      </div>

      {/* PIN overlay */}
      {pinTarget && (
        <PinPad
          wallet={pinTarget}
          onSuccess={handlePinSuccess}
          onClose={() => setPinTarget(null)}
        />
      )}
    </div>
  )
}
