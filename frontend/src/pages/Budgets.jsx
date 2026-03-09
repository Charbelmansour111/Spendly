import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const categoryIcons = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
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
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({ category: 'Food', amount: '' })
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
      const [b, e] = await Promise.all([
        API.get('/budgets', { headers }),
        API.get('/expenses', { headers })
      ])
      setBudgets(b.data)
      setExpenses(e.data)
    } catch { showToast('Error loading data', 'error') }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/budgets', form, { headers: { Authorization: `Bearer ${token}` } })
      setForm({ category: 'Food', amount: '' })
      fetchAll()
      showToast('🎯 Budget goal set!')
    } catch { showToast('Error saving budget', 'error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget goal?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/budgets/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchAll()
      showToast('🗑️ Budget deleted', 'error')
    } catch { showToast('Error deleting budget', 'error') }
  }

  // Current month expenses only
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })

  const categoryTotals = thisMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {})

  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (categoryTotals[b.category] || 0), 0)
  const overBudgetCount = budgets.filter(b => (categoryTotals[b.category] || 0) > parseFloat(b.amount)).length

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🎯 Budget Goals</h1>
          <p className="text-gray-400 mt-1">Set monthly spending limits per category and track your progress</p>
        </div>

        {/* Summary Cards */}
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
              <p className="text-xs text-gray-400 mt-1">{((totalSpent / totalBudget) * 100).toFixed(0)}% used</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">Over Budget</p>
              <p className={`text-2xl font-bold ${overBudgetCount > 0 ? 'text-red-500' : 'text-green-600'}`}>{overBudgetCount}</p>
              <p className="text-xs text-gray-400 mt-1">{overBudgetCount === 0 ? '✅ All on track!' : `${overBudgetCount} categor${overBudgetCount > 1 ? 'ies' : 'y'} over`}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Set Budget Form */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Set a Budget</h2>
              <p className="text-xs text-gray-400 mb-5">Choose a category and set your monthly spending limit</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Limit ({currencySymbol})</label>
                  <input type="number" placeholder="e.g. 200" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" step="0.01" className={inputCls} />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
                  Set Budget
                </button>
              </form>

              {/* Help box */}
              <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">💡 How it works</p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Set a limit for any spending category</li>
                  <li>• Get alerted at 80% of your limit</li>
                  <li>• See live progress as you spend</li>
                  <li>• Resets automatically each month</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Budget List */}
          <div className="md:col-span-2">
            {loading ? (
              <div className="text-center py-20 text-gray-400">Loading...</div>
            ) : budgets.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-6xl mb-4">🎯</p>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No budget goals yet</h3>
                <p className="text-gray-400 text-sm">Set your first budget limit using the form on the left to start tracking your spending!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map(budget => {
                  const spent = categoryTotals[budget.category] || 0
                  const limit = parseFloat(budget.amount)
                  const pct = Math.min((spent / limit) * 100, 100)
                  const isOver = spent > limit
                  const isClose = pct >= 80 && !isOver
                  const remaining = limit - spent

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
                        <div className="flex items-center gap-3">
                          {isOver && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-3 py-1 rounded-full font-semibold">⚠️ Over Budget</span>}
                          {isClose && <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-3 py-1 rounded-full font-semibold">⚡ Almost There</span>}
                          {!isOver && !isClose && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-3 py-1 rounded-full font-semibold">✅ On Track</span>}
                          <button onClick={() => handleDelete(budget.id)} className="text-red-400 hover:text-red-600 text-xs px-3 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition border border-red-200 dark:border-red-800">🗑️ Delete</button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500 dark:text-gray-400">Spent: <span className={`font-bold ${isOver ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>{currencySymbol}{spent.toFixed(2)}</span></span>
                          <span className="text-gray-500 dark:text-gray-400">Limit: <span className="font-bold text-gray-800 dark:text-white">{currencySymbol}{limit.toFixed(2)}</span></span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-gray-400">{pct.toFixed(0)}% used</span>
                          <span className={`text-xs font-semibold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
                            {isOver ? `${currencySymbol}${Math.abs(remaining).toFixed(2)} over` : `${currencySymbol}${remaining.toFixed(2)} left`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}