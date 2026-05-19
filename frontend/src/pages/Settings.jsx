import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import { t } from '../i18n'
import { useDarkMode } from '../hooks/useDarkMode'
import { requestNotificationPermission, isNotificationsEnabled, disableNotifications, unsubscribeFromPush, playFinaChime } from '../utils/notifications'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

const CURRENCIES = ['USD','EUR','GBP','LBP','AED','SAR','CAD','AUD']
const CURRENCY_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', LBP:'L£', AED:'AED', SAR:'SAR', CAD:'C$', AUD:'A$' }
const INCOME_FREQS = ['Monthly','Bi-weekly','Weekly','Irregular']
const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'ar-SA', label: 'العربية – السعودية' },
  { code: 'ar-LB', label: 'العربية – لبنان' },
  { code: 'ar-JO', label: 'العربية – الأردن' },
  { code: 'ar-SY', label: 'العربية – سوريا' },
  { code: 'ar-BH', label: 'العربية – البحرين' },
  { code: 'ar-AE', label: 'العربية – الإمارات' },
  { code: 'ar-EG', label: 'العربية – مصر' },
  { code: 'ar-KW', label: 'العربية – الكويت' },
  { code: 'ar-IQ', label: 'العربية – العراق' },
  { code: 'ar-MA', label: 'العربية – المغرب' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'pt-PT', label: 'Português' },
  { code: 'nl-NL', label: 'Nederlands' },
  { code: 'pl-PL', label: 'Polski' },
  { code: 'ru-RU', label: 'Русский' },
  { code: 'tr-TR', label: 'Türkçe' },
  { code: 'af-ZA', label: 'Afrikaans' },
]

