import Layout from '../components/Layout'
import { useEffect, useState, useCallback } from 'react'
import API from '../utils/api'
import ReceiptScanner from '../components/ReceiptScanner'
import { DashboardSkeleton } from '../components/Skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', LBP: 'L\u00a3', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CATEGORY_ICONS  = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
const CATEGORY_COLORS = { Food: '#F97316', Transport: '#3B82F6', Shopping: '#EC4899', Subscriptions: '#8B5CF6', Entertainment: '#10B981', Other: '#6B7280' }

// ── Helpers ──────────────────────────────────────────────
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

function fmt(amount, symbol) {
  return symbol + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Sub-components ───────────────────────────────────────
function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 text-center w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-bold text-emerald-600 tabular-nums break-all">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold">Done</button>
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
      <button onClick={onClose} className="flex-shrink-0 font-bold opacity-70 hover:opacity-100">x</button>
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

// Bottom-sheet modal for adding expense
function AddExpenseSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({
    amount: '', category: 'Food', description: '',
    date: new Date().toISOString().split('T')[0], is_recurring: false
  })
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
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option>Food</option><option>Transport</option><option>Shopping</option>
                <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Description (optional)</label>
            <input type="text" placeholder="What was this for?" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly</span>
          </label>
          <button onClick={() => onSave(form)}
            disabled={!form.amount || !form.date}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-700 transition disabled:opacity-50 mt-1">
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}

