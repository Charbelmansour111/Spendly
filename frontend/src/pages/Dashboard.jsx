import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useEffect, useState } from 'react'
import API from '../utils/api'
import ReceiptScanner from '../components/ReceiptScanner'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function Dashboard() {
  const [user, setUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [budgets, setBudgets] = useState([])
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', amount: '' })
  const [editingExpense, setEditingExpense] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '', category: 'Food', description: '', date: '' })
  const [filter, setFilter] = useState({ category: 'All', sort: 'newest' })
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  // ✅ Income state
  const [incomeList, setIncomeList] = useState([])
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: 'Salary' })
  const [showIncomeForm, setShowIncomeForm] = useState(false)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      window.location.href = '/login'
    } else {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser) setUser(parsedUser)
      fetchExpenses()
      fetchBudgets()
      fetchIncome()
    }
  }, [])

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

  // ✅ Fetch income for current month
  const fetchIncome = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get(`/income?month=${currentMonth}&year=${currentYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIncomeList(res.data)
    } catch { console.log('Error fetching income') }
  }

  // ✅ Add income
  const handleIncomeSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/income', {
        ...incomeForm,
        month: currentMonth,
        year: currentYear
      }, { headers: { Authorization: `Bearer ${token}` } })
      setIncomeForm({ amount: '', source: 'Salary' })
      setShowIncomeForm(false)
      fetchIncome()
    } catch { console.log('Error adding income') }
  }

  // ✅ Delete income
  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Delete this income entry?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/income/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchIncome()
    } catch { console.log('Error deleting income') }
  }

  const handleBudgetSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/budgets', budgetForm, { headers: { Authorization: `Bearer ${token}` } })
      setBudgetForm({ category: 'Food', amount: '' })
      fetchBudgets()
    } catch { console.log('Error saving budget') }
  }

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget goal?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/budgets/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchBudgets()
    } catch { console.log('Error deleting budget') }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/expenses', form, { headers: { Authorization: `Bearer ${token}` } })
      setForm({ amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] })
      fetchExpenses()
    } catch { console.log('Error adding expense') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchExpenses()
    } catch { console.log('Error deleting expense') }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.put(`/expenses/${editingExpense}`, editForm, { headers: { Authorization: `Bearer ${token}` } })
      setEditingExpense(null)
      fetchExpenses()
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
    } catch {
      setInsight('Error getting insights. Try again.')
    }
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
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 37)
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Income: $${totalIncome.toFixed(2)}`, 14, 50)
    doc.text(`Total Spent: $${total.toFixed(2)}`, 14, 58)
    doc.text(`Balance: $${balance.toFixed(2)}`, 14, 66)
    doc.setFontSize(13)
    doc.setTextColor(79, 70, 229)
    doc.text('Spending by Category', 14, 80)
    autoTable(doc, {
      startY: 85,
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryData.map(c => [c.name, `$${c.value.toFixed(2)}`, `${((c.value / total) * 100).toFixed(0)}%`]),
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 245, 255] }
    })
    doc.setFontSize(13)
    doc.setTextColor(79, 70, 229)
    doc.text('All Expenses', 14, doc.lastAutoTable.finalY + 15)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenses.map(e => [e.date?.split('T')[0], e.category, e.description || '-', `$${parseFloat(e.amount).toFixed(2)}`]),
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 245, 255] }
    })
    doc.save(`spendly-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // ✅ This month only
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
  })

  const total = thisMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalIncome = incomeList.reduce((sum, i) => sum + parseFloat(i.amount), 0)
  const balance = totalIncome - total
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(0) : null

  const categoryData = thisMonthExpenses.reduce((acc, e) => {
    const existing = acc.find(item => item.name === e.category)
    if (existing) existing.value += parseFloat(e.amount)
    else acc.push({ name: e.category, value: parseFloat(e.amount) })
    return acc
  }, [])

  const filteredExpenses = expenses
    .filter(e => filter.category === 'All' || e.category === filter.category)
    .sort((a, b) => {
      if (filter.sort === 'newest') return new Date(b.date) - new Date(a.date)
      if (filter.sort === 'oldest') return new Date(a.date) - new Date(b.date)
      if (filter.sort === 'highest') return parseFloat(b.amount) - parseFloat(a.amount)
      if (filter.sort === 'lowest') return parseFloat(a.amount) - parseFloat(b.amount)
      return 0
    })

  const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
  const categoryIcons = {
    Food: '🍔', Transport: '🚗', Shopping: '🛍️',
    Subscriptions: '📱', Entertainment: '🎬', Other: '📦'
  }
  const insightLines = insight ? insight.split('\n').filter(l => l.trim() !== '') : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Spendly</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">Hi, {user.name} 👋</span>
            <button onClick={handleLogout} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition">Logout</button>
          </div>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ✅ NEW: Income / Spent / Balance summary card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-6">
          <p className="text-indigo-200 text-sm mb-4">{monthName} Overview</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-indigo-200 text-xs">Income</p>
              <p className="text-2xl font-bold">${totalIncome.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs">Spent</p>
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
              <p className="text-indigo-200 text-xs mt-1">{thisMonthExpenses.length} transactions</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs">Balance</p>
              <p className={`text-2xl font-bold ${balance < 0 ? 'text-red-300' : 'text-green-300'}`}>
                {balance < 0 ? '-' : '+'}${Math.abs(balance).toFixed(2)}
              </p>
              {savingsRate !== null && (
                <p className="text-indigo-200 text-xs mt-1">
                  {balance >= 0 ? `${savingsRate}% saved` : 'Over budget!'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ✅ NEW: Income section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">💰 Monthly Income</h3>
            <button
              onClick={() => setShowIncomeForm(!showIncomeForm)}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition"
            >
              {showIncomeForm ? 'Cancel' : '+ Add Income'}
            </button>
          </div>

          {showIncomeForm && (
            <form onSubmit={handleIncomeSubmit} className="flex gap-3 mb-4">
              <input
                type="number"
                placeholder="Amount ($)"
                value={incomeForm.amount}
                onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                required
                min="0.01"
                step="0.01"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={incomeForm.source}
                onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option>Salary</option>
                <option>Freelance</option>
                <option>Business</option>
                <option>Investment</option>
                <option>Other</option>
              </select>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700 transition">
                Save
              </button>
            </form>
          )}

          {incomeList.length === 0 ? (
            <p className="text-gray-400 text-sm">No income added for {monthName} yet. Add your income to see your balance.</p>
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
                    <span className="font-bold text-green-600">+${parseFloat(inc.amount).toFixed(2)}</span>
                    <button
                      onClick={() => handleDeleteIncome(inc.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded-lg transition border border-red-200"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm font-semibold text-gray-600">Total Income</span>
                <span className="font-bold text-green-600 text-lg">${totalIncome.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Add Expense Form */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Expense</h3>
            <ReceiptScanner onScanComplete={(data) => setForm({ ...form, amount: data.amount, description: data.description })} />
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="number" name="amount" placeholder="Amount ($)" value={form.amount} onChange={handleChange} required min="0.01" step="0.01" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <select name="category" value={form.category} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Food</option><option>Transport</option><option>Shopping</option>
                <option>Subscriptions</option><option>Entertainment</option><option>Other</option>
              </select>
              <input type="text" name="description" placeholder="Description (optional)" value={form.description} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">+ Add Expense</button>
            </form>
          </div>

          {/* Pie Chart */}
          {categoryData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                  <Legend formatter={(value) => {
                    const item = categoryData.find(c => c.name === value)
                    const pct = item ? ((item.value / total) * 100).toFixed(0) : 0
                    return `${value} (${pct}%)`
                  }} />
                </PieChart>
              </ResponsiveContainer>
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
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Bar dataKey="value" fill="#4F46E5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                <label className="block text-xs text-gray-500 mb-1">Monthly Limit ($)</label>
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
                          ${spent.toFixed(2)} / ${parseFloat(budget.amount).toFixed(2)}
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

        {/* Export PDF */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">📄 Expense Report</h3>
            <p className="text-gray-400 text-sm">Download all your expenses as a PDF</p>
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
          <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Your Expenses</h3>
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
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">💸</p>
              <p>No expenses yet. Add your first one!</p>
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
                              {expense.description && expense.description.length > 1 && (
                                <span className="text-sm text-gray-600">{expense.description}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{expense.date?.split('T')[0]}</p>
                          </div>
                        </div>
                        <span className="font-bold text-gray-800">${parseFloat(expense.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => { setEditingExpense(expense.id); setEditForm({ amount: expense.amount, category: expense.category, description: expense.description || '', date: expense.date?.split('T')[0] }) }} className="text-indigo-400 hover:text-indigo-600 text-xs px-3 py-1 hover:bg-indigo-50 rounded-lg transition border border-indigo-200">✏️ Edit</button>
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