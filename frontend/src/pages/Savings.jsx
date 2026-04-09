import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const goalEmojis = ['🏖️', '🚗', '🏠', '💻', '✈️', '🎓', '💍', '🏋️', '🎮', '💰']

function Toast({ message, type, onClose }) {
  // Fix: Added onClose to dependency array
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
      <span>{message}</span><button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
    </div>
  )
}

export default function Savings() {
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState({ name: '', target_amount: '', saved_amount: '', deadline: '' })
  const [showForm, setShowForm] = useState(false)
  const [addFundsId, setAddFundsId] = useState(null)
  const [addFundsAmount, setAddFundsAmount] = useState('')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Fix: Initialize as state to avoid SSR mismatch and crash
  const [currencySymbol, setCurrencySymbol] = useState('$')
  
  const showToast = (message, type = 'success') => setToast({ message, type })

  // Fix: Load currency from localStorage on mount (Client-side only)
  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
  }, [])

  // Fix: Wrap fetchGoals in useCallback to prevent infinite loops in useEffect
  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return // Handle case where token is missing
      const res = await API.get('/savings', { headers: { Authorization: `Bearer ${token}` } })
      setGoals(res.data)
    } catch { showToast('Error loading goals', 'error') }
    setLoading(false)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchGoals()
  }, [fetchGoals])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/savings', form, { headers: { Authorization: `Bearer ${token}` } })
      setForm({ name: '', target_amount: '', saved_amount: '', deadline: '' })
      setShowForm(false); fetchGoals(); showToast('🎯 Savings goal created!')
    } catch { showToast('Error creating goal', 'error') }
  }

  const handleAddFunds = async (id) => {
    try {
      const goal = goals.find(g => g.id === id)
      const newAmount = parseFloat(goal.saved_amount) + parseFloat(addFundsAmount)
      const token = localStorage.getItem('token')
      await API.patch(`/savings/${id}`, { saved_amount: newAmount }, { headers: { Authorization: `Bearer ${token}` } })
      setAddFundsId(null); setAddFundsAmount(''); fetchGoals(); showToast('💰 Funds added!')
    } catch { showToast('Error adding funds', 'error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/savings/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchGoals(); showToast('🗑️ Goal deleted', 'error')
    } catch { showToast('Error deleting goal', 'error') }
  }
  
  // Fix: Memoize the close handler so Toast effect doesn't reset on every render
  const handleCloseToast = useCallback(() => setToast(null), [])

  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.saved_amount), 0)
  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target_amount), 0)
  const completed = goals.filter(g => parseFloat(g.saved_amount) >= parseFloat(g.target_amount)).length

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🏦 Savings Goals</h1>
            <p className="text-gray-400 mt-1">Track your progress toward financial goals</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition text-sm">
            {showForm ? '✕ Cancel' : '+ New Goal'}
          </button>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
  <p className="text-xs text-gray-400 mb-1 truncate">Total Saved</p>
  <p className="text-2xl font-bold tabular-nums truncate text-green-600" title={`${currencySymbol}${totalSaved.toFixed(2)}`}>{currencySymbol}{totalSaved.toFixed(2)}</p>
</div>
<div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
  <p className="text-xs text-gray-400 mb-1 truncate">Total Target</p>
  <p className="text-2xl font-bold tabular-nums truncate text-indigo-600" title={`${currencySymbol}${totalTarget.toFixed(2)}`}>{currencySymbol}{totalTarget.toFixed(2)}</p>
</div>
<div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm min-w-0">
  <p className="text-xs text-gray-400 mb-1 truncate">Completed</p>
  <p className="text-2xl font-bold tabular-nums text-purple-600">{completed}/{goals.length}</p>
</div>

        {/* New Goal Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6 border-2 border-indigo-200 dark:border-indigo-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Create New Goal</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name</label>
                <input type="text" placeholder="e.g. Vacation to Paris" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount ({currencySymbol})</label>
                <input type="number" placeholder="e.g. 2000" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required min="1" step="0.01" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Already Saved ({currencySymbol})</label>
                <input type="number" placeholder="e.g. 500" value={form.saved_amount} onChange={e => setForm({ ...form, saved_amount: e.target.value })} min="0" step="0.01" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required className={inputCls} />
              </div>
              <div className="col-span-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">🎯 Create Goal</button>
              </div>
            </form>
          </div>
        )}

        {/* Goals List */}
        {loading ? <div className="text-center py-20 text-gray-400">Loading...</div>
        : goals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-16 text-center">
            <p className="text-6xl mb-4">🏦</p>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No savings goals yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first goal to start tracking your savings progress!</p>
            <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition text-sm">+ Create First Goal</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal, idx) => {
              const saved = parseFloat(goal.saved_amount)
              const target = parseFloat(goal.target_amount)
              const pct = Math.min((saved / target) * 100, 100)
              const isComplete = saved >= target
              const deadline = new Date(goal.deadline)
              const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
              const emoji = goalEmojis[idx % goalEmojis.length]
              const monthsLeft = Math.max(Math.ceil(daysLeft / 30), 1)
              const monthlyNeeded = isComplete ? 0 : ((target - saved) / monthsLeft)
              return (
                <div key={goal.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border-2 ${isComplete ? 'border-green-400' : 'border-transparent'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{emoji}</span>
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">{goal.name}</h3>
                        <p className="text-xs text-gray-400">
                          {isComplete ? '✅ Goal reached!' : daysLeft > 0 ? `⏰ ${daysLeft} days left` : '⚠️ Deadline passed'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete && <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-semibold">🎉 Done!</span>}
                      <button onClick={() => handleDelete(goal.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded-lg transition border border-red-200">🗑️</button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">{currencySymbol}{saved.toFixed(2)} saved</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{currencySymbol}{target.toFixed(2)} goal</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                      <div className={`h-3 rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : pct >= 75 ? 'bg-lime-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">{pct.toFixed(0)}% complete</span>
                      {!isComplete && <span className="text-xs text-indigo-600 font-semibold">Save {currencySymbol}{monthlyNeeded.toFixed(0)}/mo</span>}
                    </div>
                  </div>
                  {!isComplete && (
                    addFundsId === goal.id ? (
                      <div className="space-y-2 mt-3">
                        <input type="number" placeholder={`Amount to add (${currencySymbol})`} value={addFundsAmount} onChange={e => setAddFundsAmount(e.target.value)} min="0.01" step="0.01" className={inputCls} />
                        <div className="flex gap-2">
                          <button onClick={() => handleAddFunds(goal.id)} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">Add Funds</button>
                          <button onClick={() => { setAddFundsId(null); setAddFundsAmount('') }} className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 px-4 py-2 rounded-xl text-sm hover:bg-gray-300 transition">✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddFundsId(goal.id)} className="w-full mt-3 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">+ Add Funds</button>
                    )
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