// Bottom-sheet for adding income
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
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Source</label>
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
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
  const [user, setUser]               = useState(null)
  const [expenses, setExpenses]       = useState([])
  const [budgets, setBudgets]         = useState([])
  const [incomeList, setIncomeList]   = useState([])
  const [savingsGoals, setSavings]    = useState([])
  const [notifications, setNotifs]    = useState([])
  const [trendsData, setTrends]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [currencySymbol, setSymbol]   = useState('$')
  const [toast, setToast]             = useState(null)
  const [confirm, setConfirm]         = useState(null)
  const [modalData, setModalData]     = useState(null)
  const [showAddExp, setShowAddExp]   = useState(false)
  const [showAddInc, setShowAddInc]   = useState(false)
  const [editingExpense, setEditing]  = useState(null)
  const [editForm, setEditForm]       = useState({ amount: '', category: 'Food', description: '', date: '', is_recurring: false })
  const [showNotifs, setShowNotifs]   = useState(false)

  const today = new Date()
  const [selectedMonth, setMonth] = useState(today.getMonth())
  const [selectedYear, setYear]   = useState(today.getFullYear())
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()
  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  const showToast   = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])
  const askConfirm  = (msg, fn) => setConfirm({ message: msg, onConfirm: fn })

  // Fetch helpers
  const fetchExpenses = useCallback(async () => { try { const r = await API.get('/expenses'); setExpenses(r.data) } catch {} }, [])
  const fetchBudgets  = useCallback(async () => { try { const r = await API.get('/budgets'); setBudgets(r.data) } catch {} }, [])
  const fetchSavings  = useCallback(async () => { try { const r = await API.get('/savings'); setSavings(r.data) } catch {} }, [])
  const fetchTrends   = useCallback(async () => { try { const r = await API.get('/expenses/trends'); setTrends(r.data) } catch {} }, [])
  const fetchNotifs   = useCallback(async () => { try { const r = await API.get('/notifications'); setNotifs(r.data) } catch {} }, [])
  const fetchIncome   = useCallback(async () => {
    try { const r = await API.get('/income?month=' + (selectedMonth + 1) + '&year=' + selectedYear); setIncomeList(r.data) } catch {}
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) { window.location.href = '/login'; return }
    setUser(JSON.parse(storedUser))
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  }, [])

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
        .then(r => { if (r.data.added > 0) { fetchExpenses(); showToast(r.data.added + ' recurring expense(s) added', 'warning') } }).catch(() => {})
      API.post('/income/apply-recurring', { month: selectedMonth + 1, year: selectedYear })
        .then(r => { if (r.data.added > 0) { fetchIncome(); showToast(r.data.added + ' recurring income(s) added', 'warning') } }).catch(() => {})
    }
  }, [selectedMonth, selectedYear, isCurrentMonth, fetchIncome, fetchExpenses, showToast])

  const markRead = async () => {
    try { await API.put('/notifications/read', {}); setNotifs(prev => prev.map(n => ({ ...n, is_read: true }))) } catch {}
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
      try { await API.delete('/expenses/' + id); fetchExpenses(); showToast('Expense deleted', 'error') } catch {}
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
      try { await API.delete('/income/' + id); fetchIncome(); showToast('Income deleted', 'error') } catch {}
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

  const inputCls = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout unreadCount={unread} onBellClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markRead() }}>
      {toast    && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm  && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {modalData && <NumberModal {...modalData} onClose={() => setModalData(null)} />}
      {showAddExp && <AddExpenseSheet onClose={() => setShowAddExp(false)} onSave={handleAddExpense} currencySymbol={currencySymbol} />}
      {showAddInc && <AddIncomeSheet  onClose={() => setShowAddInc(false)} onSave={handleAddIncome} currencySymbol={currencySymbol} />}

      {/* Notifications dropdown */}
      {showNotifs && (
        <div className="fixed top-16 right-4 z-40 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Notifications</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0
              ? <p className="text-gray-400 text-sm p-4">No notifications</p>
              : notifications.slice(0, 10).map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700 text-sm ${n.is_read ? 'text-gray-500' : 'text-gray-800 dark:text-white font-medium'}`}>
                  {n.message}
                </div>
              ))
            }
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 pb-8">

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 transition font-bold text-lg">&lsaquo;</button>
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">{monthName}</p>
            {isCurrentMonth && <span className="text-xs text-emerald-500 font-medium">Current month</span>}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className={`w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition font-bold text-lg ${isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600'}`}>
            &rsaquo;
          </button>
        </div>

        {/* Hero Balance Card */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-purple-700 rounded-3xl p-6 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white" />
          </div>
          <div className="relative">
            <p className="text-emerald-200 text-xs font-medium mb-1">
              {user?.name ? 'Hey, ' + user.name.split(' ')[0] : 'Balance'} — {monthName}
            </p>
            <button onClick={() => setModalData({ label: 'Balance — ' + monthName, value: (balance >= 0 ? '+' : '-') + fmt(Math.abs(balance), currencySymbol), sub: savingsRate + '% savings rate' })}
              className="text-left w-full">
              <p className={`text-4xl font-bold text-white tabular-nums mb-1 ${balance < 0 ? 'text-red-200' : ''}`}>
                {balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance), currencySymbol)}
              </p>
            </button>
            <p className="text-emerald-200 text-xs">
              {balance >= 0 ? savingsRate + '% saved this month' : 'Spending over income'}
            </p>
          </div>

          {/* 3 stat chips */}
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
              <p className="text-emerald-200 text-xs mb-0.5">Transactions</p>
              <p className="text-white font-bold text-sm tabular-nums">{monthExpenses.length}</p>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        {isCurrentMonth && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Expense', icon: '➕', color: 'bg-emerald-600', action: () => setShowAddExp(true) },
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

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Transactions</h3>
            <a href="/reports" className="text-emerald-600 text-xs font-semibold hover:underline">View all</a>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">💸</p>
              <p className="text-gray-400 text-sm">No expenses for {monthName}</p>
              {isCurrentMonth && (
                <button onClick={() => setShowAddExp(true)} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Add First Expense</button>
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
                        <input type="checkbox" checked={editForm.is_recurring} onChange={e => setEditForm({ ...editForm, is_recurring: e.target.checked })} className="accent-emerald-600" />
                        Recurring monthly
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-semibold">Save</button>
                        <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white py-2 rounded-xl text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 transition group">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: (CATEGORY_COLORS[expense.category] || '#6B7280') + '22' }}>
                        {CATEGORY_ICONS[expense.category] || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {expense.description || expense.category}
                        </p>
                        <p className="text-xs text-gray-400">{expense.date?.split('T')[0]}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="font-bold text-gray-800 dark:text-white tabular-nums text-sm">
                          -{currencySymbol}{safeNum(expense.amount).toFixed(2)}
                        </p>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={() => { setEditing(expense.id); setEditForm({ amount: expense.amount, category: expense.category, description: expense.description || '', date: expense.date?.split('T')[0], is_recurring: expense.is_recurring || false }) }}
                            className="text-emerald-400 hover:text-emerald-600 p-1">
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
                        <div className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: budgetPct + '%' }} />
                      ) : (
                        <div className="h-1.5 rounded-full bg-emerald-300 dark:bg-emerald-700 transition-all"
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
            <a href="/budgets" className="mt-3 block text-center text-emerald-600 text-xs font-semibold hover:underline">Manage Budgets</a>
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
              <a href="/savings" className="text-emerald-600 text-xs font-semibold hover:underline">View all</a>
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
                      <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-emerald-500'}`}
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
