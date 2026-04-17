import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Other']
const CAT_ICONS = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Other: '📦' }
const PERIODS = [{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }]

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`}>
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70">✕</button>
    </div>
  )
}

function AiModal({ budget, spent, symbol, onClose }) {
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    const limit = parseFloat(budget.amount)
    const periodLabel = budget.period === 'weekly' ? 'this week' : 'this month'
    const msg = `I've exceeded my ${budget.category} budget ${periodLabel}. My limit was ${symbol}${limit.toFixed(2)} and I've spent ${symbol}${spent.toFixed(2)} (${((spent/limit)*100).toFixed(0)}% of budget). What should I do to get back on track? Give me 3 specific actionable steps.`
    API.post('/insights/chat', { message: msg })
      .then(r => setReply(r.data.reply || r.data.message || 'No advice available.'))
      .catch(() => setReply('Unable to load AI advice right now. Try again later.'))
      .finally(() => setLoading(false))
  }, [budget, spent, symbol])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-linear-to-br from-violet-600 to-purple-700 px-6 pt-7 pb-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">🤖 AI Advice</span>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
          </div>
          <p className="text-lg font-bold">You've gone over your {budget.category} budget</p>
          <p className="text-white/70 text-sm mt-1">
            Spent {symbol}{spent.toFixed(2)} of {symbol}{parseFloat(budget.amount).toFixed(2)} limit ({budget.period})
          </p>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="space-y-2.5">
              {[1,2,3].map(i => <div key={i} className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${70 + i*10}%` }} />)}
            </div>
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{reply}</div>
          )}
          <button onClick={onClose} className="mt-5 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition">
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({ category: 'Food', period: 'monthly', name: '', amount: '' })
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [aiModal, setAiModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currencySymbol] = useState(() => {
    const stored = localStorage.getItem('currency') || 'USD'
    return CURRENCY_SYMBOLS[stored] || '$'
  })

  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([API.get('/budgets'), API.get('/expenses')])
      .then(([b, e]) => { setBudgets(b.data); setExpenses(e.data) })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    // setState only in .then/.catch callbacks — not synchronously in the effect body
    Promise.all([API.get('/budgets'), API.get('/expenses')])
      .then(([b, e]) => { setBudgets(b.data); setExpenses(e.data) })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  const getSpent = (category, period) => {
    let filtered = expenses.filter(e => e.category === category)
    if (period === 'weekly') {
      const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
      filtered = filtered.filter(e => new Date(e.date) >= weekAgo)
    } else {
      filtered = filtered.filter(e => {
        const d = new Date(e.date)
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      })
    }
    return filtered.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/budgets', form)
      setForm({ category: 'Food', period: 'monthly', name: '', amount: '' })
      setShowForm(false)
      fetchAll()
      showToast('🎯 Budget set!')
    } catch { showToast('Error saving budget', 'error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return
    try {
      await API.delete(`/budgets/${id}`)
      fetchAll(); showToast('Deleted')
    } catch { showToast('Error deleting', 'error') }
  }

  const budgetsWithSpent = budgets.map(b => {
    const spent = getSpent(b.category, b.period)
    const limit = parseFloat(b.amount)
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    return { ...b, spent, limit, pct }
  })

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0)
  const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0)
  const overCount = budgetsWithSpent.filter(b => b.pct >= 100).length

  const filtered = budgetsWithSpent.filter(b => {
    if (filterStatus === 'Over') return b.pct >= 100
    if (filterStatus === 'Warning') return b.pct >= 85 && b.pct < 100
    if (filterStatus === 'OnTrack') return b.pct < 85
    return true
  })

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {aiModal && <AiModal budget={aiModal.budget} spent={aiModal.spent} symbol={currencySymbol} onClose={() => setAiModal(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-gray-400 text-sm mt-0.5">{monthName} · Set spending limits per category</p>
        </div>

        {/* Summary Cards */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Budget', value: `${currencySymbol}${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-violet-600' },
              { label: 'Total Spent', value: `${currencySymbol}${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: totalSpent > totalBudget ? 'text-red-500' : 'text-green-600', sub: totalBudget > 0 ? `${((totalSpent/totalBudget)*100).toFixed(0)}% used` : '0% used' },
              { label: 'Over Budget', value: String(overCount), color: overCount > 0 ? 'text-red-500' : 'text-green-600', sub: overCount === 0 ? '✅ All clear' : `${overCount} over` },
            ].map((card, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
                <p className="text-xs text-gray-400 mb-1 truncate">{card.label}</p>
                <p className={`text-lg font-bold tabular-nums truncate ${card.color}`}>{card.value}</p>
                {card.sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{card.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Status filters */}
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'All', label: 'All' },
                { key: 'Over', label: '🔴 Over' },
                { key: 'Warning', label: '🟠 Warning' },
                { key: 'OnTrack', label: '✅ On Track' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    filterStatus === f.key ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={() => setShowForm(v => !v)}
              className="flex-shrink-0 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
              {showForm ? '✕ Cancel' : '+ Set Budget'}
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Period</label>
                  <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} className={inputCls}>
                    {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Limit ({currencySymbol})</label>
                  <input type="number" placeholder="e.g. 200" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required min="1" step="0.01" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Label <span className="text-gray-300">(optional)</span></label>
                  <input type="text" placeholder="e.g. Groceries" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className={inputCls} />
                </div>
              </div>
              <button type="submit" className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm">
                Save Budget
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                ⚡ Warning at 85% · 🤖 AI advice when you hit 100%
              </p>
            </form>
          )}
        </div>

        {/* Budget Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <p className="text-5xl mb-3">🎯</p>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
              {budgets.length === 0 ? 'No budgets yet' : 'No budgets match this filter'}
            </p>
            <p className="text-gray-400 text-sm">
              {budgets.length === 0 ? 'Tap "+ Set Budget" to create your first spending limit.' : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => {
              const pctCapped = Math.min(b.pct, 100)
              const isOver = b.pct >= 100
              const isWarning = b.pct >= 85 && !isOver
              const remaining = b.limit - b.spent
              const periodLabel = b.period === 'weekly' ? 'This week' : monthName

              return (
                <div key={b.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-l-4 ${
                  isOver ? 'border-red-500' : isWarning ? 'border-orange-400' : 'border-green-500'
                }`}>
                  <div className="flex items-start gap-3 mb-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{CAT_ICONS[b.category] || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                          {b.name ? b.name : b.category}
                        </h3>
                        {b.name && <span className="text-xs text-gray-400">({b.category})</span>}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          isOver ? 'bg-red-100 text-red-600' : isWarning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {isOver ? '🔴 Over' : isWarning ? '🟠 Warning' : '✅ On Track'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{periodLabel} · {b.period}</p>
                    </div>
                    <button onClick={() => handleDelete(b.id)} className="flex-shrink-0 text-gray-300 hover:text-red-400 transition p-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                    <div className={`h-2.5 rounded-full transition-all duration-500 ${
                      isOver ? 'bg-red-500' : isWarning ? 'bg-orange-400' : b.pct >= 50 ? 'bg-yellow-400' : 'bg-green-500'
                    }`} style={{ width: `${pctCapped}%` }} />
                  </div>

                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-baseline gap-1 text-sm min-w-0">
                      <span className={`font-bold tabular-nums truncate ${isOver ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                        {currencySymbol}{b.spent.toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-xs flex-shrink-0">of {currencySymbol}{b.limit.toFixed(2)}</span>
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${isOver ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-green-600'}`}>
                      {isOver
                        ? `${currencySymbol}${Math.abs(remaining).toFixed(2)} over`
                        : `${currencySymbol}${remaining.toFixed(2)} left`}
                    </span>
                  </div>

                  {/* AI advice button when over budget */}
                  {isOver && (
                    <button
                      onClick={() => setAiModal({ budget: b, spent: b.spent })}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-linear-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-700 rounded-xl text-violet-700 dark:text-violet-300 text-sm font-semibold hover:from-violet-100 hover:to-purple-100 transition">
                      <span>🤖</span>
                      <span>Get AI advice on cutting back</span>
                    </button>
                  )}

                  {/* Warning nudge at 85% */}
                  {isWarning && (
                    <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl px-3 py-2">
                      <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                        ⚠️ You're at {b.pct.toFixed(0)}% of your limit — slow down on {b.category} spending to stay on track.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
