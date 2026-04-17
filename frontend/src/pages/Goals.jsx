import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const GOAL_EMOJIS = ['🏖️', '🚗', '🏠', '💻', '✈️', '🎓', '💍', '🏋️', '🎮', '💰']
const DEBT_ICONS = { Loan: '🏦', 'Credit Card': '💳', 'Personal': '👤', 'Car': '🚗', 'Medical': '🏥', 'Other': '📋' }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`}>
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onClose} className="hover:opacity-70">✕</button>
    </div>
  )
}

function AiModal({ title, prompt, symbol, onClose }) {
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    API.post('/insights/chat', { message: prompt })
      .then(r => setReply(r.data.reply || r.data.message || 'No advice available.'))
      .catch(() => setReply('Unable to load AI advice right now. Try again later.'))
      .finally(() => setLoading(false))
  }, [prompt])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-linear-to-br from-violet-600 to-purple-700 px-6 pt-7 pb-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">🤖 AI Advice</span>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
          </div>
          <p className="text-lg font-bold">{title}</p>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="space-y-2.5">
              {[1,2,3].map(i => <div key={i} className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${60 + i*12}%` }} />)}
            </div>
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{reply}</div>
          )}
          <button onClick={onClose} className="mt-5 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition">
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [debts, setDebts] = useState([])
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('saving')
  const [savingForm, setSavingForm] = useState({ name: '', target_amount: '', saved_amount: '', deadline: '' })
  const [debtForm, setDebtForm] = useState({ name: '', total_amount: '', remaining_amount: '', monthly_payment: '' })
  const [paymentId, setPaymentId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [addFundsId, setAddFundsId] = useState(null)
  const [addFundsAmount, setAddFundsAmount] = useState('')
  const [aiModal, setAiModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sym] = useState(() => {
    const stored = localStorage.getItem('currency') || 'USD'
    return CURRENCY_SYMBOLS[stored] || '$'
  })

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([API.get('/savings'), API.get('/debts')])
      .then(([g, d]) => { setGoals(g.data || []); setDebts(d.data || []) })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    Promise.all([API.get('/savings'), API.get('/debts')])
      .then(([g, d]) => { setGoals(g.data || []); setDebts(d.data || []) })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  const handleSavingSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/savings', {
        name: savingForm.name,
        target_amount: parseFloat(savingForm.target_amount),
        saved_amount: parseFloat(savingForm.saved_amount || '0'),
        deadline: savingForm.deadline || null,
      })
      setSavingForm({ name: '', target_amount: '', saved_amount: '', deadline: '' })
      setShowForm(false)
      fetchAll()
      showToast('🎯 Savings goal created!')
    } catch { showToast('Error creating goal', 'error') }
  }

  const handleDebtSubmit = async (e) => {
    e.preventDefault()
    try {
      await API.post('/debts', {
        name: debtForm.name,
        total_amount: parseFloat(debtForm.total_amount),
        remaining_amount: parseFloat(debtForm.remaining_amount || debtForm.total_amount),
        monthly_payment: parseFloat(debtForm.monthly_payment || '0'),
        category: 'Other',
      })
      setDebtForm({ name: '', total_amount: '', remaining_amount: '', monthly_payment: '' })
      setShowForm(false)
      fetchAll()
      showToast('💳 Debt added!')
    } catch { showToast('Error adding debt', 'error') }
  }

  const handleAddFunds = async (goal) => {
    const amount = parseFloat(addFundsAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return }
    const newSaved = safeNum(goal.saved_amount) + amount
    try {
      await API.patch(`/savings/${goal.id}`, { saved_amount: newSaved })
      setAddFundsId(null); setAddFundsAmount('')
      fetchAll()
      showToast('✅ Funds added!')
      if (newSaved >= safeNum(goal.target_amount)) {
        setAiModal({
          title: `🎉 Goal reached: ${goal.name}!`,
          prompt: `I just reached my savings goal "${goal.name}"! I saved ${sym}${newSaved.toFixed(2)} (target was ${sym}${safeNum(goal.target_amount).toFixed(2)}). What should I do next with this money to keep building wealth? Give me 3 specific suggestions.`
        })
      }
    } catch { showToast('Error adding funds', 'error') }
  }

  const handlePayment = async (debt) => {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return }
    const newRemaining = Math.max(safeNum(debt.remaining_amount) - amount, 0)
    try {
      await API.patch(`/debts/${debt.id}`, { remaining_amount: newRemaining })
      setPaymentId(null); setPaymentAmount('')
      fetchAll()
      showToast('💳 Payment recorded!')
      if (newRemaining === 0) {
        setAiModal({
          title: `🎉 Debt paid off: ${debt.name}!`,
          prompt: `I just paid off my debt "${debt.name}" completely! The total was ${sym}${safeNum(debt.total_amount).toFixed(2)}. Now that this debt is gone, what's the best way to use the ${sym}${safeNum(debt.monthly_payment).toFixed(2)}/month I was paying toward it? Give me 3 smart financial next steps.`
        })
      }
    } catch { showToast('Error recording payment', 'error') }
  }

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return
    try { await API.delete(`/savings/${id}`); fetchAll(); showToast('Deleted') }
    catch { showToast('Error deleting', 'error') }
  }

  const handleDeleteDebt = async (id) => {
    if (!window.confirm('Delete this debt?')) return
    try { await API.delete(`/debts/${id}`); fetchAll(); showToast('Deleted') }
    catch { showToast('Error deleting', 'error') }
  }

  const totalSaved = goals.reduce((s, g) => s + safeNum(g.saved_amount), 0)
  const totalDebt = debts.reduce((s, d) => s + safeNum(d.remaining_amount), 0)
  const netWorth = totalSaved - totalDebt

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {aiModal && <AiModal title={aiModal.title} prompt={aiModal.prompt} symbol={sym} onClose={() => setAiModal(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
          <p className="text-gray-400 text-sm mt-0.5">Savings goals and debts in one place</p>
        </div>

        {/* Net Worth Banner */}
        <div className={`rounded-2xl p-5 mb-6 text-white shadow-sm ${netWorth >= 0 ? 'bg-linear-to-r from-violet-600 to-purple-600' : 'bg-linear-to-r from-red-500 to-rose-600'}`}>
          <p className="text-sm text-white/70 mb-1">Net Worth</p>
          <p className="text-3xl font-bold tabular-nums">
            {netWorth < 0 ? '-' : ''}{sym}{Math.abs(netWorth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex gap-4 mt-3 text-sm text-white/80">
            <span>💰 Saved: {sym}{totalSaved.toFixed(2)}</span>
            <span>💳 Owed: {sym}{totalDebt.toFixed(2)}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="flex gap-1">
            {['All', 'Savings', 'Debts'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                  filter === f ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-sm'
                }`}>
                {f === 'Savings' ? '🎯 Savings' : f === 'Debts' ? '💳 Debts' : 'All'}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowForm(v => !v)}
            className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition shrink-0">
            {showForm ? '✕ Cancel' : '+ Add'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4 border-2 border-violet-200 dark:border-violet-700">
            {/* Type selector */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'saving', label: '🎯 Savings Goal', desc: 'Save toward a target' },
                { key: 'debt', label: '💳 Debt', desc: 'Track money you owe' },
              ].map(t => (
                <button key={t.key} onClick={() => setFormType(t.key)}
                  className={`flex-1 p-3 rounded-xl border-2 text-left transition ${
                    formType === t.key ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-violet-300'
                  }`}>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>

            {formType === 'saving' ? (
              <form onSubmit={handleSavingSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Goal Name</label>
                    <input type="text" placeholder="e.g. Vacation to Paris" value={savingForm.name}
                      onChange={e => setSavingForm({ ...savingForm, name: e.target.value })} required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target ({sym})</label>
                    <input type="number" placeholder="2000" value={savingForm.target_amount}
                      onChange={e => setSavingForm({ ...savingForm, target_amount: e.target.value })} required min="1" step="0.01" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Already Saved ({sym})</label>
                    <input type="number" placeholder="0" value={savingForm.saved_amount}
                      onChange={e => setSavingForm({ ...savingForm, saved_amount: e.target.value })} min="0" step="0.01" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Deadline <span className="text-gray-300">(optional)</span></label>
                    <input type="date" value={savingForm.deadline}
                      onChange={e => setSavingForm({ ...savingForm, deadline: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm">
                  Create Savings Goal
                </button>
              </form>
            ) : (
              <form onSubmit={handleDebtSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Debt Name</label>
                    <input type="text" placeholder="e.g. Car Loan, Credit Card" value={debtForm.name}
                      onChange={e => setDebtForm({ ...debtForm, name: e.target.value })} required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Amount ({sym})</label>
                    <input type="number" placeholder="5000" value={debtForm.total_amount}
                      onChange={e => setDebtForm({ ...debtForm, total_amount: e.target.value })} required min="1" step="0.01" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount Still Owed ({sym})</label>
                    <input type="number" placeholder="5000" value={debtForm.remaining_amount}
                      onChange={e => setDebtForm({ ...debtForm, remaining_amount: e.target.value })} min="0" step="0.01" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monthly Payment ({sym}) <span className="text-gray-300">(optional)</span></label>
                    <input type="number" placeholder="200" value={debtForm.monthly_payment}
                      onChange={e => setDebtForm({ ...debtForm, monthly_payment: e.target.value })} min="0" step="0.01" className={inputCls} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm">
                  Add Debt
                </button>
              </form>
            )}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Savings Goals */}
            {(filter === 'All' || filter === 'Savings') && (
              <div className="mb-4">
                {filter === 'All' && goals.length > 0 && (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Savings Goals</p>
                )}
                {goals.length === 0 && filter === 'Savings' && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-10 text-center">
                    <p className="text-4xl mb-2">🎯</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No savings goals yet</p>
                    <p className="text-gray-400 text-sm">Tap "+ Add" to create your first goal.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {goals.map((goal, idx) => {
                    const saved = safeNum(goal.saved_amount)
                    const target = safeNum(goal.target_amount)
                    const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0
                    const isComplete = target > 0 && saved >= target
                    const deadline = goal.deadline ? new Date(goal.deadline) : null
                    const daysLeft = deadline ? Math.ceil((deadline - new Date()) / 86400000) : null
                    const emoji = GOAL_EMOJIS[idx % GOAL_EMOJIS.length]

                    return (
                      <div key={goal.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-2 ${isComplete ? 'border-green-400' : 'border-transparent'}`}>
                        <div className="flex items-start gap-3 mb-3 min-w-0">
                          <span className="text-2xl shrink-0">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-800 dark:text-white truncate">{goal.name}</h3>
                              {isComplete && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold shrink-0">🎉 Done!</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {isComplete ? 'Goal reached!' : daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed') : 'No deadline'}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        </div>

                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-800 dark:text-white font-bold tabular-nums">{sym}{saved.toFixed(2)}</span>
                          <span className="text-gray-400 tabular-nums">of {sym}{target.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                          <div className={`h-2.5 rounded-full transition-all duration-500 ${
                            isComplete ? 'bg-green-500' : pct >= 75 ? 'bg-lime-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-violet-500'
                          }`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{pct.toFixed(0)}% complete</p>

                        {!isComplete && (
                          addFundsId === goal.id ? (
                            <div className="flex gap-2">
                              <input type="number" placeholder={`Amount (${sym})`} value={addFundsAmount}
                                onChange={e => setAddFundsAmount(e.target.value)} min="0.01" step="0.01"
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                              <button onClick={() => handleAddFunds(goal)} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">Add</button>
                              <button onClick={() => { setAddFundsId(null); setAddFundsAmount('') }} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-3 py-2 rounded-xl text-sm hover:bg-gray-200 transition">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setAddFundsId(goal.id)} className="w-full border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 py-2 rounded-xl text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                              + Add Funds
                            </button>
                          )
                        )}

                        {isComplete && (
                          <button onClick={() => setAiModal({
                            title: `🎉 What's next for "${goal.name}"?`,
                            prompt: `I reached my savings goal "${goal.name}" of ${sym}${target.toFixed(2)}. What should I do next with this money to maximize my financial health? Give me 3 specific suggestions.`
                          })} className="w-full flex items-center justify-center gap-2 py-2.5 bg-linear-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-700 rounded-xl text-violet-700 dark:text-violet-300 text-sm font-semibold hover:from-violet-100 transition">
                            🤖 Ask AI what to do next
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Debts */}
            {(filter === 'All' || filter === 'Debts') && (
              <div>
                {filter === 'All' && debts.length > 0 && (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Debts</p>
                )}
                {debts.length === 0 && filter === 'Debts' && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-10 text-center">
                    <p className="text-4xl mb-2">💳</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No debts tracked</p>
                    <p className="text-gray-400 text-sm">Tap "+ Add" to track a loan or credit card.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {debts.map(debt => {
                    const total = safeNum(debt.total_amount)
                    const remaining = safeNum(debt.remaining_amount)
                    const paid = total - remaining
                    const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0
                    const isPaidOff = remaining <= 0
                    const monthsLeft = debt.monthly_payment > 0 ? Math.ceil(remaining / safeNum(debt.monthly_payment)) : null

                    return (
                      <div key={debt.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-l-4 ${isPaidOff ? 'border-green-500' : 'border-red-400'}`}>
                        <div className="flex items-start gap-3 mb-3 min-w-0">
                          <span className="text-2xl shrink-0">{DEBT_ICONS[debt.category] || '💳'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-800 dark:text-white truncate">{debt.name}</h3>
                              {isPaidOff && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold shrink-0">🎉 Paid Off!</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {isPaidOff ? 'Fully paid off!' : monthsLeft ? `~${monthsLeft} months left at ${sym}${safeNum(debt.monthly_payment).toFixed(0)}/mo` : 'No monthly payment set'}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteDebt(debt.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        </div>

                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-red-500 font-bold tabular-nums">{sym}{remaining.toFixed(2)} left</span>
                          <span className="text-gray-400 tabular-nums">of {sym}{total.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                          <div className={`h-2.5 rounded-full transition-all duration-500 ${isPaidOff ? 'bg-green-500' : pct >= 75 ? 'bg-lime-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{pct.toFixed(0)}% paid off</p>

                        {!isPaidOff && (
                          paymentId === debt.id ? (
                            <div className="flex gap-2">
                              <input type="number" placeholder={`Payment (${sym})`} value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)} min="0.01" step="0.01"
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                              <button onClick={() => handlePayment(debt)} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">Pay</button>
                              <button onClick={() => { setPaymentId(null); setPaymentAmount('') }} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-3 py-2 rounded-xl text-sm hover:bg-gray-200 transition">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setPaymentId(debt.id)} className="w-full border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                              Record Payment
                            </button>
                          )
                        )}

                        {isPaidOff && (
                          <button onClick={() => setAiModal({
                            title: `🎉 "${debt.name}" is paid off!`,
                            prompt: `I just paid off my debt "${debt.name}" completely! The original amount was ${sym}${total.toFixed(2)} and I was paying ${sym}${safeNum(debt.monthly_payment).toFixed(2)}/month. What's the best way to redirect this money now that the debt is gone? Give me 3 smart next steps.`
                          })} className="w-full flex items-center justify-center gap-2 py-2.5 bg-linear-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-700 rounded-xl text-violet-700 dark:text-violet-300 text-sm font-semibold hover:from-violet-100 transition">
                            🤖 Ask AI what to do next
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty state when both are empty */}
            {filter === 'All' && goals.length === 0 && debts.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-14 text-center">
                <p className="text-5xl mb-3">🎯</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No goals or debts yet</p>
                <p className="text-gray-400 text-sm mb-5">Tap "+ Add" to create a savings goal or track a debt.</p>
                <button onClick={() => setShowForm(true)} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm">
                  + Get Started
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
