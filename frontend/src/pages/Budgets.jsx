import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Other']
const categoryIcons = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦', All: '📊' }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${
      type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'
    }`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70 ml-2">✕</button>
    </div>
  )
}

// Compact currency display — truncates if too long
function Money({ amount, symbol, className = '', size = 'base' }) {
  const formatted = `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const sizeMap = { sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl' }
  return (
    <span className={`${sizeMap[size] || 'text-base'} font-bold tabular-nums truncate block ${className}`} title={formatted}>
      {formatted}
    </span>
  )
}

export default function Budgets() {
  const [tab, setTab] = useState('budgets')
  const [budgets, setBudgets] = useState([])
  const [alerts, setAlerts] = useState([])
  const [expenses, setExpenses] = useState([])
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', amount: '' })
  const [alertForm, setAlertForm] = useState({ name: '', category: 'All', period: 'monthly', amount: '' })
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [currencySymbol, setCurrencySymbol] = useState('$')

  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [b, e, a] = await Promise.all([
        API.get('/budgets'),
        API.get('/expenses'),
        API.get('/alerts'),
      ])
      setBudgets(b.data); setExpenses(e.data); setAlerts(a.data)
    } catch { showToast('Error loading data', 'error') }
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchAll()
  }, [fetchAll])

  const handleBudgetSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/budgets', budgetForm)
      setBudgetForm({ category: 'Food', amount: '' })
      setShowBudgetForm(false)
      fetchAll()
      showToast('🎯 Budget goal set!')
    } catch { showToast('Error saving budget', 'error') }
  }

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget goal?')) return
    try {
      await API.delete(`/budgets/${id}`)
      fetchAll(); showToast('Deleted', 'error')
    } catch { showToast('Error deleting budget', 'error') }
  }

  const handleAlertSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/alerts', alertForm)
      setAlertForm({ name: '', category: 'All', period: 'monthly', amount: '' })
      setShowAlertForm(false)
      fetchAll()
      showToast('⚡ Alert created!')
    } catch { showToast('Error saving alert', 'error') }
  }

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Delete this alert?')) return
    try {
      await API.delete(`/alerts/${id}`)
      fetchAll(); showToast('Deleted', 'error')
    } catch { showToast('Error deleting alert', 'error') }
  }

  const handleToggleAlert = async (id) => {
    try {
      await API.patch(`/alerts/${id}/toggle`, {})
      fetchAll()
    } catch { showToast('Error toggling alert', 'error') }
  }

  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })

  const categoryTotals = thisMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {})

  const getSpentForPeriod = (category, period) => {
    let filtered = expenses
    if (category !== 'All') filtered = filtered.filter(e => e.category === category)
    if (period === 'daily') {
      const todayStr = today.toISOString().split('T')[0]
      filtered = filtered.filter(e => e.date?.split('T')[0] === todayStr)
    } else if (period === 'weekly') {
      const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
      filtered = filtered.filter(e => new Date(e.date) >= weekAgo)
    } else {
      filtered = filtered.filter(e => {
        const d = new Date(e.date)
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      })
    }
    return filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  }

  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (categoryTotals[b.category] || 0), 0)
  const overBudgetCount = budgets.filter(b => (categoryTotals[b.category] || 0) > parseFloat(b.amount)).length

  // Filtered budgets
  const filteredBudgets = budgets.filter(b => {
    const spent = categoryTotals[b.category] || 0
    const limit = parseFloat(b.amount)
    const isOver = spent > limit
    const isClose = (spent / limit) >= 0.8 && !isOver
    if (filterCategory !== 'All' && b.category !== filterCategory) return false
    if (filterStatus === 'Over') return isOver
    if (filterStatus === 'Close') return isClose
    if (filterStatus === 'OnTrack') return !isOver && !isClose
    return true
  })

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget & Alerts</h1>
          <p className="text-gray-400 text-sm mt-0.5">{monthName} · Set limits and get notified</p>
        </div>

        {/* ── Summary Cards ── */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Budget', value: totalBudget, color: 'text-indigo-600' },
              { label: 'Total Spent', value: totalSpent, color: totalSpent > totalBudget ? 'text-red-500' : 'text-green-600', sub: totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}% used` : '0% used' },
              { label: 'Over Budget', rawValue: overBudgetCount, color: overBudgetCount > 0 ? 'text-red-500' : 'text-green-600', sub: overBudgetCount === 0 ? '✅ All clear' : `${overBudgetCount} over` },
            ].map((card, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
                <p className="text-xs text-gray-400 mb-1 truncate">{card.label}</p>
                {card.rawValue !== undefined
                  ? <p className={`text-2xl font-bold tabular-nums ${card.color}`}>{card.rawValue}</p>
                  : <Money amount={card.value} symbol={currencySymbol} className={card.color} size="xl" />
                }
                {card.sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{card.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Bar ── */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-6 w-full">
          {[
            { key: 'budgets', label: '🎯 Budget Goals', count: budgets.length },
            { key: 'alerts', label: '⚡ Spending Alerts', count: alerts.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                tab === t.key ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <span className="truncate">{t.label}</span>
              {t.count > 0 && (
                <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            BUDGET GOALS TAB
        ══════════════════════════════════════ */}
        {tab === 'budgets' && (
          <div className="space-y-4">

            {/* Filter bar + Add button */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Category filter */}
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>

                {/* Status filter */}
                <div className="flex gap-1">
                  {['All', 'Over', 'Close', 'OnTrack'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        filterStatus === s
                          ? s === 'Over' ? 'bg-red-100 text-red-600' : s === 'Close' ? 'bg-orange-100 text-orange-600' : s === 'OnTrack' ? 'bg-green-100 text-green-600' : 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700'
                      }`}>
                      {s === 'OnTrack' ? '✅ On Track' : s === 'Over' ? '⚠️ Over' : s === 'Close' ? '⚡ Close' : 'All'}
                    </button>
                  ))}
                </div>

                {/* Spacer + Add button */}
                <div className="flex-1" />
                <button onClick={() => setShowBudgetForm(v => !v)}
                  className="flex-shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                  {showBudgetForm ? '✕ Cancel' : '+ Set Budget'}
                </button>
              </div>

              {/* Inline form */}
              {showBudgetForm && (
                <form onSubmit={handleBudgetSubmit} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Category</label>
                      <select value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })} className={inputCls}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Monthly Limit ({currencySymbol})</label>
                      <input type="number" placeholder="e.g. 200" value={budgetForm.amount}
                        onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                        required min="1" step="0.01" className={inputCls} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition text-sm">
                    Set Budget Goal
                  </button>
                  <div className="mt-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      💡 You'll be alerted at <strong>80%</strong> of your limit and when you go over. Budgets track this month's expenses automatically.
                    </p>
                  </div>
                </form>
              )}
            </div>

            {/* Budget Cards */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
              </div>
            ) : filteredBudgets.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-5xl mb-3">🎯</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  {budgets.length === 0 ? 'No budget goals yet' : 'No budgets match filters'}
                </p>
                <p className="text-gray-400 text-sm">
                  {budgets.length === 0 ? 'Set your first limit above to start tracking.' : 'Try adjusting the filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBudgets.map(budget => {
                  const spent = categoryTotals[budget.category] || 0
                  const limit = parseFloat(budget.amount)
                  const pct = Math.min((spent / limit) * 100, 100)
                  const isOver = spent > limit
                  const isClose = pct >= 80 && !isOver
                  const remaining = limit - spent

                  return (
                    <div key={budget.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-l-4 ${
                      isOver ? 'border-red-500' : isClose ? 'border-orange-400' : 'border-green-500'
                    }`}>
                      <div className="flex items-start gap-3 mb-4 min-w-0">
                        <span className="text-2xl flex-shrink-0">{categoryIcons[budget.category]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="font-semibold text-gray-800 dark:text-white truncate">{budget.category}</h3>
                            <span className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              isOver ? 'bg-red-100 text-red-600' : isClose ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {isOver ? '⚠️ Over' : isClose ? '⚡ Close' : '✅ On Track'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{monthName}</p>
                        </div>
                        <button onClick={() => handleDeleteBudget(budget.id)}
                          className="flex-shrink-0 text-gray-300 hover:text-red-400 transition p-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${
                          isOver ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-green-500'
                        }`} style={{ width: `${pct}%` }} />
                      </div>

                      {/* Amounts row — truncation safe */}
                      <div className="flex items-baseline justify-between gap-2 min-w-0">
                        <div className="flex items-baseline gap-1 min-w-0 flex-1">
                          <span className="text-xs text-gray-400 flex-shrink-0">Spent</span>
                          <Money amount={spent} symbol={currencySymbol} size="sm"
                            className={`flex-1 min-w-0 ${isOver ? 'text-red-500' : 'text-gray-800 dark:text-white'}`} />
                        </div>
                        <div className="flex items-baseline gap-1 min-w-0 flex-1 justify-center">
                          <span className="text-xs text-gray-400 flex-shrink-0">of</span>
                          <Money amount={limit} symbol={currencySymbol} size="sm"
                            className="flex-1 min-w-0 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className={`text-xs font-semibold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
                            {isOver ? '+' : ''}{isOver ? `${currencySymbol}${Math.abs(remaining).toFixed(2)} over` : `${currencySymbol}${remaining.toFixed(2)} left`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            SPENDING ALERTS TAB
        ══════════════════════════════════════ */}
        {tab === 'alerts' && (
          <div className="space-y-4">

            {/* Filter bar + Add button */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Period filter */}
                <div className="flex gap-1">
                  {['All', 'daily', 'weekly', 'monthly'].map(p => (
                    <button key={p} onClick={() => setFilterCategory(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${
                        filterCategory === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>

                {/* Status filter */}
                <div className="flex gap-1">
                  {[{ key: 'All', label: 'All' }, { key: 'Active', label: '✅ Active' }, { key: 'Paused', label: '⏸ Paused' }, { key: 'Triggered', label: '🔔 Triggered' }].map(s => (
                    <button key={s.key} onClick={() => setFilterStatus(s.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        filterStatus === s.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1" />
                <button onClick={() => setShowAlertForm(v => !v)}
                  className="flex-shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                  {showAlertForm ? '✕ Cancel' : '+ New Alert'}
                </button>
              </div>

              {/* Inline alert form */}
              {showAlertForm && (
                <form onSubmit={handleAlertSubmit} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Alert Name</label>
                      <input type="text" placeholder="e.g. Weekend Food" value={alertForm.name}
                        onChange={e => setAlertForm({ ...alertForm, name: e.target.value })}
                        required className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Category</label>
                      <select value={alertForm.category} onChange={e => setAlertForm({ ...alertForm, category: e.target.value })} className={inputCls}>
                        <option value="All">All Expenses</option>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Period</label>
                      <select value={alertForm.period} onChange={e => setAlertForm({ ...alertForm, period: e.target.value })} className={inputCls}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                        Alert when spending reaches ({currencySymbol})
                      </label>
                      <input type="number" placeholder="e.g. 100" value={alertForm.amount}
                        onChange={e => setAlertForm({ ...alertForm, amount: e.target.value })}
                        required min="1" step="0.01" className={inputCls} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition text-sm">
                    Create Alert
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    ⚡ You'll get a bell notification when this limit is reached
                  </p>
                </form>
              )}
            </div>

            {/* Alert Cards */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
              </div>
            ) : alerts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-5xl mb-3">⚡</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No spending alerts yet</p>
                <p className="text-gray-400 text-sm">Create a custom alert to get notified when you hit your limits.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts
                  .filter(a => {
                    const spent = getSpentForPeriod(a.category, a.period)
                    const isTriggered = spent >= parseFloat(a.amount)
                    if (filterCategory !== 'All' && a.period !== filterCategory) return false
                    if (filterStatus === 'Active') return a.is_active
                    if (filterStatus === 'Paused') return !a.is_active
                    if (filterStatus === 'Triggered') return isTriggered && a.is_active
                    return true
                  })
                  .map(alert => {
                    const spent = getSpentForPeriod(alert.category, alert.period)
                    const limit = parseFloat(alert.amount)
                    const pct = Math.min((spent / limit) * 100, 100)
                    const isTriggered = spent >= limit
                    const periodLabels = { daily: 'Today', weekly: 'This Week', monthly: 'This Month' }

                    return (
                      <div key={alert.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-l-4 transition ${
                        !alert.is_active ? 'border-gray-200 opacity-60' : isTriggered ? 'border-red-500' : 'border-indigo-500'
                      }`}>
                        <div className="flex items-start gap-3 mb-4 min-w-0">
                          <span className="text-2xl flex-shrink-0">{categoryIcons[alert.category] || '📊'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-white truncate">{alert.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {alert.category === 'All' ? 'All Expenses' : alert.category} · {periodLabels[alert.period]}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isTriggered && alert.is_active && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">🔔</span>
                            )}
                            <button onClick={() => handleToggleAlert(alert.id)}
                              className={`text-xs px-2.5 py-1 rounded-lg transition border font-semibold ${
                                alert.is_active ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                              }`}>
                              {alert.is_active ? 'On' : 'Off'}
                            </button>
                            <button onClick={() => handleDeleteAlert(alert.id)}
                              className="text-gray-300 hover:text-red-400 transition p-1">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                          <div className={`h-2.5 rounded-full transition-all duration-500 ${
                            isTriggered ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-indigo-500'
                          }`} style={{ width: `${pct}%` }} />
                        </div>

                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <div className="flex items-baseline gap-1 min-w-0 flex-1">
                            <span className="text-xs text-gray-400 flex-shrink-0">Spent</span>
                            <Money amount={spent} symbol={currencySymbol} size="sm"
                              className={`flex-1 min-w-0 ${isTriggered ? 'text-red-500' : 'text-gray-800 dark:text-white'}`} />
                          </div>
                          <div className="flex items-baseline gap-1 min-w-0 flex-1 justify-center">
                            <span className="text-xs text-gray-400 flex-shrink-0">of</span>
                            <Money amount={limit} symbol={currencySymbol} size="sm"
                              className="flex-1 min-w-0 text-gray-600 dark:text-gray-300" />
                          </div>
                          <span className={`flex-shrink-0 text-xs font-semibold ${isTriggered ? 'text-red-500' : 'text-indigo-600'}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
