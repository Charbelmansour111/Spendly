import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { verifyWalletPin } from '../utils/walletSession'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

// ── PIN numpad overlay ────────────────────────────────────────────────────────
function PinPad({ wallet, onSuccess, onClose }) {
  const [digits, setDigits] = useState([])
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const token = localStorage.getItem('token')
  const color = getWalletColor(wallet.color)

  async function handleDigit(d) {
    if (locked || loading || digits.length >= 6) return
    const next = [...digits, d]
    setDigits(next)
    setError('')

    if (next.length === 4) {
      setLoading(true)
      const result = await verifyWalletPin(wallet.id, next.join(''), token)
      setLoading(false)
      if (result.ok) {
        onSuccess()
      } else {
        setDigits([])
        setShake(true)
        setTimeout(() => setShake(false), 500)
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Wallet header strip */}
        <div className={`bg-linear-to-r ${color.gradient} p-5 flex items-center gap-4`}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 overflow-hidden ring-2 ring-white/30 shrink-0">
            <img src={getAvatarUrl(wallet)} alt={wallet.name} className="w-full h-full object-cover"
              onError={e => { e.target.style.display='none' }} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-lg truncate">{wallet.name}</p>
            <p className="text-white/70 text-sm">{wallet.is_total_wallet ? 'Family Overview' : 'Enter PIN to unlock'}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Dots */}
          <div className={`flex justify-center gap-3 transition-all ${shake ? 'animate-bounce' : ''}`}>
            {[0,1,2,3].map(i => (
              <div key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  i < digits.length
                    ? 'bg-violet-600 scale-110'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`} />
            ))}
          </div>

          {error && (
            <p className="text-center text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {keys.map((k, i) => (
              <button
                key={i}
                onClick={() => { if (k === '⌫') handleBack(); else if (k !== '') handleDigit(k) }}
                disabled={locked || loading || k === ''}
                className={`
                  h-14 rounded-2xl text-xl font-semibold transition-all duration-100
                  ${k === '' ? 'invisible' : ''}
                  ${k === '⌫' ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700' : ''}
                  ${k !== '' && k !== '⌫' && !locked && !loading
                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-400 active:scale-95 border border-gray-100 dark:border-gray-700'
                    : ''}
                  ${locked || loading ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                {loading && k === '⌫' ? <span className="w-4 h-4 border-2 border-gray-300 border-t-violet-500 rounded-full animate-spin inline-block" /> : k}
              </button>
            ))}
          </div>

          <button onClick={onClose}
            className="w-full py-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Wallet card ───────────────────────────────────────────────────────────────
function WalletCard({ wallet, onClick, onSettings }) {
  const color = getWalletColor(wallet.color)
  const isFamily = wallet.is_total_wallet

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full text-left rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-white dark:bg-gray-800"
      >
        {/* Color accent bar */}
        <div className={`h-1.5 w-full bg-linear-to-r ${color.gradient}`} />

        <div className="p-4 flex items-center gap-3">
          {/* Avatar */}
          <div className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-2 ${isFamily ? 'ring-purple-300 dark:ring-purple-700' : 'ring-gray-100 dark:ring-gray-700'}`}
            style={{ background: color.hex + '22' }}>
            <img src={getAvatarUrl(wallet)} alt={wallet.name}
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display='none' }} />
            {isFamily && (
              <div className="absolute inset-0 flex items-center justify-center bg-purple-100/60 dark:bg-purple-900/60 text-xl">
                👨‍👩‍👧‍👦
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{wallet.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {isFamily ? 'All wallets combined' : color.label}
            </p>
          </div>

          {/* Lock badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isFamily
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              🔒
            </span>
          </div>
        </div>
      </button>

      {/* Settings gear — shown on hover */}
      {!isFamily && (
        <button
          onClick={e => { e.stopPropagation(); onSettings() }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-white dark:bg-gray-700 shadow-md flex items-center justify-center text-gray-400 hover:text-violet-600 transition-all z-10"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WalletSelect() {
  const navigate = useNavigate()
  const location = useLocation()
  const { wallets, loading, refreshWallets, activateWallet } = useWallet()
  const [pinTarget, setPinTarget] = useState(null)

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return }
    refreshWallets()
  }, [token, navigate, refreshWallets])

  function handlePinSuccess() {
    activateWallet(pinTarget)
    setPinTarget(null)
    navigate(pinTarget.is_total_wallet ? '/family' : from, { replace: true })
  }

  const personalWallets = wallets.filter(w => !w.is_total_wallet)
  const familyWallet = wallets.find(w => w.is_total_wallet)

  if (!token) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm shadow-violet-200 dark:shadow-violet-900">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Spendly</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-400">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-32">{user?.name || 'User'}</span>
          </div>
          <button
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login') }}
            className="text-xs font-medium text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 py-8 gap-6">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Choose a Wallet</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Select which wallet to manage today</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
            Loading wallets…
          </div>
        )}

        {/* FAMILY OVERVIEW — always on top if it exists */}
        {!loading && familyWallet && (
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">Family Overview</p>
            <button
              onClick={() => setPinTarget(familyWallet)}
              className="w-full text-left rounded-2xl overflow-hidden border-2 border-purple-200 dark:border-purple-800/60 shadow-sm hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-200 hover:-translate-y-0.5 bg-white dark:bg-gray-800"
            >
              <div className="h-1.5 w-full bg-linear-to-r from-purple-500 to-violet-600" />
              <div className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-2xl shrink-0 ring-2 ring-purple-200 dark:ring-purple-800">
                  👨‍👩‍👧‍👦
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">Family Overview</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                    {personalWallets.length} wallet{personalWallets.length !== 1 ? 's' : ''} · Combined view
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                    Overview
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">🔒 PIN protected</span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* PERSONAL WALLETS */}
        {!loading && personalWallets.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">My Wallets</p>
            <div className="space-y-2.5">
              {personalWallets.map(w => (
                <WalletCard
                  key={w.id}
                  wallet={w}
                  onClick={() => setPinTarget(w)}
                  onSettings={() => navigate(`/wallet/${w.id}/profile`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ONBOARDING empty state */}
        {!loading && wallets.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-8">
            <div>
              <div className="w-20 h-20 mx-auto rounded-3xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/50 mb-5">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12V7H5a2 2 0 010-4h11v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/>
                  <path d="M18 12a2 2 0 000 4h4v-4z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create your first wallet</h2>
              <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                Separate finances for each family member — each wallet is PIN-protected.
              </p>
            </div>

            <div className="w-full space-y-2.5 text-left">
              {[
                { icon: '🔒', t: 'PIN-protected privacy', d: 'Each wallet has a unique 4–6 digit PIN' },
                { icon: '👨‍👩‍👧‍👦', t: 'Family Overview', d: 'Combined totals without exposing details' },
                { icon: '🎨', t: '100+ avatars & 10 colors', d: 'Personalize every wallet' },
              ].map(f => (
                <div key={f.t} className="flex items-start gap-3 p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <span className="text-xl mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{f.t}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/create-wallet')}
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 rounded-2xl text-white font-bold text-base transition-all shadow-lg shadow-violet-200 dark:shadow-violet-900/40 hover:-translate-y-0.5"
            >
              Create My First Wallet
            </button>
          </div>
        )}

        {/* Add wallet button */}
        {!loading && wallets.length > 0 && personalWallets.length < 10 && (
          <button
            onClick={() => navigate('/create-wallet')}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-violet-400 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all text-sm font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add New Wallet
          </button>
        )}

        {/* Manage link */}
        {!loading && wallets.length > 0 && (
          <button
            onClick={() => navigate('/profile', { state: { tab: 'wallets' } })}
            className="text-center text-xs text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
          >
            Manage Wallets
          </button>
        )}
      </div>

      {pinTarget && (
        <PinPad wallet={pinTarget} onSuccess={handlePinSuccess} onClose={() => setPinTarget(null)} />
      )}
    </div>
  )
}
