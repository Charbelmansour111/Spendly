import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import MoneyDefender from '../components/MoneyDefender'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

function ScoreRing({ score, revealed }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444'
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={revealed ? color : '#E5E7EB'} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={revealed ? offset : circumference}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {revealed ? (
            <>
              <span className="text-3xl font-bold text-white">{score}</span>
              <span className="text-xs text-white/60">/ 100</span>
            </>
          ) : (
            <span className="text-4xl">🔒</span>
          )}
        </div>
      </div>
      {revealed && (
        <div className="mt-2 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-white font-bold text-sm" style={{ backgroundColor: color }}>
            {grade}
          </span>
          <span className="text-sm font-semibold text-white/80">{label}</span>
        </div>
      )}
    </div>
  )
}

export default function Wellness() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [scoreRevealed, setScoreRevealed] = useState(false)
  const [scoreAnimating, setScoreAnimating] = useState(false)
  const [currencySymbol] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [financials, setFinancials] = useState({ totalIncome: 0, totalSpent: 0, balance: 0, streak: 0 })
  const [joke, setJoke] = useState('')
  const [jokeLoading, setJokeLoading] = useState(false)
  const [quote, setQuote] = useState({ text: '', author: '' })
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [moodResponse, setMoodResponse] = useState('')
  const [moodResponseLoading, setMoodResponseLoading] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  const [showGame, setShowGame] = useState(false)
  const [numModal, setNumModal] = useState(null)
  const [highScore] = useState(() => parseInt(localStorage.getItem('moneyDefenderHS') || '0'))
  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const dayOfMonth = today.getDate()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const fetchJoke = useCallback(async () => {
    setJokeLoading(true)
    try {
      const res = await API.get('/wellness/joke')
      setJoke(res.data.joke)
    } catch { setJoke("Why did the banker switch careers? He lost interest!") }
    setJokeLoading(false)
  }, [])

  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true)
    try {
      const res = await API.get('/wellness/quote')
      setQuote(res.data)
    } catch { setQuote({ text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" }) }
    setQuoteLoading(false)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [expRes, incRes, budRes, savRes, wellRes] = await Promise.allSettled([
        API.get('/expenses'),
        API.get(`/income?month=${currentMonth}&year=${currentYear}`),
        API.get('/budgets'),
        API.get('/savings'),
        API.get('/wellness'),
      ])

      const allExpenses = expRes.status === 'fulfilled' ? (expRes.value.data || []) : []
      const incomeList  = incRes.status  === 'fulfilled' ? (incRes.value.data  || []) : []
      const budgetList  = budRes.status  === 'fulfilled' ? (budRes.value.data  || []) : []
      const savingsList = savRes.status  === 'fulfilled' ? (savRes.value.data  || []) : []

      // Month expenses
      const monthExpenses = allExpenses.filter(e => {
        const d = new Date(e.date)
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
      })
      const totalSpent  = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
      const totalIncome = incomeList.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
      const balance     = totalIncome - totalSpent

      // Streak
      const dateset = new Set(allExpenses.map(e => e.date?.split('T')[0]).filter(Boolean))
      let streak = 0
      const checkDate = new Date()
      for (let i = 0; i < 60; i++) {
        const ds = checkDate.toISOString().split('T')[0]
        if (dateset.has(ds)) { streak++; checkDate.setDate(checkDate.getDate() - 1) }
        else { if (i > 0) break; checkDate.setDate(checkDate.getDate() - 1) }
      }

      // Category totals for budget check
      const catTotals = monthExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0)
        return acc
      }, {})
      const overBudgetCount = budgetList.filter(b => (catTotals[b.category] || 0) > parseFloat(b.amount)).length

      // Compute score + breakdown locally (same logic as backend)
      let score = 0
      const breakdown = []

      if (totalIncome > 0) {
        score += 20
        breakdown.push({ label: 'Income Tracked', points: 20, max: 20, achieved: true, reason: `You logged ${currencySymbol}${totalIncome.toFixed(2)} income this month.` })
      } else {
        breakdown.push({ label: 'Income Tracked', points: 0, max: 20, achieved: false, tip: 'Add your income to unlock 20 pts', reason: 'No income logged yet this month.' })
      }

      if (budgetList.length > 0 && overBudgetCount === 0) {
        score += 25
        breakdown.push({ label: 'Under Budget', points: 25, max: 25, achieved: true, reason: `All ${budgetList.length} budget${budgetList.length > 1 ? 's' : ''} are under limit.` })
      } else if (budgetList.length === 0) {
        breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: 'Set budget limits to unlock 25 pts', reason: 'No budgets set yet.' })
      } else {
        breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: `Over budget in ${overBudgetCount} categor${overBudgetCount > 1 ? 'ies' : 'y'}`, reason: `You exceeded ${overBudgetCount} budget limit${overBudgetCount > 1 ? 's' : ''} this month.` })
      }

      if (totalIncome > 0 && balance > 0) {
        const rate = (balance / totalIncome) * 100
        const pts = rate >= 20 ? 25 : rate >= 10 ? 15 : 10
        score += pts
        breakdown.push({ label: 'Positive Balance', points: pts, max: 25, achieved: true, reason: `Saving ${rate.toFixed(0)}% of income (${pts === 25 ? 'max pts!' : `aim for 20%+ for full 25 pts`}).` })
      } else {
        breakdown.push({ label: 'Positive Balance', points: 0, max: 25, achieved: false, tip: 'Spend less than you earn for up to 25 pts', reason: totalIncome === 0 ? 'Log income to calculate balance.' : 'Spending exceeds income this month.' })
      }

      const wellData = wellRes.status === 'fulfilled' ? wellRes.value.data : null
      if (savingsList.length > 0) {
        score += 15
        breakdown.push({ label: 'Savings Goals', points: 15, max: 15, achieved: true, reason: `${savingsList.length} savings goal${savingsList.length > 1 ? 's' : ''} active.` })
      } else {
        breakdown.push({ label: 'Savings Goals', points: 0, max: 15, achieved: false, tip: 'Create a savings goal to unlock 15 pts', reason: 'No savings goals created yet.' })
      }

      const txnPts = Math.min(Math.floor((monthExpenses.length / 10) * 15), 15)
      score += txnPts
      if (monthExpenses.length >= 10) {
        breakdown.push({ label: 'Consistent Tracking', points: 15, max: 15, achieved: true, reason: `${monthExpenses.length} transactions logged this month.` })
      } else {
        breakdown.push({ label: 'Consistent Tracking', points: txnPts, max: 15, achieved: false, tip: `Log ${10 - monthExpenses.length} more transactions for full 15 pts`, reason: `Only ${monthExpenses.length} of 10 needed transactions logged.` })
      }

      setFinancials({ totalIncome, totalSpent, balance, streak })
      setData({ ...wellData, score, breakdown, budgetList, monthExpenseCount: monthExpenses.length })
      if (wellData?.note?.content) setNote(wellData.note.content)
      if (wellData?.mood?.mood) setSelectedMood(wellData.mood.mood)
    } catch (e) { console.log('Error fetching wellness', e) }
    setLoading(false)
  }, [currentMonth, currentYear, currencySymbol])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchData()
    fetchJoke()
    fetchQuote()
  }, [fetchData, fetchJoke, fetchQuote])

  const handleCalculateScore = () => {
    if (scoreAnimating) return
    setScoreAnimating(true)
    setScoreRevealed(false)
    setTimeout(() => {
      setScoreRevealed(true)
      setScoreAnimating(false)
    }, 200)
  }

  const saveNote = async () => {
    try {
      await API.post('/wellness/note', { content: note })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } catch { console.log('Error saving note') }
  }

  const saveMood = async (mood) => {
    setSelectedMood(mood)
    setMoodResponseLoading(true)
    setMoodResponse('')
    try {
      await API.post('/wellness/mood', { mood })
      const res = await API.post('/wellness/mood-response', { mood })
      setMoodResponse(res.data.message)
    } catch {
      setMoodResponse("Thanks for sharing! Keep tracking your finances.")
    }
    setMoodResponseLoading(false)
  }

  // Computed stats — all from locally fetched data, not from wellness endpoint
  const { totalIncome, totalSpent, balance, streak } = financials
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : null
  const dailyBurn   = totalSpent > 0 && dayOfMonth > 0 ? (totalSpent / dayOfMonth) : null
  const budgetItem  = data?.breakdown?.find(b => b.label === 'Under Budget')
  const budgetsOk   = budgetItem?.achieved
  const hasBudgets  = data?.budgetList?.length > 0
  const trackItem   = data?.breakdown?.find(b => b.label === 'Consistent Tracking')
  const trackPct    = trackItem ? Math.round((trackItem.points / trackItem.max) * 100) : 0
  const txnCount    = data?.monthExpenseCount ?? 0

  // Achievements computed locally from direct data
  const achievements = (() => {
    if (!data) return []
    const list = []
    if (txnCount >= 1)        list.push({ icon: '🎯', title: 'First Step',        desc: 'Added your first expense' })
    if (txnCount >= 50)       list.push({ icon: '📊', title: 'Data Master',       desc: '50+ expenses tracked' })
    if (hasBudgets)           list.push({ icon: '⚡', title: 'Budget Setter',     desc: 'Created your first budget' })
    if (data?.breakdown?.find(b => b.label === 'Savings Goals')?.achieved)
                              list.push({ icon: '🏦', title: 'Saver',             desc: 'Active savings goal set' })
    if (totalIncome > 0)      list.push({ icon: '💰', title: 'Income Tracker',    desc: 'Tracking your income' })
    if ((data?.score || 0) >= 80) list.push({ icon: '🏆', title: 'Finance Pro',   desc: 'Health score above 80!' })
    if ((data?.score || 0) === 100) list.push({ icon: '💎', title: 'Perfect Score', desc: 'Achieved 100/100!' })
    if (streak >= 7)          list.push({ icon: '🔥', title: 'On Fire',           desc: '7-day tracking streak!' })
    if (savingsRate !== null && savingsRate >= 20) list.push({ icon: '🌟', title: 'Smart Saver', desc: 'Saving 20%+ of income!' })
    return list
  })()

  const getPersonality = () => {
    if (totalSpent === 0) return { label: 'Just Getting Started', emoji: '🌱', color: 'from-gray-500 to-gray-600', desc: 'Start logging expenses to unlock your financial identity.' }
    const rate = totalIncome > 0 ? balance / totalIncome : -1
    if (rate >= 0.3) return { label: 'Wealth Builder', emoji: '🏗️', color: 'from-emerald-500 to-teal-600', desc: "Saving 30%+ of income — you're building real wealth." }
    if (data?.score >= 80) return { label: 'The Disciplined One', emoji: '🎯', color: 'from-violet-500 to-purple-600', desc: 'Consistent, under budget, and crushing your goals.' }
    if (rate >= 0.1) return { label: 'Steady Climber', emoji: '📈', color: 'from-blue-500 to-indigo-600', desc: "Saving something every month — momentum is everything." }
    if (rate >= 0) return { label: 'Break-Even Racer', emoji: '⚖️', color: 'from-yellow-500 to-orange-500', desc: "You're covering your costs — now push for savings." }
    return { label: 'Free Spirit', emoji: '🎪', color: 'from-pink-500 to-rose-500', desc: 'Life is for living — but a little budget goes a long way.' }
  }
  const personality = getPersonality()

  const moods = [
    { emoji: '😄', label: 'Great', value: 'great' },
    { emoji: '😊', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '😟', label: 'Worried', value: 'worried' },
    { emoji: '😰', label: 'Stressed', value: 'stressed' },
  ]

  if (loading) return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-5">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-56" />
          <div className="h-52 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          </div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Wellness</h1>
            <p className="text-gray-400 text-sm mt-0.5">{monthName}</p>
          </div>
          <span className="text-3xl">💚</span>
        </div>

        {/* Health Score Card */}
        <div className="bg-linear-to-br from-emerald-500 to-green-700 rounded-3xl p-6 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <ScoreRing score={data?.score || 0} revealed={scoreRevealed} />
              <button
                onClick={handleCalculateScore}
                disabled={scoreAnimating}
                className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 disabled:opacity-50">
                {scoreAnimating ? (
                  <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Scanning…</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>{scoreRevealed ? 'Recalculate' : 'Calculate My Score'}</>
                )}
              </button>
            </div>
            <div className="flex-1 w-full">
              <h2 className="text-lg font-bold mb-1">Financial Health Score</h2>
              <p className="text-green-200 text-xs mb-4">Based on your {monthName} activity</p>
              <div className="space-y-2.5">
                {data?.breakdown?.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-base mt-0.5">{item.achieved ? '✅' : '⬜'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-sm">{item.label}</span>
                        <span className="font-bold tabular-nums text-sm">{item.points}/{item.max}</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full">
                        <div className="h-1.5 bg-white rounded-full transition-all duration-700"
                          style={{ width: scoreRevealed ? `${(item.points / item.max) * 100}%` : '0%' }} />
                      </div>
                      {!item.achieved && item.tip && (
                        <p className="text-white/60 text-[11px] mt-1">↗ {item.tip}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
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
        <div className="bg-linear-to-br from-teal-500 to-emerald-600 rounded-2xl px-5 py-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white" />
          </div>
          <div className="relative mb-3">
            <p className="text-white font-bold text-base">My Wellness</p>
            <p className="text-white/70 text-xs">{monthName} · {!data ? 'Calculate your score above' : data.score >= 80 ? 'Excellent health 🌟' : data.score >= 60 ? 'Good — keep going' : 'Work in progress'}</p>
          </div>
          <div className="relative grid grid-cols-4 gap-2">
            <button onClick={() => setNumModal({ label: 'Income', value: currencySymbol + totalIncome.toFixed(2), sub: monthName })}
              className="bg-white/20 rounded-xl px-2 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-white/70 text-[10px] mb-0.5">Income</p>
              <p className="text-white font-bold text-xs tabular-nums truncate">{currencySymbol}{totalIncome.toFixed(0)}</p>
            </button>
            <button onClick={() => setNumModal({ label: 'Spent', value: currencySymbol + totalSpent.toFixed(2), sub: monthName })}
              className="bg-white/20 rounded-xl px-2 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-white/70 text-[10px] mb-0.5">Spent</p>
              <p className="text-white font-bold text-xs tabular-nums truncate">{currencySymbol}{totalSpent.toFixed(0)}</p>
            </button>
            <button onClick={() => setNumModal({ label: 'Balance', value: (balance >= 0 ? '+' : '') + currencySymbol + Math.abs(balance).toFixed(2), sub: balance >= 0 ? 'surplus' : 'deficit' })}
              className="bg-white/20 rounded-xl px-2 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-white/70 text-[10px] mb-0.5">Balance</p>
              <p className="text-white font-bold text-xs tabular-nums truncate">{balance >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(balance).toFixed(0)}</p>
            </button>
            <button onClick={() => setNumModal({ label: 'Tracking Streak', value: streak + ' days', sub: 'consecutive tracking' })}
              className="bg-white/20 rounded-xl px-2 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-white/70 text-[10px] mb-0.5">Streak</p>
              <p className="text-white font-bold text-xs tabular-nums">{streak}d</p>
            </button>
          </div>
        </div>

        {/* Interesting Stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* Savings Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Savings Rate</p>
            {savingsRate !== null ? (
              <>
                <p className={`text-2xl font-bold ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {savingsRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {savingsRate >= 20 ? 'Excellent — keep it up' : savingsRate >= 10 ? 'Good — aim for 20%' : savingsRate >= 0 ? 'Low — cut some costs' : 'Spending more than earned'}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">Add income to calculate</p>
            )}
          </div>

          {/* Daily Burn Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Daily Burn</p>
            {dailyBurn !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{currencySymbol}{dailyBurn.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">Average per day this month</p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No expenses yet</p>
            )}
          </div>

          {/* Budget Health */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Budget Health</p>
            {hasBudgets ? (
              <>
                <p className={`text-2xl font-bold ${budgetsOk ? 'text-emerald-600' : 'text-red-500'}`}>
                  {budgetsOk ? '✓ Good' : '✗ Over'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {budgetsOk ? 'Under all budgets' : budgetItem?.tip || 'Exceeded a limit'}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No budgets set</p>
            )}
          </div>

          {/* Tracking Consistency */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Tracking</p>
            {txnCount > 0 ? (
              <>
                <p className={`text-2xl font-bold ${trackPct >= 100 ? 'text-emerald-600' : trackPct >= 50 ? 'text-yellow-500' : 'text-gray-500'}`}>{trackPct}%</p>
                <p className="text-xs text-gray-400 mt-1">{txnCount} / 10 transactions this month</p>
              </>
            ) : <p className="text-sm text-gray-400 mt-1">No transactions yet</p>}
          </div>
        </div>

        {/* Spending Personality */}
        <div className={`bg-linear-to-br ${personality.color} rounded-3xl p-5 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 text-7xl opacity-20 -translate-y-2 translate-x-2">{personality.emoji}</div>
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Your Spending Personality</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{personality.emoji}</span>
            <h3 className="text-xl font-bold">{personality.label}</h3>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{personality.desc}</p>
        </div>

        {/* Achievements */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-xl">🏅</span> Achievements
          </h3>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {achievements.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-3">
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{a.title}</p>
                    <p className="text-xs text-gray-400 leading-snug">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-3xl mb-2">🚀</p>
              <p className="text-gray-400 text-sm">Start tracking to unlock achievements!</p>
            </div>
          )}
          {data?.breakdown?.filter(b => !b.achieved && b.tip).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 mb-2">To improve your score:</p>
              <div className="space-y-1.5">
                {data.breakdown.filter(b => !b.achieved).map((b, i) => (
                  <p key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                    <span className="text-violet-400 shrink-0 mt-0.5">→</span>
                    <span><span className="font-semibold text-gray-600 dark:text-gray-300">{b.label}:</span> {b.reason}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mini Games */}
        <div className="bg-linear-to-br from-violet-950 to-gray-900 rounded-3xl p-5 border border-violet-700/30">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2"><span>🎮</span> Finance Mini-Games</h3>
              <p className="text-gray-400 text-xs mt-1">7 games to sharpen your money skills</p>
              {highScore > 0 && <p className="text-yellow-400 text-xs mt-1">🏆 Best: {highScore}</p>}
            </div>
            <button onClick={() => setShowGame(true)}
              className="bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-500 transition shadow-lg shadow-violet-900/40 active:scale-95">
              Play
            </button>
          </div>
        </div>

        {showGame && <MoneyDefender onClose={() => setShowGame(false)} />}

        {/* Mood + Joke */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Mood Tracker */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
            <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
              <span>🎨</span> How do you feel?
            </h3>
            <p className="text-xs text-gray-400 mb-4">About your finances today</p>
            <div className="flex justify-between mb-4">
              {moods.map((m) => (
                <button key={m.value} onClick={() => saveMood(m.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${selectedMood === m.value ? 'bg-violet-100 dark:bg-violet-900/30 scale-110' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{m.label}</span>
                </button>
              ))}
            </div>
            {moodResponseLoading && <div className="animate-pulse h-8 bg-violet-50 dark:bg-violet-900/20 rounded-xl" />}
            {moodResponse && !moodResponseLoading && (
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-3">
                <p className="text-sm text-violet-700 dark:text-violet-300 leading-relaxed">{moodResponse}</p>
              </div>
            )}
          </div>

          {/* AI Joke */}
          <div className="bg-linear-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-750 rounded-3xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2"><span>😄</span> Finance Joke</h3>
              <button onClick={fetchJoke} disabled={jokeLoading}
                className="text-xs text-orange-500 font-bold disabled:opacity-50 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full transition hover:bg-orange-200 active:scale-95">
                {jokeLoading ? '⏳' : '🔄'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mb-4">Powered by AI</p>
            {jokeLoading ? (
              <div className="space-y-2">
                <div className="animate-pulse h-4 bg-orange-100 dark:bg-gray-600 rounded-xl w-full" />
                <div className="animate-pulse h-4 bg-orange-100 dark:bg-gray-600 rounded-xl w-3/4" />
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed italic">"{joke}"</p>
            )}
          </div>
        </div>

        {/* AI Quote */}
        <div className="bg-linear-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-3xl p-5 border border-violet-100 dark:border-violet-800/40">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-violet-600 flex items-center gap-1.5"><span>💬</span> Motivational Quote</h3>
            <button onClick={fetchQuote} disabled={quoteLoading}
              className="text-xs text-violet-500 font-bold disabled:opacity-50 bg-violet-100 dark:bg-violet-900/30 px-3 py-1.5 rounded-full hover:bg-violet-200 transition active:scale-95">
              {quoteLoading ? '⏳' : '🔄'}
            </button>
          </div>
          {quoteLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse h-5 bg-violet-100 dark:bg-gray-600 rounded-xl w-3/4" />
              <div className="animate-pulse h-4 bg-violet-100 dark:bg-gray-600 rounded-xl w-1/3" />
            </div>
          ) : (
            <>
              <p className="text-gray-800 dark:text-white font-medium text-sm italic leading-relaxed">"{quote.text}"</p>
              <p className="text-gray-400 text-xs mt-2">— {quote.author}</p>
            </>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
            <span>📝</span> Personal Notes
          </h3>
          <p className="text-xs text-gray-400 mb-3">Your private space</p>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Write anything — reminders, thoughts, goals..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white text-sm resize-none" />
          <button onClick={saveNote}
            className="mt-3 w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition active:scale-95">
            {noteSaved ? '✅ Saved!' : 'Save Note'}
          </button>
        </div>

        <footer className="text-center py-4 text-gray-300 dark:text-gray-600 text-xs">
          2026 Spendly — Track smarter, spend better
        </footer>

      </div>
    </Layout>
  )
}
