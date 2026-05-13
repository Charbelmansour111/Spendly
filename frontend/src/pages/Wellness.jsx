import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import MoneyDefender from '../components/MoneyDefender'
import TimeMachineModal from '../components/TimeMachineModal'
import { useWallet } from '../context/WalletContext'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

const SCORE_META = (s) => {
  if (s >= 90) return { grade: 'A+', label: 'Outstanding',  color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' }
  if (s >= 80) return { grade: 'A',  label: 'Excellent',    color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' }
  if (s >= 70) return { grade: 'B',  label: 'Good',         color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400' }
  if (s >= 60) return { grade: 'C',  label: 'Fair',         color: '#F97316', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' }
  if (s >= 40) return { grade: 'D',  label: 'Needs Work',   color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-500 dark:text-red-400' }
  return       { grade: 'F',  label: 'Critical',     color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-500 dark:text-red-400' }
}

const BREAKDOWN_CONFIG = {
  'Income Tracked':    { icon: '💵', max: 20  },
  'Under Budget':      { icon: '🎯', max: 25  },
  'Positive Balance':  { icon: '⚖️', max: 25  },
  'Savings Goals':     { icon: '🏦', max: 15  },
  'Consistent Tracking':{ icon: '📊', max: 15 },
}

function ScoreRing({ score, revealed }) {
  const r = 54
  const C = 2 * Math.PI * r
  const meta = SCORE_META(score)
  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10"
          className="text-gray-100 dark:text-gray-700/60" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={revealed ? meta.color : 'transparent'} strokeWidth="10"
          strokeDasharray={C}
          strokeDashoffset={revealed ? C - (score / 100) * C : C}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)', filter: revealed ? `drop-shadow(0 0 6px ${meta.color}88)` : 'none' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {revealed ? (
          <>
            <span className="text-4xl font-black text-gray-900 dark:text-white leading-none tabular-nums">{score}</span>
            <span className="text-[11px] font-semibold text-gray-400 leading-none">/100</span>
          </>
        ) : (
          <span className="text-3xl select-none">🔒</span>
        )}
      </div>
    </div>
  )
}

export default function Wellness() {
  const { activeWallet } = useWallet()
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [note, setNote]               = useState('')
  const [noteSaved, setNoteSaved]     = useState(false)
  const [scoreRevealed, setScoreRevealed] = useState(false)
  const [scoreAnimating, setScoreAnimating] = useState(false)
  const [sym] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [financials, setFinancials]   = useState({ totalIncome: 0, totalSpent: 0, balance: 0, streak: 0 })
  const [joke, setJoke]               = useState('')
  const [jokeLoading, setJokeLoading] = useState(false)
  const [quote, setQuote]             = useState({ text: '', author: '' })
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [moodResponse, setMoodResponse] = useState('')
  const [moodLoading, setMoodLoading] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  const [showGame, setShowGame]       = useState(false)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [highScore]                   = useState(() => parseInt(localStorage.getItem('moneyDefenderHS') || '0'))

  const today        = new Date()
  const monthName    = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const dayOfMonth   = today.getDate()
  const currentMonth = today.getMonth() + 1
  const currentYear  = today.getFullYear()

  const fetchJoke = useCallback(async () => {
    setJokeLoading(true)
    try { const r = await API.get('/wellness/joke'); setJoke(r.data.joke) }
    catch { setJoke("Why did the banker switch careers? He lost interest!") }
    setJokeLoading(false)
  }, [])

  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true)
    try { const r = await API.get('/wellness/quote'); setQuote(r.data) }
    catch { setQuote({ text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" }) }
    setQuoteLoading(false)
  }, [])

  const fetchData = useCallback(async () => {
    try { await API.post('/income/apply-recurring', { month: currentMonth, year: currentYear }) } catch { /* noop */ }
    try {
      const wid = activeWallet && !activeWallet.is_total_wallet ? activeWallet.id : null
      const [expRes, incRes, budRes, savRes, wellRes] = await Promise.allSettled([
        wid ? API.get(`/wallets/${wid}/expenses`) : API.get('/expenses'),
        wid ? API.get(`/wallets/${wid}/income`)   : API.get('/income'),
        API.get('/budgets'),
        API.get('/savings'),
        API.get('/wellness'),
      ])
      const allExpenses  = expRes.status === 'fulfilled' ? (expRes.value.data || []) : []
      const allIncome    = incRes.status  === 'fulfilled' ? (incRes.value.data  || []) : []
      const incomeList   = allIncome.filter(i => Number(i.month) === currentMonth && Number(i.year) === currentYear)
      const budgetList   = budRes.status  === 'fulfilled' ? (budRes.value.data  || []) : []
      const savingsList  = savRes.status  === 'fulfilled' ? (savRes.value.data  || []) : []
      const monthExpenses = allExpenses.filter(e => {
        const s = (e.date instanceof Date ? e.date.toISOString() : String(e.date)).split('T')[0]
        const [y, m] = s.split('-').map(Number)
        return m === currentMonth && y === currentYear
      })
      const totalSpent  = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
      const totalIncome = incomeList.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
      const balance     = totalIncome - totalSpent
      const dateset     = new Set(allExpenses.map(e => e.date?.split('T')[0]).filter(Boolean))
      let streak = 0
      const cd = new Date()
      for (let i = 0; i < 60; i++) {
        const ds = cd.toISOString().split('T')[0]
        if (dateset.has(ds)) { streak++; cd.setDate(cd.getDate() - 1) }
        else { if (i > 0) break; cd.setDate(cd.getDate() - 1) }
      }
      const catTotals = monthExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0); return acc
      }, {})
      const overBudgetCount = budgetList.filter(b => (catTotals[b.category] || 0) > parseFloat(b.amount)).length
      let score = 0; const breakdown = []
      if (totalIncome > 0) {
        score += 20; breakdown.push({ label: 'Income Tracked', points: 20, max: 20, achieved: true, tip: `${sym}${totalIncome.toFixed(2)} logged this month` })
      } else {
        breakdown.push({ label: 'Income Tracked', points: 0, max: 20, achieved: false, tip: 'Add your income to unlock 20 pts' })
      }
      if (budgetList.length > 0 && overBudgetCount === 0) {
        score += 25; breakdown.push({ label: 'Under Budget', points: 25, max: 25, achieved: true, tip: `All ${budgetList.length} budgets under limit` })
      } else if (budgetList.length === 0) {
        breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: 'Set budget limits to unlock 25 pts' })
      } else {
        breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: `Over in ${overBudgetCount} categor${overBudgetCount > 1 ? 'ies' : 'y'}` })
      }
      if (totalIncome > 0 && balance > 0) {
        const rate = (balance / totalIncome) * 100
        const pts = rate >= 20 ? 25 : rate >= 10 ? 15 : 10
        score += pts; breakdown.push({ label: 'Positive Balance', points: pts, max: 25, achieved: true, tip: `Saving ${rate.toFixed(0)}% of income` })
      } else {
        breakdown.push({ label: 'Positive Balance', points: 0, max: 25, achieved: false, tip: totalIncome === 0 ? 'Log income to calculate' : 'Spending exceeds income' })
      }
      const wellData = wellRes.status === 'fulfilled' ? wellRes.value.data : null
      if (savingsList.length > 0) {
        score += 15; breakdown.push({ label: 'Savings Goals', points: 15, max: 15, achieved: true, tip: `${savingsList.length} goal${savingsList.length > 1 ? 's' : ''} active` })
      } else {
        breakdown.push({ label: 'Savings Goals', points: 0, max: 15, achieved: false, tip: 'Create a goal to unlock 15 pts' })
      }
      const txnPts = Math.min(Math.floor((monthExpenses.length / 10) * 15), 15)
      score += txnPts
      if (monthExpenses.length >= 10) {
        breakdown.push({ label: 'Consistent Tracking', points: 15, max: 15, achieved: true, tip: `${monthExpenses.length} transactions this month` })
      } else {
        breakdown.push({ label: 'Consistent Tracking', points: txnPts, max: 15, achieved: false, tip: `${10 - monthExpenses.length} more needed for full pts` })
      }
      setFinancials({ totalIncome, totalSpent, balance, streak })
      setData({ ...wellData, score, breakdown, budgetList, monthExpenseCount: monthExpenses.length })
      if (wellData?.note?.content) setNote(wellData.note.content)
      if (wellData?.mood?.mood) setSelectedMood(wellData.mood.mood)
    } catch (e) { console.log('Wellness fetch error', e) }
    setLoading(false)
  }, [currentMonth, currentYear, sym, activeWallet])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData(); fetchJoke(); fetchQuote()
  }, [fetchData, fetchJoke, fetchQuote])

  const handleReveal = () => {
    if (scoreAnimating) return
    setScoreAnimating(true)
    setScoreRevealed(false)
    setTimeout(() => { setScoreRevealed(true); setScoreAnimating(false) }, 120)
  }

  const saveNote = async () => {
    try { await API.post('/wellness/note', { content: note }); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2000) }
    catch { /* noop */ }
  }

  const saveMood = async (mood) => {
    setSelectedMood(mood); setMoodLoading(true); setMoodResponse('')
    try {
      await API.post('/wellness/mood', { mood })
      const r = await API.post('/wellness/mood-response', { mood })
      setMoodResponse(r.data.message)
    } catch { setMoodResponse('Thanks for sharing! Keep tracking your finances.') }
    setMoodLoading(false)
  }

  const { totalIncome, totalSpent, balance, streak } = financials
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : null
  const dailyBurn   = totalSpent > 0 && dayOfMonth > 0 ? totalSpent / dayOfMonth : null
  const meta        = SCORE_META(data?.score || 0)

  const getPersonality = () => {
    if (totalSpent === 0) return { label: 'Just Getting Started', emoji: '🌱', color: '#6B7280', desc: 'Start logging expenses to unlock your financial identity.' }
    const rate = totalIncome > 0 ? balance / totalIncome : -1
    if (rate >= 0.3) return { label: 'Wealth Builder',     emoji: '🏗️', color: '#059669', desc: "Saving 30%+ — you're building real wealth." }
    if (data?.score >= 80) return { label: 'The Disciplined One', emoji: '🎯', color: '#7C3AED', desc: 'Consistent, under budget, and crushing goals.' }
    if (rate >= 0.1) return { label: 'Steady Climber',     emoji: '📈', color: '#2563EB', desc: 'Saving every month — momentum is everything.' }
    if (rate >= 0)   return { label: 'Break-Even Racer',   emoji: '⚖️', color: '#D97706', desc: "Covering costs — now push for savings." }
    return               { label: 'Free Spirit',           emoji: '🎪', color: '#EC4899', desc: 'Life is for living — a budget helps too.' }
  }
  const personality = getPersonality()

  const moods = [
    { emoji: '😄', label: 'Great',    value: 'great'   },
    { emoji: '😊', label: 'Good',     value: 'good'    },
    { emoji: '😐', label: 'Okay',     value: 'okay'    },
    { emoji: '😟', label: 'Worried',  value: 'worried' },
    { emoji: '😰', label: 'Stressed', value: 'stressed'},
  ]

  if (loading) return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between pb-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Financial Wellness</h1>
            <p className="text-sm text-gray-400 mt-0.5">{monthName}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 14px #7c3aed44' }}>
            💚
          </div>
        </div>

        {/* ── SCORE CARD ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Top gradient strip */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }} />

          <div className="p-6">
            <div className="flex items-center gap-6">
              <ScoreRing score={data?.score || 0} revealed={scoreRevealed} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Health Score</p>
                {scoreRevealed ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-black" style={{ color: meta.color }}>{meta.grade}</span>
                      <span className="text-base font-semibold text-gray-700 dark:text-gray-200">{meta.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">Based on {monthName}</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Tap to reveal your score</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600">Based on income, budgets & habits</p>
                  </>
                )}
                <button
                  onClick={handleReveal}
                  disabled={scoreAnimating}
                  className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 border"
                  style={scoreRevealed
                    ? { background: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }
                    : { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', borderColor: 'transparent', boxShadow: '0 4px 12px #7c3aed30' }
                  }>
                  {scoreAnimating ? 'Calculating…' : scoreRevealed ? 'Recalculate' : 'Calculate Score'}
                </button>
              </div>
            </div>

            {/* Score breakdown — only visible after reveal */}
            {scoreRevealed && data?.breakdown && (
              <div className="mt-5 space-y-2.5 border-t border-gray-50 dark:border-gray-800 pt-5">
                {data.breakdown.map((item, i) => {
                  const cfg = BREAKDOWN_CONFIG[item.label] || {}
                  const pct = (item.points / item.max) * 100
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center shrink-0">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
                          <span className="text-xs font-bold tabular-nums ml-2 shrink-0" style={{ color: item.achieved ? meta.color : '#9ca3af' }}>
                            {item.points}<span className="text-gray-300 dark:text-gray-600">/{item.max}</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: item.achieved ? meta.color : '#e5e7eb' }} />
                        </div>
                        {!item.achieved && <p className="text-[10px] text-gray-400 mt-0.5">{item.tip}</p>}
                      </div>
                      {item.achieved && (
                        <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0" style={{ background: `${meta.color}15`, color: meta.color }}>✓</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── QUICK STATS ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Income',  value: `${sym}${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: monthName,                     icon: '💵', accent: '#10b981' },
            { label: 'Spent',   value: `${sym}${totalSpent.toLocaleString('en-US',  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,  sub: monthName,                     icon: '💸', accent: '#ef4444' },
            { label: 'Balance', value: `${balance >= 0 ? '+' : '-'}${sym}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: balance >= 0 ? 'surplus' : 'deficit', icon: '⚖️', accent: balance >= 0 ? '#2563eb' : '#f97316' },
            { label: 'Streak',  value: `${streak}d`,                                                                                            sub: 'in a row',                    icon: '🔥', accent: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</span>
                <span className="text-sm">{s.icon}</span>
              </div>
              <p className="text-xl font-black tabular-nums leading-none" style={{ color: s.accent }}>{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── MONTHLY INSIGHTS ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Monthly Insights</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Savings Rate */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Savings Rate</p>
              {savingsRate !== null ? (
                <>
                  <p className="text-2xl font-black tabular-nums"
                    style={{ color: savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }}>
                    {savingsRate.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {savingsRate >= 20 ? 'Great savings!' : savingsRate >= 10 ? 'Aim for 20%+' : savingsRate >= 0 ? 'Cut some costs' : 'Over budget'}
                  </p>
                </>
              ) : <p className="text-sm text-gray-400">Add income first</p>}
            </div>
            {/* Daily Burn */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Daily Burn</p>
              {dailyBurn !== null ? (
                <>
                  <p className="text-2xl font-black tabular-nums text-gray-800 dark:text-white">{sym}{dailyBurn.toFixed(2)}</p>
                  <p className="text-[11px] text-gray-400">avg per day</p>
                </>
              ) : <p className="text-sm text-gray-400">No expenses yet</p>}
            </div>

            <div className="col-span-2 h-px bg-gray-100 dark:bg-gray-800" />

            {/* Budget Health */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Budget Health</p>
              {data?.budgetList?.length > 0 ? (
                <>
                  <p className="text-2xl font-black" style={{ color: data.breakdown?.find(b => b.label === 'Under Budget')?.achieved ? '#10b981' : '#ef4444' }}>
                    {data.breakdown?.find(b => b.label === 'Under Budget')?.achieved ? 'On Track' : 'Over'}
                  </p>
                  <p className="text-[11px] text-gray-400">{data.breakdown?.find(b => b.label === 'Under Budget')?.tip}</p>
                </>
              ) : <p className="text-sm text-gray-400">No budgets set</p>}
            </div>
            {/* Tracking */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-black tabular-nums text-gray-800 dark:text-white">{data?.monthExpenseCount ?? 0}</p>
              <p className="text-[11px] text-gray-400">this month · target 10</p>
            </div>
          </div>
        </div>

        {/* ── SPENDING PERSONALITY ── */}
        <div className="rounded-3xl p-5 overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${personality.color}22, ${personality.color}08)`, border: `1px solid ${personality.color}22` }}>
          <div className="absolute top-3 right-4 text-7xl opacity-10 select-none leading-none">{personality.emoji}</div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: personality.color }}>Your Profile</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{personality.emoji}</span>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{personality.label}</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{personality.desc}</p>
        </div>

        {/* ── MOOD TRACKER ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">How are you feeling?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">About your finances today</p>
          <div className="flex justify-between">
            {moods.map(m => (
              <button key={m.value} onClick={() => saveMood(m.value)}
                className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-2xl transition-all active:scale-90 ${
                  selectedMood === m.value ? 'bg-violet-50 dark:bg-violet-900/20 scale-105' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{m.label}</span>
              </button>
            ))}
          </div>
          {moodLoading && <div className="mt-3 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />}
          {moodResponse && !moodLoading && (
            <div className="mt-3 bg-violet-50 dark:bg-violet-900/20 rounded-2xl px-4 py-3 border border-violet-100 dark:border-violet-800/30">
              <p className="text-sm text-violet-700 dark:text-violet-300 leading-relaxed">{moodResponse}</p>
            </div>
          )}
        </div>

        {/* ── QUOTE + JOKE ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Quote */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Daily Quote</p>
              <button onClick={fetchQuote} disabled={quoteLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-violet-600 transition disabled:opacity-40 text-sm">
                {quoteLoading ? '⏳' : '↻'}
              </button>
            </div>
            {quoteLoading ? <div className="space-y-2"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-3/4" /></div> : (
              <>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">"{quote.text}"</p>
                <p className="text-xs text-gray-400 mt-2">— {quote.author}</p>
              </>
            )}
          </div>
          {/* Joke */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finance Joke</p>
              <button onClick={fetchJoke} disabled={jokeLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-amber-500 transition disabled:opacity-40 text-sm">
                {jokeLoading ? '⏳' : '↻'}
              </button>
            </div>
            {jokeLoading ? <div className="space-y-2"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-2/3" /></div> : (
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">"{joke}"</p>
            )}
          </div>
        </div>

        {/* ── ACTIONS: TIME MACHINE + MINI GAMES ── */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowTimeMachine(true)}
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 text-left hover:border-violet-200 dark:hover:border-violet-800/40 transition-all active:scale-[0.98] group">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform">🕰️</div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Time Machine</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">Travel to any year in history</p>
          </button>
          <button onClick={() => setShowGame(true)}
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 text-left hover:border-violet-200 dark:hover:border-violet-800/40 transition-all active:scale-[0.98] group">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform">🎮</div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Mini Games</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{highScore > 0 ? `Best: ${highScore}` : '7 games to play'}</p>
          </button>
        </div>

        {/* ── PERSONAL NOTES ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Personal Notes</p>
          <p className="text-sm text-gray-400 mb-3">Your private space</p>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Reminders, thoughts, goals…"
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none transition"
          />
          <button onClick={saveNote}
            className="mt-3 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition active:scale-95">
            {noteSaved ? '✓ Saved' : 'Save Note'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 dark:text-gray-700 py-2">
          Spendly · Track smarter, spend better
        </p>

      </div>

      {showGame && <MoneyDefender onClose={() => setShowGame(false)} />}
      {showTimeMachine && (
        <TimeMachineModal
          onClose={() => setShowTimeMachine(false)}
          defaultAmount={financials.totalSpent || 100}
          currency={localStorage.getItem('currency') || 'USD'}
        />
      )}
    </Layout>
  )
}
