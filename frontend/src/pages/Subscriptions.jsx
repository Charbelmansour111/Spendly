import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CATEGORIES = ['Streaming', 'Software', 'Fitness', 'News & Media', 'Cloud Storage', 'Gaming', 'Music', 'Education', 'Other']
const CYCLES = ['monthly', 'yearly', 'weekly']

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const fmt = (n, sym) => `${sym}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const CAT_COLORS = {
  'Streaming': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  'Software': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'Fitness': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  'Music': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  'Gaming': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  'Education': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  'default': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
}

const EMPTY = { name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '', category: 'Other' }

const toMonthly = (amount, cycle) => {
  const a = parseFloat(amount || 0)
  if (cycle === 'yearly') return a / 12
  if (cycle === 'weekly') return a * 4.33
  return a
}

export default function Subscriptions() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const sym = CURRENCY_SYMBOLS[user.currency] || '$'

  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    API.get('/subscriptions').then(r => setSubs(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openAdd = () => { setForm(EMPTY); setEditing(null); setShowModal(true) }
  const openEdit = (s) => { setForm({ ...s, next_billing_date: s.next_billing_date ? s.next_billing_date.split('T')[0] : '' }); setEditing(s.id); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.amount) return showToast('Name and amount are required')
    setSaving(true)
    try {
      if (editing) {
        const r = await API.put(`/subscriptions/${editing}`, form)
        setSubs(prev => prev.map(s => s.id === editing ? r.data : s))
        showToast('Subscription updated')
      } else {
        const r = await API.post('/subscriptions', form)
        setSubs(prev => [r.data, ...prev])
        showToast('Subscription added')
      }
      setShowModal(false)
    } catch { showToast('Failed to save') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subscription?')) return
    try {
      await API.delete(`/subscriptions/${id}`)
      setSubs(prev => prev.filter(s => s.id !== id))
      showToast('Subscription deleted')
    } catch { showToast('Failed to delete') }
  }

  const monthlyTotal = subs.reduce((s, sub) => s + toMonthly(sub.amount, sub.billing_cycle), 0)
  const yearlyTotal = monthlyTotal * 12

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = subs.filter(s => s.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})
  const otherItems = subs.filter(s => !CATEGORIES.slice(0, -1).includes(s.category))
  if (otherItems.length) grouped['Other'] = otherItems

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">

        {toast && (
          <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg border border-gray-700">
            {toast}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">All your recurring services in one place</p>
          </div>
          <button onClick={openAdd} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-sm">
            + Add Subscription
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Monthly Cost</p>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{fmt(monthlyTotal, sym)}</p>
            <p className="text-xs text-gray-400 mt-1">{subs.length} active subscription{subs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Yearly Cost</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{fmt(yearlyTotal, sym)}</p>
            <p className="text-xs text-gray-400 mt-1">per year</p>
          </div>
        </div>

        {/* Empty state */}
        {!loading && subs.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No subscriptions tracked yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs mx-auto">Add Netflix, Spotify, or any recurring service to see what you're really spending each month.</p>
            <button onClick={openAdd} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-700 transition">
              Add your first subscription
            </button>
          </div>
        )}

        {/* Grouped list */}
        {subs.length > 0 && (
          <div className="space-y-3">
            {subs.map(s => {
              const monthly = toMonthly(s.amount, s.billing_cycle)
              const colorClass = CAT_COLORS[s.category] || CAT_COLORS.default
              const nextDate = s.next_billing_date ? new Date(s.next_billing_date) : null
              const daysUntil = nextDate ? Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24)) : null

              return (
                <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-lg shrink-0">
                    {s.category === 'Streaming' ? '🎬' : s.category === 'Music' ? '🎵' : s.category === 'Fitness' ? '💪' : s.category === 'Gaming' ? '🎮' : s.category === 'Software' ? '💻' : s.category === 'Education' ? '📚' : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{s.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>{s.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="capitalize">{s.billing_cycle}</span>
                      {daysUntil !== null && (
                        <span className={daysUntil <= 3 ? 'text-red-500 font-semibold' : daysUntil <= 7 ? 'text-orange-400' : ''}>
                          {daysUntil === 0 ? 'Due today' : daysUntil < 0 ? 'Overdue' : `${daysUntil}d until renewal`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{fmt(s.amount, sym)}</p>
                    {s.billing_cycle !== 'monthly' && (
                      <p className="text-xs text-gray-400">{fmt(monthly, sym)}/mo</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-violet-500 transition p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{editing ? 'Edit Subscription' : 'Add Subscription'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Service Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Netflix, Spotify, Adobe..."
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Amount</label>
                    <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Billing Cycle</label>
                    <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                      {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Next Billing Date (optional)</label>
                  <input type="date" value={form.next_billing_date} onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                {form.billing_cycle !== 'monthly' && form.amount && (
                  <p className="text-xs text-violet-500 bg-violet-50 dark:bg-violet-900/20 rounded-lg px-3 py-2">
                    ≈ {CURRENCY_SYMBOLS[user.currency] || '$'}{toMonthly(form.amount, form.billing_cycle).toFixed(2)}/month
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition disabled:opacity-60">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
