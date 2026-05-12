import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import MoneyDefender from '../components/MoneyDefender'
import TimeMachineModal from '../components/TimeMachineModal'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

function ScoreRing({ score, revealed }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444'
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
          <circle cx="80" cy="80" r={radius} fill="none" stroke={revealed ? color : 'rgba(255,255,255,0.15)'} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={revealed ? offset : circumference}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease', filter: revealed ? `drop-shadow(0 0 8px ${color})` : 'none' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {revealed ? (
            <>
              <span className="text-5xl font-black text-white leading-none">{score}</span>
              <span className="text-sm text-white/50 font-medium">/ 100</span>
            </>
          ) : (
            <span className="text-5xl">🔒</span>
          )}
        </div>
      </div>
      {revealed && (
        <div className="mt-3 flex items-center gap-2">
          <span className="px-4 py-1.5 rounded-full text-white font-black text-base shadow-lg" style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}66` }}>
            {grade}
          </span>
          <span className="text-base font-semibold text-white/70">{label}</span>
        </div>
      )}
    </div>
  )
}

const BREAKDOWN_ICONS = {
  'Income Tracked': '💰',
  'Under Budget': '🎯',
  'Positive Balance': '📈',
  'Savings Goals': '🏦',
  'Consistent Tracking': '📊',
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
  const [showTimeMachine, setShowTimeMachine] = useState(false)
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
    try { await API.post('/income/apply-recurring', { month: currentMonth, year: currentYear }) } catch { /* noop */ }
    try {
      const [expRes, incRes, budRes, savRes, wellRes] = await Promise.allSettled([
        API.get('/expenses'),
        API.get('/income'),
        API.get('/budgets'),
        API.get('/savings'),
        API.get('/wellness'),
      ])

      const allExpenses = expRes.status === 'fulfilled' ? (expRes.value.data || []) : []
      const allIncome   = incRes.status  === 'fulfilled' ? (incRes.value.data  || []) : []
      const incomeList  = allIncome.filter(i => Number(i.month) === currentMonth && Number(i.year) === currentYear)
      const budgetList  = budRes.status  === 'fulfilled' ? (budRes.value.data  || []) : []
      const savingsList = savRes.status  === 'fulfilled' ? (savRes.value.data  || []) : []

      // Month expenses — parse date string directly to avoid UTC-offset month drift
      const monthExpenses = allExpenses.filter(e => {
        const s = (e.date instanceof Date ? e.date.toISOString() : String(e.date)).split('T')[0]
        const [y, m] = s.split('-').map(Number)
        return m === currentMonth && y === currentYear
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Wellness</h1>
            <p className="text-gray-400 text-sm mt-0.5">{monthName}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-xl leading-none">💚</span>
          </div>
        </div>

        {/* Hero Health Score Card */}
        <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #2e1065 0%, #1e1b4b 40%, #0f0c2e 100%)' }}>
          {/* Decorative orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #4f46e5, transparent)', transform: 'translate(-30%, 30%)' }} />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

          <div className="relative p-7 flex flex-col items-center gap-5">
            {/* Score ring — big and centered */}
            <ScoreRing score={data?.score || 0} revealed={scoreRevealed} />

            <button
              onClick={handleCalculateScore}
              disabled={scoreAnimating}
              className="bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all text-white text-sm font-bold px-7 py-3 rounded-full flex items-center gap-2 disabled:opacity-50 backdrop-blur-sm">
              {scoreAnimating ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Scanning…</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>{scoreRevealed ? 'Recalculate Score' : 'Calculate My Score'}</>
              )}
            </button>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-white font-bold text-lg">Financial Health Score</h2>
              <p className="text-white/40 text-xs mt-0.5">Based on your {monthName} activity</p>
            </div>

            {/* Breakdown as progress bars */}
            <div className="w-full space-y-3 pt-1">
              {data?.breakdown?.map((item, i) => {
                const pct = (item.points / item.max) * 100
                const barColor = item.achieved ? '#10B981' : pct > 0 ? '#F59E0B' : '#6b7280'
                return (
                  <div key={i} className="bg-white/5 rounded-2xl p-3.5 border border-white/8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
                        style={{ background: item.achieved ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)' }}>
                        {BREAKDOWN_ICONS[item.label] || '✦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-white text-sm font-semibold">{item.label}</span>
                          <span className="text-white/60 text-xs font-bold tabular-nums ml-2 shrink-0">{item.points}<span className="text-white/30">/{item.max}</span></span>
                        </div>
                      </div>
                      {item.achieved && <span className="text-emerald-400 text-sm shrink-0">✓</span>}
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: scoreRevealed ? `${pct}%` : '0%', background: barColor, boxShadow: item.achieved ? `0 0 8px ${barColor}88` : 'none' }} />
                    </div>
                    {!item.achieved && item.tip && (
                      <p className="text-white/35 text-[11px] mt-1.5 flex items-center gap-1">
                        <span className="text-violet-400">↗</span> {item.tip}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Num Modal */}
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

        {/* Stats Row — 4 styled cards */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'Income', icon: '💵', value: `${currencySymbol}${totalIncome.toFixed(0)}`, sub: monthName, color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/20', textColor: 'text-emerald-400', modal: { label: 'Income', value: currencySymbol + totalIncome.toFixed(2), sub: monthName } },
            { label: 'Spent', icon: '💸', value: `${currencySymbol}${totalSpent.toFixed(0)}`, sub: monthName, color: 'from-rose-500/20 to-red-500/10', border: 'border-rose-500/20', iconBg: 'bg-rose-500/20', textColor: 'text-rose-400', modal: { label: 'Spent', value: currencySymbol + totalSpent.toFixed(2), sub: monthName } },
            { label: 'Balance', icon: '⚖️', value: `${balance >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(balance).toFixed(0)}`, sub: balance >= 0 ? 'surplus' : 'deficit', color: balance >= 0 ? 'from-blue-500/20 to-indigo-500/10' : 'from-orange-500/20 to-red-500/10', border: balance >= 0 ? 'border-blue-500/20' : 'border-orange-500/20', iconBg: balance >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20', textColor: balance >= 0 ? 'text-blue-400' : 'text-orange-400', modal: { label: 'Balance', value: (balance >= 0 ? '+' : '') + currencySymbol + Math.abs(balance).toFixed(2), sub: balance >= 0 ? 'surplus' : 'deficit' } },
            { label: 'Streak', icon: '🔥', value: `${streak}d`, sub: 'in a row', color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', iconBg: 'bg-amber-500/20', textColor: 'text-amber-400', modal: { label: 'Tracking Streak', value: streak + ' days', sub: 'consecutive tracking' } },
          ].map((stat) => (
            <button key={stat.label} onClick={() => setNumModal(stat.modal)}
              className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-2xl p-3 text-left active:scale-95 transition-transform`}>
              <div className={`w-7 h-7 rounded-lg ${stat.iconBg} flex items-center justify-center text-sm mb-2`}>{stat.icon}</div>
              <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">{stat.label}</p>
              <p className={`${stat.textColor} font-black text-sm tabular-nums truncate`}>{stat.value}</p>
              <p className="text-gray-500 text-[9px] truncate">{stat.sub}</p>
            </button>
          ))}
        </div>

        {/* Interesting Stats */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-violet-500/20 flex items-center justify-center text-sm">📊</div>
            <h2 className="text-gray-800 dark:text-white font-bold text-base">Monthly Insights</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Savings Rate */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-sm">💹</div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Savings Rate</p>
              </div>
              {savingsRate !== null ? (
                <>
                  <p className={`text-2xl font-black ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
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
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-sm">🔥</div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Daily Burn</p>
              </div>
              {dailyBurn !== null ? (
                <>
                  <p className="text-2xl font-black text-gray-800 dark:text-white">{currencySymbol}{dailyBurn.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-1">Average per day this month</p>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-1">No expenses yet</p>
              )}
            </div>

            {/* Budget Health */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-sm">🎯</div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Budget Health</p>
              </div>
              {hasBudgets ? (
                <>
                  <p className={`text-2xl font-black ${budgetsOk ? 'text-emerald-600' : 'text-red-500'}`}>
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
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-sm">📋</div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tracking</p>
              </div>
              {txnCount > 0 ? (
                <>
                  <p className={`text-2xl font-black ${trackPct >= 100 ? 'text-emerald-600' : trackPct >= 50 ? 'text-yellow-500' : 'text-gray-500'}`}>{trackPct}%</p>
                  <p className="text-xs text-gray-400 mt-1">{txnCount} / 10 transactions this month</p>
                </>
              ) : <p className="text-sm text-gray-400 mt-1">No transactions yet</p>}
            </div>
          </div>
        </div>

        {/* Spending Personality */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-pink-500/20 flex items-center justify-center text-sm">🧠</div>
            <h2 className="text-gray-800 dark:text-white font-bold text-base">Spending Personality</h2>
          </div>
          <div className={`bg-gradient-to-br ${personality.color} rounded-3xl p-6 text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 text-[100px] opacity-10 leading-none -translate-y-2 translate-x-4 select-none">{personality.emoji}</div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Your Financial Identity</p>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{personality.emoji}</span>
              <h3 className="text-2xl font-black">{personality.label}</h3>
            </div>
            <p className="text-white/75 text-sm leading-relaxed">{personality.desc}</p>
          </div>
        </div>

        {/* Mini Games */}
        <div className="relative rounded-3xl overflow-hidden border border-violet-700/30" style={{ background: 'linear-gradient(135deg, #1e1065 0%, #111827 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(20%, -20%)' }} />
          <div className="relative flex justify-between items-center p-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-xl bg-violet-500/30 flex items-center justify-center text-sm">🎮</div>
                <h3 className="text-white font-bold text-base">Finance Mini-Games</h3>
              </div>
              <p className="text-gray-400 text-xs mt-0.5 ml-9">7 games to sharpen your money skills</p>
              {highScore > 0 && <p className="text-yellow-400 text-xs mt-1 ml-9">🏆 Best: {highScore}</p>}
            </div>
            <button onClick={() => setShowGame(true)}
              className="bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-500 transition shadow-lg shadow-violet-900/40 active:scale-95 shrink-0">
              Play
            </button>
          </div>
        </div>

        {showGame && <MoneyDefender onClose={() => setShowGame(false)} />}

        {/* Mood + Joke */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Mood Tracker */}
          <div className="bg-white dark:bg-gray-800/80 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-xl bg-pink-500/15 flex items-center justify-center text-sm">🎨</div>
              <h3 className="text-base font-bold text-gray-800 dark:text-white">How do you feel?</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-9">About your finances today</p>
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
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-3 border border-violet-100 dark:border-violet-800/30">
                <p className="text-sm text-violet-700 dark:text-violet-300 leading-relaxed">{moodResponse}</p>
              </div>
            )}
          </div>

          {/* AI Joke */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800/80 dark:to-gray-800/60 rounded-3xl shadow-sm border border-amber-100/80 dark:border-gray-700/50 p-5">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center text-sm">😄</div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white">Finance Joke</h3>
              </div>
              <button onClick={fetchJoke} disabled={jokeLoading}
                className="text-xs text-orange-500 font-bold disabled:opacity-50 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full transition hover:bg-orange-200 active:scale-95">
                {jokeLoading ? '⏳' : '🔄'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mb-4 ml-9">Powered by AI</p>
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
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-3xl p-5 border border-violet-100 dark:border-violet-800/40">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center text-sm">💬</div>
              <h3 className="text-sm font-bold text-violet-600">Motivational Quote</h3>
            </div>
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

        {/* Time Machine */}
        <div className="relative rounded-3xl overflow-hidden border border-violet-700/30" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0f172a 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, #6d28d9, transparent)', transform: 'translate(30%, -30%)' }} />
          <div className="relative flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-xl bg-violet-500/30 flex items-center justify-center text-sm">🕰️</div>
                <h3 className="text-white font-bold text-base">Time Machine</h3>
              </div>
              <p className="text-violet-300 text-xs mt-0.5 ml-9">Travel to any year in history</p>
              <p className="text-gray-500 text-[11px] mt-0.5 ml-9">AI sketch + planet animation + sarcastic roast</p>
            </div>
            <button onClick={() => setShowTimeMachine(true)}
              className="shrink-0 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-500 transition shadow-lg shadow-violet-900/40 active:scale-95">
              Travel
            </button>
          </div>
        </div>

        {showTimeMachine && (
          <TimeMachineModal
            onClose={() => setShowTimeMachine(false)}
            defaultAmount={financials.totalSpent || 100}
            currency={localStorage.getItem('currency') || 'USD'}
          />
        )}

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800/80 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm">📝</div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white">Personal Notes</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3 ml-9">Your private space</p>
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
