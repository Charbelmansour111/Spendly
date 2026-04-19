import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import { t } from '../i18n'

const CURRENCIES = ['USD','EUR','GBP','LBP','AED','SAR','CAD','AUD']
const CURRENCY_SYMBOLS = { USD:'$',EUR:'€',GBP:'£',LBP:'L£',AED:'AED',SAR:'SAR',CAD:'C$',AUD:'A$' }
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

export default function Profile() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { window.location.href = '/login'; return null }
    return JSON.parse(stored)
  })
  const [form, setForm] = useState(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return { name: u.name || '', email: u.email || '', currency: u.currency || 'USD' }
  })
  const [pwForm, setPwForm]       = useState({ current: '', newPw: '', confirm: '' })
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [prefs, setPrefs]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('spendly_prefs') || '{}') } catch { return {} }
  })
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [micLang, setMicLang]     = useState(() => localStorage.getItem('spendly_lang_mic') || 'en-US')
  const [appLang, setAppLang]     = useState(() => localStorage.getItem('spendly_lang_app') || localStorage.getItem('spendly_lang_response') || 'en-US')
  const [photo, setPhoto]         = useState(() => localStorage.getItem('spendly_profile_photo') || '')
  const fileInputRef              = useRef(null)
  const [supportForm, setSupportForm] = useState({ subject: 'General question', message: '' })
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)

  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700/60 text-gray-900 dark:text-white text-sm transition"
  const showToast = (msg, type = 'success') => setToast({ message: msg, type })
  const FREQ_KEYS = { Monthly: 'monthly_freq', 'Bi-weekly': 'biweekly_freq', Weekly: 'weekly_freq', Irregular: 'irregular_freq' }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhoto(ev.target.result)
      localStorage.setItem('spendly_profile_photo', ev.target.result)
      showToast('Photo updated!')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await API.put('/profile', form)
      localStorage.setItem('currency', form.currency)
      const updated = { ...user, ...form }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      showToast(t('save_changes') + ' ✓')
    } catch { showToast(t('server_error'), 'error') }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) { showToast('Passwords do not match', 'error'); return }
    if (pwForm.newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return }
    try {
      await API.put('/profile/password', { current_password: pwForm.current, new_password: pwForm.newPw })
      setPwForm({ current: '', newPw: '', confirm: '' })
      showToast(t('change_password') + ' ✓')
    } catch (e) { showToast(e.response?.data?.message || t('server_error'), 'error') }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.prompt('Type DELETE to confirm account deletion:')
    if (confirmed !== 'DELETE') return
    try {
      await API.delete('/profile')
      localStorage.clear()
      window.location.href = '/register'
    } catch { showToast(t('server_error'), 'error') }
  }

  if (!user) return null

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const TABS = [
    { key: 'profile',  label: 'Profile',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { key: 'prefs',    label: 'Preferences',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    { key: 'security', label: 'Security',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { key: 'account',  label: 'Account',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { key: 'support',  label: 'Support',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ]

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Hero header */}
        <div className="relative bg-linear-to-br from-violet-600 to-indigo-700 rounded-3xl overflow-hidden mb-5">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 right-16 w-12 h-12 bg-white/5 rounded-full" />

          <div className="relative p-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white/25">
                  {photo
                    ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-white/20 flex items-center justify-center text-2xl font-black text-white">{initials}</div>
                  }
                </div>
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white leading-tight truncate">{user?.name}</h1>
                <p className="text-white/65 text-sm truncate mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs bg-white/15 hover:bg-white/20 transition px-2.5 py-1 rounded-full font-semibold text-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Personal Plan
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs bg-white/15 hover:bg-white/20 transition px-2.5 py-1 rounded-full font-semibold text-white">
                    {CURRENCY_SYMBOLS[user?.currency] || '$'} {user?.currency || 'USD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-white/15">
              {[
                { label: 'Currency', val: user?.currency || 'USD' },
                { label: 'Savings Target', val: (prefs.savingsTarget ?? 20) + '%' },
                { label: 'Language', val: (appLang || 'en-US').split('-')[0].toUpperCase() },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-white font-bold text-sm">{s.val}</p>
                  <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
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
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Personal Information</p>
              </div>
              <Field label={t('full_name')}>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
              </Field>
              <Field label={t('email')}>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={cls} />
              </Field>
              <Field label={t('currency')}>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={cls}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
                </select>
              </Field>
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('saving')}</>
                  : t('save_changes')}
              </button>
            </div>
          </div>
        )}

        {/* Preferences tab */}
        {activeTab === 'prefs' && (
          <div className="space-y-4">
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
                <p className="text-xs text-gray-400 mt-1">{t('savings_rec')}</p>
              </Field>

              <Field label={t('app_language')} hint={t('app_lang_hint')}>
                <select value={appLang} onChange={e => setAppLang(e.target.value)} className={cls}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </Field>

              <Field label={t('mic_language')} hint={t('mic_lang_hint')}>
                <select value={micLang} onChange={e => setMicLang(e.target.value)} className={cls}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </Field>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">⚠️ {t('currency_warning')}</p>
              </div>

              <button onClick={() => {
                localStorage.setItem('spendly_prefs', JSON.stringify(prefs))
                localStorage.setItem('spendly_lang_app', appLang)
                localStorage.setItem('spendly_lang_mic', micLang)
                setPrefsSaved(true)
                setTimeout(() => { setPrefsSaved(false); window.location.reload() }, 1200)
              }}
                className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 active:scale-95 transition">
                {prefsSaved ? '✓ ' + t('saved_label') : t('save_preferences')}
              </button>
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Change Password</p>
              </div>
              <Field label={t('current_password')}>
                <input type="password" placeholder="••••••••" value={pwForm.current}
                  onChange={e => setPwForm({ ...pwForm, current: e.target.value })} className={cls} />
              </Field>
              <Field label={t('new_password')}>
                <input type="password" placeholder="••••••••" value={pwForm.newPw}
                  onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} className={cls} />
                {pwForm.newPw.length > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        pwForm.newPw.length >= i * 3
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                    ))}
                    <span className="text-xs text-gray-400 shrink-0">
                      {pwForm.newPw.length < 4 ? 'Weak' : pwForm.newPw.length < 7 ? 'Fair' : pwForm.newPw.length < 10 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}
              </Field>
              <Field label={t('confirm_password')}>
                <input type="password" placeholder="••••••••" value={pwForm.confirm}
                  onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} className={cls} />
                {pwForm.confirm.length > 0 && pwForm.newPw !== pwForm.confirm && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </Field>
              <button onClick={handleChangePassword}
                disabled={!pwForm.current || !pwForm.newPw || !pwForm.confirm || pwForm.newPw !== pwForm.confirm}
                className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 transition disabled:opacity-50">
                {t('change_password')}
              </button>
            </div>
          </div>
        )}

        {/* Account tab */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            {/* Plan card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{t('your_plan')}</p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-linear-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl border border-violet-200 dark:border-violet-800/40">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-300">Personal Plan</p>
                  <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">{t('personal_plan')}</p>
                </div>
              </div>
            </div>

            {/* Tutorial */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">App Tutorial</p>
              </div>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Replay the interactive tour to rediscover features, tips, and the voice assistant.
              </p>
              <button onClick={() => { localStorage.removeItem('spendly_onboarded'); window.location.href = '/dashboard' }}
                className="w-full flex items-center justify-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 py-3 rounded-xl font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition text-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Replay Tutorial
              </button>
            </div>

            {/* Sign out */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Session</p>
              </div>
              <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login' }}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>

            {/* Danger zone */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p className="text-sm font-bold text-red-600">{t('delete_account')}</p>
              </div>
              <p className="text-xs text-red-400 mb-4 leading-relaxed">{t('delete_warning')}</p>
              <button onClick={handleDeleteAccount}
                className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition text-sm">
                {t('delete_account')}
              </button>
            </div>
          </div>
        )}

        {/* Support tab */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            {supportSent ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-base font-bold text-gray-800 dark:text-white">Message sent!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">We'll get back to you as soon as possible.</p>
                <button onClick={() => { setSupportSent(false); setSupportForm({ subject: 'General question', message: '' }) }}
                  className="mt-2 text-violet-600 text-sm font-semibold hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Contact Support</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Have a question, found a bug, or want to suggest a feature? We'd love to hear from you.
                </p>
                <Field label="Subject">
                  <select value={supportForm.subject} onChange={e => setSupportForm(f => ({ ...f, subject: e.target.value }))} className={cls}>
                    {['General question', 'Bug report', 'Feature idea', 'Account issue', 'Other'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Message">
                  <textarea rows={5} placeholder="Describe your issue or idea in detail..."
                    value={supportForm.message}
                    onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
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
                      window.open(`mailto:charbel.mansourb@gmail.com?subject=${encodeURIComponent('[Spendly] ' + supportForm.subject)}&body=${encodeURIComponent(supportForm.message)}`)
                      setSupportSent(true)
                    }
                    setSupportSending(false)
                  }}
                  className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {supportSending
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                    : 'Send Message'}
                </button>
                <p className="text-xs text-center text-gray-400">
                  You can also email us directly at{' '}
                  <a href="mailto:charbel.mansourb@gmail.com" className="text-violet-500 hover:underline">charbel.mansourb@gmail.com</a>
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  )
}
