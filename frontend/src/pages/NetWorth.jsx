import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const safeNum = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n }

const ASSET_CATEGORIES = ['Cash & Bank', 'Savings', 'Investments', 'Real Estate', 'Vehicle', 'Other']
const LIABILITY_CATEGORIES = ['Credit Card', 'Mortgage', 'Car Loan', 'Student Loan', 'Personal Loan', 'Other']

const CATEGORY_ICONS = {
  'Cash & Bank': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M12 12v4M10 14h4"/>
    </svg>
  ),
  'Savings': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8L5 7h14l-3-4z"/><circle cx="12" cy="13" r="2"/>
    </svg>
  ),
  'Investments': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  'Real Estate': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
    </svg>
  ),
  'Vehicle': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  'Credit Card': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
}

function fmt(n, sym = '$') {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return sym + (n / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return sym + (n / 1_000).toFixed(1) + 'k'
  return sym + safeNum(n).toFixed(2)
}

function fmtFull(n, sym = '$') {
  return (n < 0 ? '-' : '') + sym + Math.abs(safeNum(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

export default function NetWorth() {
  const [data, setData] = useState({ items: [], totalAssets: 0, totalLiabilities: 0, netWorth: 0, history: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null) // { type: 'asset'|'liability', item?: existing }
  const [form, setForm] = useState({ name: '', category: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'

  const showToast = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    try {
      const r = await API.get('/networth')
      setData(r.data)
      // Save today's snapshot silently
      const { totalAssets, totalLiabilities, netWorth } = r.data
      API.post('/networth/snapshot', { totalAssets, totalLiabilities, netWorth }).catch(() => {})
    } catch {
      showToast('Failed to load net worth data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    load()
  }, [load])

  const openAdd = (type) => {
    const cats = type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
    setForm({ name: '', category: cats[0], amount: '' })
    setModal({ type })
  }

  const openEdit = (item) => {
    setForm({ name: item.name, category: item.category, amount: String(item.amount) })
    setModal({ type: item.type, item })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.amount) return
    setSaving(true)
    try {
      if (modal.item) {
        await API.put(`/networth/item/${modal.item.id}`, { name: form.name, category: form.category, amount: parseFloat(form.amount) })
        showToast('Updated successfully')
      } else {
        await API.post('/networth/item', { name: form.name, category: form.category, amount: parseFloat(form.amount), type: modal.type })
        showToast('Added successfully')
      }
      setModal(null)
      load()
    } catch {
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await API.delete(`/networth/item/${id}`)
      setDeleteId(null)
      showToast('Deleted')
      load()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const assets = data.items.filter(i => i.type === 'asset')
  const liabilities = data.items.filter(i => i.type === 'liability')
  const netWorth = data.netWorth
  const trend = data.history.length >= 2
    ? netWorth - safeNum(data.history[1]?.net_worth)
    : null

  const assetPct = data.totalAssets > 0 ? Math.min((data.totalAssets / Math.max(data.totalAssets + data.totalLiabilities, 1)) * 100, 100) : 0

  // Group by category
  const groupBy = (items) => {
    const map = {}
    items.forEach(i => { if (!map[i.category]) map[i.category] = []; map[i.category].push(i) })
    return map
  }

  const cats = type => type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Net Worth</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your total financial picture</p>
        </div>

        {/* Hero card */}
        <div className={`bg-linear-to-br ${netWorth >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'} rounded-3xl px-6 pt-6 pb-5 text-white mb-4 relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">Total Net Worth</p>
            <p className="text-4xl font-black tabular-nums mb-1">{fmtFull(netWorth, sym)}</p>
            {trend !== null && (
              <p className={`text-sm font-semibold ${trend >= 0 ? 'text-white/90' : 'text-white/80'}`}>
                {trend >= 0 ? '↑' : '↓'} {fmtFull(Math.abs(trend), sym)} vs last snapshot
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-2xl px-4 py-3">
                <p className="text-white/70 text-xs mb-0.5">Total Assets</p>
                <p className="text-white font-bold text-base tabular-nums">{fmtFull(data.totalAssets, sym)}</p>
              </div>
              <div className="bg-white/15 rounded-2xl px-4 py-3">
                <p className="text-white/70 text-xs mb-0.5">Total Liabilities</p>
                <p className="text-white font-bold text-base tabular-nums">{fmtFull(data.totalLiabilities, sym)}</p>
              </div>
            </div>

            {/* Asset vs liability bar */}
            {(data.totalAssets > 0 || data.totalLiabilities > 0) && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>Assets {Math.round(assetPct)}%</span>
                  <span>Liabilities {Math.round(100 - assetPct)}%</span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-2 bg-white rounded-full transition-all duration-700" style={{ width: `${assetPct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History trend (if available) */}
        {data.history.length >= 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-5 py-4 mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Net Worth History</p>
            <div className="flex items-end gap-1.5 h-14">
              {[...data.history].reverse().map((snap, i) => {
                const max = Math.max(...data.history.map(s => Math.abs(safeNum(s.net_worth))), 1)
                const pct = Math.max((Math.abs(safeNum(snap.net_worth)) / max) * 100, 4)
                const positive = safeNum(snap.net_worth) >= 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all ${positive ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{ height: `${pct}%` }}
                      title={fmtFull(safeNum(snap.net_worth), sym)}
                    />
                    <span className="text-[9px] text-gray-400 tabular-nums">
                      {new Date(snap.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Assets section */}
        <Section
          title="Assets"
          total={data.totalAssets}
          sym={sym}
          items={assets}
          type="asset"
          groupBy={groupBy}
          onAdd={() => openAdd('asset')}
          onEdit={openEdit}
          onDelete={setDeleteId}
          color="emerald"
        />

        {/* Liabilities section */}
        <Section
          title="Liabilities"
          total={data.totalLiabilities}
          sym={sym}
          items={liabilities}
          type="liability"
          groupBy={groupBy}
          onAdd={() => openAdd('liability')}
          onEdit={openEdit}
          onDelete={setDeleteId}
          color="rose"
        />
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className={`bg-linear-to-br ${modal.type === 'asset' ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'} px-6 pt-6 pb-5 text-white`}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-lg">{modal.item ? 'Edit' : 'Add'} {modal.type === 'asset' ? 'Asset' : 'Liability'}</p>
                <button onClick={() => setModal(null)} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
              </div>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={modal.type === 'asset' ? 'e.g. Chase Checking' : 'e.g. Visa Credit Card'}
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {(modal.type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Amount ({sym})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3.5 rounded-2xl font-bold text-white text-sm transition ${modal.type === 'asset' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'} disabled:opacity-50`}
              >
                {saving ? 'Saving…' : modal.item ? 'Save Changes' : `Add ${modal.type === 'asset' ? 'Asset' : 'Liability'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 w-full max-w-xs">
            <p className="font-bold text-gray-900 dark:text-white text-center mb-2">Delete this entry?</p>
            <p className="text-sm text-gray-400 text-center mb-5">This can't be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function Section({ title, total, sym, items, type, groupBy, onAdd, onEdit, onDelete, color }) {
  const groups = groupBy(items)
  const colorMap = {
    emerald: { badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: 'text-emerald-500', btn: 'bg-emerald-500 hover:bg-emerald-600', header: 'text-emerald-600 dark:text-emerald-400' },
    rose:    { badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',             icon: 'text-rose-500',    btn: 'bg-rose-500 hover:bg-rose-600',       header: 'text-rose-600 dark:text-rose-400' },
  }
  const c = colorMap[color]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/60">
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{title}</p>
          <p className={`text-xs font-semibold mt-0.5 ${c.header}`}>{fmtFull(total, sym)}</p>
        </div>
        <button
          onClick={onAdd}
          className={`${c.btn} text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-gray-400 text-sm">No {title.toLowerCase()} added yet</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Tap Add to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-700/60">
          {Object.entries(groups).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="px-5 py-2 bg-gray-50/60 dark:bg-gray-700/30 flex items-center gap-2">
                <span className={`${c.icon}`}>{CATEGORY_ICONS[cat] || <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/></svg>}</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{cat}</span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                  {fmtFull(catItems.reduce((s, i) => s + safeNum(i.amount), 0), sym)}
                </span>
              </div>
              {catItems.map(item => (
                <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{item.name}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums shrink-0">{fmtFull(safeNum(item.amount), sym)}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
