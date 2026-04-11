import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCIES = ['USD','EUR','GBP','LBP','AED','SAR','CAD','AUD']
const CURRENCY_SYMBOLS = { USD:'$',EUR:'€',GBP:'£',LBP:'L£',AED:'AED',SAR:'SAR',CAD:'C$',AUD:'A$' }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">x</button>
    </div>
  )
}

export default function Profile() {
  const [user, setUser]           = useState(null)
  const [form, setForm]           = useState({ name: '', email: '', currency: 'USD', business_name: '' })
  const [pwForm, setPwForm]       = useState({ current: '', newPw: '', confirm: '' })
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)
  const [activeTab, setActiveTab] = useState('profile')

  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  const showToast = (msg, type = 'success') => setToast({ message: msg, type })

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { window.location.href = '/login'; return }
    const u = JSON.parse(stored)
    setUser(u)
    setForm({ name: u.name || '', email: u.email || '', currency: u.currency || 'USD', business_name: u.business_name || '' })
    setLoading(false)
  }, [])

  const isBusiness = user?.account_type === 'business'
  const accentColor = isBusiness ? 'text-orange-500' : 'text-indigo-600'
  const accentBg    = isBusiness ? 'bg-orange-500' : 'bg-indigo-600'

  const handleSave = async () => {
    setSaving(true)
    try {
      await API.put('/profile', form)
      localStorage.setItem('currency', form.currency)
      const updated = { ...user, ...form }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      showToast('Profile updated!')
    } catch { showToast('Error saving profile', 'error') }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) { showToast('Passwords do not match', 'error'); return }
    if (pwForm.newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return }
    try {
      await API.put('/profile/password', { current_password: pwForm.current, new_password: pwForm.newPw })
      setPwForm({ current: '', newPw: '', confirm: '' })
      showToast('Password changed!')
    } catch (e) { showToast(e.response?.data?.message || 'Error changing password', 'error') }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.prompt('Type DELETE to confirm account deletion:')
    if (confirmed !== 'DELETE') return
    try {
      await API.delete('/profile')
      localStorage.clear()
      window.location.href = '/register'
    } catch { showToast('Error deleting account', 'error') }
  }

  if (loading) return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Avatar header */}
        <div className="flex flex-col items-center mb-8">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-3 ${accentBg}`}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{user?.name}</h1>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isBusiness ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {isBusiness ? (user?.business_type === 'restaurant' ? '🍽️ Restaurant' : '🏪 Firm') : '👤 Personal'}
            </span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-3 py-1 rounded-full font-semibold">
              {CURRENCY_SYMBOLS[user?.currency] || '$'} {user?.currency || 'USD'}
            </span>
          </div>
        </div>

        {/* Business stats — only for business accounts */}
        {isBusiness && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Account Type', value: 'Business', icon: '🏢' },
              { label: 'Business Mode', value: user?.business_type === 'restaurant' ? 'Restaurant' : 'Firm', icon: user?.business_type === 'restaurant' ? '🍽️' : '🏪' },
              { label: 'AI Powered', value: 'Active', icon: '🤖' },
            ].map((s, i) => (
              <div key={i} className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-3 text-center">
                <p className="text-xl mb-1">{s.icon}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-xs font-bold text-orange-600 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-6">
          {[
            { key: 'profile',   label: 'Profile' },
            { key: 'security',  label: 'Security' },
            { key: 'danger',    label: 'Danger Zone' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.key
                ? `bg-white dark:bg-gray-700 shadow-sm ${accentColor}`
                : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={cls} />
            </div>

            {/* Business name — only for business */}
            {isBusiness && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  {user?.business_type === 'restaurant' ? 'Restaurant Name' : 'Business Name'}
                </label>
                <input type="text"
                  placeholder={user?.business_type === 'restaurant' ? 'e.g. Epic Sandwich' : 'e.g. My Company'}
                  value={form.business_name}
                  onChange={e => setForm({ ...form, business_name: e.target.value })}
                  className={cls} />
                <p className="text-xs text-gray-400 mt-1">This name appears on your business dashboard</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Currency</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={cls}>
                {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
              </select>
            </div>

            <button onClick={handleSave} disabled={saving}
              className={`w-full ${accentBg} text-white py-4 rounded-2xl font-bold hover:opacity-90 transition disabled:opacity-50`}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Change Password</h3>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Current Password</label>
              <input type="password" placeholder="••••••••" value={pwForm.current}
                onChange={e => setPwForm({ ...pwForm, current: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">New Password</label>
              <input type="password" placeholder="••••••••" value={pwForm.newPw}
                onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Confirm New Password</label>
              <input type="password" placeholder="••••••••" value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} className={cls} />
            </div>
            <button onClick={handleChangePassword} disabled={!pwForm.current || !pwForm.newPw || !pwForm.confirm}
              className={`w-full ${accentBg} text-white py-4 rounded-2xl font-bold hover:opacity-90 transition disabled:opacity-50`}>
              Change Password
            </button>
          </div>
        )}

        {/* Danger zone tab */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Account Type</h3>
              <p className="text-xs text-gray-400 mb-3">
                You are on a <span className={`font-bold ${accentColor}`}>{isBusiness ? 'Business' : 'Personal'}</span> account.
                {isBusiness ? ' To switch to personal, contact support.' : ' To upgrade to business, contact support.'}
              </p>
              <div className={`rounded-xl p-3 text-xs ${isBusiness ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}>
                {isBusiness
                  ? '🍽️ Business accounts include: Menu Builder, Stock Tracking, AI Expense Verification, Employee & Payroll Management'
                  : '👤 Personal accounts include: Expense Tracking, Budgets, Savings Goals, AI Insights'}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <h3 className="font-semibold text-red-600 text-sm mb-1">Delete Account</h3>
              <p className="text-xs text-red-400 mb-4">This will permanently delete all your data. This cannot be undone.</p>
              <button onClick={handleDeleteAccount}
                className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition text-sm">
                Delete My Account
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}