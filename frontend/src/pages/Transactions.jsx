import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', LBP: 'L\u00a3', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CATEGORY_ICONS   = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦', Salary: '💼', Freelance: '💻', Business: '🏪', Investment: '📈' }
const CATEGORY_COLORS  = { Food: '#F97316', Transport: '#3B82F6', Shopping: '#EC4899', Subscriptions: '#8B5CF6', Entertainment: '#10B981', Other: '#6B7280' }

function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 text-center w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-bold text-indigo-600 tabular-nums break-all">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(amount, symbol) {
  return symbol + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'error' ? 'bg-red-500' : 'bg-green-500'
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${bg}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 font-bold opacity-70 hover:opacity-100">x</button>
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

function EditSheet({ expense, currencySymbol, onSave, onClose }) {
  const [form, setForm] = useState({
    amount: expense.amount,
    category: expense.category,
    description: expense.description || '',
    date: expense.date?.split('T')[0] || '',
    is_recurring: expense.is_recurring || false,
  })
  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Edit Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({currencySymbol})</label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              min="0.01" step="0.01" required className={inputCls + ' text-lg font-bold'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                <option>Food</option><option>Transport</option><option>Shopping</option>
                <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optional" className={inputCls} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly</span>
          </label>
          <button onClick={() => onSave(form)}
            disabled={!form.amount || !form.date}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition disabled:opacity-50">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Transactions() {
  const [expenses, setExpenses]   = useState([])
  const [income, setIncome]       = useState([])
  const [modalData, setModalData] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [currencySymbol, setSymbol] = useState('$')
  const [toast, setToast]         = useState(null)
  const [confirm, setConfirm]     = useState(null)
  const [editing, setEditing]     = useState(null)

  // Filters
  const [search, setSearch]       = useState('')
  const [typeFilter, setType]     = useState('all')       // all | expense | income
  const [catFilter, setCat]       = useState('All')
  const [sortBy, setSort]         = useState('newest')
  const [showFilters, setShowFilters] = useState(false)

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [e, i] = await Promise.all([
        API.get('/expenses'),
        API.get('/income'),
      ])
      setExpenses(e.data || [])
      setIncome(i.data || [])
    } catch { console.log('Error fetching transactions') }
    setLoading(false)
  }

  const handleDeleteExpense = (id) => {
    setConfirm({
      message: 'Delete this expense?',
      onConfirm: async () => {
        setConfirm(null)
        try { await API.delete('/expenses/' + id); fetchAll(); showToast('Expense deleted', 'error') } catch {}
      }
    })
  }

  const handleEditSave = async (form) => {
    try {
      await API.put('/expenses/' + editing.id, form)
      setEditing(null); fetchAll(); showToast('Expense updated!')
    } catch { showToast('Error updating', 'error') }
  }

  // Merge expenses + income into one feed
  const allTransactions = [
    ...expenses.map(e => ({ ...e, txType: 'expense' })),
    ...income.map(i  => ({ ...i, txType: 'income',  category: i.source || 'Income', date: i.created_at || new Date().toISOString() })),
  ]

  // Apply filters
  const filtered = allTransactions
    .filter(tx => typeFilter === 'all' || tx.txType === typeFilter)
    .filter(tx => catFilter === 'All' || tx.category === catFilter || tx.source === catFilter)
    .filter(tx => {
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (tx.description || '').toLowerCase().includes(s) ||
             (tx.category    || '').toLowerCase().includes(s) ||
             (tx.source      || '').toLowerCase().includes(s) ||
             String(tx.amount).includes(s)
    })
    .sort((a, b) => {
      if (sortBy === 'newest')  return new Date(b.date) - new Date(a.date)
      if (sortBy === 'oldest')  return new Date(a.date) - new Date(b.date)
      if (sortBy === 'highest') return safeNum(b.amount) - safeNum(a.amount)
      if (sortBy === 'lowest')  return safeNum(a.amount) - safeNum(b.amount)
      return 0
    })

  // Summary stats
  const totalExpenses = expenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const totalIncome   = income.reduce((s, i)   => s + safeNum(i.amount), 0)

  // Group by date label
  const grouped = filtered.reduce((acc, tx) => {
    const d    = new Date(tx.date)
    const now  = new Date()
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    let label
    if (diff === 0)      label = 'Today'
    else if (diff === 1) label = 'Yesterday'
    else if (diff < 7)   label = diff + ' days ago'
    else                 label = d.toLocaleDateString('default', { month: 'long', year: 'numeric' })
    if (!acc[label]) acc[label] = []
    acc[label].push(tx)
    return acc
  }, {})

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Category', 'Description', 'Amount']]
    filtered.forEach(tx => rows.push([
      tx.date?.split('T')[0],
      tx.txType,
      tx.category || tx.source || '',
      tx.description || '',
      (tx.txType === 'income' ? '+' : '-') + safeNum(tx.amount).toFixed(2)
    ]))
    const csv  = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'spendly-transactions.csv'; link.click()
    URL.revokeObjectURL(url)
    showToast('CSV exported!')
  }

  const hasActiveFilters = typeFilter !== 'all' || catFilter !== 'All' || sortBy !== 'newest'

  return (
    <Layout>
      {toast    && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm  && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {editing  && <EditSheet expense={editing} currencySymbol={currencySymbol} onSave={handleEditSave} onClose={() => setEditing(null)} />}
        {modalData && <NumberModal {...modalData} onClose={() => setModalData(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-400 text-sm mt-0.5">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-semibold hover:border-indigo-300 hover:text-indigo-600 transition shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>

        {/* Summary Pills */}
   <div className="grid grid-cols-3 gap-3 mb-5">
  {[
    { label: 'Income', value: fmt(totalIncome, currencySymbol),   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',   sub: income.length + ' sources' },
    { label: 'Spent',  value: fmt(totalExpenses, currencySymbol), color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',       sub: expenses.length + ' expenses' },
    { label: 'Total',  value: String(allTransactions.length),     color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', sub: 'all time transactions' },
  ].map((s, i) => (
    <button key={i} onClick={() => setModalData({ label: s.label, value: s.value, sub: s.sub })}
      className={`${s.bg} rounded-2xl p-3 text-center active:scale-95 transition-transform`}>
      <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
      <p className={`text-sm font-bold tabular-nums truncate ${s.color}`}>{s.value}</p>
      <p className="text-gray-300 text-xs mt-0.5">Tap</p>
    </button>
  ))}
</div>

        {/* Search bar */}
        <div className="relative mb-3">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white shadow-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${showFilters || hasActiveFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters {hasActiveFilters && '•'}
          </button>

          {/* Type quick filters */}
          {['all', 'expense', 'income'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition capitalize ${typeFilter === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
              {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
            </button>
          ))}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <select value={catFilter} onChange={e => setCat(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="All">All Categories</option>
                  <option>Food</option><option>Transport</option><option>Shopping</option>
                  <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
                  <option>Salary</option><option>Freelance</option><option>Business</option><option>Investment</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Sort by</label>
                <select value={sortBy} onChange={e => setSort(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={() => { setType('all'); setCat('All'); setSort('newest') }}
                className="text-xs text-red-500 font-semibold hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Transactions list grouped by date */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-700 dark:text-white mb-1">No transactions found</p>
            <p className="text-gray-400 text-sm">
              {search ? 'Try a different search term' : 'Add your first expense from the Dashboard'}
            </p>
            {hasActiveFilters && (
              <button onClick={() => { setType('all'); setCat('All'); setSort('newest'); setSearch('') }}
                className="mt-4 text-indigo-600 text-sm font-semibold hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([dateLabel, txs]) => (
              <div key={dateLabel}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{dateLabel}</p>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                  <p className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                    {txs.filter(t => t.txType === 'expense').reduce((s, t) => s + safeNum(t.amount), 0) > 0
                      ? '-' + currencySymbol + txs.filter(t => t.txType === 'expense').reduce((s, t) => s + safeNum(t.amount), 0).toFixed(2)
                      : ''}
                  </p>
                </div>

                {/* Transaction rows */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                  {txs.map((tx, idx) => (
                    <div key={tx.id + '-' + tx.txType}
                      className={`flex items-center gap-3 px-4 py-3.5 group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${idx < txs.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: tx.txType === 'income' ? '#D1FAE522' : (CATEGORY_COLORS[tx.category] || '#6B7280') + '22' }}>
                        {CATEGORY_ICONS[tx.category] || (tx.txType === 'income' ? '💵' : '📦')}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {tx.description || tx.category || tx.source}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.txType === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                            {tx.category || tx.source}
                          </span>
                          {tx.is_recurring && (
                            <span className="text-xs text-purple-500">Recurring</span>
                          )}
                        </div>
                      </div>

                      {/* Amount + actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className={`font-bold text-sm tabular-nums ${tx.txType === 'income' ? 'text-green-600' : 'text-gray-800 dark:text-white'}`}>
                          {tx.txType === 'income' ? '+' : '-'}{currencySymbol}{safeNum(tx.amount).toFixed(2)}
                        </p>

                        {/* Edit / Delete — show on hover for expenses only */}
                        {tx.txType === 'expense' && (
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button onClick={() => setEditing(tx)}
                              className="text-indigo-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteExpense(tx.id)}
                              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
