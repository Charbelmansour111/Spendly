import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useEffect, useState } from 'react'
import API from '../utils/api'
import ReceiptScanner from '../components/ReceiptScanner'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return <span key={i}>{part}</span>
  })
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 animate-bounce ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
    </div>
  )
}

function Dashboard() {
  const [user, setUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [budgets, setBudgets] = useState([])
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', amount: '' })
  const [editingExpense, setEditingExpense] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '', category: 'Food', description: '', date: '', is_recurring: false })
  const [filter, setFilter] = useState({ category: 'All', sort: 'newest' })
  const [search, setSearch] = useState('')
  const [incomeList, setIncomeList] = useState([])
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: 'Salary' })
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    amount: '', category: 'Food', description: '',
    date: new Date().toISOString().split('T')[0], is_recurring: false
  })

  // Savings Goals state
  const [savingsGoals, setSavingsGoals] = useState([])
  const [showSavingsForm, setShowSavingsForm] = useState(false)
  const [savingsForm, setSavingsForm] = useState({ name: '', target_amount: '', saved_amount: '', deadline: '' })
  const [addFundsId, setAddFundsId] = useState(null)
  const [addFundsAmount, setAddFundsAmount] = useState('')

  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()

  const currencySymbol = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (isCurrentMonth) return
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const monthName = new Date(selectedYear, selectedMonth, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })

  const showToast = (message, type = 'success') => setToast({ message, type })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) { window.location.href = '/login'; return }
    const parsedUser = JSON.parse(storedUser)
    if (parsedUser) setUser(parsedUser)
    fetchExpenses()
    fetchBudgets()
    fetchSavingsGoals()
  }, [])

  useEffect(() => {
    fetchIncome()
    if (isCurrentMonth) {
      const token = localStorage.getItem('token')
      API.post('/expenses/apply-recurring',
        { month: selectedMonth + 1, year: selectedYear },
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(res => {
        if (res.data.added > 0) {
          fetchExpenses()
          showToast(`🔁 ${res.data.added} recurring expense${res.data.added > 1 ? 's' : ''} added for ${monthName}!`, 'warning')
        }
      }).catch(() => {})
    }
  }, [selectedMonth, selectedYear])

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/expenses', { headers: { Authorization: `Bearer ${token}` } })
      setExpenses(res.data)
    } catch { console.log('Error fetching expenses') }
  }

  const fetchBudgets = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/budgets', { headers: { Authorization: `Bearer ${token}` } })
      setBudgets(res.data)
    } catch { console.log('Error fetching budgets') }
  }

  const fetchIncome = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get(`/income?month=${selectedMonth + 1}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIncomeList(res.data)
    } catch { console.log('Error fetching income') }
  }

  const fetchSavingsGoals = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/savings', { headers: { Authorization: `Bearer ${token}` } })
      setSavingsGoals(res.data)
    } catch { console.log('Error fetching savings goals') }
  }

  const handleSavingsSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/savings', savingsForm, { headers: { Authorization: `Bearer ${token}` } })
      setSavingsForm({ name: '', target_amount: '', saved_amount: '', deadline: '' })
      setShowSavingsForm(false)
      fetchSavingsGoals()
      showToast('🎯 Savings goal created!')
    } catch { console.log('Error creating savings goal') }
  }

  const handleAddFunds = async (id) => {
    try {
      const goal = savingsGoals.find(g => g.id === id)
      const newAmount = parseFloat(goal.saved_amount) + parseFloat(addFundsAmount)
      const token = localStorage.getItem('token')
      await API.patch(`/savings/${id}`, { saved_amount: newAmount }, { headers: { Authorization: `Bearer ${token}` } })
      setAddFundsId(null)
      setAddFundsAmount('')
      fetchSavingsGoals()
      showToast('💰 Funds added to goal!')
    } catch { console.log('Error updating savings goal') }
  }

  const handleDeleteSavings = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/savings/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchSavingsGoals()
      showToast('🗑️ Goal deleted', 'error')
    } catch { console.log('Error deleting savings goal') }
  }

  const handleIncomeSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/income', { ...incomeForm, month: selectedMonth + 1, year: selectedYear },
        { headers: { Authorization: `Bearer ${token}` } })
      setIncomeForm({ amount: '', source: 'Salary' })
      setShowIncomeForm(false)
      fetchIncome()
      showToast('✅ Income added successfully!')
    } catch { console.log('Error adding income') }
  }

  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Delete this income entry?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/income/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchIncome()
      showToast('🗑️ Income deleted', 'error')
    } catch { console.log('Error deleting income') }
  }

  const handleBudgetSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/budgets', budgetForm, { headers: { Authorization: `Bearer ${token}` } })
      setBudgetForm({ category: 'Food', amount: '' })
      fetchBudgets()
      showToast('🎯 Budget goal set!')
    } catch { console.log('Error saving budget') }
  }

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget goal?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/budgets/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchBudgets()
      showToast('🗑️ Budget deleted', 'error')
    } catch { console.log('Error deleting budget') }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/expenses', form, { headers: { Authorization: `Bearer ${token}` } })
      setForm({ amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] })
      const updatedExpenses = await API.get('/expenses', { headers: { Authorization: `Bearer ${token}` } })
      setExpenses(updatedExpenses.data)
      const newMonthExpenses = updatedExpenses.data.filter(ex => {
        const d = new Date(ex.date)
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
      })
      const newCategoryData = newMonthExpenses.reduce((acc, ex) => {
        const existing = acc.find(item => item.name === ex.category)
        if (existing) existing.value += parseFloat(ex.amount)
        else acc.push({ name: ex.category, value: parseFloat(ex.amount) })
        return acc
      }, [])
      const budget = budgets.find(b => b.category === form.category)
      if (budget) {
        const spent = newCategoryData.find(c => c.name === form.category)?.value || 0
        const pct = (spent / parseFloat(budget.amount)) * 100
        if (spent > parseFloat(budget.amount)) {
          showToast(`⚠️ Over budget on ${form.category}! Spent ${currencySymbol}${spent.toFixed(2)} of ${currencySymbol}${parseFloat(budget.amount).toFixed(2)}`, 'error')
        } else if (pct >= 90) {
          showToast(`⚡ Almost at budget limit for ${form.category}! ${pct.toFixed(0)}% used`, 'warning')
        } else {
          showToast('✅ Expense added!')
        }
      } else {
        showToast('✅ Expense added!')
      }
    } catch { console.log('Error adding expense') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchExpenses()
      showToast('🗑️ Expense deleted', 'error')
    } catch { console.log('Error deleting expense') }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.put(`/expenses/${editingExpense}`, editForm, { headers: { Authorization: `Bearer ${token}` } })
      setEditingExpense(null)
      fetchExpenses()
      showToast('✅ Expense updated!')
    } catch { console.log('Error editing expense') }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const getInsights = async () => {
    setLoadingInsight(true)
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/insights', { headers: { Authorization: `Bearer ${token}` } })
      setInsight(res.data.insight)
    } catch { setInsight('Error getting insights. Try again.') }
    setLoadingInsight(false)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(24)
    doc.setTextColor(79, 70, 229)
    doc.text('Spendly', 14, 20)
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(`Report for: ${user?.name}`, 14, 30)
    doc.text(`Period: ${monthName}`, 14, 37)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 44)
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Income: ${currencySymbol}${totalIncome.toFixed(2)}`, 14, 57)
    doc.text(`Total Spent: ${currencySymbol}${total.toFixed(2)}`, 14, 65)
    doc.text(`Balance: ${currencySymbol}${balance.toFixed(2)}`, 14, 73)
    doc.setFontSize(13)
    doc.setTextColor(79, 70, 229)
    doc.text('Spending by Category', 14, 87)
    autoTable(doc, {
      startY: 92,
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryData.map(c => [c.name, `${currencySymbol}${c.value.toFixed(2)}`, total > 0 ? `${((c.value / total) * 100).toFixed(0)}%` : '0%']),
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 245, 255] }
    })
    doc.setFontSize(13)
    doc.setTextColor(79, 70, 229)
    doc.text('All Expenses', 14, doc.lastAutoTable.finalY + 15)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: selectedMonthExpenses.map(e => [e.date?.split('T')[0], e.category, e.description || '-', `${currencySymbol}${parseFloat(e.amount).toFixed(2)}`]),
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 245, 255] }
    })
    doc.save(`spendly-${monthName.replace(' ', '-')}.pdf`)
  }

  const selectedMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  const total = selectedMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalIncome = incomeList.reduce((sum, i) => sum + parseFloat(i.amount), 0)
  const balance = totalIncome - total
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(0) : null

  const categoryData = selectedMonthExpenses.reduce((acc, e) => {
    const existing = acc.find(item => item.name === e.category)
    if (existing) existing.value += parseFloat(e.amount)
    else acc.push({ name: e.category, value: parseFloat(e.amount) })
    return acc
  }, [])

  const weeklyData = (() => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    return weeks.map((label, i) => {
      const weekStart = i * 7 + 1
      const weekEnd = i === 3 ? 31 : weekStart + 6
      const weekTotal = selectedMonthExpenses
        .filter(e => {
          const day = new Date(e.date).getDate()
          return day >= weekStart && day <= weekEnd
        })
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
      return { label, total: weekTotal }
    })
  })()

  const filteredExpenses = selectedMonthExpenses
    .filter(e => filter.category === 'All' || e.category === filter.category)
    .filter(e => {
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return e.category.toLowerCase().includes(s) || (e.description && e.description.toLowerCase().includes(s))
    })
    .sort((a, b) => {
      if (filter.sort === 'newest') return new Date(b.date) - new Date(a.date)
      if (filter.sort === 'oldest') return new Date(a.date) - new Date(b.date)
      if (filter.sort === 'highest') return parseFloat(b.amount) - parseFloat(a.amount)
      if (filter.sort === 'lowest') return parseFloat(a.amount) - parseFloat(b.amount)
      return 0
    })

  const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
  const categoryIcons = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
  const insightLines = insight ? insight.split('\n').filter(l => l.trim() !== '') : []

  const goalEmojis = ['🏖️', '🚗', '🏠', '💻', '✈️', '🎓', '💍', '🏋️', '🎮', '💰']

  return (
    <div className="min-h-screen bg-gray-50">

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Spendly</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm hidden md:block">Hi, {user.name} 👋</span>
            <a href="/dashboard" className="text-gray-500 text-xl hover:text-indigo-600 transition" title="Dashboard">🏠</a>
            <a href="/profile" className="text-gray-500 text-xl hover:text-indigo-600 transition" title="Profile">👤</a>
            <button onClick={handleLogout} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition">Logout</button>
          </div>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={prevMonth} className="bg-white shadow-sm border border-gray-200 text-gray-600 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition text-lg font-bold">‹</button>
          <div className="bg-white shadow-sm border border-gray-200 px-6 py-2 rounded-xl">
            <span className="font-semibold text-gray-800">{monthName}</span>
            {isCurrentMonth && <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Current</span>}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} className={`bg-white shadow-sm border border-gray-200 w-10 h-10 rounded-xl flex items-center justify-center transition text-lg font-bold ${isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'}`}>›</button>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-6">
          <p className="text-indigo-200 text-sm mb-4">{monthName} Overview</p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-300 text-lg">↑</span>
                  <p className="text-indigo-200 text-xs">Income</p>
                </div>
                <p className="text-lg font-bold text-green-300">{currencySymbol}{totalIncome.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-red-300 text-lg">↓</span>
                  <p className="text-indigo-200 text-xs">Spent</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-300">{currencySymbol}{total.toFixed(2)}</p>
                  <p className="text-indigo-300 text-xs">{selectedMonthExpenses.length} transactions</p>
                </div>
              </div>
            </div>
            <div className="w-px bg-white/20 self-stretch" />
            <div className="flex flex-col items-center justify-center min-w-[120px]">
              <p className="text-indigo-200 text-xs mb-1">Balance</p>
              <p className={`text-3xl font-bold ${balance < 0 ? 'text-red-300' : 'text-green-300'}`}>
                {balance < 0 ? '-' : '+'}{currencySymbol}{Math.abs(balance).toFixed(2)}
              </p>
              {savingsRate !== null && (
                <span className={`mt-2 text-xs px-3 py-1 rounded-full font-semibold ${balance >= 0 ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'}`}>
                  {balance >= 0 ? `${savingsRate}% saved` : 'Over budget!'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Income Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">💰 Income — {monthName}</h3>
            {isCurrentMonth && (
              <button onClick={() => setShowIncomeForm(!showIncomeForm)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                {showIncomeForm ? 'Cancel' : '+ Add Income'}
              </button>
            )}
          </div>
          {showIncomeForm && isCurrentMonth && (
            <form onSubmit={handleIncomeSubmit} className="mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount ({currencySymbol})</label>
                  <input type="number" placeholder="e.g. 1500" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} required min="0.01" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Source</label>
                  <select value={incomeForm.source} onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option>Salary</option><option>Freelance</option><option>Business</option><option>Investment</option><option>Other</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700 transition">+ Save Income</button>
            </form>
          )}
          {incomeList.length === 0 ? (
            <p className="text-gray-400 text-sm">{isCurrentMonth ? 'No income added for this month yet.' : `No income recorded for ${monthName}.`}</p>
          ) : (
            <div className="space-y-2">
              {incomeList.map(inc => (
                <div key={inc.id} className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💵</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{inc.source}</p>
                      <p className="text-xs text-gray-400">{monthName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-600">+{currencySymbol}{parseFloat(inc.amount).toFixed(2)}</span>
                    {isCurrentMonth && (
                      <button onClick={() => handleDeleteIncome(inc.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded-lg transition border border-red-200">🗑️</button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm font-semibold text-gray-600">Total Income</span>
                <span className="font-bold text-green-600 text-lg">{currencySymbol}{totalIncome.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {isCurrentMonth ? (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Expense</h3>
              <ReceiptScanner onScanComplete={(data) => setForm({ ...form, amount: data.amount, description: data.description })} />
              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="number" name="amount" placeholder={`Amount (${currencySymbol})`} value={form.amount} onChange={handleChange} required min="0.01" step="0.01" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select name="category" value={form.category} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Food</option><option>Transport</option><option>Shopping</option>
                  <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
                </select>
                <input type="text" name="description" placeholder="Description (optional)" value={form.description} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm text-gray-600">🔁 Recurring monthly</span>
                </label>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">+ Add Expense</button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-semibold text-gray-700">Viewing {monthName}</p>
              <p className="text-gray-400 text-sm mt-1">You can't add expenses to a past month.</p>
            </div>
          )}

          {categoryData.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${currencySymbol}${v.toFixed(2)}`} />
                  <Legend formatter={(value) => {
                    const item = categoryData.find(c => c.name === value)
                    const pct = item && total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
                    return `${value} (${pct}%)`
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-gray-400 text-sm">No expenses for {monthName} yet.</p>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" /><YAxis />
                <Tooltip formatter={(v) => `${currencySymbol}${v.toFixed(2)}`} />
                <Bar dataKey="value" fill="#4F46E5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weekly Breakdown */}
        {selectedMonthExpenses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">📅 Weekly Breakdown</h3>
            <p className="text-gray-400 text-xs mb-5">How your spending is spread across {monthName}</p>
            <div className="grid grid-cols-4 gap-4">
              {weeklyData.map((week, i) => {
                const maxWeekTotal = Math.max(...weeklyData.map(w => w.total), 1)
                const heightPct = week.total > 0 ? (week.total / maxWeekTotal) * 100 : 0
                const isHighest = week.total === maxWeekTotal && week.total > 0
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className={`text-xs font-semibold ${isHighest ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {currencySymbol}{week.total.toFixed(0)}
                    </span>
                    <div className="w-full bg-gray-100 rounded-xl flex flex-col justify-end overflow-hidden" style={{ height: '80px' }}>
                      <div
                        className={`w-full rounded-xl transition-all duration-500 ${isHighest ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${isHighest ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {week.label}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
              <span>Avg/week: <span className="font-semibold text-gray-600">{currencySymbol}{(total / 4).toFixed(2)}</span></span>
              <span>Highest: <span className="font-semibold text-indigo-600">{weeklyData.reduce((a, b) => a.total > b.total ? a : b).label}</span></span>
            </div>
          </div>
        )}

        {/* Budget Goals */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Budget Goals</h3>
          <form onSubmit={handleBudgetSubmit} className="mb-6">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Food</option><option>Transport</option><option>Shopping</option>
                  <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monthly Limit ({currencySymbol})</label>
                <input type="number" placeholder="e.g. 200" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} required className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 transition">Set Budget</button>
          </form>
          {budgets.length === 0 ? (
            <p className="text-gray-400 text-sm">No budget goals set yet.</p>
          ) : (
            <div className="space-y-4">
              {budgets.map(budget => {
                const spent = categoryData.find(c => c.name === budget.category)?.value || 0
                const pct = Math.min((spent / parseFloat(budget.amount)) * 100, 100)
                const isOver = spent > parseFloat(budget.amount)
                const isClose = pct >= 90 && !isOver
                return (
                  <div key={budget.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{categoryIcons[budget.category]} {budget.category}</span>
                      <div className="flex items-center gap-2">
                        <span className={isOver ? 'text-red-500 font-bold' : 'text-gray-500'}>
                          {currencySymbol}{spent.toFixed(2)} / {currencySymbol}{parseFloat(budget.amount).toFixed(2)}
                          {isOver && ' ⚠️ Over budget!'}
                          {isClose && ' ⚡ Almost there!'}
                        </span>
                        <button onClick={() => handleDeleteBudget(budget.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded-lg transition border border-red-200">🗑️</button>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`h-3 rounded-full transition-all ${isOver ? 'bg-red-500' : pct >= 90 ? 'bg-orange-500' : pct >= 70 ? 'bg-yellow-400' : pct >= 40 ? 'bg-lime-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Savings Goals */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">🏦 Savings Goals</h3>
            <button onClick={() => setShowSavingsForm(!showSavingsForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
              {showSavingsForm ? 'Cancel' : '+ New Goal'}
            </button>
          </div>

          {showSavingsForm && (
            <form onSubmit={handleSavingsSubmit} className="mb-6 bg-indigo-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Goal Name</label>
                  <input type="text" placeholder="e.g. Vacation to Paris" value={savingsForm.name} onChange={e => setSavingsForm({ ...savingsForm, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target Amount ({currencySymbol})</label>
                  <input type="number" placeholder="e.g. 2000" value={savingsForm.target_amount} onChange={e => setSavingsForm({ ...savingsForm, target_amount: e.target.value })} required min="1" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Already Saved ({currencySymbol})</label>
                  <input type="number" placeholder="e.g. 500" value={savingsForm.saved_amount} onChange={e => setSavingsForm({ ...savingsForm, saved_amount: e.target.value })} min="0" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Deadline</label>
                  <input type="date" value={savingsForm.deadline} onChange={e => setSavingsForm({ ...savingsForm, deadline: e.target.value })} required className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 transition">🎯 Create Goal</button>
            </form>
          )}

          {savingsGoals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">🏦</p>
              <p className="text-sm">No savings goals yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savingsGoals.map((goal, idx) => {
                const saved = parseFloat(goal.saved_amount)
                const target = parseFloat(goal.target_amount)
                const pct = Math.min((saved / target) * 100, 100)
                const isComplete = saved >= target
                const deadline = new Date(goal.deadline)
                const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
                const emoji = goalEmojis[idx % goalEmojis.length]

                return (
                  <div key={goal.id} className={`rounded-xl p-4 border ${isComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{emoji}</span>
                        <div>
                          <p className="font-semibold text-gray-800">{goal.name}</p>
                          <p className="text-xs text-gray-400">
                            {isComplete ? '✅ Goal reached!' : daysLeft > 0 ? `⏰ ${daysLeft} days left` : '⚠️ Deadline passed'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isComplete && <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-semibold">🎉 Complete!</span>}
                        <button onClick={() => handleDeleteSavings(goal.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded-lg transition border border-red-200">🗑️</button>
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{currencySymbol}{saved.toFixed(2)} saved</span>
                        <span className="font-semibold text-gray-700">{currencySymbol}{target.toFixed(2)} goal</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : pct >= 75 ? 'bg-lime-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-indigo-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-right text-xs text-gray-400 mt-1">{pct.toFixed(0)}%</p>
                    </div>

                    {!isComplete && (
                      addFundsId === goal.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="number"
                            placeholder={`Amount (${currencySymbol})`}
                            value={addFundsAmount}
                            onChange={e => setAddFundsAmount(e.target.value)}
                            min="0.01" step="0.01"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button onClick={() => handleAddFunds(goal.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">Add</button>
                          <button onClick={() => { setAddFundsId(null); setAddFundsAmount('') }} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-300 transition">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setAddFundsId(goal.id)} className="mt-2 w-full border border-indigo-200 text-indigo-600 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition">
                          + Add Funds
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Export PDF */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">📄 Expense Report</h3>
            <p className="text-gray-400 text-sm">Download {monthName} expenses as PDF</p>
          </div>
          <button onClick={exportPDF} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">⬇️ Download PDF</button>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">🤖 AI Insights</h3>
            <button onClick={getInsights} disabled={loadingInsight} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
              {loadingInsight ? 'Analyzing...' : 'Analyze My Spending'}
            </button>
          </div>
          {insightLines.length > 0 ? (
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
              {insightLines.map((line, i) => (
                <p key={i} className="text-gray-700 text-sm leading-relaxed">{renderMarkdown(line)}</p>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Click "Analyze My Spending" to get personalized AI insights.</p>
          )}
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Expenses — {monthName}</h3>
              <div className="flex flex-wrap gap-2">
                <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="All">All Categories</option>
                  <option>Food</option><option>Transport</option><option>Shopping</option>
                  <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
                </select>
                <select value={filter.sort} onChange={e => setFilter({ ...filter, sort: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>
              </div>
            </div>
            <input
              type="text"
              placeholder="🔍 Search by description or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">💸</p>
              <p>{search ? 'No expenses match your search.' : isCurrentMonth ? 'No expenses yet. Add your first one!' : `No expenses found for ${monthName}.`}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map(expense => (
                <div key={expense.id} className="bg-gray-50 rounded-xl p-4">
                  {editingExpense === expense.id ? (
                    <form onSubmit={handleEdit} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} required min="0.01" step="0.01" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option>Food</option><option>Transport</option><option>Shopping</option>
                          <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
                        </select>
                        <input type="text" placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} required className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.is_recurring} onChange={e => setEditForm({ ...editForm, is_recurring: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
                        <span className="text-sm text-gray-600">🔁 Recurring monthly</span>
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">Save</button>
                        <button type="button" onClick={() => setEditingExpense(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{categoryIcons[expense.category] || '📦'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">{expense.category}</span>
                              {expense.is_recurring && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">🔁 Recurring</span>}
                              {expense.description && expense.description.length > 1 && (
                                <span className="text-sm text-gray-600">{expense.description}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{expense.date?.split('T')[0]}</p>
                          </div>
                        </div>
                        <span className="font-bold text-gray-800">{currencySymbol}{parseFloat(expense.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => { setEditingExpense(expense.id); setEditForm({ amount: expense.amount, category: expense.category, description: expense.description || '', date: expense.date?.split('T')[0], is_recurring: expense.is_recurring || false }) }}
                          className="text-indigo-400 hover:text-indigo-600 text-xs px-3 py-1 hover:bg-indigo-50 rounded-lg transition border border-indigo-200">✏️ Edit</button>
                        <button onClick={() => handleDelete(expense.id)} className="text-red-400 hover:text-red-600 text-xs px-3 py-1 hover:bg-red-50 rounded-lg transition border border-red-200">🗑️ Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-6 text-gray-400 text-sm mt-8">
        <p>© 2026 <span className="text-indigo-600 font-semibold">Spendly</span> — Track smarter, spend better 💸</p>
      </footer>
    </div>
  )
}

export default Dashboard