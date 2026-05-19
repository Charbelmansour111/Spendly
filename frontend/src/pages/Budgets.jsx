import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import BudgetSuggestionsSheet from '../components/BudgetSuggestionsSheet'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const CATEGORIES = ['Food', 'Coffee', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Fitness', 'Education', 'Travel', 'Gifts', 'Subscriptions', 'Other']
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦' }
const PERIODS = [{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }, { value: 'daily', label: 'Daily' }]

const haptic = (ms = 10) => navigator.vibrate?.(ms)

function SwipeRow({ onDelete, children }) {
  const [swiped, setSwiped] = useState(false)
  const [startX, setStartX] = useState(null)
  const [liveOffset, setLiveOffset] = useState(0)
  const REVEAL = 76
  const THRESHOLD = 60

  const onTouchStart = e => setStartX(e.touches[0].clientX)
  const onTouchMove = e => {
    if (startX === null) return
    const d = startX - e.touches[0].clientX
    if (d > 0) setLiveOffset(Math.min(d, REVEAL + 20))
    else if (d < -20 && swiped) { setSwiped(false); setLiveOffset(0) }
  }
  const onTouchEnd = () => {
    if (liveOffset >= THRESHOLD) { haptic(12); setSwiped(true); setLiveOffset(REVEAL) }
    else { setSwiped(false); setLiveOffset(0) }
    setStartX(null)
  }
  const handleConfirmDelete = () => { haptic(20); setSwiped(false); setLiveOffset(0); onDelete() }
  const handleSnapBack = () => { setSwiped(false); setLiveOffset(0) }
  const displayOffset = swiped ? REVEAL : liveOffset

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: REVEAL, opacity: displayOffset > 4 ? 1 : 0 }}>
        <button onClick={handleConfirmDelete}
          className="flex-1 bg-red-500 active:bg-red-600 flex flex-col items-center justify-center gap-0.5 transition-colors rounded-r-2xl">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
          </svg>
          <span className="text-[9px] text-white font-bold tracking-wide">Delete</span>
        </button>
      </div>
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={swiped ? handleSnapBack : undefined}
        style={{ transform: `translateX(-${displayOffset}px)`, transition: startX === null ? 'transform 0.22s ease' : 'none' }}>
        {children}
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-16 md:top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`}>
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70">✕</button>
    </div>
  )
}

function AiModal({ budget, spent, symbol, onClose }) {
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(true)
  const fetched = useRef(false)

  const limit = parseFloat(budget.amount)
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0
  const remaining = Math.max(0, limit - spent)
  const isOver = pct >= 100
  const isWarning = !isOver && pct >= 85
  const isGood = pct < 60

  const gradient = isOver
    ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
    : isWarning
    ? 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)'
    : isGood
    ? 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
    : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'

  const icon = CAT_ICONS[budget.category] || '📦'
  const periodLabel = budget.period === 'daily' ? 'today' : budget.period === 'weekly' ? 'this week' : 'this month'
  const periodEnd = budget.period === 'daily' ? 'day' : budget.period === 'weekly' ? 'week' : 'month'

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    let msg
    if (isOver) {
      msg = `My ${budget.category} budget is ${symbol}${limit.toFixed(2)} for the ${periodEnd}. I've spent ${symbol}${spent.toFixed(2)} — ${pct}% of my limit, ${symbol}${(spent - limit).toFixed(2)} over. Give me TWO specific, practical tips to get back on track this ${periodEnd}. Be direct, brief, and specific to ${budget.category}. No bullet points.`
    } else if (isWarning) {
      msg = `My ${budget.category} budget is ${symbol}${limit.toFixed(2)} for the ${periodEnd}. I've spent ${symbol}${spent.toFixed(2)} (${pct}%) with only ${symbol}${remaining.toFixed(2)} left. Give me ONE clear, practical tip to stay under budget for the rest of the ${periodEnd}. Be specific to ${budget.category}.`
    } else if (isGood) {
      msg = `My ${budget.category} budget is ${symbol}${limit.toFixed(2)} for the ${periodEnd} and I've only spent ${symbol}${spent.toFixed(2)} (${pct}%) — I'm doing well. Give me ONE tip to get the most value from my remaining ${symbol}${remaining.toFixed(2)} ${budget.category} budget. Be brief and actionable.`
    } else {
      msg = `My ${budget.category} budget is ${symbol}${limit.toFixed(2)} for the ${periodEnd}. I've spent ${symbol}${spent.toFixed(2)} (${pct}%) with ${symbol}${remaining.toFixed(2)} remaining. Give me ONE specific, practical tip for managing my ${budget.category} spending well. Under 2 sentences.`
    }

    API.post('/insights/chat', { message: msg })
      .then(r => setAdvice(r.data.reply || r.data.message || ''))
      .catch(() => setAdvice(''))
      .finally(() => setLoading(false))
  }, [budget, spent, symbol])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-0 shrink-0">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Gradient header */}
          <div style={{ background: gradient }} className="px-5 pt-5 pb-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/65 text-[11px] font-semibold uppercase tracking-wider">Budget Review</p>
                <p className="text-white font-bold text-lg leading-tight">{budget.category}</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/15 rounded-2xl px-3 py-2.5 text-center">
                <p className="text-white/60 text-[10px] font-medium mb-0.5">Spent</p>
                <p className="text-white font-bold text-sm tabular-nums">{symbol}{spent.toFixed(0)}</p>
              </div>
              <div className="bg-white/15 rounded-2xl px-3 py-2.5 text-center">
                <p className="text-white/60 text-[10px] font-medium mb-0.5">Limit</p>
                <p className="text-white font-bold text-sm tabular-nums">{symbol}{limit.toFixed(0)}</p>
              </div>
              <div className="bg-white/15 rounded-2xl px-3 py-2.5 text-center">
                <p className="text-white/60 text-[10px] font-medium mb-0.5">{isOver ? 'Over by' : 'Remaining'}</p>
                <p className="text-white font-bold text-sm tabular-nums">{symbol}{isOver ? (spent - limit).toFixed(0) : remaining.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{periodLabel} usage</span>
              <span className={`text-xs font-bold ${isOver ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                {pct}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: isOver ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981',
                }}
              />
            </div>
          </div>

          {/* AI Advice — shown first, most prominent */}
          <div className="px-5 py-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
                </svg>
              </div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {isOver ? 'Action plan' : isGood ? 'You're doing great' : 'AI Advice'}
              </p>
            </div>

            {loading ? (
              <div className="space-y-2.5">
                {[92, 78, 65].map((w, i) => (
                  <div key={i} className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : advice ? (
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{advice}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No advice available right now.</p>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-5 pt-3 pb-7 shrink-0 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold rounded-2xl text-sm transition"
          >
            Got it
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
  const [suggestModal, setSuggestModal] = useState(null) // { suggestions, monthlyIncome, fromNetWorth }
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showAISheet, setShowAISheet] = useState(false)
  const [noIncomeModal, setNoIncomeModal] = useState(false)
  const [totalBudgetInput, setTotalBudgetInput] = useState('')
  const [currencySymbol] = useState(() => {
    const stored = localStorage.getItem('currency') || 'USD'
    return CURRENCY_SYMBOLS[stored] || '$'
  })

  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  // Hide bottom nav when any entry form/modal is open
  useEffect(() => {
    const open = showForm || showAISheet || !!aiModal || !!numModal || !!suggestModal || noIncomeModal
    if (open) document.body.classList.add('modal-open')
    else document.body.classList.remove('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [showForm, showAISheet, aiModal, numModal, suggestModal, noIncomeModal])

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
    if (period === 'daily') {
      const todayStr = today.toISOString().split('T')[0]
      filtered = filtered.filter(e => (e.date || '').split('T')[0] === todayStr)
    } else if (period === 'weekly') {
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
    const periodLabel = form.period === 'daily' ? 'daily' : form.period === 'weekly' ? 'weekly' : 'monthly'
    const periodContext = form.period === 'daily' ? 'today' : form.period === 'weekly' ? 'this week' : 'this month'
    const msg = `I want to set a ${periodLabel} budget for ${form.category}. I've spent ${currencySymbol}${spent.toFixed(2)} on ${form.category} ${periodContext}. What's a realistic and healthy ${periodLabel} budget limit I should set? Reply in 2 sentences max with a specific number suggestion.`
    try {
      const res = await API.post('/insights/chat', { message: msg })
      setFormAiSuggestion(res.data.reply || '')
    } catch { setFormAiSuggestion('Unable to get suggestion right now.') }
    setFormAiLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    const duplicate = budgets.find(b => b.category === form.category && b.period === form.period)
    if (duplicate) {
      showToast(`You already have a ${form.period} budget for ${form.category}`, 'error')
      return
    }
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

  const handleDeleteNoConfirm = async (id) => {
    setBudgets(prev => prev.filter(b => b.id !== id))
    try {
      await API.delete(`/budgets/${id}`)
      showToast('Budget removed')
    } catch { showToast('Error deleting', 'error'); fetchAll() }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return
    setBudgets(prev => prev.filter(b => b.id !== id))
    try {
      await API.delete(`/budgets/${id}`)
      showToast('Deleted')
    } catch { showToast('Error deleting', 'error'); fetchAll() }
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
      {showAISheet && (
        <BudgetSuggestionsSheet
          existingBudgets={budgets}
          onClose={() => setShowAISheet(false)}
          onApplied={() => { fetchAll(); showToast('✅ Budgets applied!', 'success') }}
        />
      )}

      {/* No income modal */}
      {noIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-linear-to-br from-violet-600 to-purple-700 px-6 pt-7 pb-5 text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">✨ AI Suggestions</span>
                <button onClick={() => setNoIncomeModal(false)} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
              </div>
              <p className="font-bold text-lg mt-2">No income found yet 🤔</p>
              <p className="text-white/70 text-sm mt-1">
                AI needs a reference point to suggest smart limits.
              </p>
            </div>
            <div className="px-6 py-5 space-y-3">
              {/* Option 1 — add income */}
              <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/40">
                <span className="text-xl shrink-0 mt-0.5">💼</span>
                <div>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Add income first</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 leading-relaxed">
                    Most accurate — AI will allocate budgets as real percentages of your income.
                  </p>
                  <a href="/dashboard"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Go add income →
                  </a>
                </div>
              </div>

              {/* Option 2 — manual total */}
              <div className="flex gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-100 dark:border-violet-800/40">
                <span className="text-xl shrink-0 mt-0.5">💰</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Set a monthly spending amount</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5 leading-relaxed">
                    No income coming in? Spending from savings or net worth — just tell me the total and I'll split it across categories for you.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold pointer-events-none">
                        {currencySymbol}
                      </span>
                      <input
                        type="number" placeholder="e.g. 2000" min="1" step="1"
                        value={totalBudgetInput}
                        onChange={e => setTotalBudgetInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 border border-violet-200 dark:border-violet-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <button
                      disabled={!parseFloat(totalBudgetInput) || suggestLoading}
                      onClick={async () => {
                        const amt = parseFloat(totalBudgetInput)
                        if (!amt) return
                        setNoIncomeModal(false)
                        setSuggestLoading(true)
                        try {
                          const prefs2 = (() => { try { return JSON.parse(localStorage.getItem('fina_prefs') || '{}') } catch { return {} } })()
                          const r = await API.post('/budgets/suggest', { totalBudget: amt, savingsTarget: prefs2.savingsTarget ?? 20 })
                          setSuggestModal({ suggestions: r.data.suggestions || [], monthlyIncome: null, fromNetWorth: true, totalUsed: amt })
                        } catch { showToast('Failed to generate suggestions', 'error') }
                        finally { setSuggestLoading(false) }
                      }}
                      className="bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 active:scale-95 transition disabled:opacity-40">
                      {suggestLoading ? '…' : 'Go'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Budget Suggest Modal */}
      {suggestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-linear-to-br from-violet-600 to-purple-700 px-6 pt-6 pb-5 text-white shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">✨ AI Suggestions</span>
                <button onClick={() => setSuggestModal(null)} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
              </div>
              <p className="font-bold text-lg mt-2">Smart Budget Suggestions</p>
              <p className="text-white/70 text-xs mt-0.5">
                {suggestModal?.fromNetWorth
                  ? `Based on your ${currencySymbol}${parseFloat(totalBudgetInput||0).toFixed(0) || '—'}/mo spending plan`
                  : suggestModal?.monthlyIncome
                    ? `Based on ${currencySymbol}${suggestModal.monthlyIncome.toFixed(0)}/mo income + spending history`
                    : 'Based on your last 3 months of spending'}
              </p>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {suggestModal.suggestions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Not enough spending history yet. Add some expenses first!</p>
              ) : suggestModal.suggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.category}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{s.reasoning}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-violet-600 dark:text-violet-400 tabular-nums">{currencySymbol}{parseFloat(s.suggested_amount).toFixed(0)}</p>
                    <p className="text-[10px] text-gray-400">/ month</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await API.post('/budgets', { category: s.category, amount: s.suggested_amount, period: 'monthly' })
                        showToast(`${s.category} budget set to ${currencySymbol}${parseFloat(s.suggested_amount).toFixed(0)}`)
                        fetchAll()
                      } catch { showToast('Failed to apply', 'error') }
                    }}
                    className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
                    Apply
                  </button>
                </div>
              ))}
            </div>
            {suggestModal.suggestions.length > 0 && (
              <div className="px-5 pb-5 pt-2 shrink-0 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={async () => {
                    try {
                      await Promise.all(suggestModal.suggestions.map(s =>
                        API.post('/budgets', { category: s.category, amount: s.suggested_amount, period: 'monthly' })
                      ))
                      showToast('All budgets applied!')
                      fetchAll()
                      setSuggestModal(null)
                    } catch { showToast('Failed to apply all', 'error') }
                  }}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-sm transition">
                  Apply All Suggestions
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 page-enter">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-gray-400 text-sm mt-0.5">{monthName} · Spending limits & bill reminders</p>
        </div>

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
          <div className="bg-linear-to-br from-amber-400 to-orange-500 rounded-2xl px-5 py-4 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white" />
            </div>
            <div className="relative mb-3">
              <p className="text-white font-bold text-base">Budgets</p>
              <p className="text-white/70 text-xs">{monthName} · {totalSpent > totalBudget ? '⚠️ over budget' : `${currencySymbol}${(totalBudget - totalSpent).toFixed(0)} remaining`}</p>
            </div>
            <div className="relative grid grid-cols-3 gap-2">
              <button onClick={() => setNumModal({ label: 'Total Spent', value: currencySymbol + totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), sub: totalBudget > 0 ? ((totalSpent/totalBudget)*100).toFixed(0) + '% used' : '' })}
                className="bg-white/20 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
                <p className="text-white/70 text-[10px] mb-0.5">Spent</p>
                <p className="text-white font-bold text-sm tabular-nums truncate">{currencySymbol}{totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-white/50 text-[10px]">{totalBudget > 0 ? ((totalSpent/totalBudget)*100).toFixed(0) + '% used' : '0% used'}</p>
              </button>
              <button onClick={() => setNumModal({ label: 'Remaining', value: currencySymbol + Math.max(0, totalBudget - totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
                className="bg-white/20 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
                <p className="text-white/70 text-[10px] mb-0.5">Remaining</p>
                <p className="text-white font-bold text-sm tabular-nums truncate">{currencySymbol}{Math.max(0, totalBudget - totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-white/50 text-[10px]">{budgets.length} categor{budgets.length !== 1 ? 'ies' : 'y'}</p>
              </button>
              <button onClick={() => setNumModal({ label: 'Over Limit', value: String(overCount), sub: overCount === 0 ? 'All clear' : overCount + ' exceeded' })}
                className="bg-white/20 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
                <p className="text-white/70 text-[10px] mb-0.5">Over Limit</p>
                <p className="text-white font-bold text-sm tabular-nums">{overCount}</p>
                <p className="text-white/50 text-[10px]">{overCount === 0 ? 'all good ✓' : 'exceeded'}</p>
              </button>
            </div>
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
            <button
              onClick={() => setShowAISheet(true)}
              className="shrink-0 flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>
              AI Budget Plan
            </button>
            <button onClick={() => setShowForm(v => !v)}
              className="shrink-0 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
              {showForm ? '✕ Cancel' : '+ Set Budget'}
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {(() => {
                const dup = budgets.find(b => b.category === form.category && b.period === form.period)
                return dup ? (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-3 py-2.5 mb-3">
                    <span className="text-base shrink-0">⚠️</span>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      You already have a {dup.period} budget limit for <strong>{dup.category}</strong>. Delete the existing one first to set a new limit.
                    </p>
                  </div>
                ) : null
              })()}
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
              <button type="submit"
                disabled={saving || !!budgets.find(b => b.category === form.category && b.period === form.period)}
                className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm disabled:opacity-50">
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
          budgets.length === 0 ? (
            <div className="bg-linear-to-br from-amber-400 to-orange-500 rounded-2xl px-5 py-8 mb-3 relative overflow-hidden text-center">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white" />
              </div>
              <div className="relative">
                <div className="text-5xl mb-3">🎯</div>
                <p className="text-white font-bold text-base mb-1">No budgets yet</p>
                <p className="text-white/60 text-sm mb-4">Set spending limits by category to stay on top of your finances.</p>
                <button onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold text-sm px-5 py-2.5 rounded-2xl transition active:scale-95">
                  + Set Budget
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-10 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No budgets match this filter</p>
              <p className="text-gray-400 text-sm">Try a different filter.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {filtered.map(b => {
              const pctCapped = Math.min(b.pct, 100)
              const isOver = b.pct >= 100
              const isWarning = b.pct >= 85 && !isOver
              const remaining = b.limit - b.spent
              const periodLabel = b.period === 'daily' ? 'Today' : b.period === 'weekly' ? 'This week' : monthName
              const lastMonthSpent = b.period === 'monthly' ? getLastMonthSpent(b.category) : null
              const lastMonthRollover = lastMonthSpent !== null ? b.limit - lastMonthSpent : null

              return (
                <SwipeRow key={b.id} onDelete={() => handleDeleteNoConfirm(b.id)}>
                <div
                  onClick={() => setAiModal({ budget: b, spent: b.spent })}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-l-4 cursor-pointer active:scale-[0.985] transition-transform ${
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
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                        {periodLabel}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          b.period === 'daily' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                          b.period === 'weekly' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>{b.period}</span>
                      </p>
                    </div>
                    <button onClick={() => handleDelete(b.id)} className="hidden md:block shrink-0 text-gray-300 hover:text-red-400 transition p-1">
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

                  {isWarning && (
                    <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl px-3 py-2">
                      <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                        ⚠️ At {b.pct.toFixed(0)}% — tap for AI tips on staying under budget.
                      </p>
                    </div>
                  )}
                  {isOver && (
                    <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2">
                      <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                        🚨 Over limit — tap for AI recovery tips.
                      </p>
                    </div>
                  )}
                  {!isWarning && !isOver && (
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2 text-right">Tap for spending tips →</p>
                  )}
                </div>
                </SwipeRow>
              )
            })}
          </div>
        )}

      </div>
    </Layout>
  )
}
