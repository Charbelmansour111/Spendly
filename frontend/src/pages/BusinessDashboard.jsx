import { useEffect, useState, useCallback } from 'react'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(amount, symbol) {
  return symbol + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 text-center w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-bold text-indigo-600 tabular-nums break-all">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

function AddRevenueSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], total_revenue: '', notes: '' })
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Daily Revenue</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={cls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Total Revenue ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.total_revenue}
              onChange={e => setForm({ ...form, total_revenue: e.target.value })} min="0" step="0.01"
              className={cls + ' text-2xl font-bold'} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
            <input type="text" placeholder="e.g. busy Friday night" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} className={cls} />
          </div>
          <button onClick={() => onSave(form)} disabled={!form.total_revenue || !form.date}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50">
            Save Revenue
          </button>
        </div>
      </div>
    </div>
  )
}

function AddExpenseSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({ amount: '', category: 'Ingredients', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false })
  const BIZ_CATS = ['Ingredients', 'Staff', 'Rent', 'Utilities', 'Marketing', 'Equipment', 'Packaging', 'Other']
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Business Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} min="0.01" step="0.01"
              className={cls + ' text-2xl font-bold'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={cls}>
                {BIZ_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={cls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <input type="text" placeholder="e.g. beef supply from Ali" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} className={cls} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="accent-red-500 w-4 h-4" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly</span>
          </label>
          <button onClick={() => onSave(form)} disabled={!form.amount || !form.date}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition disabled:opacity-50">
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}

function AddEmployeeSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({ name: '', role: 'Staff', salary: '', phone: '', salary_type: 'monthly' })
  const ROLES = ['Manager', 'Chef', 'Sous Chef', 'Waiter', 'Cashier', 'Delivery', 'Cleaner', 'Security', 'Staff']
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Employee</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name</label>
            <input type="text" placeholder="e.g. Ahmad Khalil" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={cls}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Salary Type</label>
              <select value={form.salary_type} onChange={e => setForm({ ...form, salary_type: e.target.value })} className={cls}>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Salary ({currencySymbol}/{form.salary_type === 'monthly' ? 'month' : 'day'})</label>
            <input type="number" placeholder="0.00" value={form.salary}
              onChange={e => setForm({ ...form, salary: e.target.value })} min="0" step="0.01"
              className={cls + ' text-lg font-bold'} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone (optional)</label>
            <input type="tel" placeholder="+961 XX XXX XXX" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} className={cls} />
          </div>
          <button onClick={() => onSave(form)} disabled={!form.name || !form.salary}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
            Add Employee
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BusinessDashboard() {
  const [user, setUser]             = useState(null)
  const [revenue, setRevenue]       = useState([])
  const [expenses, setExpenses]     = useState([])
  const [employees, setEmployees]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [currencySymbol, setSymbol] = useState('$')
  const [toast, setToast]           = useState(null)
  const [modalData, setModalData]   = useState(null)
  const [showAddRev, setShowAddRev] = useState(false)
  const [showAddExp, setShowAddExp] = useState(false)
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [activeTab, setActiveTab]   = useState('overview')

  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) { window.location.href = '/login'; return }
    const u = JSON.parse(storedUser)
    setUser(u)
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    if (u.account_type !== 'business') { window.location.href = '/dashboard'; return }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [rev, exp, emp] = await Promise.all([
        API.get('/business/revenue'),
        API.get('/business/expenses'),
        API.get('/business/employees'),
      ])
      setRevenue(rev.data || [])
      setExpenses(exp.data || [])
      setEmployees(emp.data || [])
    } catch { console.log('Error fetching business data') }
    setLoading(false)
  }

  const handleAddRevenue = async (form) => {
    try { await API.post('/business/revenue', form); setShowAddRev(false); fetchAll(); showToast('Revenue added!') }
    catch { showToast('Error adding revenue', 'error') }
  }

  const handleAddExpense = async (form) => {
    try { await API.post('/expenses', form); setShowAddExp(false); fetchAll(); showToast('Expense added!') }
    catch { showToast('Error adding expense', 'error') }
  }

  const handleAddEmployee = async (form) => {
    try { await API.post('/business/employees', form); setShowAddEmp(false); fetchAll(); showToast('Employee added!') }
    catch { showToast('Error adding employee', 'error') }
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Remove this employee?')) return
    try { await API.delete('/business/employees/' + id); fetchAll(); showToast('Employee removed', 'error') } catch {}
  }

  const monthRevenue = revenue.filter(r => { const d = new Date(r.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() }).reduce((s, r) => s + safeNum(r.total_revenue), 0)
  const monthExpenses = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() }).reduce((s, e) => s + safeNum(e.amount), 0)
  const monthPayroll = employees.filter(e => e.is_active && e.salary_type === 'monthly').reduce((s, e) => s + safeNum(e.salary), 0)
  const netProfit = monthRevenue - monthExpenses - monthPayroll
  const profitMargin = monthRevenue > 0 ? ((netProfit / monthRevenue) * 100).toFixed(1) : 0
  const todayStr = today.toISOString().split('T')[0]
  const todayRevenue = revenue.filter(r => r.date?.split('T')[0] === todayStr).reduce((s, r) => s + safeNum(r.total_revenue), 0)

  const expCategoryData = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() }).reduce((acc, e) => { const f = acc.find(i => i.name === e.category); if (f) f.value += safeNum(e.amount); else acc.push({ name: e.category, value: safeNum(e.amount) }); return acc }, []).sort((a, b) => b.value - a.value)

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayRev = revenue.filter(r => r.date?.split('T')[0] === dateStr).reduce((s, r) => s + safeNum(r.total_revenue), 0)
    return { label: d.toLocaleDateString('default', { weekday: 'short' }), value: dayRev, isToday: i === 6 }
  })
  const maxDay = Math.max(...last7Days.map(d => d.value), 1)
  const isRestaurant = user?.business_type === 'restaurant'
  const businessName = user?.business_name || (isRestaurant ? 'My Restaurant' : 'My Business')

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {modalData && <NumberModal {...modalData} onClose={() => setModalData(null)} />}
      {showAddRev && <AddRevenueSheet onClose={() => setShowAddRev(false)} onSave={handleAddRevenue} currencySymbol={currencySymbol} />}
      {showAddExp && <AddExpenseSheet onClose={() => setShowAddExp(false)} onSave={handleAddExpense} currencySymbol={currencySymbol} />}
      {showAddEmp && <AddEmployeeSheet onClose={() => setShowAddEmp(false)} onSave={handleAddEmployee} currencySymbol={currencySymbol} />}

      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
          <p className="text-xs text-gray-400">Business Dashboard</p>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">{businessName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isRestaurant ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            {isRestaurant ? '🍽️ Restaurant' : '🏪 Firm'}
          </span>
          <a href="/dashboard" className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition">Personal →</a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24">

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-orange-400" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-400" />
          </div>
          <div className="relative">
            <p className="text-gray-400 text-xs mb-1">{monthName} — Net Profit</p>
            <button onClick={() => setModalData({ label: 'Net Profit — ' + monthName, value: fmt(Math.abs(netProfit), currencySymbol), sub: profitMargin + '% profit margin' })}>
              <p className={`text-4xl font-bold tabular-nums mb-1 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : '-'}{fmt(Math.abs(netProfit), currencySymbol)}
              </p>
            </button>
            <p className="text-gray-400 text-xs">{profitMargin}% margin</p>
          </div>
          <div className="relative grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Revenue',  value: fmt(monthRevenue, currencySymbol),  color: 'text-green-400',  click: () => setModalData({ label: 'Revenue — ' + monthName, value: fmt(monthRevenue, currencySymbol) }) },
              { label: 'Expenses', value: fmt(monthExpenses, currencySymbol), color: 'text-red-400',    click: () => setModalData({ label: 'Expenses — ' + monthName, value: fmt(monthExpenses, currencySymbol) }) },
              { label: 'Payroll',  value: fmt(monthPayroll, currencySymbol),  color: 'text-yellow-400', click: () => setModalData({ label: 'Payroll — ' + monthName, value: fmt(monthPayroll, currencySymbol), sub: employees.filter(e => e.is_active).length + ' employees' }) },
            ].map((s, i) => (
              <button key={i} onClick={s.click} className="bg-white/10 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                <p className="text-gray-400 text-xs mb-0.5">{s.label}</p>
                <p className={`font-bold text-sm tabular-nums truncate ${s.color}`}>{s.value}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3 flex items-center gap-3 flex-1">
            <span className="text-2xl">☀️</span>
            <div>
              <p className="text-xs text-orange-400 font-medium">Today's Revenue</p>
              <p className="text-xl font-bold text-orange-600 tabular-nums">{fmt(todayRevenue, currencySymbol)}</p>
            </div>
          </div>
          <button onClick={() => setShowAddRev(true)} className="bg-orange-500 text-white rounded-2xl px-4 py-3 font-bold text-sm hover:bg-orange-600 transition active:scale-95 flex-shrink-0">
            + Revenue
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Revenue', icon: '💵', color: 'bg-green-600',  action: () => setShowAddRev(true) },
            { label: 'Expense', icon: '🧾', color: 'bg-red-500',    action: () => setShowAddExp(true) },
            { label: 'Staff',   icon: '👥', color: 'bg-blue-600',   action: () => setShowAddEmp(true) },
            { label: 'Menu',    icon: '🍽️', color: 'bg-orange-500', action: () => window.location.href = '/business/menu' },
          ].map((a, i) => (
            <button key={i} onClick={a.action} className={`${a.color} text-white rounded-2xl py-3 flex flex-col items-center gap-1 active:scale-95 transition-transform shadow-sm`}>
              <span className="text-xl">{a.icon}</span>
              <span className="text-xs font-semibold">{a.label}</span>
            </button>
          ))}
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5">
          {[{ key: 'overview', label: 'Overview' }, { key: 'staff', label: 'Staff' }, { key: 'expenses', label: 'Expenses' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.key ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Last 7 Days Revenue</h3>
              <div className="flex items-end gap-2 h-24">
                {last7Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-400 tabular-nums">{day.value > 0 ? currencySymbol + (day.value >= 1000 ? (day.value / 1000).toFixed(1) + 'k' : day.value.toFixed(0)) : ''}</p>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" style={{ height: 60 }}>
                      <div style={{ height: (day.value / maxDay) * 60, marginTop: 'auto' }}
                        className={`w-full rounded-lg transition-all duration-500 ${day.isToday ? 'bg-orange-500' : 'bg-orange-200 dark:bg-orange-800'}`} />
                    </div>
                    <p className={`text-xs font-semibold ${day.isToday ? 'text-orange-500' : 'text-gray-400'}`}>{day.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Revenue</h3>
                <button onClick={() => setShowAddRev(true)} className="text-xs text-orange-500 font-semibold hover:underline">+ Add</button>
              </div>
              {revenue.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="text-gray-400 text-sm">No revenue recorded yet</p>
                  <button onClick={() => setShowAddRev(true)} className="mt-3 bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-semibold">Add First Entry</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {revenue.slice(0, 7).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{r.date?.split('T')[0]}</p>
                        {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                      </div>
                      <p className="font-bold text-green-600 tabular-nums text-sm">+{fmt(r.total_revenue, currencySymbol)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {expCategoryData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Expenses This Month</h3>
                <div className="space-y-3">
                  {expCategoryData.map((cat, i) => {
                    const pct = monthExpenses > 0 ? (cat.value / monthExpenses) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-200">{cat.name}</span>
                          <span className="text-sm font-bold text-gray-800 dark:text-white tabular-nums">{fmt(cat.value, currencySymbol)} <span className="text-xs text-gray-400">({Math.round(pct)}%)</span></span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-red-400 transition-all" style={{ width: pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Staff — {employees.filter(e => e.is_active).length} active</h3>
              <button onClick={() => setShowAddEmp(true)} className="text-xs text-blue-600 font-semibold hover:underline">+ Add</button>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4">
              <p className="text-xs text-blue-400 mb-1">Monthly Payroll</p>
              <p className="text-2xl font-bold text-blue-600 tabular-nums">{fmt(monthPayroll, currencySymbol)}</p>
              <p className="text-xs text-blue-400 mt-1">{monthRevenue > 0 ? ((monthPayroll / monthRevenue) * 100).toFixed(1) + '% of revenue' : 'No revenue recorded'}</p>
            </div>
            {employees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-gray-400 text-sm">No employees added yet</p>
                <button onClick={() => setShowAddEmp(true)} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Add First Employee</button>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.filter(e => e.is_active).map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{emp.name}</p>
                      <p className="text-xs text-gray-400">{emp.role}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-white tabular-nums">{fmt(emp.salary, currencySymbol)}</p>
                      <p className="text-xs text-gray-400">/{emp.salary_type === 'monthly' ? 'mo' : 'day'}</p>
                    </div>
                    <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-400 hover:text-red-600 p-1 ml-1 flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Business Expenses</h3>
              <button onClick={() => setShowAddExp(true)} className="text-xs text-red-500 font-semibold hover:underline">+ Add</button>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🧾</p>
                <p className="text-gray-400 text-sm">No expenses recorded yet</p>
                <button onClick={() => setShowAddExp(true)} className="mt-3 bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-semibold">Add First Expense</button>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 15).map(exp => (
                  <div key={exp.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="w-9 h-9 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-sm flex-shrink-0">
                      {exp.category === 'Ingredients' ? '🥩' : exp.category === 'Staff' ? '👥' : exp.category === 'Rent' ? '🏠' : exp.category === 'Utilities' ? '💡' : '🧾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{exp.description || exp.category}</p>
                      <p className="text-xs text-gray-400">{exp.date?.split('T')[0]} · {exp.category}</p>
                    </div>
                    <p className="font-bold text-red-500 tabular-nums text-sm flex-shrink-0">-{fmt(exp.amount, currencySymbol)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-stretch h-16 max-w-2xl mx-auto">
          {[
            { href: '/business',       icon: '📊', label: 'Dashboard' },
            { href: '/business/menu',  icon: '🍽️', label: 'Menu' },
            { href: '/business/stock', icon: '📦', label: 'Stock' },
            { href: '/insights',       icon: '🤖', label: 'AI' },
            { href: '/profile',        icon: '👤', label: 'Profile' },
          ].map((item, i) => {
            const isActive = window.location.pathname === item.href
            return (
              <a key={i} href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 relative ${isActive ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {isActive && <span className="absolute top-0 w-6 h-0.5 rounded-full bg-orange-500" />}
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}