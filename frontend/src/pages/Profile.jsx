import { useEffect, useState } from 'react'
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
      <button onClick={onClose} className="font-bold opacity-70">x</button>
    </div>
  )
}

export default function Profile() {
  const [user, setUser]           = useState(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { window.location.href = '/login'; return null }
    return JSON.parse(stored)
  })
  const [form, setForm]           = useState(() => {
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
  const [micLang, setMicLang] = useState(() => localStorage.getItem('spendly_lang_mic') || 'en-US')
  const [appLang, setAppLang] = useState(() => localStorage.getItem('spendly_lang_app') || localStorage.getItem('spendly_lang_response') || 'en-US')

  // Business mode disabled — business_name field removed
  // const [form, setForm] = useState({ name: '', email: '', currency: 'USD', business_name: '' })

  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  const showToast = (msg, type = 'success') => setToast({ message: msg, type })

  // Business mode disabled — always personal
  // const isBusiness = user?.account_type === 'business'

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

  const FREQ_KEYS = { Monthly: 'monthly_freq', 'Bi-weekly': 'biweekly_freq', Weekly: 'weekly_freq', Irregular: 'irregular_freq' }

  if (!user) return null

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Avatar header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-violet-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 mb-3">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{user?.name}</h1>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
              {t('personal')}
            </span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full font-semibold">
              {CURRENCY_SYMBOLS[user?.currency] || '$'} {user?.currency || 'USD'}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-6">
          {[
            { key: 'profile',  label: t('profile') },
            { key: 'prefs',    label: t('preferences') },
            { key: 'security', label: t('security') },
            { key: 'danger',   label: '⚠️' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('full_name')}</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('email')}</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('currency')}</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={cls}>
                {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
              </select>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition disabled:opacity-50">
              {saving ? t('saving') : t('save_changes')}
            </button>
          </div>
        )}

        {/* Preferences tab */}
        {activeTab === 'prefs' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('income_frequency')}</label>
              <div className="grid grid-cols-2 gap-2">
                {INCOME_FREQS.map(f => (
                  <button key={f} type="button"
                    onClick={() => setPrefs(p => ({ ...p, incomeFreq: f }))}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                      (prefs.incomeFreq || 'Monthly') === f
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                    {t(FREQ_KEYS[f] || f)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
                {t('savings_target')} <span className="text-gray-400 font-normal">{t('savings_target_hint')}</span>
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="80" step="5"
                  value={prefs.savingsTarget ?? 20}
                  onChange={e => setPrefs(p => ({ ...p, savingsTarget: parseInt(e.target.value) }))}
                  className="flex-1 accent-violet-600" />
                <span className="text-lg font-bold text-violet-600 w-12 text-right tabular-nums">
                  {prefs.savingsTarget ?? 20}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t('savings_rec')}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
                {t('app_language')} <span className="text-gray-400 font-normal">{t('app_lang_hint')}</span>
              </label>
              <select value={appLang} onChange={e => setAppLang(e.target.value)} className={cls}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
                {t('mic_language')} <span className="text-gray-400 font-normal">{t('mic_lang_hint')}</span>
              </label>
              <select value={micLang} onChange={e => setMicLang(e.target.value)} className={cls}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('currency_note')}</label>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  ⚠️ {t('currency_warning')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('spendly_prefs', JSON.stringify(prefs))
                localStorage.setItem('spendly_lang_app', appLang)
                localStorage.setItem('spendly_lang_mic', micLang)
                setPrefsSaved(true)
                setTimeout(() => { setPrefsSaved(false); window.location.reload() }, 1200)
              }}
              className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition">
              {prefsSaved ? t('saved_label') : t('save_preferences')}
            </button>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">{t('change_password')}</h3>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('current_password')}</label>
              <input type="password" placeholder="••••••••" value={pwForm.current}
                onChange={e => setPwForm({ ...pwForm, current: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('new_password')}</label>
              <input type="password" placeholder="••••••••" value={pwForm.newPw}
                onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t('confirm_password')}</label>
              <input type="password" placeholder="••••••••" value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} className={cls} />
            </div>
            <button onClick={handleChangePassword} disabled={!pwForm.current || !pwForm.newPw || !pwForm.confirm}
              className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition disabled:opacity-50">
              {t('change_password')}
            </button>
          </div>
        )}

        {/* Danger zone tab */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">{t('your_plan')}</h3>
              <div className="rounded-xl p-3 text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">
                {t('personal_plan')}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <h3 className="font-semibold text-red-600 text-sm mb-1">{t('delete_account')}</h3>
              <p className="text-xs text-red-400 mb-4">{t('delete_warning')}</p>
              <button onClick={handleDeleteAccount}
                className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition text-sm">
                {t('delete_account')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
