import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const categoryIcons = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦', All: '📊' }
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Other']

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
    </div>
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
  const currencySymbol = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'
  const showToast = (message, type = 'success') => setToast({ message, type })
  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [b, e, a] = await Promise.all([
        API.get('/budgets', { headers }),
        API.get('/expenses', { headers }),
        API.get('/alerts', { headers })
      ])
      setBudgets(b.data); setExpenses(e.data); setAlerts(a.data)
    } catch { showToast('Error loading data', 'error') }
    setLoading(false)
  }

  const handleBudgetSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/budgets', budgetForm, { headers: { Authorization: `Bearer ${token}` } })
      setBudgetForm({ category: 'Food', amount: '' }); fetchAll(); showToast('🎯 Budget goal set!')
    } catch { showToast('Error saving budget', 'error') }
  }

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget goal?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/budgets/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchAll(); showToast('🗑️ Budget deleted', 'error')
    } catch { showToast('Error deleting budget', 'error') }
  }

  const handleAlertSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/alerts', alertForm, { headers: { Authorization: `Bearer ${token}` } })
      setAlertForm({ name: '', category: 'All', period: 'monthly', amount: '' }); fetchAll(); showToast('⚡ Spending alert created!')
    } catch { showToast('Error saving alert', 'error') }
  }

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Delete this alert?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/alerts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchAll(); showToast('🗑️ Alert deleted', 'error')
    } catch { showToast('Error deleting alert', 'error') }
  }

  const handleToggleAlert = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await API.patch(`/alerts/${id}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } })
      fetchAll()
    } catch { showToast('Error toggling alert', 'error') }
  }

  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })

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

  const categoryTotals = thisMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {})

  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (categoryTotals[b.category] || 0), 0)
  const overBudgetCount = budgets.filter(b => (categoryTotals[b.category] || 0) > parseFloat(b.amount)).length

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">⚡ Budget & Alerts</h1>
          <p className="text-gray-400 mt-1">Set monthly budget limits and create custom spending alerts</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
          <button onClick={() => setTab('budgets')} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'budgets' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            🎯 Budget Goals
          </button>
          <button onClick={() => setTab('alerts')} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'alerts' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            ⚡ Spending Alerts
          </button>
        </div>

        {/* BUDGET GOALS TAB */}
        {tab === 'budgets' && (
          <>
            {budgets.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
                  <p className="text-xs text-gray-400 mb-1">Total Budget</p>
                  <p className="text-2xl font-bold text-indigo-600">{currencySymbol}{totalBudget.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-1">{monthName}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
                  <p className="text-xs text-gray-400 mb-1">Total Spent</p>
                  <p className={`text-2xl font-bold ${totalSpent > totalBudget ? 'text-red-500' : 'text-green-600'}`}>{currencySymbol}{totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-1">{totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% used</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
                  <p className="text-xs text-gray-400 mb-1">Over Budget</p>
                  <p className={`text-2xl font-bold ${overBudgetCount > 0 ? 'text-red-500' : 'text-green-600'}`}>{overBudgetCount}</p>
                  <p className="text-xs text-gray-400 mt-1">{overBudgetCount === 0 ? '✅ All on track!' : `${overBudgetCount} over limit`}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Set a Budget</h2>
                  <p className="text-xs text-gray-400 mb-4">Pick a category and monthly limit</p>
                  <form onSubmit={handleBudgetSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <select value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })} className={inputCls}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Limit ({currencySymbol})</label>
                      <input type="number" placeholder="e.g. 200" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} required min="1" step="0.01" className={inputCls} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">Set Budget</button>
                  </form>
                  <div className="mt-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                    <p className="text-xs font-semibold text-indigo-600 mb-2">💡 How it works</p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <li>• Set a limit per spending category</li>
                      <li>• Get notified at 80% of your limit</li>
                      <li>• See live progress as you spend</li>
                      <li>• Resets automatically each month</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                {loading ? <div className="text-center py-20 text-gray-400">Loading...</div>
                : budgets.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                    <p className="text-6xl mb-4">🎯</p>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No budget goals yet</h3>
                    <p className="text-gray-400 text-sm">Set your first budget limit using the form to start tracking!</p>
                  </div>
                ) : budgets.map(budget => {
                  const spent = categoryTotals[budget.category] || 0
                  const limit = parseFloat(budget.amount)
                  const pct = Math.min((spent / limit) * 100, 100)
                  const isOver = spent > limit
                  const isClose = pct >= 80 && !isOver
                  return (
                    <div key={budget.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border-l-4 ${isOver ? 'border-red-500' : isClose ? 'border-orange-400' : 'border-green-500'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{categoryIcons[budget.category]}</span>
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white text-lg">{budget.category}</h3>
                            <p className="text-xs text-gray-400">{monthName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOver && <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-semibold">⚠️ Over Budget</span>}
                          {isClose && <span className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-semibold">⚡ Almost There</span>}
                          {!isOver && !isClose && <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full font-semibold">✅ On Track</span>}
                          <button onClick={() => handleDeleteBudget(budget.id)} className="text-red-400 hover:text-red-600 text-xs px-3 py-1 hover:bg-red-50 rounded-lg transition border border-red-200">🗑️</button>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Spent: <span className={`font-bold ${isOver ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>{currencySymbol}{spent.toFixed(2)}</span></span>
                        <span className="text-gray-500">Limit: <span className="font-bold text-gray-800 dark:text-white">{currencySymbol}{limit.toFixed(2)}</span></span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 mb-2">
                        <div className={`h-4 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">{pct.toFixed(0)}% used</span>
                        <span className={`text-xs font-semibold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
                          {isOver ? `${currencySymbol}${Math.abs(limit - spent).toFixed(2)} over` : `${currencySymbol}${(limit - spent).toFixed(2)} left`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* SPENDING ALERTS TAB */}
        {tab === 'alerts' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Create Alert</h2>
                <p className="text-xs text-gray-400 mb-4">Get notified when you hit your custom limit</p>
                <form onSubmit={handleAlertSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alert Name</label>
                    <input type="text" placeholder="e.g. Weekend Food" value={alertForm.name} onChange={e => setAlertForm({ ...alertForm, name: e.target.value })} required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select value={alertForm.category} onChange={e => setAlertForm({ ...alertForm, category: e.target.value })} className={inputCls}>
                      <option value="All">All Expenses</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Period</label>
                    <select value={alertForm.period} onChange={e => setAlertForm({ ...alertForm, period: e.target.value })} className={inputCls}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alert when spending reaches ({currencySymbol})</label>
                    <input type="number" placeholder="e.g. 100" value={alertForm.amount} onChange={e => setAlertForm({ ...alertForm, amount: e.target.value })} required min="1" step="0.01" className={inputCls} />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">Create Alert</button>
                </form>
                <div className="mt-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-yellow-600 mb-2">⚡ How alerts work</p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>• Choose any category or all expenses</li>
                    <li>• Pick daily, weekly or monthly window</li>
                    <li>• Get a bell notification when triggered</li>
                    <li>• Toggle alerts on/off anytime</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              {loading ? <div className="text-center py-20 text-gray-400">Loading...</div>
              : alerts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                  <p className="text-6xl mb-4">⚡</p>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No spending alerts yet</h3>
                  <p className="text-gray-400 text-sm">Create your first custom alert to get notified when you hit your spending limits!</p>
                </div>
              ) : alerts.map(alert => {
                const spent = getSpentForPeriod(alert.category, alert.period)
                const limit = parseFloat(alert.amount)
                const pct = Math.min((spent / limit) * 100, 100)
                const isTriggered = spent >= limit
                const periodLabels = { daily: 'Today', weekly: 'This Week', monthly: 'This Month' }
                return (
                  <div key={alert.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border-l-4 ${!alert.is_active ? 'border-gray-300 opacity-60' : isTriggered ? 'border-red-500' : 'border-indigo-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{categoryIcons[alert.category] || '📊'}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-white">{alert.name}</h3>
                          <p className="text-xs text-gray-400">{alert.category === 'All' ? 'All Expenses' : alert.category} · {periodLabels[alert.period]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isTriggered && alert.is_active && <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-semibold">🔔 Triggered!</span>}
                        <button onClick={() => handleToggleAlert(alert.id)} className={`text-xs px-3 py-1 rounded-lg transition border font-semibold ${alert.is_active ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                          {alert.is_active ? '✅ Active' : '⏸ Paused'}
                        </button>
                        <button onClick={() => handleDeleteAlert(alert.id)} className="text-red-400 hover:text-red-600 text-xs px-3 py-1 hover:bg-red-50 rounded-lg transition border border-red-200">🗑️</button>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Spent: <span className={`font-bold ${isTriggered ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>{currencySymbol}{spent.toFixed(2)}</span></span>
                      <span className="text-gray-500">Limit: <span className="font-bold text-gray-800 dark:text-white">{currencySymbol}{limit.toFixed(2)}</span></span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-2">
                      <div className={`h-3 rounded-full transition-all duration-500 ${isTriggered ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">{pct.toFixed(0)}% of limit reached</span>
                      <span className={`text-xs font-semibold ${isTriggered ? 'text-red-500' : 'text-indigo-600'}`}>
                        {isTriggered ? `${currencySymbol}${(spent - limit).toFixed(2)} over` : `${currencySymbol}${(limit - spent).toFixed(2)} remaining`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}