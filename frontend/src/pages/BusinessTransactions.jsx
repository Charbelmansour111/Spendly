import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">x</button>
    </div>
  )
}

export default function BusinessTransactions() {
  const [revenue, setRevenue]     = useState([])
  const [expenses, setExpenses]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [symbol, setSymbol]       = useState('$')
  const [toast, setToast]         = useState(null)
  const [typeFilter, setType]     = useState('all')
  const [search, setSearch]       = useState('')

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.account_type !== 'business') { window.location.href = '/dashboard'; return }
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [r, e] = await Promise.all([API.get('/business/revenue'), API.get('/business/expenses')])
      setRevenue(r.data || [])
      setExpenses(e.data || [])
    } catch { showToast('Error loading transactions', 'error') }
    setLoading(false)
  }

  const handleDeleteRevenue = async (id) => {
    if (!window.confirm('Delete this revenue entry?')) return
    try { await API.delete('/business/revenue/' + id); fetchAll(); showToast('Deleted', 'error') } catch {}
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try { await API.delete('/expenses/' + id); fetchAll(); showToast('Deleted', 'error') } catch {}
  }

  // Merge into one feed
  const allTx = [
    ...revenue.map(r  => ({ ...r,  txType: 'revenue',  date: r.date,       amount: r.total_revenue, label: r.notes || 'Daily Revenue' })),
    ...expenses.map(e => ({ ...e,  txType: 'expense',  date: e.date,       amount: e.amount,        label: e.description || e.category })),
  ].filter(tx => {
    if (typeFilter !== 'all' && tx.txType !== typeFilter) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      return (tx.label || '').toLowerCase().includes(s) || (tx.category || '').toLowerCase().includes(s)
    }
    return true
  }).sort((a, b) => new Date(b.date) - new Date(a.date))

  // Group by date
  const grouped = allTx.reduce((acc, tx) => {
    const d    = new Date(tx.date)
    const now  = new Date()
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? diff + ' days ago' : d.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })
    if (!acc[label]) acc[label] = []
    acc[label].push(tx)
    return acc
  }, {})

  const totalRevenue  = revenue.reduce((s, r) => s + safeNum(r.total_revenue), 0)
  const totalExpenses = expenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const netProfit     = totalRevenue - totalExpenses

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto px-4 py-6">

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Transactions</h1>
          <p className="text-gray-400 text-sm mt-0.5">{allTx.length} transactions</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Revenue',  value: fmt(totalRevenue, symbol),  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Expenses', value: fmt(totalExpenses, symbol), color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Net',      value: fmt(Math.abs(netProfit), symbol), color: netProfit >= 0 ? 'text-orange-600' : 'text-red-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-3 text-center`}>
              <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
              <p className={`text-sm font-bold tabular-nums truncate ${s.color}`}>{netProfit < 0 && s.label === 'Net' ? '-' : ''}{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white shadow-sm" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5">
          {['all', 'revenue', 'expense'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition capitalize ${typeFilter === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
              {t === 'all' ? 'All' : t === 'revenue' ? 'Revenue' : 'Expenses'}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : allTx.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold text-gray-700 dark:text-white mb-1">No transactions found</p>
            <p className="text-gray-400 text-sm">Add revenue and expenses from the dashboard</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([dateLabel, txs]) => {
              const dayRevenue  = txs.filter(t => t.txType === 'revenue').reduce((s, t) => s + safeNum(t.amount), 0)
              const dayExpenses = txs.filter(t => t.txType === 'expense').reduce((s, t) => s + safeNum(t.amount), 0)
              const dayNet = dayRevenue - dayExpenses
              return (
                <div key={dateLabel}>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{dateLabel}</p>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                    {dayRevenue > 0 && <p className="text-xs text-green-600 font-semibold tabular-nums">+{fmt(dayRevenue, symbol)}</p>}
                    {dayExpenses > 0 && <p className="text-xs text-red-500 font-semibold tabular-nums">-{fmt(dayExpenses, symbol)}</p>}
                    {dayRevenue > 0 && dayExpenses > 0 && (
                      <p className={`text-xs font-bold tabular-nums ${dayNet >= 0 ? 'text-orange-600' : 'text-red-500'}`}>
                        ={dayNet >= 0 ? '+' : ''}{fmt(dayNet, symbol)}
                      </p>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    {txs.map((tx, idx) => (
                      <div key={tx.id + '-' + tx.txType}
                        className={`flex items-center gap-3 px-4 py-3.5 group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${idx < txs.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${tx.txType === 'revenue' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/20'}`}>
                          {tx.txType === 'revenue' ? '💵' : tx.category === 'Ingredients' ? '🥩' : tx.category === 'Staff' ? '👥' : tx.category === 'Rent' ? '🏠' : '🧾'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{tx.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.txType === 'revenue' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                              {tx.txType === 'revenue' ? 'Revenue' : tx.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className={`font-bold text-sm tabular-nums ${tx.txType === 'revenue' ? 'text-green-600' : 'text-red-500'}`}>
                            {tx.txType === 'revenue' ? '+' : '-'}{fmt(tx.amount, symbol)}
                          </p>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button onClick={() => tx.txType === 'revenue' ? handleDeleteRevenue(tx.id) : handleDeleteExpense(tx.id)}
                              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}