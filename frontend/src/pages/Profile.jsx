import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Layout from '../components/Layout'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor } from '../data/avatars'
import { deleteWallet, lockWallet } from '../utils/walletSession'

// ── Pricing data ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    desc: 'Great for getting started with personal finance tracking.',
    monthly: 0,
    yearly: 0,
    popular: false,
    current: true,
    features: [
      '1 wallet',
      'Manual expense & income entry',
      'Basic budgets',
      'Monthly reports',
      'Core dashboard',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    desc: 'For power users who want AI insights and unlimited tracking.',
    monthly: 9.99,
    yearly: 89,
    popular: true,
    current: false,
    features: [
      'Unlimited wallets',
      'AI chat insights',
      'Advanced reports & analytics',
      'Goals & debt tracker',
      'Subscriptions tracker',
      'Voice "Hey Fina"',
      'PDF export',
    ],
  },
  {
    id: 'family',
    name: 'Family',
    desc: 'Shared finance for couples and families with unified overview.',
    monthly: 19.99,
    yearly: 179,
    popular: false,
    current: false,
    features: [
      'Everything in Pro',
      'Family Overview wallet',
      'Multi-member tracking',
      'Shared budgets & goals',
      'Family net worth',
      'Priority support',
    ],
  },
]

// ── Pricing section ───────────────────────────────────────────────────────────
function PricingSection() {
  const [yearly, setYearly] = useState(false)
  const [selected, setSelected] = useState(null)
  const [animating, setAnimating] = useState(null)

  const handleSelect = (id) => {
    setAnimating(id)
    setSelected(id)
    setTimeout(() => setAnimating(null), 500)
  }

  return (
    <div className="relative overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(160deg,#0f0a1e 0%,#1a0d3a 40%,#0d1a3a 100%)' }}>
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse,#7c3aed,transparent 70%)' }} />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative px-5 pt-8 pb-8">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">Choose Your Plan</p>
          <h3 className="text-2xl font-bold text-white leading-tight">Simple, transparent pricing</h3>
          <p className="text-white/50 text-sm mt-1.5">No hidden fees. Cancel anytime.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center bg-white/10 rounded-full p-1 gap-1">
            {['Monthly','Yearly'].map((label, i) => {
              const active = yearly === (i === 1)
              return (
                <button key={label} onClick={() => setYearly(i === 1)}
                  className="relative px-5 py-2 rounded-full text-sm font-semibold transition-colors z-10"
                  style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)' }}>
                  {active && (
                    <motion.span layoutId="billingPill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                  )}
                  <span className="relative">{label}</span>
                  {label === 'Yearly' && (
                    <span className="relative ml-1.5 text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">-25%</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {PLANS.map(plan => {
            const price = yearly ? plan.yearly : plan.monthly
            const isSelected = selected === plan.id || (selected === null && plan.current)
            const isAnimating = animating === plan.id

            return (
              <motion.div key={plan.id}
                onClick={() => handleSelect(plan.id)}
                animate={isAnimating ? { scale: [1, 0.97, 1.02, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative cursor-pointer rounded-2xl overflow-hidden"
                style={{
                  background: plan.popular
                    ? 'linear-gradient(135deg,rgba(109,40,217,0.25),rgba(91,21,182,0.15))'
                    : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${isSelected ? '#7c3aed' : plan.popular ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isSelected
                    ? '0 0 0 1px rgba(124,58,237,0.4), 0 8px 32px rgba(124,58,237,0.2)'
                    : plan.popular
                    ? '0 4px 24px rgba(109,40,217,0.15)'
                    : 'none',
                }}>

                {plan.popular && (
                  <div className="absolute top-0 right-0 text-[10px] font-black text-white bg-violet-600 px-3 py-1 rounded-bl-xl tracking-wider">
                    POPULAR
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-white text-base">{plan.name}</p>
                        {plan.current && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Current</span>
                        )}
                      </div>
                      <p className="text-white/45 text-xs leading-relaxed">{plan.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-0.5">
                        {price === 0
                          ? <span className="text-2xl font-black text-white">Free</span>
                          : <>
                              <span className="text-sm font-bold text-white/60 mt-1">$</span>
                              <span className="text-2xl font-black text-white">{price % 1 === 0 ? price : price.toFixed(2)}</span>
                            </>
                        }
                      </div>
                      {price > 0 && <p className="text-white/40 text-[10px]">/ {yearly ? 'year' : 'month'}</p>}
                    </div>
                  </div>

                  {/* Feature list */}
                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                          {plan.features.map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                              <p className="text-white/70 text-xs">{f}</p>
                            </div>
                          ))}
                          {!plan.current && (
                            <motion.button
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15 }}
                              whileTap={{ scale: 0.97 }}
                              className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm transition"
                              style={{
                                background: plan.popular
                                  ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
                                  : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.15)',
                              }}>
                              Upgrade to {plan.name}
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Selection indicator */}
                  {!isSelected && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                      <p className="text-white/30 text-xs">Tap to view features</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        <p className="text-center text-white/25 text-[11px] mt-5">Billed securely via Stripe · Encrypted · Cancel anytime</p>
      </div>
    </div>
  )
}

// ── Accordion section ─────────────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            {icon}
          </div>
          <p className="font-bold text-gray-800 dark:text-white text-sm">{title}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-400 dark:text-gray-500">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden">
            <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-violet-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">✕</button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { wallets, refreshWallets, deactivateWallet } = useWallet()
  const [user] = useState(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { window.location.href = '/login'; return null }
    return JSON.parse(stored)
  })
  const [photo, setPhoto]   = useState(() => localStorage.getItem('fina_profile_photo') || '')
  const fileInputRef        = useRef(null)
  const [toast, setToast]   = useState(null)
  const [walletChangePinId, setWalletChangePinId]   = useState(null)
  const [walletPinCurrent, setWalletPinCurrent]     = useState('')
  const [walletPinNew, setWalletPinNew]             = useState('')
  const [walletPinNewConfirm, setWalletPinNewConfirm] = useState('')
  const [walletPinError, setWalletPinError]         = useState('')
  const [walletPinLoading, setWalletPinLoading]     = useState(false)

  const showToast = (msg, type = 'success') => setToast({ message: msg, type })
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('fina_prefs') || '{}') } catch { return {} } })()
  const appLang = localStorage.getItem('fina_lang_app') || 'en-US'
  const totalWallets = wallets.filter(w => !w.is_total_wallet).length

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setPhoto(ev.target.result); localStorage.setItem('fina_profile_photo', ev.target.result); showToast('Photo updated!') }
    reader.readAsDataURL(file)
  }

  if (!user) return null

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* ── Hero ── */}
        <div className="relative rounded-3xl overflow-hidden mb-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          {/* Subtle violet top accent */}
          <div className="h-1.5 bg-linear-to-r from-violet-500 via-purple-500 to-indigo-500" />

          <div className="px-6 pt-5 pb-6">
            {/* Avatar row */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-2 ring-violet-200 dark:ring-violet-800">
                  {photo
                    ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white">{initials}</div>
                  }
                </div>
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition border border-gray-200 dark:border-gray-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full font-bold">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Personal Plan
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium truncate">{user?.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">Fina member</p>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Wallets', val: totalWallets },
                { label: 'Savings Goal', val: (prefs.savingsTarget ?? 20) + '%' },
                { label: 'Language', val: (appLang || 'en-US').split('-')[0].toUpperCase() },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-base font-black text-gray-800 dark:text-white">{s.val}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="space-y-3">

          {/* Profile section */}
          <Section
            defaultOpen={true}
            title="Profile"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Email</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{user?.email}</p>
                  </div>
                </div>
                <a href="/settings" className="text-xs text-violet-600 font-semibold border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                  Edit
                </a>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Security</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Password & PIN</p>
                  </div>
                </div>
                <a href="/settings" className="text-xs text-violet-600 font-semibold border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                  Manage
                </a>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Session</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Sign out of Fina</p>
                  </div>
                </div>
                <button
                  onClick={() => { if (window.confirm('Sign out?')) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login' } }}
                  className="text-xs text-red-500 font-semibold border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                  Sign out
                </button>
              </div>
            </div>
          </Section>

          {/* Wallets section */}
          <Section
            defaultOpen={false}
            title="Wallets"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12V7H5a2 2 0 010-4h11v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>}>
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-400 font-medium">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</p>
                <a href="/create-wallet" className="text-xs font-bold text-violet-600 border border-violet-200 dark:border-violet-800 px-3 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                  + New
                </a>
              </div>

              {wallets.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No wallets yet.</p>
              )}

              <div className="space-y-2">
                {wallets.map(w => {
                  const color = getWalletColor(w.color)
                  const isChangingPin = walletChangePinId === w.id
                  return (
                    <div key={w.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${color.gradient} overflow-hidden shrink-0 ring-2 ring-white dark:ring-gray-800`}>
                          <img src={getAvatarUrl(w)} alt={w.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{w.name}</p>
                          <p className="text-xs text-gray-400">{w.is_total_wallet ? 'Family Overview' : color.label}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => { setWalletChangePinId(isChangingPin ? null : w.id); setWalletPinCurrent(''); setWalletPinNew(''); setWalletPinNewConfirm(''); setWalletPinError('') }}
                            className="text-[11px] font-bold text-violet-600 border border-violet-200 dark:border-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                            {isChangingPin ? 'Cancel' : 'PIN'}
                          </button>
                          {!w.is_total_wallet && (
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Delete "${w.name}"? All its data will be removed.`)) return
                                const token = localStorage.getItem('token')
                                try {
                                  await deleteWallet(w.id, token)
                                  deactivateWallet()
                                  await refreshWallets()
                                  showToast('Wallet deleted')
                                  window.location.href = '/wallets'
                                } catch (e) { showToast(e.message, 'error') }
                              }}
                              className="text-[11px] font-bold text-red-500 border border-red-200 dark:border-red-800 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {isChangingPin && (
                        <div className="border-t border-gray-100 dark:border-gray-700 p-3 space-y-2.5 bg-gray-50 dark:bg-gray-700/30">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Change PIN</p>
                          {[
                            { label: 'Current PIN', val: walletPinCurrent, set: setWalletPinCurrent },
                            { label: 'New PIN (4–6 digits)', val: walletPinNew, set: setWalletPinNew },
                            { label: 'Confirm New PIN', val: walletPinNewConfirm, set: setWalletPinNewConfirm },
                          ].map(({ label, val, set }) => (
                            <div key={label}>
                              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{label}</label>
                              <input
                                type="password" inputMode="numeric" placeholder="••••" value={val} maxLength={6}
                                onChange={e => { set(e.target.value.replace(/\D/g,'').slice(0,6)); setWalletPinError('') }}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </div>
                          ))}
                          {walletPinError && <p className="text-xs text-red-500">{walletPinError}</p>}
                          <button
                            disabled={walletPinLoading || walletPinNew.length < 4 || walletPinNew !== walletPinNewConfirm || !walletPinCurrent}
                            onClick={async () => {
                              setWalletPinLoading(true); setWalletPinError('')
                              try {
                                const token = localStorage.getItem('token')
                                const res = await fetch(`https://spendly-backend-et20.onrender.com/api/wallets/${w.id}/change-pin`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ current_pin: walletPinCurrent, new_pin: walletPinNew }),
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.message)
                                lockWallet()
                                setWalletChangePinId(null)
                                showToast('PIN changed — unlock your wallet again')
                                setTimeout(() => { window.location.href = '/wallets' }, 1500)
                              } catch (e) { setWalletPinError(e.message) }
                              setWalletPinLoading(false)
                            }}
                            className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
                            {walletPinLoading ? 'Saving…' : 'Save New PIN'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => { window.location.href = '/wallets' }}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm">
                Switch Wallet
              </button>
            </div>
          </Section>

          {/* Your Plan section */}
          <Section
            defaultOpen={false}
            title="Your Plan"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}>
            <PricingSection />
          </Section>

        </div>

      </div>
    </Layout>
  )
}
