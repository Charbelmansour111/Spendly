import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

const GOAL_TYPES = [
  { key: 'Vacation',       emoji: '✈️',  label: 'Trip / Vacation' },
  { key: 'Object',         emoji: '🛒',  label: 'Object / Purchase' },
  { key: 'Emergency',      emoji: '🛡️',  label: 'Emergency Fund' },
  { key: 'Medical',        emoji: '🏥',  label: 'Medical / Health' },
  { key: 'Education',      emoji: '🎓',  label: 'Education' },
  { key: 'House',          emoji: '🏠',  label: 'House / Rent' },
  { key: 'Car',            emoji: '🚗',  label: 'Car' },
  { key: 'Other',          emoji: '💰',  label: 'Other' },
]

const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
const goalEmoji = (type) => GOAL_TYPES.find(t => t.key === type)?.emoji || '💰'

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onClose} className="hover:opacity-70">✕</button>
    </div>
  )
}

function AiModal({ title, prompt, onClose }) {
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
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">🤖 Spendly AI</span>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
          </div>
          <p className="text-lg font-bold leading-snug">{title}</p>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="space-y-2.5">
              {[1,2,3].map(i => <div key={i} className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${60 + i * 12}%` }} />)}
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

function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
        <p className="text-4xl font-bold text-violet-600 tabular-nums break-all leading-tight">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-bold hover:bg-violet-700 transition">Done</button>
      </div>
    </div>
  )
}

export default function Goals() {
  const [goals, setGoals]   = useState([])
  const [debts, setDebts]   = useState([])
  const [filter, setFilter] = useState('All')
  const [numModal, setNumModal] = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [formType, setFormType]   = useState('saving')
  const [savingForm, setSavingForm] = useState({ name: '', target_amount: '', saved_amount: '', deadline: '', goal_type: 'Other' })
  const [debtForm, setDebtForm]   = useState({ name: '', total_amount: '', remaining_amount: '', monthly_payment: '' })
  const [paymentId, setPaymentId]         = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [addFundsId, setAddFundsId]       = useState(null)
  const [addFundsAmount, setAddFundsAmount] = useState('')
  const [aiModal, setAiModal] = useState(null)
  const [toast, setToast]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [sym] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

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
    if (saving) return
    setSaving(true)
    try {
      await API.post('/savings', {
        name: savingForm.name,
        target_amount: parseFloat(savingForm.target_amount),
        saved_amount: parseFloat(savingForm.saved_amount || '0'),
        deadline: savingForm.deadline || null,
        goal_type: savingForm.goal_type,
      })
      setSavingForm({ name: '', target_amount: '', saved_amount: '', deadline: '', goal_type: 'Other' })
      setShowForm(false)
      fetchAll()
      showToast('🎯 Savings goal created!')
    } catch { showToast('Error creating goal', 'error') }
    finally { setSaving(false) }
  }

  const handleDebtSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
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
    finally { setSaving(false) }
  }

  const handleAddFunds = async (goal) => {
    const amount = parseFloat(addFundsAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return }
    if (saving) return
    setSaving(true)
    const newSaved = safeNum(goal.saved_amount) + amount
    const target   = safeNum(goal.target_amount)
    try {
      await API.patch(`/savings/${goal.id}`, { saved_amount: newSaved })
      setAddFundsId(null); setAddFundsAmount('')
      fetchAll()
      showToast('✅ Funds added!')
      if (newSaved >= target) {
        setAiModal({
          title: `🎉 Goal reached: "${goal.name}"!`,
          prompt: `I just reached my savings goal "${goal.name}" (${goalEmoji(goal.goal_type)}). I saved ${sym}${newSaved.toFixed(2)} which was my full target. What should I do with this money now? Give me 3 specific next steps based on this being a "${goal.goal_type}" goal.`
        })
      }
    } catch { showToast('Error adding funds', 'error') }
    finally { setSaving(false) }
  }

  const handlePayment = async (debt) => {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return }
    if (saving) return
    setSaving(true)
    const newRemaining = Math.max(safeNum(debt.remaining_amount) - amount, 0)
    try {
      await API.patch(`/debts/${debt.id}`, { remaining_amount: newRemaining })
      setPaymentId(null); setPaymentAmount('')
      fetchAll()
      showToast('💳 Payment recorded!')
      if (newRemaining === 0) {
        setAiModal({
          title: `🎉 Debt paid off: "${debt.name}"!`,
          prompt: `I just fully paid off my debt "${debt.name}" (original: ${sym}${safeNum(debt.total_amount).toFixed(2)}). I was paying ${sym}${safeNum(debt.monthly_payment).toFixed(2)}/month. What are 3 smart things I should do with that freed-up money now?`
        })
      }
    } catch { showToast('Error recording payment', 'error') }
    finally { setSaving(false) }
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

  // Stats
  const activeGoals     = goals.filter(g => safeNum(g.saved_amount) < safeNum(g.target_amount))
  const completedGoals  = goals.filter(g => safeNum(g.saved_amount) >= safeNum(g.target_amount) && safeNum(g.target_amount) > 0)
  const activeDebts     = debts.filter(d => safeNum(d.remaining_amount) > 0)
  const paidOffDebts    = debts.filter(d => safeNum(d.remaining_amount) <= 0)
  const totalSaved      = goals.reduce((s, g) => s + safeNum(g.saved_amount), 0)
  const totalDebtLeft   = debts.reduce((s, d) => s + safeNum(d.remaining_amount), 0)

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast   && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {aiModal && <AiModal title={aiModal.title} prompt={aiModal.prompt} onClose={() => setAiModal(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
          <p className="text-gray-400 text-sm mt-0.5">Savings goals and debts in one place</p>
        </div>

        {/* Progress Overview */}
        {numModal && <NumberModal {...numModal} onClose={() => setNumModal(null)} />}
        {(goals.length > 0 || debts.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Active Goals', value: String(activeGoals.length),             sub: `${completedGoals.length} completed`, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', emoji: '🎯' },
              { label: 'Total Saved',  value: `${sym}${totalSaved.toFixed(2)}`,       sub: `across ${goals.length} goal${goals.length !== 1 ? 's' : ''}`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', emoji: '💰' },
              { label: 'Active Debts', value: String(activeDebts.length),             sub: `${paidOffDebts.length} paid off`, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', emoji: '💳' },
              { label: 'Still Owed',   value: `${sym}${totalDebtLeft.toFixed(2)}`,    sub: 'total remaining', color: totalDebtLeft > 0 ? 'text-orange-500' : 'text-green-600', bg: 'bg-orange-50 dark:bg-orange-900/20', emoji: '📉' },
            ].map((s, i) => (
              <button key={i} onClick={() => setNumModal({ label: s.label, value: s.value, sub: s.sub })}
                className={`${s.bg} rounded-2xl p-4 text-left active:scale-95 transition-transform`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{s.emoji}</span>
                  <p className="text-xs text-gray-400 truncate">{s.label}</p>
                </div>
                <p className={`text-lg font-bold tabular-nums truncate ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{s.sub}</p>
              </button>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="flex gap-1">
            {['All', 'Savings', 'Debts'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition ${filter === f ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-sm'}`}>
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
            <div className="flex gap-2 mb-4">
              {[
                { key: 'saving', label: '🎯 Savings Goal', desc: 'Save toward a target' },
                { key: 'debt',   label: '💳 Debt',         desc: 'Track money you owe' },
              ].map(t => (
                <button key={t.key} onClick={() => setFormType(t.key)}
                  className={`flex-1 p-3 rounded-xl border-2 text-left transition ${formType === t.key ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-violet-300'}`}>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>

            {formType === 'saving' ? (
              <form onSubmit={handleSavingSubmit} className="space-y-3">
                {/* Goal type picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">What are you saving for?</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GOAL_TYPES.map(t => (
                      <button key={t.key} type="button" onClick={() => setSavingForm(f => ({ ...f, goal_type: t.key }))}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition ${savingForm.goal_type === t.key ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:border-violet-300'}`}>
                        <span className="text-lg sm:text-xl">{t.emoji}</span>
                        <span className="text-[9px] sm:text-[10px] font-medium text-gray-600 dark:text-gray-300 leading-tight text-center">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Goal Name</label>
                    <input type="text" placeholder="e.g. Paris vacation" value={savingForm.name}
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
                <button type="submit" disabled={saving} className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm disabled:opacity-60">
                  {saving ? 'Saving…' : 'Create Savings Goal'}
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
                <button type="submit" disabled={saving} className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition text-sm disabled:opacity-60">
                  {saving ? 'Saving…' : 'Add Debt'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <>
            {/* ── Savings Goals ── */}
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
                  {goals.map(goal => {
                    const saved     = safeNum(goal.saved_amount)
                    const target    = safeNum(goal.target_amount)
                    const pct       = target > 0 ? Math.min((saved / target) * 100, 100) : 0
                    const isComplete = target > 0 && saved >= target
                    const deadline  = goal.deadline ? new Date(goal.deadline) : null
                    const daysLeft  = deadline ? Math.ceil((deadline - new Date()) / 86400000) : null
                    const remaining = target - saved
                    const emoji     = goalEmoji(goal.goal_type)

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
                              {isComplete
                                ? 'Goal reached!'
                                : daysLeft !== null
                                  ? daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'
                                  : `${sym}${remaining.toFixed(2)} to go`}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          </button>
                        </div>

                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-bold tabular-nums text-gray-800 dark:text-white">{sym}{saved.toFixed(2)}</span>
                          <span className="text-gray-400 tabular-nums">of {sym}{target.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                          <div className={`h-2.5 rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : pct >= 75 ? 'bg-lime-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-violet-500'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{pct.toFixed(0)}% complete</p>

                        {/* Add funds */}
                        {!isComplete && (
                          addFundsId === goal.id ? (
                            <div className="flex gap-2 mb-2">
                              <input type="number" placeholder={`Amount (${sym})`} value={addFundsAmount}
                                onChange={e => setAddFundsAmount(e.target.value)} min="0.01" step="0.01"
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                              <button onClick={() => handleAddFunds(goal)} disabled={saving} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60">{saving ? '…' : 'Add'}</button>
                              <button onClick={() => { setAddFundsId(null); setAddFundsAmount('') }} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-3 py-2 rounded-xl text-sm">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setAddFundsId(goal.id)}
                              className="w-full border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 py-2 rounded-xl text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition mb-2">
                              + Add Funds
                            </button>
                          )
                        )}

                        {/* AI tip — mid-process (always visible while in progress) */}
                        {!isComplete && (
                          <button onClick={() => setAiModal({
                            title: `💡 Tips for "${goal.name}"`,
                            prompt: `I'm saving for "${goal.name}" (${emoji} ${goal.goal_type} goal). I've saved ${sym}${saved.toFixed(2)} out of ${sym}${target.toFixed(2)} so far — that's ${pct.toFixed(0)}% complete.${daysLeft ? ` I have ${daysLeft} days left.` : ''} Give me 3 specific and practical tips to reach this goal faster.`
                          })} className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 text-xs font-medium hover:border-violet-300 hover:text-violet-600 transition">
                            🤖 Ask AI for tips
                          </button>
                        )}

                        {/* AI — on completion */}
                        {isComplete && (
                          <button onClick={() => setAiModal({
                            title: `🎉 Goal reached — what's next?`,
                            prompt: `I reached my savings goal "${goal.name}" (${emoji}). I saved ${sym}${saved.toFixed(2)}. What are 3 smart things to do with this money now?`
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

            {/* ── Debts ── */}
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
                    const total     = safeNum(debt.total_amount)
                    const remaining = safeNum(debt.remaining_amount)
                    const paid      = total - remaining
                    const pct       = total > 0 ? Math.min((paid / total) * 100, 100) : 0
                    const isPaidOff = remaining <= 0
                    const monthsLeft = debt.monthly_payment > 0 ? Math.ceil(remaining / safeNum(debt.monthly_payment)) : null

                    return (
                      <div key={debt.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border-l-4 ${isPaidOff ? 'border-green-500' : 'border-red-400'}`}>
                        <div className="flex items-start gap-3 mb-3 min-w-0">
                          <span className="text-2xl shrink-0">💳</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-800 dark:text-white truncate">{debt.name}</h3>
                              {isPaidOff && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold shrink-0">🎉 Paid Off!</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {isPaidOff ? 'Fully paid off!' : monthsLeft ? `~${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} left at ${sym}${safeNum(debt.monthly_payment).toFixed(0)}/mo` : 'No monthly payment set'}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteDebt(debt.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          </button>
                        </div>

                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-bold tabular-nums text-red-500">{sym}{remaining.toFixed(2)} left</span>
                          <span className="text-gray-400 tabular-nums">of {sym}{total.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                          <div className={`h-2.5 rounded-full transition-all duration-500 ${isPaidOff ? 'bg-green-500' : pct >= 75 ? 'bg-lime-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{pct.toFixed(0)}% paid off</p>

                        {/* Record payment */}
                        {!isPaidOff && (
                          paymentId === debt.id ? (
                            <div className="flex gap-2 mb-2">
                              <input type="number" placeholder={`Payment (${sym})`} value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)} min="0.01" step="0.01"
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                              <button onClick={() => handlePayment(debt)} disabled={saving} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60">{saving ? '…' : 'Pay'}</button>
                              <button onClick={() => { setPaymentId(null); setPaymentAmount('') }} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-3 py-2 rounded-xl text-sm">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setPaymentId(debt.id)}
                              className="w-full border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition mb-2">
                              Record Payment
                            </button>
                          )
                        )}

                        {/* AI tip — mid-process */}
                        {!isPaidOff && (
                          <button onClick={() => setAiModal({
                            title: `💡 Tips to pay off "${debt.name}"`,
                            prompt: `I have a debt called "${debt.name}". Total was ${sym}${total.toFixed(2)}, I still owe ${sym}${remaining.toFixed(2)} (${pct.toFixed(0)}% paid so far).${safeNum(debt.monthly_payment) > 0 ? ` I currently pay ${sym}${safeNum(debt.monthly_payment).toFixed(2)}/month.` : ''} Give me 3 practical strategies to pay this off faster.`
                          })} className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 text-xs font-medium hover:border-violet-300 hover:text-violet-600 transition">
                            🤖 Ask AI for tips
                          </button>
                        )}

                        {/* AI — on payoff */}
                        {isPaidOff && (
                          <button onClick={() => setAiModal({
                            title: `🎉 "${debt.name}" is paid off!`,
                            prompt: `I just fully paid off "${debt.name}" (${sym}${total.toFixed(2)} total). I was paying ${sym}${safeNum(debt.monthly_payment).toFixed(2)}/month. What are 3 smart ways to use that freed-up money now?`
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

            {/* Empty state */}
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
