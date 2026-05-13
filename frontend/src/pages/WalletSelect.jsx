import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useDarkMode } from '../hooks/useDarkMode'
import { verifyWalletPin } from '../utils/walletSession'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

const BASE = 'https://spendly-backend-et20.onrender.com/api'
const FAMILY_STUB = { id: '__family__', is_total_wallet: true, name: 'Family Overview', color: 'purple' }

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
)
const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconMoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
)
const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)

// ── PIN numpad overlay ────────────────────────────────────────────────────────
function PinPad({ wallet, personalWallets = [], onSuccess, onClose }) {
  const [digits, setDigits] = useState([])
  const [error, setError]   = useState('')
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake]   = useState(false)

  const token = localStorage.getItem('token')
  const color = getWalletColor(wallet.color)
  const isFamily = !!wallet.is_total_wallet

  // Try verify-family-pin endpoint; fall back to looping personal wallets
  // with the existing verify-pin endpoint (works with any backend version).
  async function verifyFamilyPin(pin) {
    // Primary: dedicated endpoint (new backend)
    try {
      const res = await fetch(`${BASE}/wallets/verify-family-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin }),
      })
      // Only trust this path when endpoint actually exists (not a 404/HTML error)
      if (res.status !== 404 && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json()
        return { ok: res.ok, resolvedWallet: data.wallet || null, ...data }
      }
    } catch (_) { /* fall through */ }

    // Fallback: loop each personal wallet using the always-available verify-pin endpoint
    if (personalWallets.length === 0) {
      return { ok: false, message: 'No wallets found to verify against' }
    }
    let lastErr = { ok: false, message: 'Incorrect PIN' }
    for (const pw of personalWallets) {
      try {
        const r = await verifyWalletPin(pw.id, pin, token)
        if (r.ok) return { ok: true, resolvedWallet: null }
        if (r.locked) return { ok: false, locked: true, message: r.message }
        lastErr = { ok: false, attemptsLeft: r.attemptsLeft, message: r.message }
      } catch (_) {
        lastErr = { ok: false, message: 'Network error — check your connection' }
      }
    }
    return lastErr
  }

  async function handleDigit(d) {
    if (locked || loading || digits.length >= 6) return
    const next = [...digits, d]
    setDigits(next)
    setError('')

    if (next.length === 4) {
      setLoading(true)
      let result
      if (isFamily) {
        result = await verifyFamilyPin(next.join(''))
      } else {
        result = await verifyWalletPin(wallet.id, next.join(''), token)
      }
      setLoading(false)
      if (result.ok) {
        onSuccess(result.resolvedWallet || null)
      } else {
        setDigits([])
        setShake(true)
        setTimeout(() => setShake(false), 500)
        if (result.locked) {
          setLocked(true)
          setError(result.message || 'Too many attempts. Try again later.')
        } else {
          setError(result.attemptsLeft != null
            ? `Incorrect PIN — ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? 's' : ''} left`
            : isFamily ? 'Incorrect PIN — try any wallet PIN' : 'Incorrect PIN')
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
        {/* Header strip */}
        <div className={`${isFamily ? 'bg-linear-to-r from-violet-600 to-purple-700' : `bg-linear-to-r ${color.gradient}`} p-4 flex items-center gap-3`}>
          <div className="w-12 h-12 rounded-xl bg-white/20 overflow-hidden ring-2 ring-white/30 shrink-0 flex items-center justify-center">
            {isFamily
              ? <span className="text-xl">👨‍👩‍👧‍👦</span>
              : <img src={getAvatarUrl(wallet)} alt={wallet.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
            }
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-base truncate">{wallet.name}</p>
            <p className="text-white/70 text-xs">
              {isFamily ? 'Enter any wallet PIN to unlock' : 'Enter your PIN to unlock'}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Dots */}
          <div className={`flex justify-center gap-3 ${shake ? 'animate-bounce' : ''}`}>
            {[0,1,2,3].map(i => (
              <div key={i}
                className={`w-3 h-3 rounded-full transition-all duration-150 ${
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
          <div className="grid grid-cols-3 gap-2">
            {keys.map((k, i) => (
              <button
                key={i}
                onClick={() => { if (k === '⌫') handleBack(); else if (k !== '') handleDigit(k) }}
                disabled={locked || loading || k === ''}
                className={`
                  h-13 rounded-2xl text-xl font-semibold transition-all duration-100
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
            className="w-full py-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium transition-colors">
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
        className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.99]"
      >
        <div className={`h-0.5 w-full bg-linear-to-r ${color.gradient}`} />
        <div className="px-3.5 py-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-linear-to-br ${color.gradient} shadow-sm`}>
            <img src={getAvatarUrl(wallet)} alt={wallet.name}
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display='none' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{wallet.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full bg-linear-to-br ${color.gradient} shrink-0`} />
              <span className="capitalize">{color.label}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-400 dark:text-gray-500">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-300 dark:text-gray-600">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      </button>
      {/* Settings gear on hover */}
      <button
        onClick={e => { e.stopPropagation(); onSettings() }}
        className="absolute top-1/2 -translate-y-1/2 right-10 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-white dark:bg-gray-700 shadow-md flex items-center justify-center text-gray-400 hover:text-violet-600 transition-all z-10"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
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
  const [dark, toggleDark] = useDarkMode()
  const [pinTarget, setPinTarget] = useState(null)

  const token = localStorage.getItem('token')
  const from  = location.state?.from?.pathname

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return }
    refreshWallets()
  }, [token, navigate, refreshWallets])

  function handlePinSuccess(resolvedWallet) {
    const target = resolvedWallet || pinTarget
    activateWallet(target)
    setPinTarget(null)
    if (resolvedWallet) refreshWallets()
    if (target.is_total_wallet) {
      navigate('/family', { replace: true })
    } else {
      navigate(`/wallet/${target.id}/profile`, { replace: true })
    }
  }

  function handleSignOut() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  function handleFamilyClick() {
    const existing = wallets.find(w => !!w.is_total_wallet)
    setPinTarget(existing || FAMILY_STUB)
  }

  const personalWallets = wallets.filter(w => !w.is_total_wallet)

  if (!token) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* ── TOP BAR ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Spendly</span>
        </div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Select Wallet
        </p>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-32 gap-3">

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
            Loading wallets…
          </div>
        )}

        {/* ── FAMILY TOTAL ── */}
        {!loading && personalWallets.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-0.5">
              Family Total
            </p>
            <button
              onClick={handleFamilyClick}
              className="w-full text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
            >
              <div className="bg-linear-to-br from-violet-600 via-purple-600 to-indigo-700 px-4 py-4 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/8 pointer-events-none" />
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-xl ring-2 ring-white/20 shrink-0">
                    👨‍👩‍👧‍👦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">Family Overview</p>
                    <p className="text-white/60 text-xs mt-0.5">
                      {personalWallets.length} wallet{personalWallets.length !== 1 ? 's' : ''} · Any PIN to unlock
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                      🔒 Any PIN
                    </span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="opacity-60">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
                {/* Feature chips */}
                <div className="flex gap-1.5 mt-3">
                  {['Dashboard','Transactions','Net Worth','Report'].map(f => (
                    <span key={f} className="text-[10px] font-semibold bg-white/15 text-white/90 px-2 py-0.5 rounded-full border border-white/15">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── MY WALLETS ── */}
        {!loading && personalWallets.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-0.5">
              My Wallets
            </p>
            <div className="space-y-1.5">
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

        {/* ── ONBOARDING ── */}
        {!loading && wallets.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12V7H5a2 2 0 010-4h11v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/>
                <path d="M18 12a2 2 0 000 4h4v-4z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create your first wallet</h2>
              <p className="text-gray-400 text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
                Each family member gets a PIN-protected wallet. A Family Total is created automatically.
              </p>
            </div>
            <div className="w-full space-y-2 text-left">
              {[
                { icon: '🔒', t: 'PIN-protected privacy',   d: 'Each wallet has a unique 4–6 digit PIN' },
                { icon: '👨‍👩‍👧‍👦', t: 'Family Total overview',  d: 'Use any wallet PIN to access combined totals' },
                { icon: '🎨', t: '100+ avatars & colors',   d: 'Personalise every wallet' },
              ].map(f => (
                <div key={f.t} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-lg mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{f.t}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV BAR ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-md mx-auto flex items-center px-4 pt-2.5 pb-2">

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 flex-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors active:scale-90"
          >
            <IconLogout />
            <span className="text-[10px] font-semibold">Sign Out</span>
          </button>

          {/* Add Wallet — center, primary */}
          <button
            onClick={() => navigate('/create-wallet')}
            className="flex flex-col items-center gap-1 flex-1"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-300/40 dark:shadow-violet-900/50 hover:bg-violet-700 active:scale-90 transition-all text-white -mt-5">
              <IconPlus />
            </div>
            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">Add Wallet</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="flex flex-col items-center gap-1 flex-1 text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors active:scale-90"
          >
            {dark ? <IconSun /> : <IconMoon />}
            <span className="text-[10px] font-semibold">{dark ? 'Light' : 'Dark'}</span>
          </button>

        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>

      {/* PIN overlay */}
      {pinTarget && (
        <PinPad
          wallet={pinTarget}
          personalWallets={personalWallets}
          onSuccess={handlePinSuccess}
          onClose={() => setPinTarget(null)}
        />
      )}
    </div>
  )
}