const HEADER_GRADS = {
  blue:   'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 55%,#1e40af 100%)',
  purple: 'linear-gradient(135deg,#5b21b6 0%,#7c3aed 55%,#4c1d95 100%)',
  green:  'linear-gradient(135deg,#065f46 0%,#059669 55%,#064e3b 100%)',
  red:    'linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#991b1b 100%)',
  orange: 'linear-gradient(135deg,#7c2d12 0%,#ea580c 55%,#9a3412 100%)',
  pink:   'linear-gradient(135deg,#831843 0%,#db2777 55%,#9d174d 100%)',
  yellow: 'linear-gradient(135deg,#78350f 0%,#d97706 55%,#92400e 100%)',
  teal:   'linear-gradient(135deg,#134e4a 0%,#0d9488 55%,#115e59 100%)',
  indigo: 'linear-gradient(135deg,#312e81 0%,#6366f1 55%,#3730a3 100%)',
  gray:   'linear-gradient(135deg,#1f2937 0%,#4b5563 55%,#374151 100%)',
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-violet-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">✕</button>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
        {hint && <span className="text-xs text-gray-400 font-normal normal-case tracking-normal">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function Settings() {
  const { activeWallet } = useWallet()
  const walletColor = getWalletColor(activeWallet?.color)
  const headerGrad = HEADER_GRADS[activeWallet?.color] || HEADER_GRADS.purple

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { window.location.href = '/login'; return null }
    return JSON.parse(stored)
  })
  const [emailForm, setEmailForm]   = useState(() => ({ email: JSON.parse(localStorage.getItem('user') || '{}').email || '', currency: JSON.parse(localStorage.getItem('user') || '{}').currency || 'USD' }))
  const [emailSaving, setEmailSaving] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [activeTab, setActiveTab]   = useState('prefs')
  const [prefs, setPrefs]           = useState(() => { try { return JSON.parse(localStorage.getItem('fina_prefs') || '{}') } catch { return {} } })
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [micLang, setMicLang]       = useState(() => localStorage.getItem('fina_lang_mic') || 'en-US')
  const [appLang, setAppLang]       = useState(() => localStorage.getItem('fina_lang_app') || 'en-US')
  const [notifEnabled, setNotifEnabled] = useState(() => isNotificationsEnabled())
  const [dark, toggleDark]          = useDarkMode()
  const [supportForm, setSupportForm]   = useState({ subject: 'General question', message: '' })
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent]   = useState(false)
  const [shortcutCopied, setShortcutCopied] = useState(false)
  const [nwPin, setNwPin]           = useState(() => localStorage.getItem('fina_nw_pin') || '')
  const [nwPinInput, setNwPinInput] = useState('')
  const [nwPinConfirm, setNwPinConfirm] = useState('')
  const [nwPinMode, setNwPinMode]   = useState(null)
  const [wPinMode, setWPinMode]     = useState(null)
  const [wPinCurrent, setWPinCurrent] = useState('')
  const [wPinNew, setWPinNew]       = useState('')
  const [wPinConfirm, setWPinConfirm] = useState('')
  const [wPinError, setWPinError]   = useState('')
  const [wPinLoading, setWPinLoading] = useState(false)

  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700/60 text-gray-900 dark:text-white text-sm transition"
  const showToast = (msg, type = 'success') => setToast({ message: msg, type })
  const FREQ_KEYS = { Monthly: 'monthly_freq', 'Bi-weekly': 'biweekly_freq', Weekly: 'weekly_freq', Irregular: 'irregular_freq' }

  const handleSaveAccount = async () => {
    setEmailSaving(true)
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      await API.put('/profile', { name: u.name, ...emailForm })
      localStorage.setItem('currency', emailForm.currency)
      const updated = { ...u, ...emailForm }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      showToast('Account updated ✓')
    } catch { showToast('Could not save', 'error') }
    setEmailSaving(false)
  }


  const handleChangeWalletPin = async () => {
    if (!activeWallet) return
    if (wPinNew.length < 4) { setWPinError('PIN must be 4–6 digits'); return }
    if (wPinNew !== wPinConfirm) { setWPinError('PINs do not match'); return }
    setWPinLoading(true); setWPinError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`https://spendly-backend-et20.onrender.com/api/wallets/${activeWallet.id}/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_pin: wPinCurrent, new_pin: wPinNew }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update PIN')
      setWPinMode(null); setWPinCurrent(''); setWPinNew(''); setWPinConfirm('')
      showToast('Wallet PIN updated ✓')
    } catch (e) { setWPinError(e.message) }
    setWPinLoading(false)
  }

  if (!user) return null

  const TABS = [
    {
      key: 'prefs',
      label: 'Preferences',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    },
    {
      key: 'security',
      label: 'Security',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    },
    {
      key: 'support',
      label: 'Support',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    },
  ]

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Hero header — wallet-colored */}
        <div className="relative rounded-3xl overflow-hidden mb-5" style={{ background: headerGrad }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,white,transparent)' }} />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,white,transparent)' }} />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '18px 18px' }} />

          <div className="relative p-6 flex items-center gap-4">
            {/* Wallet avatar */}
            <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${walletColor.gradient} overflow-hidden shadow-xl ring-4 ring-white/25 shrink-0`}>
              {activeWallet
                ? <img src={getAvatarUrl(activeWallet)} alt={activeWallet.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
                : <div className="w-full h-full flex items-center justify-center text-white/60"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12V7H5a2 2 0 010-4h11v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg></div>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Active Wallet</p>
              <h1 className="text-xl font-bold text-white leading-tight truncate">{activeWallet?.name || 'No wallet'}</h1>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-2 h-2 rounded-full bg-white/80" />
                <p className="text-white/70 text-xs font-medium">{walletColor.label}</p>
                {activeWallet?.is_total_wallet && <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full text-white/90 font-semibold">Family</span>}
              </div>
            </div>
            <a href="/settings" className="shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </div>
            </a>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5 gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600 dark:text-violet-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Preferences tab */}
        {activeTab === 'prefs' && (
          <div className="space-y-4">

            {/* App prefs — first */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">App Preferences</p>
              </div>

              <Field label={t('income_frequency')}>
                <div className="grid grid-cols-2 gap-2">
                  {INCOME_FREQS.map(f => (
                    <button key={f} type="button" onClick={() => setPrefs(p => ({ ...p, incomeFreq: f }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                        (prefs.incomeFreq || 'Monthly') === f
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}>
                      {t(FREQ_KEYS[f] || f)}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={t('savings_target')} hint={t('savings_target_hint')}>
                <div className="flex items-center gap-3 mt-1">
                  <input type="range" min="0" max="80" step="5"
                    value={prefs.savingsTarget ?? 20}
                    onChange={e => setPrefs(p => ({ ...p, savingsTarget: parseInt(e.target.value) }))}
                    className="flex-1 accent-violet-600" />
                  <span className="text-lg font-bold text-violet-600 w-12 text-right tabular-nums">{prefs.savingsTarget ?? 20}%</span>
                </div>
              </Field>

              <Field label={t('app_language')}>
                <select value={appLang} onChange={e => setAppLang(e.target.value)} className={cls}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </Field>

              <Field label={t('mic_language')}>
                <select value={micLang} onChange={e => setMicLang(e.target.value)} className={cls}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </Field>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">🔔 Notifications</p>
                  <p className="text-xs text-gray-400 mt-0.5">Daily reminders, budget warnings & more</p>
                </div>
                <Toggle checked={notifEnabled} onChange={async (v) => {
                  if (!v) { disableNotifications(); unsubscribeFromPush(); setNotifEnabled(false) }
                  else { const ok = await requestNotificationPermission(); setNotifEnabled(ok); if (ok) playFinaChime() }
                }} />
              </div>

              <button onClick={() => {
                localStorage.setItem('fina_prefs', JSON.stringify(prefs))
                localStorage.setItem('fina_lang_app', appLang)
                localStorage.setItem('fina_lang_mic', micLang)
                setPrefsSaved(true)
                setTimeout(() => { setPrefsSaved(false); window.location.reload() }, 1200)
              }}
                className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 active:scale-95 transition">
                {prefsSaved ? '✓ Saved!' : t('save_preferences')}
              </button>
            </div>

            {/* Account details — after app prefs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Account</p>
              </div>
              <Field label="Email Address">
                <input type="email" value={emailForm.email} onChange={e => setEmailForm(f => ({ ...f, email: e.target.value }))} className={cls} />
              </Field>
              <Field label={t('currency')}>
                <select value={emailForm.currency} onChange={e => setEmailForm(f => ({ ...f, currency: e.target.value }))} className={cls}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
                </select>
              </Field>
              <button onClick={handleSaveAccount} disabled={emailSaving}
                className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {emailSaving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                  : 'Save Account'}
              </button>
            </div>

            {/* Appearance */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-sm font-bold text-gray-700 dark:text-white mb-4">Appearance</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Dark Mode</p>
                  <p className="text-xs text-gray-400 mt-0.5">Switch between light and dark theme</p>
                </div>
                <Toggle checked={dark} onChange={toggleDark} />
              </div>
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">

            {/* Wallet PIN */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  Wallet PIN{activeWallet ? ` — ${activeWallet.name}` : ''}
                </p>
              </div>
              {!activeWallet ? (
                <p className="text-sm text-gray-400">No active wallet.</p>
              ) : wPinMode === 'change' ? (
                <div className="space-y-3">
                  <Field label="Current PIN">
                    <input type="password" inputMode="numeric" maxLength={6} placeholder="••••"
                      value={wPinCurrent} onChange={e => { setWPinCurrent(e.target.value.replace(/\D/g,'').slice(0,6)); setWPinError('') }} className={cls} />
                  </Field>
                  <Field label="New PIN (4–6 digits)">
                    <input type="password" inputMode="numeric" maxLength={6} placeholder="••••"
                      value={wPinNew} onChange={e => { setWPinNew(e.target.value.replace(/\D/g,'').slice(0,6)); setWPinError('') }} className={cls} />
                  </Field>
                  <Field label="Confirm New PIN">
                    <input type="password" inputMode="numeric" maxLength={6} placeholder="••••"
                      value={wPinConfirm} onChange={e => { setWPinConfirm(e.target.value.replace(/\D/g,'').slice(0,6)); setWPinError('') }} className={cls} />
                    {wPinConfirm.length >= 4 && wPinNew !== wPinConfirm && <p className="text-xs text-red-500 mt-1">PINs do not match</p>}
                  </Field>
                  {wPinError && <p className="text-xs text-red-500">{wPinError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setWPinMode(null); setWPinCurrent(''); setWPinNew(''); setWPinConfirm(''); setWPinError('') }}
                      className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      Cancel
                    </button>
                    <button
                      disabled={wPinLoading || wPinNew.length < 4 || wPinNew !== wPinConfirm || !wPinCurrent}
                      onClick={handleChangeWalletPin}
                      className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
                      {wPinLoading ? 'Saving…' : 'Save PIN'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Wallet access code</p>
                    <p className="text-xs text-gray-400 mt-0.5">Change the PIN used to unlock this wallet</p>
                  </div>
                  <button onClick={() => { setWPinCurrent(''); setWPinNew(''); setWPinConfirm(''); setWPinError(''); setWPinMode('change') }}
                    className="text-xs font-bold text-violet-600 border border-violet-200 dark:border-violet-800 px-3 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                    Change PIN
                  </button>
                </div>
              )}
            </div>

            {/* Net Worth PIN */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Net Worth PIN</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{nwPin ? 'PIN is active' : 'No PIN set'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{nwPin ? 'Your Net Worth page is protected' : 'Protect your Net Worth page with a 4-digit PIN'}</p>
                </div>
                <div className="flex gap-2">
                  {nwPin && (
                    <button onClick={() => { setNwPinInput(''); setNwPinConfirm(''); setNwPinMode('remove') }}
                      className="text-xs font-bold text-red-500 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      Remove
                    </button>
                  )}
                  <button onClick={() => { setNwPinInput(''); setNwPinConfirm(''); setNwPinMode('set') }}
                    className="text-xs font-bold text-violet-600 border border-violet-200 dark:border-violet-800 px-3 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                    {nwPin ? 'Change' : 'Set PIN'}
                  </button>
                </div>
              </div>

              {nwPinMode === 'set' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">New 4-digit PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={nwPinInput}
                      onChange={e => setNwPinInput(e.target.value.replace(/\D/g,'').slice(0,4))} className={cls} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Confirm PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={nwPinConfirm}
                      onChange={e => setNwPinConfirm(e.target.value.replace(/\D/g,'').slice(0,4))} className={cls} />
                    {nwPinConfirm.length === 4 && nwPinInput !== nwPinConfirm && <p className="text-xs text-red-500 mt-1">PINs do not match</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setNwPinMode(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                    <button disabled={nwPinInput.length !== 4 || nwPinInput !== nwPinConfirm}
                      onClick={() => { localStorage.setItem('fina_nw_pin', nwPinInput); setNwPin(nwPinInput); setNwPinMode(null); showToast('PIN set') }}
                      className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
                      Save PIN
                    </button>
                  </div>
                </div>
              )}

              {nwPinMode === 'remove' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Enter current PIN to confirm</label>
                    <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={nwPinInput}
                      onChange={e => setNwPinInput(e.target.value.replace(/\D/g,'').slice(0,4))} className={cls} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setNwPinMode(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                    <button disabled={nwPinInput.length !== 4}
                      onClick={() => {
                        if (nwPinInput !== nwPin) { showToast('Incorrect PIN', 'error'); return }
                        localStorage.removeItem('fina_nw_pin'); setNwPin(''); setNwPinMode(null); showToast('PIN removed')
                      }}
                      className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-50">
                      Remove PIN
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Support tab */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            {/* Your Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Your Plan</p>
                <a href="/profile" className="ml-auto text-xs text-violet-600 font-semibold hover:underline">View all plans →</a>
              </div>
              <div className="flex items-center gap-4 p-4 bg-linear-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl border border-violet-200 dark:border-violet-800/40">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-300">Personal Plan</p>
                  <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">{t('personal_plan')}</p>
                </div>
                <span className="text-xs bg-violet-600 text-white px-2.5 py-1 rounded-full font-bold">Active</span>
              </div>
            </div>

            {/* App Tutorial */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">App Tutorial</p>
              </div>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">Replay the interactive tour to rediscover features, tips, and the voice assistant.</p>
              <button onClick={() => { const uid = JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'; localStorage.removeItem(`fina_onboarded_${uid}`); window.location.href = '/dashboard' }}
                className="w-full flex items-center justify-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 py-3 rounded-xl font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition text-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Replay Tutorial
              </button>
            </div>

            {/* Contact Support */}
            {supportSent ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-base font-bold text-gray-800 dark:text-white">Message sent!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">We'll get back to you as soon as possible.</p>
                <button onClick={() => { setSupportSent(false); setSupportForm({ subject: 'General question', message: '' }) }}
                  className="mt-2 text-violet-600 text-sm font-semibold hover:underline">Send another</button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Contact Support</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Have a question, found a bug, or want to suggest a feature?</p>
                <Field label="Subject">
                  <select value={supportForm.subject} onChange={e => setSupportForm(f => ({ ...f, subject: e.target.value }))} className={cls}>
                    {['General question','Bug report','Feature idea','Account issue','Other'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Message">
                  <textarea rows={4} placeholder="Describe your issue or idea..."
                    value={supportForm.message} onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
                    className={cls + ' resize-none'} />
                </Field>
                <button
                  disabled={supportSending || supportForm.message.trim().length < 10}
                  onClick={async () => {
                    setSupportSending(true)
                    try {
                      await API.post('/support/ticket', { subject: supportForm.subject, message: supportForm.message, user_email: user.email })
                      setSupportSent(true)
                    } catch {
                      window.open(`mailto:charbel.mansourb@gmail.com?subject=${encodeURIComponent('[Fina] ' + supportForm.subject)}&body=${encodeURIComponent(supportForm.message)}`)
                      setSupportSent(true)
                    }
                    setSupportSending(false)
                  }}
                  className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {supportSending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</> : 'Send Message'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  )
}
