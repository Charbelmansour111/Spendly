import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const goalEmojis = ['🏖️', '🚗', '🏠', '💻', '✈️', '🎓', '💍', '🏋️', '🎮', '💰']

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 ml-2 hover:opacity-70">x</button>
    </div>
  )
}

function NumberModal({ label, value, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-gray-400 mb-3">{label}</p>
        <p className="text-4xl font-bold text-violet-600 tabular-nums break-all">{value}</p>
        <button onClick={onClose} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

export default function Savings() {
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState({ name: '', target_amount: '', saved_amount: '0', deadline: '' })
  const [showForm, setShowForm] = useState(false)
  const [addFundsId, setAddFundsId] = useState(null)
  const [addFundsAmount, setAddFundsAmount] = useState('')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [modalData, setModalData] = useState(null)

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])
  const handleCloseToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
  }, [])

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await API.get('/savings')
      setGoals(res.data || [])
    } catch { showToast('Error loading goals', 'error') }
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchGoals()
  }, [fetchGoals])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/savings', {
        ...form,
        saved_amount: parseFloat(form.saved_amount || '0'),
        target_amount: parseFloat(form.target_amount),
      })
      setForm({ name: '', target_amount: '', saved_amount: '0', deadline: '' })
      setShowForm(false)
      fetchGoals()
      showToast('Savings goal created!')
    } catch { showToast('Error creating goal', 'error') }
  }

  const handleAddFunds = async (id) => {
    const amount = parseFloat(addFundsAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return }
    try {
      const goal = goals.find(g => g.id === id)
      const newAmount = parseFloat(goal.saved_amount || 0) + amount
      await API.patch('/savings/' + id, { saved_amount: newAmount })
      setAddFundsId(null)
      setAddFundsAmount('')
      fetchGoals()
      showToast('Funds added!')
    } catch { showToast('Error adding funds', 'error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return
    try {
      await API.delete('/savings/' + id)
      fetchGoals()
      showToast('Goal deleted', 'error')
    } catch { showToast('Error deleting goal', 'error') }
  }

  // Guard against NaN — always parse with fallback
  const safeNum = (val) => {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  const totalSaved  = goals.reduce((sum, g) => sum + safeNum(g.saved_amount), 0)
  const totalTarget = goals.reduce((sum, g) => sum + safeNum(g.target_amount), 0)
  const completed   = goals.filter(g => safeNum(g.saved_amount) >= safeNum(g.target_amount)).length

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
      {modalData && <NumberModal label={modalData.label} value={modalData.value} onClose={() => setModalData(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savings Goals</h1>
            <p className="text-gray-400 text-sm mt-0.5">Track your progress toward financial goals</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex-shrink-0 bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 transition text-sm">
            {showForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>

        {/* Summary Cards — tappable */}
        {goals.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Saved',  value: currencySymbol + totalSaved.toFixed(2),  color: 'text-green-600' },
              { label: 'Total Target', value: currencySymbol + totalTarget.toFixed(2), color: 'text-violet-600' },
              { label: 'Completed',    value: completed + '/' + goals.length,          color: 'text-purple-600' },
            ].map((s, i) => (
              <button key={i} onClick={() => setModalData({ label: s.label, value: s.value })}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm min-w-0 text-center active:scale-95 transition-transform">
                <p className="text-xs text-gray-400 mb-1 truncate">{s.label}</p>
                <p className={`text-xl font-bold tabular-nums truncate ${s.color}`} title={s.value}>{s.value}</p>
                <p className="text-gray-300 text-xs mt-0.5">Tap</p>
              </button>
            ))}
          </div>
        )}

        {/* New Goal Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-5 border-2 border-violet-200 dark:border-violet-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Create New Goal</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Goal Name</label>
                <input type="text" placeholder="e.g. Vacation to Paris" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Target Amount ({currencySymbol})</label>
                <input type="number" placeholder="e.g. 2000" value={form.target_amount}
                  onChange={e => setForm({ ...form, target_amount: e.target.value })} required min="1" step="0.01" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Already Saved ({currencySymbol})</label>
                <input type="number" placeholder="0.00" value={form.saved_amount}
                  onChange={e => setForm({ ...form, saved_amount: e.target.value })} min="0" step="0.01" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Target Deadline</label>
                <input type="date" value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })} required className={inputCls} />
              </div>
              <div className="col-span-2">
                <button type="submit" className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition">
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Goals List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-16 text-center">
            <p className="text-5xl mb-4">🏦</p>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">No savings goals yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first goal to start tracking your savings progress!</p>
            <button onClick={() => setShowForm(true)}
              className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm">
              + Create First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal, idx) => {
              const saved  = safeNum(goal.saved_amount)
              const target = safeNum(goal.target_amount)
              const pct    = target > 0 ? Math.min((saved / target) * 100, 100) : 0
              const isComplete = target > 0 && saved >= target
              const deadline = goal.deadline ? new Date(goal.deadline) : null
              const daysLeft = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null
              const emoji = goalEmojis[idx % goalEmojis.length]
              const monthsLeft = daysLeft ? Math.max(Math.ceil(daysLeft / 30), 1) : 1
              const monthlyNeeded = isComplete ? 0 : ((target - saved) / monthsLeft)

              return (
                <div key={goal.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-2 ${isComplete ? 'border-green-400' : 'border-transparent'}`}>

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4 min-w-0">
                    <span className="text-3xl flex-shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">{goal.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isComplete
                          ? 'Goal reached!'
                          : daysLeft !== null
                            ? daysLeft > 0 ? daysLeft + ' days left' : 'Deadline passed'
                            : 'No deadline set'
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isComplete && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">Done!</span>}
                      <button onClick={() => handleDelete(goal.id)} className="text-gray-300 hover:text-red-400 transition p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Amounts — tappable */}
                  <div className="flex justify-between items-baseline gap-2 mb-2 min-w-0">
                    <button onClick={() => setModalData({ label: 'Saved — ' + goal.name, value: currencySymbol + saved.toFixed(2) })}
                      className="text-left min-w-0">
                      <p className="text-xs text-gray-400">Saved</p>
                      <p className="text-base font-bold tabular-nums truncate text-gray-800 dark:text-white" title={currencySymbol + saved.toFixed(2)}>
                        {currencySymbol}{saved.toFixed(2)}
                      </p>
                    </button>
                    <button onClick={() => setModalData({ label: 'Target — ' + goal.name, value: currencySymbol + target.toFixed(2) })}
                      className="text-right min-w-0">
                      <p className="text-xs text-gray-400">Goal</p>
                      <p className="text-base font-bold tabular-nums truncate text-gray-500 dark:text-gray-300" title={currencySymbol + target.toFixed(2)}>
                        {currencySymbol}{target.toFixed(2)}
                      </p>
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-2">
                    <div className={`h-3 rounded-full transition-all duration-500 ${
                      isComplete ? 'bg-green-500' : pct >= 75 ? 'bg-lime-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-violet-500'
                    }`} style={{ width: pct + '%' }} />
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-400">{pct.toFixed(0)}% complete</span>
                    {!isComplete && monthlyNeeded > 0 && (
                      <span className="text-xs text-violet-600 font-semibold">
                        Save {currencySymbol}{monthlyNeeded.toFixed(0)}/mo
                      </span>
                    )}
                  </div>

                  {/* Add Funds */}
                  {!isComplete && (
                    addFundsId === goal.id ? (
                      <div className="space-y-2">
                        <input type="number" placeholder={'Amount to add (' + currencySymbol + ')'}
                          value={addFundsAmount} onChange={e => setAddFundsAmount(e.target.value)}
                          min="0.01" step="0.01" className={inputCls} />
                        <div className="flex gap-2">
                          <button onClick={() => handleAddFunds(goal.id)}
                            className="flex-1 bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
                            Add Funds
                          </button>
                          <button onClick={() => { setAddFundsId(null); setAddFundsAmount('') }}
                            className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-4 py-2 rounded-xl text-sm hover:bg-gray-200 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddFundsId(goal.id)}
                        className="w-full border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 py-2 rounded-xl text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
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
    </Layout>
  )
}
