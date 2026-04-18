import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦', Salary: '💼', Freelance: '💻', Business: '🏪', Investment: '📈' }
const CAT_COLORS = { Food: '#F97316', Transport: '#3B82F6', Shopping: '#EC4899', Subscriptions: '#8B5CF6', Entertainment: '#10B981', Other: '#6B7280' }
const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
const EXPENSE_CATS = ['Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Other']

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmtMoney(amount, symbol) {
  return symbol + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function dayLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  return d.toLocaleDateString('default', { month: 'long', year: 'numeric' })
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="hover:opacity-70 shrink-0">✕</button>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <p className="text-4xl mb-3">🗑️</p>
        <p className="font-semibold text-gray-800 dark:text-white mb-1">{message}</p>
        <p className="text-gray-400 text-sm mb-5">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white py-3 rounded-xl font-semibold">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition">Delete</button>
        </div>
      </div>
    </div>
  )
}

function EditSheet({ expense, sym, onSave, onClose }) {
  const [form, setForm] = useState({
    amount: expense.amount,
    category: expense.category,
    description: expense.description || '',
    date: expense.date?.split('T')[0] || '',
    is_recurring: expense.is_recurring || false,
  })
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Edit Expense</h3>
          <button onClick={onClose} className="text-gray-400 p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({sym})</label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} min="0.01" step="0.01" className={cls + ' text-lg font-bold'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={cls}>
                {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={cls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" className={cls} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="accent-violet-600 w-4 h-4" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly</span>
          </label>
          <button onClick={() => onSave(form)} disabled={!form.amount || !form.date}
            className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition disabled:opacity-50">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  Main page
// ──────────────────────────────────────────────────────────────
export default function Transactions() {
  const [expenses, setExpenses] = useState([])
  const [income, setIncome]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('expenses')   // expenses | income | all
  const [sym] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [toast, setToast]       = useState(null)
  const [confirm, setConfirm]   = useState(null)
  const [editing, setEditing]   = useState(null)

  // Filters
  const [search, setSearch]       = useState('')
  const [catFilter, setCat]       = useState('All')
  const [sortBy, setSort]         = useState('newest')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    Promise.all([API.get('/expenses'), API.get('/income')])
      .then(([e, i]) => { setExpenses(e.data || []); setIncome(i.data || []) })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  const fetchAll = useCallback(() => {
    Promise.all([API.get('/expenses'), API.get('/income')])
      .then(([e, i]) => { setExpenses(e.data || []); setIncome(i.data || []) })
      .catch(() => showToast('Error loading', 'error'))
  }, [showToast])

  const handleDeleteExpense = (id) => {
    setConfirm({
      message: 'Delete this expense?',
      onConfirm: async () => {
        setConfirm(null)
        try { await API.delete('/expenses/' + id); fetchAll(); showToast('Deleted', 'error') } catch { showToast('Error deleting', 'error') }
      }
    })
  }

  const handleEditSave = async (form) => {
    try { await API.put('/expenses/' + editing.id, form); setEditing(null); fetchAll(); showToast('Updated!') }
    catch { showToast('Error updating', 'error') }
  }

  // ── Derived data ──
  const applyFilters = (list, isIncome) => list
    .filter(tx => !search.trim() || [tx.description, tx.category, tx.source, String(tx.amount)].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
    .filter(tx => {
      const cat = isIncome ? (tx.source || 'Other') : (tx.category || 'Other')
      return catFilter === 'All' || cat === catFilter
    })
    .filter(tx => {
      const d = new Date(tx.date || tx.created_at)
      if (dateFrom && d < new Date(dateFrom)) return false
      if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
    .sort((a, b) => {
      const da = new Date(a.date || a.created_at), db = new Date(b.date || b.created_at)
      if (sortBy === 'newest')  return db - da
      if (sortBy === 'oldest')  return da - db
      if (sortBy === 'highest') return safeNum(b.amount) - safeNum(a.amount)
      if (sortBy === 'lowest')  return safeNum(a.amount) - safeNum(b.amount)
      return 0
    })

  const filteredExpenses = applyFilters(expenses, false)
  const filteredIncome   = applyFilters(income, true)

  const totalExpenses  = filteredExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const totalIncome    = filteredIncome.reduce((s, i) => s + safeNum(i.amount), 0)
  const net            = totalIncome - totalExpenses

  // Category breakdown for the active tab
  const expenseByCat = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + safeNum(e.amount); return acc
  }, {})
  const incomeBySrc = filteredIncome.reduce((acc, i) => {
    const src = i.source || 'Other'
    acc[src] = (acc[src] || 0) + safeNum(i.amount); return acc
  }, {})

  // Group by date
  const groupByDate = (list, isIncome) => list.reduce((acc, tx) => {
    const label = dayLabel(tx.date || tx.created_at)
    if (!acc[label]) acc[label] = []
    acc[label].push({ ...tx, _isIncome: isIncome })
    return acc
  }, {})

  const allMixed = [
    ...filteredExpenses.map(e => ({ ...e, _isIncome: false })),
    ...filteredIncome.map(i => ({ ...i, _isIncome: true, category: i.source || 'Income', date: i.date || i.created_at })),
  ].sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date)
    if (sortBy === 'newest')  return db - da
    if (sortBy === 'oldest')  return da - db
    if (sortBy === 'highest') return safeNum(b.amount) - safeNum(a.amount)
    if (sortBy === 'lowest')  return safeNum(a.amount) - safeNum(b.amount)
    return 0
  })
  const allMixedGrouped = allMixed.reduce((acc, tx) => {
    const label = dayLabel(tx.date)
    if (!acc[label]) acc[label] = []
    acc[label].push(tx)
    return acc
  }, {})

  const groupedExpenses = groupByDate(filteredExpenses, false)
  const groupedIncome   = groupByDate(filteredIncome, true)

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Category/Source', 'Description', 'Amount']]
    filteredExpenses.forEach(e => rows.push([e.date?.split('T')[0], 'Expense', e.category, e.description || '', '-' + safeNum(e.amount).toFixed(2)]))
    filteredIncome.forEach(i => rows.push([(i.date || i.created_at)?.split('T')[0], 'Income', i.source || 'Other', i.description || '', '+' + safeNum(i.amount).toFixed(2)]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'spendly-transactions.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exported!')
  }

  const hasFilters = catFilter !== 'All' || sortBy !== 'newest' || dateFrom || dateTo || search

  // ── Render helpers ──
  const renderExpenseRow = (tx, idx, total) => (
    <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 group hover:bg-gray-50 dark:hover:bg-gray-700/40 transition ${idx < total - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{ background: (CAT_COLORS[tx.category] || '#6B7280') + '20' }}>
        {CAT_ICONS[tx.category] || '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
          {tx.description || tx.category}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{tx.category}</span>
          <span className="text-xs text-gray-400">{fmtDate(tx.date)}</span>
          {tx.is_recurring && <span className="text-xs text-purple-500 font-medium">↻ Recurring</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold text-sm tabular-nums text-gray-800 dark:text-white">
          -{sym}{safeNum(tx.amount).toFixed(2)}
        </span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button onClick={() => setEditing(tx)} className="text-violet-400 hover:text-violet-600 p-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => handleDeleteExpense(tx.id)} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )

  const renderIncomeRow = (tx, idx, total) => (
    <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 ${idx < total - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 bg-green-100 dark:bg-green-900/30">
        {CAT_ICONS[tx.source] || '💵'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
          {tx.description || tx.source || 'Income'}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">{tx.source || 'Income'}</span>
          <span className="text-xs text-gray-400">{fmtDate(tx.date || tx.created_at)}</span>
          {tx.is_recurring && <span className="text-xs text-purple-500 font-medium">↻ Recurring</span>}
        </div>
      </div>
      <span className="font-bold text-sm tabular-nums text-green-600 shrink-0">
        +{sym}{safeNum(tx.amount).toFixed(2)}
      </span>
    </div>
  )

  const filterBar = (isIncome) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>}
      </div>

      <div className="flex items-center gap-2 justify-between">
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${showFilters || hasFilters ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Filters {hasFilters ? '•' : ''}
        </button>

        {/* Category quick pills */}
        <div className="flex gap-1.5 flex-wrap flex-1 justify-end">
          <button onClick={() => setCat('All')} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${catFilter === 'All' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>All</button>
          {(isIncome ? INCOME_SOURCES : EXPENSE_CATS).map(c => (
            <button key={c} onClick={() => setCat(c === catFilter ? 'All' : c)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${catFilter === c ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'}`}>
              {CAT_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Sort by</label>
            <select value={sortBy} onChange={e => setSort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">From date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">To date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {hasFilters && (
            <div className="col-span-2">
              <button onClick={() => { setCat('All'); setSort('newest'); setDateFrom(''); setDateTo(''); setSearch('') }}
                className="text-xs text-red-500 font-semibold hover:underline">Clear all filters</button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderGrouped = (grouped, isIncome) => (
    <div className="space-y-4">
      {Object.entries(grouped).map(([label, txs]) => (
        <div key={label}>
          <div className="flex items-center gap-3 mb-2 px-1">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</p>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            <p className="text-xs font-semibold tabular-nums whitespace-nowrap">
              {isIncome
                ? <span className="text-green-600">+{sym}{txs.reduce((s,t) => s + safeNum(t.amount), 0).toFixed(2)}</span>
                : <span className="text-red-500">-{sym}{txs.reduce((s,t) => s + safeNum(t.amount), 0).toFixed(2)}</span>
              }
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            {txs.map((tx, idx) => isIncome ? renderIncomeRow(tx, idx, txs.length) : renderExpenseRow(tx, idx, txs.length))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Layout>
      {toast   && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {editing && <EditSheet expense={editing} sym={sym} onSave={handleEditSave} onClose={() => setEditing(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-400 text-sm mt-0.5">{expenses.length + income.length} total entries</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-semibold hover:border-violet-300 hover:text-violet-600 transition shadow-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total Income</p>
            <p className="text-base font-bold text-green-600 tabular-nums truncate">+{fmtMoney(totalIncome, sym)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{filteredIncome.length} entr{filteredIncome.length !== 1 ? 'ies' : 'y'}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total Spent</p>
            <p className="text-base font-bold text-red-500 tabular-nums truncate">-{fmtMoney(totalExpenses, sym)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</p>
          </div>
          <div className={`rounded-2xl p-4 text-center ${net >= 0 ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
            <p className="text-xs text-gray-400 mb-1">Balance</p>
            <p className={`text-base font-bold tabular-nums truncate ${net >= 0 ? 'text-violet-600' : 'text-orange-500'}`}>
              {net >= 0 ? '+' : ''}{fmtMoney(net, sym)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{net >= 0 ? 'surplus' : 'deficit'}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5">
          {[
            { key: 'expenses', label: `💸 Expenses`, count: filteredExpenses.length },
            { key: 'income',   label: `💵 Income`,   count: filteredIncome.length },
            { key: 'all',      label: `📋 All`,       count: filteredExpenses.length + filteredIncome.length },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setCat('All') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                tab === t.key ? 'bg-white dark:bg-gray-700 text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <span>{t.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Expenses tab */}
        {tab === 'expenses' && (
          <>
            {filterBar(false)}

            {/* Category breakdown */}
            {filteredExpenses.length > 0 && Object.keys(expenseByCat).length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Breakdown by category</p>
                <div className="space-y-2">
                  {Object.entries(expenseByCat).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => {
                    const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-lg shrink-0">{CAT_ICONS[cat] || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{cat}</span>
                            <span className="text-gray-400 tabular-nums">{sym}{amt.toFixed(2)} · {pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">💸</p>
                <p className="font-semibold text-gray-700 dark:text-white mb-1">No expenses found</p>
                <p className="text-gray-400 text-sm">{hasFilters ? 'Try adjusting your filters.' : 'Add expenses from the Dashboard.'}</p>
              </div>
            ) : renderGrouped(groupedExpenses, false)}
          </>
        )}

        {/* Income tab */}
        {tab === 'income' && (
          <>
            {filterBar(true)}

            {/* Source breakdown */}
            {filteredIncome.length > 0 && Object.keys(incomeBySrc).length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Breakdown by source</p>
                <div className="space-y-2">
                  {Object.entries(incomeBySrc).sort((a,b) => b[1]-a[1]).map(([src, amt]) => {
                    const pct = totalIncome > 0 ? (amt / totalIncome) * 100 : 0
                    return (
                      <div key={src} className="flex items-center gap-3">
                        <span className="text-lg shrink-0">{CAT_ICONS[src] || '💵'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{src}</span>
                            <span className="text-gray-400 tabular-nums">{sym}{amt.toFixed(2)} · {pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
            ) : filteredIncome.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">💵</p>
                <p className="font-semibold text-gray-700 dark:text-white mb-1">No income entries found</p>
                <p className="text-gray-400 text-sm">{hasFilters ? 'Try adjusting your filters.' : 'Add income from the Dashboard.'}</p>
              </div>
            ) : renderGrouped(groupedIncome, true)}
          </>
        )}

        {/* All tab */}
        {tab === 'all' && (
          <>
            {filterBar(false)}
            {loading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
            ) : allMixed.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-semibold text-gray-700 dark:text-white mb-1">No transactions found</p>
                <p className="text-gray-400 text-sm">{hasFilters ? 'Try adjusting your filters.' : 'Add transactions from the Dashboard.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(allMixedGrouped).map(([label, txs]) => (
                  <div key={label}>
                    <div className="flex items-center gap-3 mb-2 px-1">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</p>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                      {txs.map((tx, idx) => tx._isIncome ? renderIncomeRow(tx, idx, txs.length) : renderExpenseRow(tx, idx, txs.length))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
