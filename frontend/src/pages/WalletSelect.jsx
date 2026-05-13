import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { verifyWalletPin } from '../utils/walletSession'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

// ── PIN numpad overlay ────────────────────────────────────────────────────────
function PinPad({ wallet, onSuccess, onClose }) {
  const [digits, setDigits]   = useState([])
  const [error, setError]     = useState('')
  const [locked, setLocked]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake]     = useState(false)

  const token = localStorage.getItem('token')
  const color = getWalletColor(wallet.color)
  const isFamily = wallet.is_total_wallet

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
            : isFamily ? 'No wallet matches this PIN' : 'Incorrect PIN')
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
        <div className={`${isFamily ? 'bg-linear-to-r from-violet-600 to-purple-700' : `bg-linear-to-r ${color.gradient}`} p-5 flex items-center gap-4`}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 overflow-hidden ring-2 ring-white/30 shrink-0 flex items-center justify-center">
            {isFamily
              ? <span className="text-2xl">👨‍👩‍👧‍👦</span>
              : <img src={getAvatarUrl(wallet)} alt={wallet.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
            }
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-lg truncate">{wallet.name}</p>
            <p className="text-white/70 text-sm">
              {isFamily ? 'Enter any wallet PIN to unlock' : 'Enter your PIN to unlock'}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Dots */}
          <div className={`flex justify-center gap-3 ${shake ? 'animate-bounce' : ''}`}>
            {[0,1,2,3].map(i => (
              <div key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  i < digits.length ? 'bg-violet-600 scale-110' : 'bg-gray-200 dark:bg-gray-700'
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
                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 active:scale-95 border border-gray-100 dark:border-gray-700'
                    : ''}
                  ${locked || loading ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                {loading && k === '⌫'
                  ? <span className="w-4 h-4 border-2 border-gray-300 border-t-violet-500 rounded-full animate-spin inline-block" />
                  : k}
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

// ── Personal wallet card ──────────────────────────────────────────────────────
function WalletCard({ wallet, onClick, onSettings }) {
  const color = getWalletColor(wallet.color)

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
      >
        {/* Thin color accent bar */}
        <div className={`h-0.5 w-full bg-linear-to-r ${color.gradient}`} />

        <div className="p-3.5 flex items-center gap-3.5">
          {/* Avatar */}
          <div className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-linear-to-br ${color.gradient} shadow-sm`}>
            <img src={getAvatarUrl(wallet)} alt={wallet.name}
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display='none' }} />
          </div>

          {/* Name + color */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{wallet.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-linear-to-br ${color.gradient} shrink-0`} />
              <span className="capitalize">{color.label}</span>
            </p>
          </div>

          {/* Lock + chevron */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-500 dark:text-gray-400">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-300 dark:text-gray-600">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      </button>

      {/* Settings gear — on hover (desktop) */}
      <button
        onClick={e => { e.stopPropagation(); onSettings() }}
        className="absolute top-1/2 -translate-y-1/2 right-11 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-white dark:bg-gray-700 shadow-md flex items-center justify-center text-gray-400 hover:text-violet-600 transition-all z-10"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WalletSelect() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { wallets, loading, refreshWallets, activateWallet } = useWallet()
  const [pinTarget, setPinTarget] = useState(null)

  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || '{}')
  const from  = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return }
    refreshWallets()
  }, [token, navigate, refreshWallets])

  function handlePinSuccess() {
    activateWallet(pinTarget)
    setPinTarget(null)
    navigate(pinTarget.is_total_wallet ? '/family' : from, { replace: true })
  }

  function handleSignOut() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const personalWallets = wallets.filter(w => !w.is_total_wallet)
  const familyWallet    = wallets.find(w => w.is_total_wallet)

  if (!token) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* ── TOP BAR ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center shadow-sm shadow-violet-200 dark:shadow-violet-900/40">
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
            <span className="text-sm text-gray-500 dark:text-gray-400 max-w-32 truncate">{user?.name || 'User'}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs font-medium text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-5 gap-5">

        {/* Page heading */}
        <div className="pt-1 pb-1">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Choose a Wallet</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {wallets.length > 0 ? 'Select a wallet to continue' : 'Create your first wallet to get started'}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2.5 text-gray-400 text-sm py-10 justify-center">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
            Loading wallets…
          </div>
        )}

        {/* ── FAMILY TOTAL ── always on top */}
        {!loading && familyWallet && (
          <div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 px-0.5">
              Family Total
            </p>
            <button
              onClick={() => setPinTarget(familyWallet)}
              className="w-full text-left rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 active:scale-[0.98]"
            >
              <div className="bg-linear-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/8 pointer-events-none" />
                <div className="absolute -bottom-6 -left-4 w-28 h-28 rounded-full bg-white/6 pointer-events-none" />

                {/* Top row: avatar + badge */}
                <div className="relative flex items-start justify-between mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-3xl ring-2 ring-white/25 shrink-0">
                    👨‍👩‍👧‍👦
                  </div>
                  <span className="text-[11px] font-bold bg-white/20 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0">
                    🔒 Any wallet PIN
                  </span>
                </div>

                {/* Title + wallet count */}
                <div className="relative">
                  <p className="text-white font-black text-xl tracking-tight">Family Overview</p>
                  <p className="text-white/60 text-sm mt-0.5">
                    {personalWallets.length} wallet{personalWallets.length !== 1 ? 's' : ''} · All combined
                  </p>

                  {/* Feature chips */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                      { icon: '📊', label: 'Dashboard' },
                      { icon: '💸', label: 'Transactions' },
                      { icon: '📈', label: 'Net Worth' },
                      { icon: '📋', label: 'Report' },
                    ].map(f => (
                      <span key={f.label}
                        className="flex items-center gap-1 text-[11px] font-semibold bg-white/15 text-white/90 px-2.5 py-1 rounded-full border border-white/20">
                        {f.icon} {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── MY WALLETS ── */}
        {!loading && personalWallets.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 px-0.5">
              My Wallets
            </p>
            <div className="space-y-2">
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

        {/* ── ONBOARDING empty state ── */}
        {!loading && wallets.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6">
            <div>
              <div className="w-20 h-20 mx-auto rounded-3xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/50 mb-5">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12V7H5a2 2 0 010-4h11v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/>
                  <path d="M18 12a2 2 0 000 4h4v-4z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create your first wallet</h2>
              <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                Each family member gets their own PIN-protected wallet. A Family Total wallet is created automatically.
              </p>
            </div>

            <div className="w-full space-y-2.5 text-left">
              {[
                { icon: '🔒', t: 'PIN-protected privacy',      d: 'Each wallet has a unique 4–6 digit PIN' },
                { icon: '👨‍👩‍👧‍👦', t: 'Family Total overview',     d: 'Use any wallet PIN to access combined totals' },
                { icon: '🎨', t: '100+ avatars & 10 colors',    d: 'Personalise every wallet' },
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
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 rounded-2xl text-white font-bold text-base transition shadow-lg shadow-violet-200 dark:shadow-violet-900/40 hover:-translate-y-0.5"
            >
              Create My First Wallet
            </button>
          </div>
        )}

        {/* ── ADD WALLET ── */}
        {!loading && wallets.length > 0 && personalWallets.length < 10 && (
          <button
            onClick={() => navigate('/create-wallet')}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500 hover:border-violet-400 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all text-sm font-semibold"
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
            className="text-center text-xs text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition pb-2"
          >
            Manage Wallets
          </button>
        )}

      </div>

      {/* PIN overlay */}
      {pinTarget && (
        <PinPad wallet={pinTarget} onSuccess={handlePinSuccess} onClose={() => setPinTarget(null)} />
      )}
    </div>
  )
}
