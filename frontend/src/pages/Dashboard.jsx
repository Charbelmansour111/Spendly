import Layout from '../components/Layout'
import { useEffect, useState, useCallback, useRef } from 'react'
import API from '../utils/api'
import ReceiptScanner from '../components/ReceiptScanner'
import { DashboardSkeleton } from '../components/Skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Onboarding from '../components/Onboarding'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', LBP: 'L\u00a3', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CATEGORY_ICONS  = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
const CATEGORY_COLORS = { Food: '#F97316', Transport: '#3B82F6', Shopping: '#EC4899', Subscriptions: '#8B5CF6', Entertainment: '#10B981', Other: '#6B7280' }

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

function fmt(amount, symbol) {
  return symbol + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}

// ── Sub-components ───────────────────────────────────────
function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 text-center w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-bold text-violet-600 tabular-nums break-all">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${bg}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="shrink-0 font-bold opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel, confirmText = 'Delete' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <p className="text-4xl mb-3">🗑️</p>
        <p className="font-semibold text-gray-800 dark:text-white mb-1">{message}</p>
        <p className="text-gray-400 text-sm mb-5">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white py-3 rounded-xl font-semibold">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

const SUBCATEGORIES = {
  Food: [
    { label: "McDonald's", emoji: '🍔' }, { label: 'KFC', emoji: '🍗' },
    { label: 'Starbucks', emoji: '☕' }, { label: 'Pizza', emoji: '🍕' },
    { label: 'Groceries', emoji: '🛒' }, { label: 'Restaurant', emoji: '🍽️' },
    { label: 'Delivery', emoji: '📦' }, { label: 'Burger King', emoji: '🍔' },
  ],
  Transport: [
    { label: 'Uber', emoji: '🚗' }, { label: 'Taxi', emoji: '🚕' },
    { label: 'Gas', emoji: '⛽' }, { label: 'Metro', emoji: '🚇' },
    { label: 'Bus', emoji: '🚌' }, { label: 'Parking', emoji: '🅿️' },
    { label: 'Flight', emoji: '✈️' }, { label: 'Bike', emoji: '🚲' },
  ],
  Shopping: [
    { label: 'Amazon', emoji: '📦' }, { label: 'Clothing', emoji: '👕' },
    { label: 'Electronics', emoji: '💻' }, { label: 'Beauty', emoji: '💄' },
    { label: 'IKEA', emoji: '🛋️' }, { label: 'Pharmacy', emoji: '💊' },
    { label: 'Books', emoji: '📚' }, { label: 'Sports', emoji: '🏋️' },
  ],
  Entertainment: [
    { label: 'Netflix', emoji: '🎬' }, { label: 'Spotify', emoji: '🎵' },
    { label: 'Disney+', emoji: '🏰' }, { label: 'HBO', emoji: '🎭' },
    { label: 'Cinema', emoji: '🎥' }, { label: 'Games', emoji: '🎮' },
    { label: 'Bar', emoji: '🍺' }, { label: 'Concert', emoji: '🎤' },
  ],
  Other: [
    { label: 'Healthcare', emoji: '🏥' }, { label: 'Education', emoji: '🎓' },
    { label: 'Gifts', emoji: '🎁' }, { label: 'Insurance', emoji: '🛡️' },
    { label: 'Gym', emoji: '🏋️' }, { label: 'Charity', emoji: '❤️' },
    { label: 'Rent', emoji: '🏠' }, { label: 'Utilities', emoji: '💡' },
  ],
}

function AddExpenseSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({
    amount: '', category: 'Food', description: '',
    date: new Date().toISOString().split('T')[0], is_recurring: false
  })
  const [selectedSub, setSelectedSub] = useState(null)

  const handleCategoryChange = (cat) => {
    setForm(f => ({ ...f, category: cat }))
    setSelectedSub(null)
  }

  const handleSubSelect = (sub) => {
    setSelectedSub(sub.label)
    setForm(f => ({ ...f, description: sub.label }))
  }

  const subs = SUBCATEGORIES[form.category] || []

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <ReceiptScanner onScanComplete={data => setForm(f => ({ ...f, amount: data.amount, description: data.description }))} />
        <div className="space-y-3 mt-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Amount ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              required min="0.01" step="0.01"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold" />
          </div>

          {/* Category selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {['Food','Transport','Shopping','Entertainment','Other'].map(cat => (
                <button key={cat} type="button" onClick={() => handleCategoryChange(cat)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition ${
                    form.category === cat
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-violet-300'
                  }`}>
                  {cat === 'Food' ? '🍔' : cat === 'Transport' ? '🚗' : cat === 'Shopping' ? '🛍️' : cat === 'Entertainment' ? '🎬' : '📦'} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory tiles */}
          {subs.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Quick-fill</label>
              <div className="grid grid-cols-4 gap-2">
                {subs.map(sub => (
                  <button key={sub.label} type="button" onClick={() => handleSubSelect(sub)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition ${
                      selectedSub === sub.label
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                        : 'border-gray-100 dark:border-gray-700 hover:border-violet-300 bg-gray-50 dark:bg-gray-700/50'
                    }`}>
                    <span className="text-xl">{sub.emoji}</span>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 leading-tight text-center">{sub.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Description (optional)</label>
            <input type="text" placeholder="What was this for?" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="w-4 h-4 accent-violet-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly</span>
          </label>
          <button onClick={() => onSave(form)}
            disabled={!form.amount || !form.date}
            className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-violet-700 transition disabled:opacity-50 mt-1">
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}

function AddIncomeSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({ amount: '', source: 'Salary', is_recurring: false })
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Income</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Amount ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              min="0.01" step="0.01"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Source</label>
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Salary</option><option>Freelance</option><option>Business</option><option>Investment</option><option>Other</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="w-4 h-4 accent-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly</span>
          </label>
          <button onClick={() => onSave(form)}
            disabled={!form.amount}
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-700 transition disabled:opacity-50">
            Add Income
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────
export default function Dashboard() {
  const [user]                        = useState(() => {
    const u = localStorage.getItem('user')
    if (!u) { window.location.href = '/login'; return null }
    return JSON.parse(u)
  })
  const [expenses, setExpenses]       = useState([])
  const [budgets, setBudgets]         = useState([])
  const [incomeList, setIncomeList]   = useState([])
  const [savingsGoals, setSavings]    = useState([])
  const [notifications, setNotifs]    = useState([])
  const [trendsData, setTrends]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [currencySymbol]              = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [toast, setToast]             = useState(null)
  const [confirm, setConfirm]         = useState(null)
  const [modalData, setModalData]     = useState(null)
  const [showAddExp, setShowAddExp]   = useState(false)
  const [showAddInc, setShowAddInc]   = useState(false)
  const [editingExpense, setEditing]  = useState(null)
  const [editForm, setEditForm]       = useState({ amount: '', category: 'Food', description: '', date: '', is_recurring: false })
  const [showNotifs, setShowNotifs]   = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('spendly_onboarded'))

  // Carousel + news state
  const [carouselPanel, setCarousel]  = useState(0)
  const [news, setNews]               = useState([])
  const [newsLoading, setNewsLoading] = useState(() => !!localStorage.getItem('token'))

  // Net worth data
  const [debts, setDebts]   = useState([])
  const [subs, setSubs]     = useState([])
  const touchStartX = useRef(null)
  const notifRef    = useRef(null)

  const today = new Date()
  const [selectedMonth, setMonth] = useState(today.getMonth())
  const [selectedYear, setYear]   = useState(today.getFullYear())
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()
  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  const showToast  = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])
  const askConfirm = (msg, fn) => setConfirm({ message: msg, onConfirm: fn })

  const fetchExpenses = useCallback(async () => { try { const r = await API.get('/expenses'); setExpenses(r.data) } catch { /* noop */ } }, [])
  const fetchBudgets  = useCallback(async () => { try { const r = await API.get('/budgets'); setBudgets(r.data) } catch { /* noop */ } }, [])
  const fetchSavings  = useCallback(async () => { try { const r = await API.get('/savings'); setSavings(r.data) } catch { /* noop */ } }, [])
  const fetchTrends   = useCallback(async () => { try { const r = await API.get('/expenses/trends'); setTrends(r.data) } catch { /* noop */ } }, [])
  const fetchNotifs   = useCallback(async () => { try { const r = await API.get('/notifications'); setNotifs(r.data) } catch { /* noop */ } }, [])
  const fetchIncome   = useCallback(async () => {
    try { const r = await API.get('/income?month=' + (selectedMonth + 1) + '&year=' + selectedYear); setIncomeList(r.data) } catch { /* noop */ }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    Promise.all([fetchExpenses(), fetchBudgets(), fetchSavings(), fetchTrends(), fetchNotifs()])
      .finally(() => setLoading(false))
  }, [fetchExpenses, fetchBudgets, fetchSavings, fetchTrends, fetchNotifs])

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    fetchIncome()
    if (isCurrentMonth) {
      API.post('/expenses/apply-recurring', { month: selectedMonth + 1, year: selectedYear })
        .then(r => { if (r.data.added > 0) { fetchExpenses(); showToast(r.data.added + ' recurring expense(s) added', 'warning') } }).catch(() => { /* noop */ })
      API.post('/income/apply-recurring', { month: selectedMonth + 1, year: selectedYear })
        .then(r => { if (r.data.added > 0) { fetchIncome(); showToast(r.data.added + ' recurring income(s) added', 'warning') } }).catch(() => { /* noop */ })
    }
  }, [selectedMonth, selectedYear, isCurrentMonth, fetchIncome, fetchExpenses, showToast])

  // Fetch news on mount (newsLoading starts true via lazy init above)
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    API.get('/news').then(r => setNews(r.data || [])).catch(() => { /* noop */ }).finally(() => setNewsLoading(false))
  }, [])

  // Fetch debts + subscriptions for net worth
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    API.get('/debts').then(r => setDebts(r.data || [])).catch(() => {})
    API.get('/subscriptions').then(r => setSubs(r.data || [])).catch(() => {})
  }, [])

  // Close notification panel on outside click
  useEffect(() => {
    if (!showNotifs) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  const markRead = async () => {
    try { await API.put('/notifications/read', {}); setNotifs(prev => prev.map(n => ({ ...n, is_read: true }))) } catch { /* noop */ }
  }

  const deleteNotif = async (id) => {
    try { await API.delete('/notifications/' + id); setNotifs(prev => prev.filter(n => n.id !== id)) } catch { /* noop */ }
  }

  const clearAllNotifs = async () => {
    try {
      await Promise.all(notifications.map(n => API.delete('/notifications/' + n.id)))
      setNotifs([])
    } catch { /* noop */ }
  }

  // Carousel touch swipe — disabled on panel 1 (news) so horizontal scroll works
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50 && carouselPanel !== 1) setCarousel(p => Math.max(0, Math.min(2, p + (diff > 0 ? 1 : -1))))
    touchStartX.current = null
  }

  const refreshNews = () => {
    setNewsLoading(true)
    API.get('/news').then(r => setNews(r.data || [])).catch(() => {}).finally(() => setNewsLoading(false))
  }

  // Derived values
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })
  const total       = monthExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const totalIncome = incomeList.reduce((s, i) => s + safeNum(i.amount), 0)
  const balance     = totalIncome - total
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0
  const unread      = notifications.filter(n => !n.is_read).length

  const categoryData = monthExpenses.reduce((acc, e) => {
    const f = acc.find(i => i.name === e.category)
    if (f) f.value += safeNum(e.amount)
    else acc.push({ name: e.category, value: safeNum(e.amount) })
    return acc
  }, []).sort((a, b) => b.value - a.value)

  const recentExpenses = [...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  // Financial tips computed from real user data
  const tips = (() => {
    const list = []
    if (balance < 0) {
      list.push({ icon: '🚨', title: 'Spending Alert', desc: `You're ${fmt(Math.abs(balance), currencySymbol)} over income this month. Cut non-essentials.`, color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' })
    } else if (savingsRate < 10 && totalIncome > 0) {
      list.push({ icon: '💡', title: 'Low Savings Rate', desc: `Saving ${savingsRate}% this month. Aim for 20%+ for financial security.`, color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' })
    } else if (savingsRate >= 20) {
      list.push({ icon: '🎉', title: 'Great Savings!', desc: `You're saving ${savingsRate}% of income this month — excellent discipline!`, color: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20' })
    } else if (totalIncome > 0) {
      list.push({ icon: '📈', title: 'On Track', desc: `${savingsRate}% savings rate. Push to 20% for stronger long-term security.`, color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' })
    }
    const overBudget = categoryData.filter(cat => {
      const b = budgets.find(bud => bud.category === cat.name)
      return b && cat.value > safeNum(b.amount)
    })
    if (overBudget.length > 0) {
      list.push({ icon: '⚠️', title: 'Budget Exceeded', desc: `Over budget on: ${overBudget.map(c => c.name).join(', ')}. Review your limits.`, color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' })
    }
    if (categoryData.length > 0) {
      const top = categoryData[0]
      const pct = total > 0 ? Math.round((top.value / total) * 100) : 0
      if (pct > 40) {
        list.push({ icon: CATEGORY_ICONS[top.name] || '📦', title: `Heavy ${top.name} Spending`, desc: `${top.name} is ${pct}% of your spending. Small changes here have the biggest impact.`, color: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20' })
      }
    }
    const nearGoals = savingsGoals.filter(g => {
      const pct = safeNum(g.target_amount) > 0 ? safeNum(g.saved_amount) / safeNum(g.target_amount) : 0
      return pct >= 0.8 && pct < 1
    })
    if (nearGoals.length > 0) {
      list.push({ icon: '🏆', title: 'Almost There!', desc: `Close to reaching: ${nearGoals.map(g => g.name).join(', ')}. One final push!`, color: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' })
    }
    if (list.length === 0) {
      list.push({ icon: '📊', title: 'Start Tracking', desc: 'Log expenses regularly to unlock personalized financial insights.', color: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20' })
    }
    list.push({ icon: '💰', title: '50/30/20 Rule', desc: 'Allocate 50% to needs, 30% to wants, 20% to savings for a balanced budget.', color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' })
    list.push({ icon: '🔄', title: 'Emergency Fund', desc: 'Aim for 3–6 months of expenses in a liquid savings account for financial security.', color: 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20' })
    return list
  })()

  // Handlers
  const handleAddExpense = async (form) => {
    try {
      await API.post('/expenses', form)
      setShowAddExp(false)
      await fetchExpenses()
      const budget = budgets.find(b => b.category === form.category)
      if (budget) {
        const r = await API.get('/expenses')
        const monthExp = r.data.filter(ex => { const d = new Date(ex.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
        const spent = monthExp.filter(ex => ex.category === form.category).reduce((s, ex) => s + safeNum(ex.amount), 0)
        const pct = (spent / safeNum(budget.amount)) * 100
        if (spent > safeNum(budget.amount)) {
          showToast('Over budget on ' + form.category + '!', 'error')
          await API.post('/notifications/budget-alert', { category: form.category, spent, limit: budget.amount }).catch(() => {})
          fetchNotifs()
        } else if (pct >= 80) {
          showToast(Math.round(pct) + '% of ' + form.category + ' budget used', 'warning')
        } else {
          showToast('Expense added!')
        }
      } else {
        showToast('Expense added!')
      }
    } catch { showToast('Error adding expense', 'error') }
  }

  const handleAddIncome = async (form) => {
    try {
      await API.post('/income', { ...form, month: selectedMonth + 1, year: selectedYear })
      setShowAddInc(false)
      await fetchIncome()
      showToast('Income added!')
    } catch { showToast('Error adding income', 'error') }
  }

  const handleDeleteExpense = (id) => {
    askConfirm('Delete this expense?', async () => {
      setConfirm(null)
      try { await API.delete('/expenses/' + id); fetchExpenses(); showToast('Expense deleted', 'error') } catch { /* noop */ }
    })
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    try {
      await API.put('/expenses/' + editingExpense, editForm)
      setEditing(null); fetchExpenses(); showToast('Expense updated!')
    } catch { showToast('Error updating', 'error') }
  }

  const handleDeleteIncome = (id) => {
    askConfirm('Delete this income entry?', async () => {
      setConfirm(null)
      try { await API.delete('/income/' + id); fetchIncome(); showToast('Income deleted', 'error') } catch { /* noop */ }
    })
  }

  const prevMonth = () => { if (selectedMonth === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (selectedMonth === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  if (loading) return (
    <Layout unreadCount={0}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><DashboardSkeleton /></div>
    </Layout>
  )

  const inputCls = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  const PANEL_LABELS = ['Overview', 'World News', 'Your Tips']

  return (
    <Layout unreadCount={unread} onBellClick={() => { setShowNotifs(v => !v); if (!showNotifs) markRead() }}>
      {toast    && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm  && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {showOnboarding && <Onboarding onDone={() => { localStorage.setItem('spendly_onboarded', '1'); setShowOnboarding(false) }} />}
      {modalData && <NumberModal {...modalData} onClose={() => setModalData(null)} />}
      {showAddExp && <AddExpenseSheet onClose={() => setShowAddExp(false)} onSave={handleAddExpense} currencySymbol={currencySymbol} />}
      {showAddInc && <AddIncomeSheet  onClose={() => setShowAddInc(false)} onSave={handleAddIncome} currencySymbol={currencySymbol} />}

      {/* Notifications panel */}
      {showNotifs && (
        <div ref={notifRef} className="fixed top-16 right-4 z-40 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Notifications</p>
            {notifications.length > 0 && (
              <button onClick={clearAllNotifs} className="text-xs text-red-500 hover:underline font-medium">Clear all</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="text-3xl">🔔</span>
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 15).map(n => (
                <div key={n.id} className={`flex items-start gap-2 px-4 py-3 border-b border-gray-50 dark:border-gray-700/60 group ${n.is_read ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-violet-500'}`} />
                  <p className="text-xs flex-1 leading-relaxed">{n.message}</p>
                  <button onClick={() => deleteNotif(n.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition p-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 pb-8">

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-violet-50 hover:text-violet-600 transition font-bold text-lg">&lsaquo;</button>
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">{monthName}</p>
            {isCurrentMonth && <span className="text-xs text-violet-500 font-medium">Current month</span>}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className={`w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition font-bold text-lg ${isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-violet-50 hover:text-violet-600'}`}>
            &rsaquo;
          </button>
        </div>

        {/* ── Swipeable Carousel ────────────────────────────── */}
        <div className="mb-5">
          {/* Panel tabs */}
          <div className="flex gap-1 mb-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {PANEL_LABELS.map((label, i) => (
              <button key={i} onClick={() => setCarousel(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${i === carouselPanel ? 'bg-white dark:bg-gray-700 text-violet-600 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Sliding panels wrapper */}
          <div className="overflow-hidden rounded-3xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${carouselPanel * 100}%)` }}>

              {/* Panel 0 — Balance overview */}
              <div className="w-full shrink-0">
                <div className="bg-linear-to-br from-violet-600 via-violet-700 to-purple-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white" />
                    <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white" />
                  </div>
                  <div className="relative">
                    <p className="text-violet-200 text-xs font-medium mb-1">
                      {user?.name ? 'Hey, ' + user.name.split(' ')[0] : 'Balance'} — {monthName}
                    </p>
                    <button onClick={() => setModalData({ label: 'Balance — ' + monthName, value: (balance >= 0 ? '+' : '-') + fmt(Math.abs(balance), currencySymbol), sub: savingsRate + '% savings rate' })}
                      className="text-left w-full">
                      <p className={`text-4xl font-bold text-white tabular-nums mb-1 ${balance < 0 ? 'text-red-200' : ''}`}>
                        {balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance), currencySymbol)}
                      </p>
                    </button>
                    <p className="text-violet-200 text-xs">
                      {balance >= 0 ? savingsRate + '% saved this month' : 'Spending over income'}
                    </p>
                  </div>
                  <div className="relative grid grid-cols-3 gap-2 mt-4">
                    <button onClick={() => setModalData({ label: 'Income — ' + monthName, value: fmt(totalIncome, currencySymbol), sub: incomeList.length + ' source(s)' })}
                      className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                      <p className="text-green-300 text-xs mb-0.5">Income</p>
                      <p className="text-white font-bold text-sm tabular-nums truncate">{fmt(totalIncome, currencySymbol)}</p>
                    </button>
                    <button onClick={() => setModalData({ label: 'Spent — ' + monthName, value: fmt(total, currencySymbol), sub: monthExpenses.length + ' transactions' })}
                      className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                      <p className="text-red-300 text-xs mb-0.5">Spent</p>
                      <p className="text-white font-bold text-sm tabular-nums truncate">{fmt(total, currencySymbol)}</p>
                    </button>
                    <button onClick={() => setModalData({ label: 'Transactions', value: String(monthExpenses.length), sub: 'this month' })}
                      className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                      <p className="text-violet-200 text-xs mb-0.5">Txns</p>
                      <p className="text-white font-bold text-sm tabular-nums">{monthExpenses.length}</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel 1 — World & Financial News */}
              <div className="w-full shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden" style={{ minHeight: '212px' }}>
                  <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/60">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">World & Financial News</p>
                    <div className="flex items-center gap-2">
                      <button onClick={refreshNews} disabled={newsLoading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition disabled:opacity-40"
                        title="Refresh news">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          className={newsLoading ? 'animate-spin' : ''}>
                          <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                      </button>
                      <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
                      </span>
                    </div>
                  </div>
                  {newsLoading ? (
                    <div className="flex items-center justify-center py-12 gap-3">
                      <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">Loading headlines…</p>
                    </div>
                  ) : news.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-2 px-4 text-center">
                      <span className="text-3xl">📰</span>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">News unavailable</p>
                      <p className="text-gray-400 text-xs">Add a NEWS_API_KEY to your backend .env to enable live headlines</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="flex gap-3 px-4 py-4" style={{ width: 'max-content' }}>
                        {news.map((article, i) => (
                          <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                            className="w-52 shrink-0 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-700/50 block group">
                            <div className="relative h-28 overflow-hidden bg-gray-200 dark:bg-gray-600">
                              <img src={article.urlToImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={e => { e.target.parentElement.style.background = '#374151' }} />
                              <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[90%]">
                                {article.source?.name}
                              </span>
                            </div>
                            <div className="p-2.5">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-3">{article.title}</p>
                              <p className="text-[10px] text-gray-400 mt-1.5">{timeAgo(article.publishedAt)}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel 2 — Financial Tips */}
              <div className="w-full shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden" style={{ minHeight: '212px' }}>
                  <div className="px-5 pt-4 pb-2 border-b border-gray-50 dark:border-gray-700/60">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">How You're Doing</p>
                    <p className="text-xs text-gray-400 mt-0.5">Based on your {monthName} data</p>
                  </div>
                  <div className="px-4 pb-4 pt-3 space-y-2.5 max-h-64 overflow-y-auto">
                    {tips.map((tip, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl border ${tip.color}`}>
                        <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-gray-800 dark:text-white">{tip.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{tip.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setCarousel(i)}
                className={`rounded-full transition-all duration-200 ${i === carouselPanel ? 'w-5 h-1.5 bg-violet-600' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600'}`} />
            ))}
          </div>
        </div>
        {/* ── End Carousel ─────────────────────────────────── */}

        {/* Quick Actions */}
        {isCurrentMonth && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Expense', icon: '➕', color: 'bg-violet-600', action: () => setShowAddExp(true) },
              { label: 'Income',  icon: '💵', color: 'bg-green-600',  action: () => setShowAddInc(true) },
              { label: 'AI',      icon: '🤖', color: 'bg-purple-600', action: () => window.location.href = '/insights' },
              { label: 'Reports', icon: '📄', color: 'bg-gray-700',   action: () => window.location.href = '/reports' },
            ].map((a, i) => (
              <button key={i} onClick={a.action}
                className={`${a.color} text-white rounded-2xl py-3 flex flex-col items-center gap-1 active:scale-95 transition-transform shadow-sm`}>
                <span className="text-xl">{a.icon}</span>
                <span className="text-xs font-semibold">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Upcoming Bills */}
        {(() => {
          const upcoming = subs.filter(s => {
            if (!s.next_billing_date) return false
            const days = Math.ceil((new Date(s.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24))
            return days >= 0 && days <= 7
          }).sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
          if (!upcoming.length) return null
          return (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-amber-800 dark:text-amber-400 text-sm mb-3">⏰ Bills Due This Week</h3>
              <div className="space-y-2">
                {upcoming.map(s => {
                  const days = Math.ceil((new Date(s.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={s.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{s.name}</p>
                        <p className={`text-xs font-semibold ${days === 0 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                          {days === 0 ? 'Due today' : `In ${days} day${days > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <p className="font-bold text-gray-800 dark:text-white text-sm tabular-nums">{currencySymbol}{safeNum(s.amount).toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Transactions</h3>
            <a href="/reports" className="text-violet-600 text-xs font-semibold hover:underline">View all</a>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">💸</p>
              <p className="text-gray-400 text-sm">No expenses for {monthName}</p>
              {isCurrentMonth && (
                <button onClick={() => setShowAddExp(true)} className="mt-3 bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Add First Expense</button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {recentExpenses.map(expense => (
                <div key={expense.id}>
                  {editingExpense === expense.id ? (
                    <form onSubmit={handleEditSave} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} required min="0.01" step="0.01" className={inputCls} />
                        <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className={inputCls}>
                          <option>Food</option><option>Transport</option><option>Shopping</option><option>Subscriptions</option><option>Entertainment</option><option>Other</option>
                        </select>
                        <input type="text" placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={inputCls} />
                        <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} required className={inputCls} />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={editForm.is_recurring} onChange={e => setEditForm({ ...editForm, is_recurring: e.target.checked })} className="accent-violet-600" />
                        Recurring monthly
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold">Save</button>
                        <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white py-2 rounded-xl text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 transition group">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: (CATEGORY_COLORS[expense.category] || '#6B7280') + '22' }}>
                        {CATEGORY_ICONS[expense.category] || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {expense.description || expense.category}
                        </p>
                        <p className="text-xs text-gray-400">{expense.date?.split('T')[0]}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="font-bold text-gray-800 dark:text-white tabular-nums text-sm">
                          -{currencySymbol}{safeNum(expense.amount).toFixed(2)}
                        </p>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={() => { setEditing(expense.id); setEditForm({ amount: expense.amount, category: expense.category, description: expense.description || '', date: expense.date?.split('T')[0], is_recurring: expense.is_recurring || false }) }}
                            className="text-violet-400 hover:text-violet-600 p-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-400 hover:text-red-600 p-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spending by Category */}
        {categoryData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Spending by Category</h3>
            <div className="space-y-3">
              {categoryData.slice(0, 5).map((cat, i) => {
                const pct = total > 0 ? (cat.value / total) * 100 : 0
                const budget = budgets.find(b => b.category === cat.name)
                const budgetPct = budget ? Math.min((cat.value / safeNum(budget.amount)) * 100, 100) : 0
                const isOver = budget && cat.value > safeNum(budget.amount)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{CATEGORY_ICONS[cat.name] || '📦'}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{cat.name}</span>
                        {isOver && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Over!</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-800 dark:text-white tabular-nums">{currencySymbol}{cat.value.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 ml-1">({Math.round(pct)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      {budget ? (
                        <div className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-violet-500'}`}
                          style={{ width: budgetPct + '%' }} />
                      ) : (
                        <div className="h-1.5 rounded-full bg-violet-300 dark:bg-violet-700 transition-all"
                          style={{ width: pct + '%' }} />
                      )}
                    </div>
                    {budget && (
                      <p className="text-xs text-gray-400 mt-0.5">Budget: {currencySymbol}{safeNum(budget.amount).toFixed(2)}</p>
                    )}
                  </div>
                )
              })}
            </div>
            <a href="/budgets" className="mt-3 block text-center text-violet-600 text-xs font-semibold hover:underline">Manage Budgets</a>
          </div>
        )}

        {/* Income this month */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Income — {monthName}</h3>
            {isCurrentMonth && (
              <button onClick={() => setShowAddInc(true)} className="text-xs text-green-600 font-semibold hover:underline">+ Add</button>
            )}
          </div>
          {incomeList.length === 0 ? (
            <p className="text-gray-400 text-sm">No income recorded for {monthName}.</p>
          ) : (
            <div className="space-y-2">
              {incomeList.map(inc => (
                <div key={inc.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-sm">💵</div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{inc.source}</p>
                      {inc.is_recurring && <span className="text-xs text-green-600">Recurring</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600 tabular-nums text-sm">+{currencySymbol}{safeNum(inc.amount).toFixed(2)}</span>
                    {isCurrentMonth && (
                      <button onClick={() => handleDeleteIncome(inc.id)} className="text-red-400 hover:text-red-600 p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 font-semibold">Total</span>
                <span className="font-bold text-green-600 tabular-nums text-sm">{currencySymbol}{totalIncome.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Savings Goals Preview */}
        {savingsGoals.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Savings Goals</h3>
              <a href="/savings" className="text-violet-600 text-xs font-semibold hover:underline">View all</a>
            </div>
            <div className="space-y-3">
              {savingsGoals.slice(0, 3).map((g, i) => {
                const saved  = safeNum(g.saved_amount)
                const target = safeNum(g.target_amount)
                const pct    = target > 0 ? Math.min((saved / target) * 100, 100) : 0
                return (
                  <div key={g.id}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{['🏖️','🚗','🏠','💻','✈️'][i % 5]}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-32">{g.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums">{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-violet-500'}`}
                        style={{ width: pct + '%' }} />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs text-gray-400">{currencySymbol}{saved.toFixed(0)} saved</span>
                      <span className="text-xs text-gray-400">Goal: {currencySymbol}{target.toFixed(0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Net Worth */}
        {(debts.length > 0 || savingsGoals.length > 0) && (() => {
          const totalSaved = savingsGoals.reduce((s, g) => s + safeNum(g.saved_amount), 0)
          const totalDebt  = debts.reduce((s, d) => s + safeNum(d.remaining_amount), 0)
          const netWorth   = totalSaved - totalDebt
          return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Net Worth</h3>
                <a href="/debts" className="text-violet-600 text-xs font-semibold hover:underline">Manage Debts</a>
              </div>
              <p className={`text-3xl font-bold tabular-nums mb-4 ${netWorth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {netWorth >= 0 ? '+' : '-'}{fmt(Math.abs(netWorth), currencySymbol)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Assets (Savings)</p>
                  <p className="text-base font-bold text-green-600 tabular-nums">{fmt(totalSaved, currencySymbol)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                  <p className="text-xs text-red-500 font-semibold mb-1">Liabilities (Debt)</p>
                  <p className="text-base font-bold text-red-500 tabular-nums">{fmt(totalDebt, currencySymbol)}</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* 6-Month Trend */}
        {trendsData.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">6-Month Trend</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendsData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <Tooltip formatter={v => currencySymbol + safeNum(v).toFixed(2)} />
                <Line type="monotone" dataKey="income"   stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Income" />
                <Line type="monotone" dataKey="spending" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Spent" />
                <Line type="monotone" dataKey="balance"  stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </Layout>
  )
}
