import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Other']
const CAT_ICONS = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
const PERIODS = [{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }]

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`}>
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70">✕</button>
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
    const pct = ((spent / limit) * 100).toFixed(0)
    const periodLabel = budget.period === 'weekly' ? 'this week' : 'this month'
    const isOver = spent >= limit
    const msg = isOver
      ? `I've exceeded my ${budget.category} budget ${periodLabel}. My limit was ${symbol}${limit.toFixed(2)} and I've spent ${symbol}${spent.toFixed(2)} (${pct}% used). What should I do to get back on track? Give me 3 specific actionable steps.`
      : `I'm at ${pct}% of my ${budget.category} budget ${periodLabel}. My limit is ${symbol}${limit.toFixed(2)} and I've spent ${symbol}${spent.toFixed(2)} so far. I still have ${symbol}${(limit - spent).toFixed(2)} left. Give me 3 practical tips to stay under my limit for the rest of the ${budget.period === 'weekly' ? 'week' : 'month'}.`
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
          <p className="text-lg font-bold">
            {spent >= parseFloat(budget.amount) ? `Over budget: ${budget.category}` : `Heads up: ${budget.category} budget`}
          </p>
          <p className="text-white/70 text-sm mt-1">
            {symbol}{spent.toFixed(2)} of {symbol}{parseFloat(budget.amount).toFixed(2)} · {((spent/parseFloat(budget.amount))*100).toFixed(0)}% used · {budget.period}
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
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [aiModal, setAiModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formAiLoading, setFormAiLoading] = useState(false)
  const [numModal, setNumModal] = useState(null)
  const [formAiSuggestion, setFormAiSuggestion] = useState('')
  const [currencySymbol] = useState(() => {
    const stored = localStorage.getItem('currency') || 'USD'
    return CURRENCY_SYMBOLS[stored] || '$'
  })

  // Bills tab
  const [activeTab, setActiveTab]     = useState('budgets')
  const [showBillForm, setShowBillForm] = useState(false)
  const [billForm, setBillForm]        = useState({ name: '', amount: '', dueDay: '', emoji: '🏠' })
  const [billSaving, setBillSaving]    = useState(false)
  const BILLS_KEY = 'spendly_bills'
  const [bills, setBillsState]         = useState(() => { try { return JSON.parse(localStorage.getItem('spendly_bills') || '[]') } catch { return [] } })

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

  const getLastMonthSpent = (category) => {
    const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1
    const prevYear  = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
    return expenses
      .filter(e => { const d = new Date(e.date); return d.getMonth() === prevMonth && d.getFullYear() === prevYear && e.category === category })
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  }

  const getFormAiAdvice = async () => {
    setFormAiLoading(true)
    setFormAiSuggestion('')
    const spent = getSpent(form.category, form.period)
    const periodLabel = form.period === 'weekly' ? 'weekly' : 'monthly'
    const msg = `I want to set a ${periodLabel} budget for ${form.category}. I've spent ${currencySymbol}${spent.toFixed(2)} on ${form.category} ${form.period === 'weekly' ? 'this week' : 'this month'}. What's a realistic and healthy ${periodLabel} budget limit I should set? Reply in 2 sentences max with a specific number suggestion.`
    try {
      const res = await API.post('/insights/chat', { message: msg })
      setFormAiSuggestion(res.data.reply || '')
    } catch { setFormAiSuggestion('Unable to get suggestion right now.') }
    setFormAiLoading(false)
  }

  // ── Bill helpers ────────────────────────────────────────
  const paidKey = `spendly_paid_bills_${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`
  const paidBills = (() => { try { return JSON.parse(localStorage.getItem(paidKey) || '[]') } catch { return [] } })()

  const saveBills = (updated) => {
    setBillsState(updated)
    localStorage.setItem(BILLS_KEY, JSON.stringify(updated))
  }

  const daysUntilDue = (dueDay) => {
    const now = new Date()
    const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), dueDay)
    if (thisMonthDue >= now) return Math.ceil((thisMonthDue - now) / 864e5)
    return Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, dueDay) - now) / 864e5)
  }

  const markPaid = (id) => {
    const updated = [...paidBills, id]
    localStorage.setItem(paidKey, JSON.stringify(updated))
    setBillsState([...bills]) // force re-render
  }

  const unmarkPaid = (id) => {
    const updated = paidBills.filter(p => p !== id)
    localStorage.setItem(paidKey, JSON.stringify(updated))
    setBillsState([...bills])
  }

  const handleAddBill = (e) => {
    e.preventDefault()
    if (billSaving) return
    setBillSaving(true)
    const newBill = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: billForm.name.trim(),
      amount: billForm.amount,
      dueDay: parseInt(billForm.dueDay),
      emoji: billForm.emoji,
    }
    saveBills([...bills, newBill])
    setBillForm({ name: '', amount: '', dueDay: '', emoji: '🏠' })
    setShowBillForm(false)
    showToast('📅 Bill added!')
    setBillSaving(false)
  }

  const handleDeleteBill = (id) => {
    if (!window.confirm('Remove this bill?')) return
    saveBills(bills.filter(b => b.id !== id))
    showToast('Removed')
  }

  const upcomingBillCount = bills.filter(b => !paidBills.includes(b.id) && daysUntilDue(b.dueDay) <= 7).length
  const BILL_EMOJIS = ['🏠', '🚗', '💡', '💧', '📱', '🌐', '💳', '🏥', '🎓', '🎵', '🍕', '🛒']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await API.post('/budgets', form)
      setForm({ category: 'Food', period: 'monthly', name: '', amount: '' })
      setFormAiSuggestion('')
      setShowForm(false)
      fetchAll()
      showToast('🎯 Budget set!')
    } catch { showToast('Error saving budget', 'error') }
    finally { setSaving(false) }
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
          <p className="text-gray-400 text-sm mt-0.5">{monthName} · Spending limits & bill reminders</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-2xl mb-6">
          <button onClick={() => setActiveTab('budgets')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'budgets' ? 'bg-white dark:bg-gray-800 text-violet-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            🎯 Spending Budgets
          </button>
          <button onClick={() => setActiveTab('bills')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 ${activeTab === 'bills' ? 'bg-white dark:bg-gray-800 text-violet-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            📅 Bills
            {upcomingBillCount > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{upcomingBillCount}</span>}
          </button>
        </div>

        {activeTab === 'budgets' && <>
        {/* Summary Cards */}
        {numModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setNumModal(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{numModal.label}</p>
              <p className="text-4xl font-bold text-violet-600 tabular-nums break-all leading-tight">{numModal.value}</p>
              {numModal.sub && <p className="text-sm text-gray-400 mt-2">{numModal.sub}</p>}
              <button onClick={() => setNumModal(null)} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-bold hover:bg-violet-700 transition">Done</button>
            </div>
          </div>
        )}
        {budgets.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: 'Total Budget', value: `${currencySymbol}${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, textColor: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30', icon: '📊' },
              { label: 'Total Spent',  value: `${currencySymbol}${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: totalBudget > 0 ? `${((totalSpent/totalBudget)*100).toFixed(0)}% used` : '0% used', textColor: totalSpent > totalBudget ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400', bg: totalSpent > totalBudget ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30' : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30', icon: totalSpent > totalBudget ? '💸' : '✅' },
              { label: 'Over Limit',   value: String(overCount), sub: overCount === 0 ? 'All under budget' : `${overCount} exceeded`, textColor: overCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400', bg: overCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30' : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30', icon: overCount > 0 ? '⚠️' : '🎯' },
            ].map((card, i) => (
              <button key={i} onClick={() => setNumModal({ label: card.label, value: card.value, sub: card.sub })}
                className={`${card.bg} rounded-2xl p-3 sm:p-4 min-w-0 text-left active:scale-95 transition-transform`}>
                <p className="text-base mb-1">{card.icon}</p>
                <p className={`text-sm sm:text-lg font-bold tabular-nums truncate ${card.textColor}`}>{card.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{card.label}</p>
                {card.sub && <p className={`text-[10px] sm:text-xs mt-0.5 truncate ${card.textColor} opacity-70`}>{card.sub}</p>}
              </button>
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
              className="shrink-0 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium">Limit ({currencySymbol})</label>
                    <button type="button" onClick={getFormAiAdvice} disabled={formAiLoading}
                      className="text-[10px] font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-2 py-1 rounded-full hover:bg-violet-100 transition disabled:opacity-50 flex items-center gap-1">
                      {formAiLoading ? <><div className="w-2.5 h-2.5 border border-violet-400 border-t-violet-600 rounded-full animate-spin"/>Thinking…</> : '✨ Ask AI'}
                    </button>
                  </div>
                  <input type="number" placeholder="e.g. 200" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required min="1" step="0.01" className={inputCls} />
                  {formAiSuggestion && (
                    <div className="mt-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-xl px-3 py-2">
                      <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">{formAiSuggestion}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Label <span className="text-gray-300">(optional)</span></label>
                  <input type="text" placeholder="e.g. Groceries" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className={inputCls} />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Budget'}
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
              const lastMonthSpent = b.period === 'monthly' ? getLastMonthSpent(b.category) : null
              const lastMonthRollover = lastMonthSpent !== null ? b.limit - lastMonthSpent : null

              return (
                <div key={b.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-l-4 ${
                  isOver ? 'border-red-500' : isWarning ? 'border-orange-400' : 'border-green-500'
                }`}>
                  <div className="flex items-start gap-3 mb-3 min-w-0">
                    <span className="text-2xl shrink-0">{CAT_ICONS[b.category] || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                          {b.name ? b.name : b.category}
                        </h3>
                        {b.name && <span className="text-xs text-gray-400">({b.category})</span>}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${
                          isOver ? 'bg-red-100 text-red-600' : isWarning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {isOver ? '🔴 Over' : isWarning ? '🟠 Warning' : '✅ On Track'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{periodLabel} · {b.period}</p>
                    </div>
                    <button onClick={() => handleDelete(b.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition p-1">
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
                      <span className="text-gray-400 text-xs shrink-0">of {currencySymbol}{b.limit.toFixed(2)}</span>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${isOver ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-green-600'}`}>
                      {isOver
                        ? `${currencySymbol}${Math.abs(remaining).toFixed(2)} over`
                        : `${currencySymbol}${remaining.toFixed(2)} left`}
                    </span>
                  </div>
                  {lastMonthRollover !== null && (
                    <p className={`text-xs mt-1.5 ${lastMonthRollover >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {lastMonthRollover >= 0
                        ? `↩ Last month: ${currencySymbol}${lastMonthRollover.toFixed(2)} unspent`
                        : `↩ Last month: ${currencySymbol}${Math.abs(lastMonthRollover).toFixed(2)} over budget`}
                    </p>
                  )}

                  {/* AI advice button when over budget */}
                  {isOver && (
                    <button
                      onClick={() => setAiModal({ budget: b, spent: b.spent })}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-linear-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-700 rounded-xl text-violet-700 dark:text-violet-300 text-sm font-semibold hover:from-violet-100 hover:to-purple-100 transition">
                      <span>🤖</span>
                      <span>Get AI advice on cutting back</span>
                    </button>
                  )}

                  {/* Warning at 85% — with AI tips button */}
                  {isWarning && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl px-3 py-2">
                        <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                          ⚠️ You're at {b.pct.toFixed(0)}% of your {b.category} limit — only {currencySymbol}{remaining.toFixed(2)} left.
                        </p>
                      </div>
                      <button
                        onClick={() => setAiModal({ budget: b, spent: b.spent })}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 text-xs font-medium hover:border-violet-300 hover:text-violet-600 transition">
                        🤖 Ask AI how to stay under budget
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </> /* end budgets tab */}

        {/* ── BILLS TAB ─────────────────────────────────────── */}
        {activeTab === 'bills' && (
          <div>
            {/* Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl p-5 mb-5 flex gap-3">
              <span className="text-2xl shrink-0">📅</span>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Track your fixed monthly bills</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                  Add recurring payments like rent, utilities, or phone bills with their due date.
                  Bills due within 7 days will show up as a reminder on your <strong>Dashboard</strong> automatically.
                  This is separate from savings goals and debt — it's just so you're never caught off guard. 😊
                </p>
              </div>
            </div>

            {/* Summary + Add button */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {bills.length} bill{bills.length !== 1 ? 's' : ''} ·{' '}
                  <span className="text-violet-600">{currencySymbol}{bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0).toFixed(2)}/mo</span>
                </p>
              </div>
              <button onClick={() => setShowBillForm(v => !v)}
                className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
                {showBillForm ? '✕ Cancel' : '+ Add Bill'}
              </button>
            </div>

            {/* Add bill form */}
            {showBillForm && (
              <form onSubmit={handleAddBill} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4 border border-violet-100 dark:border-violet-800/40">
                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-4">New bill</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Bill name</label>
                    <input type="text" placeholder="e.g. Rent, Electricity, Phone"
                      value={billForm.name} onChange={e => setBillForm({ ...billForm, name: e.target.value })}
                      required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Amount ({currencySymbol})</label>
                    <input type="number" placeholder="e.g. 800" min="0.01" step="0.01"
                      value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: e.target.value })}
                      required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Due day of month</label>
                    <input type="number" placeholder="1–28" min="1" max="28"
                      value={billForm.dueDay} onChange={e => setBillForm({ ...billForm, dueDay: e.target.value })}
                      required className={inputCls} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Pick an icon</label>
                  <div className="flex flex-wrap gap-2">
                    {BILL_EMOJIS.map(em => (
                      <button key={em} type="button" onClick={() => setBillForm({ ...billForm, emoji: em })}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition ${billForm.emoji === em ? 'bg-violet-100 dark:bg-violet-900/40 ring-2 ring-violet-500' : 'bg-gray-100 dark:bg-gray-700 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={billSaving}
                  className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm disabled:opacity-60">
                  {billSaving ? 'Saving…' : '📅 Save Bill'}
                </button>
              </form>
            )}

            {/* Bills list */}
            {bills.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-5xl mb-3">📭</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No bills yet</p>
                <p className="text-gray-400 text-sm">Add a bill above and it'll show as a reminder on your Dashboard when it's due soon.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...bills]
                  .map(b => ({ ...b, days: daysUntilDue(b.dueDay), isPaid: paidBills.includes(b.id) }))
                  .sort((a, b) => a.days - b.days)
                  .map(b => {
                    const isDueSoon = b.days <= 7 && !b.isPaid
                    const isOverdue = b.days === 0 && !b.isPaid
                    return (
                      <div key={b.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4 border-l-4 ${b.isPaid ? 'border-green-400 opacity-70' : isDueSoon ? 'border-amber-400' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="w-11 h-11 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl shrink-0">
                          {b.emoji || '📅'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${b.isPaid ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white'}`}>{b.name}</p>
                          <p className={`text-xs font-medium mt-0.5 ${b.isPaid ? 'text-green-500' : isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                            {b.isPaid ? '✅ Paid this month' : isOverdue ? '⚠️ Due today' : `Due in ${b.days} day${b.days !== 1 ? 's' : ''} (day ${b.dueDay})`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-800 dark:text-white tabular-nums text-sm">{currencySymbol}{parseFloat(b.amount || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => b.isPaid ? unmarkPaid(b.id) : markPaid(b.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition ${b.isPaid ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'}`}>
                            {b.isPaid ? 'Undo' : 'Paid'}
                          </button>
                          <button onClick={() => handleDeleteBill(b.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            Remove
                          </button>
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
