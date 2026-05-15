import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import MoneyDefender from '../components/MoneyDefender'
import TimeMachineModal from '../components/TimeMachineModal'
import { useWallet } from '../context/WalletContext'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

const SCORE_META = (s) => {
  if (s >= 90) return { grade: 'A+', label: 'Outstanding', color: '#10B981', ring: '#10B981', glow: '#10B98133' }
  if (s >= 80) return { grade: 'A',  label: 'Excellent',   color: '#10B981', ring: '#10B981', glow: '#10B98133' }
  if (s >= 70) return { grade: 'B',  label: 'Good',        color: '#F59E0B', ring: '#F59E0B', glow: '#F59E0B33' }
  if (s >= 60) return { grade: 'C',  label: 'Fair',        color: '#F97316', ring: '#F97316', glow: '#F9731633' }
  if (s >= 40) return { grade: 'D',  label: 'Needs Work',  color: '#EF4444', ring: '#EF4444', glow: '#EF444433' }
  return       { grade: 'F',  label: 'Critical',    color: '#EF4444', ring: '#EF4444', glow: '#EF444433' }
}

const BREAKDOWN_CONFIG = {
  'Income Tracked':     { icon: '💵', color: '#10B981', bg: 'rgba(16,185,129,.12)' },
  'Under Budget':       { icon: '🎯', color: '#7C3AED', bg: 'rgba(124,58,237,.12)' },
  'Positive Balance':   { icon: '⚖️', color: '#2563EB', bg: 'rgba(37,99,235,.12)'  },
  'Savings Goals':      { icon: '🏦', color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
  'Consistent Tracking':{ icon: '📊', color: '#EC4899', bg: 'rgba(236,72,153,.12)' },
}

function ScoreRing({ score, revealed }) {
  const r = 52, C = 2 * Math.PI * r
  const meta = SCORE_META(score)
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 116 116">
        <circle cx="58" cy="58" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
        <circle cx="58" cy="58" r={r} fill="none"
          stroke={revealed ? meta.ring : 'rgba(255,255,255,0.08)'} strokeWidth="9"
          strokeDasharray={C} strokeDashoffset={revealed ? C - (score / 100) * C : C}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)', filter: revealed ? `drop-shadow(0 0 8px ${meta.ring})` : 'none' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {revealed ? (
          <>
            <span className="text-3xl font-black text-white leading-none tabular-nums">{score}</span>
            <span className="text-[11px] text-white/50 font-medium mt-0.5">/100</span>
          </>
        ) : (
          <span className="text-2xl select-none">🔒</span>
        )}
      </div>
    </div>
  )
}

export default function Wellness() {
  const { activeWallet } = useWallet()
  const [data, setData]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [note, setNote]                     = useState('')
  const [noteSaved, setNoteSaved]           = useState(false)
  const [scoreRevealed, setScoreRevealed]   = useState(false)
  const [scoreAnimating, setScoreAnimating] = useState(false)
  const [sym]                               = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [financials, setFinancials]         = useState({ totalIncome: 0, totalSpent: 0, balance: 0, streak: 0 })
  const [joke, setJoke]                     = useState('')
  const [jokeLoading, setJokeLoading]       = useState(false)
  const [quote, setQuote]                   = useState({ text: '', author: '' })
  const [quoteLoading, setQuoteLoading]     = useState(false)
  const [moodResponse, setMoodResponse]     = useState('')
  const [moodLoading, setMoodLoading]       = useState(false)
  const [selectedMood, setSelectedMood]     = useState(null)
  const [showGame, setShowGame]             = useState(false)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [highScore]                         = useState(() => parseInt(localStorage.getItem('moneyDefenderHS') || '0'))

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
        API.get('/budgets'), API.get('/savings'), API.get('/wellness'),
      ])
      const allExpenses   = expRes.status === 'fulfilled' ? (expRes.value.data || []) : []
      const allIncome     = incRes.status === 'fulfilled'  ? (incRes.value.data  || []) : []
      const incomeList    = allIncome.filter(i => Number(i.month) === currentMonth && Number(i.year) === currentYear)
      const budgetList    = budRes.status === 'fulfilled'  ? (budRes.value.data  || []) : []
      const savingsList   = savRes.status === 'fulfilled'  ? (savRes.value.data  || []) : []
      const monthExpenses = allExpenses.filter(e => {
        const s = (e.date instanceof Date ? e.date.toISOString() : String(e.date)).split('T')[0]
        const [y, m] = s.split('-').map(Number)
        return m === currentMonth && y === currentYear
      })
      const totalSpent  = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
      const totalIncome = incomeList.reduce((s, i)    => s + parseFloat(i.amount || 0), 0)
      const balance     = totalIncome - totalSpent
      const dateset     = new Set(allExpenses.map(e => e.date?.split('T')[0]).filter(Boolean))
      let streak = 0; const cd = new Date()
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
        score += 20; breakdown.push({ label: 'Income Tracked', points: 20, max: 20, achieved: true, tip: `${sym}${totalIncome.toFixed(2)} logged` })
      } else breakdown.push({ label: 'Income Tracked', points: 0, max: 20, achieved: false, tip: 'Add income to unlock 20 pts' })
      if (budgetList.length > 0 && overBudgetCount === 0) {
        score += 25; breakdown.push({ label: 'Under Budget', points: 25, max: 25, achieved: true, tip: `All ${budgetList.length} budgets OK` })
      } else if (budgetList.length === 0)
        breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: 'Set budgets to unlock 25 pts' })
      else
        breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: `Over in ${overBudgetCount} categor${overBudgetCount > 1 ? 'ies' : 'y'}` })
      if (totalIncome > 0 && balance > 0) {
        const rate = (balance / totalIncome) * 100
        const pts = rate >= 20 ? 25 : rate >= 10 ? 15 : 10
        score += pts; breakdown.push({ label: 'Positive Balance', points: pts, max: 25, achieved: true, tip: `Saving ${rate.toFixed(0)}% of income` })
      } else breakdown.push({ label: 'Positive Balance', points: 0, max: 25, achieved: false, tip: totalIncome === 0 ? 'Log income first' : 'Spending > income' })
      const wellData = wellRes.status === 'fulfilled' ? wellRes.value.data : null
      if (savingsList.length > 0) {
        score += 15; breakdown.push({ label: 'Savings Goals', points: 15, max: 15, achieved: true, tip: `${savingsList.length} goal${savingsList.length > 1 ? 's' : ''} active` })
      } else breakdown.push({ label: 'Savings Goals', points: 0, max: 15, achieved: false, tip: 'Create a goal to unlock 15 pts' })
      const txnPts = Math.min(Math.floor((monthExpenses.length / 10) * 15), 15)
      score += txnPts
      breakdown.push(monthExpenses.length >= 10
        ? { label: 'Consistent Tracking', points: 15, max: 15, achieved: true,  tip: `${monthExpenses.length} transactions` }
        : { label: 'Consistent Tracking', points: txnPts, max: 15, achieved: false, tip: `${10 - monthExpenses.length} more for full pts` })
      setFinancials({ totalIncome, totalSpent, balance, streak })
      setData({ ...wellData, score, breakdown, budgetList, monthExpenseCount: monthExpenses.length })
      if (wellData?.note?.content) setNote(wellData.note.content)
      if (wellData?.mood?.mood)    setSelectedMood(wellData.mood.mood)
    } catch (e) { console.log('Wellness fetch error', e) }
    setLoading(false)
  }, [currentMonth, currentYear, sym, activeWallet])

  useEffect(() => {
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    fetchData(); fetchJoke(); fetchQuote()
  }, [fetchData, fetchJoke, fetchQuote])

  const handleReveal = () => {
    if (scoreAnimating) return
    setScoreAnimating(true); setScoreRevealed(false)
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
  const moods       = [
    { emoji: '😄', label: 'Great',    value: 'great'    },
    { emoji: '😊', label: 'Good',     value: 'good'     },
    { emoji: '😐', label: 'Okay',     value: 'okay'     },
    { emoji: '😟', label: 'Worried',  value: 'worried'  },
    { emoji: '😰', label: 'Stressed', value: 'stressed' },
  ]

  const getPersonality = () => {
    if (totalSpent === 0) return { label: 'Just Getting Started', emoji: '🌱', from: '#6B7280', to: '#4B5563' }
    const rate = totalIncome > 0 ? balance / totalIncome : -1
    if (rate >= 0.3)         return { label: 'Wealth Builder',      emoji: '🏗️', from: '#059669', to: '#0D9488' }
    if ((data?.score||0) >= 80) return { label: 'The Disciplined One', emoji: '🎯', from: '#7C3AED', to: '#4F46E5' }
    if (rate >= 0.1)         return { label: 'Steady Climber',      emoji: '📈', from: '#2563EB', to: '#0891B2' }
    if (rate >= 0)           return { label: 'Break-Even Racer',    emoji: '⚖️', from: '#D97706', to: '#EA580C' }
    return                          { label: 'Free Spirit',         emoji: '🎪', from: '#EC4899', to: '#F43F5E' }
  }
  const personality = getPersonality()

  // ── Full-screen overlays ─────────────────────────────────────────────────────
  if (showGame) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6 page-enter">
          <button onClick={() => setShowGame(false)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition mb-5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to Wellness
          </button>
          <MoneyDefender onClose={() => setShowGame(false)} inline />
        </div>
      </Layout>
    )
  }

  if (showTimeMachine) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6 page-enter">
          <button onClick={() => setShowTimeMachine(false)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition mb-5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to Wellness
          </button>
          <TimeMachineModal
            inline
            onClose={() => setShowTimeMachine(false)}
            defaultAmount={financials.totalSpent || 100}
            currency={localStorage.getItem('currency') || 'USD'}
          />
        </div>
      </Layout>
    )
  }

  if (loading) return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        {[80, 48, 48, 48, 32].map((h, i) => (
          <div key={i} className={`h-${h} bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse`} />
        ))}
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Wellness</h1>
            <p className="text-sm text-gray-400 mt-0.5">{monthName}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 14px #7c3aed55' }}>
            💚
          </div>
        </div>

        {/* ── SCORE HERO ── */}
        <div className="rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}>
          <div className="p-6">
            <div className="flex items-center gap-5">
              <ScoreRing score={data?.score || 0} revealed={scoreRevealed} />
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest mb-1">Health Score</p>
                {scoreRevealed ? (
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black" style={{ color: meta.color }}>{meta.grade}</span>
                      <span className="text-white font-bold text-lg">{meta.label}</span>
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">Based on {monthName}</p>
                  </div>
                ) : (
                  <div className="mb-3">
                    <p className="text-white/70 text-base font-semibold">Tap to reveal</p>
                    <p className="text-white/30 text-xs mt-0.5">5 financial factors</p>
                  </div>
                )}
                <button onClick={handleReveal} disabled={scoreAnimating}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: scoreRevealed ? `${meta.color}25` : 'rgba(255,255,255,0.15)', color: scoreRevealed ? meta.color : '#fff', border: `1px solid ${scoreRevealed ? meta.color + '40' : 'rgba(255,255,255,0.2)'}` }}>
                  {scoreAnimating ? 'Calculating…' : scoreRevealed ? 'Recalculate' : 'Calculate Score'}
                </button>
              </div>
            </div>

            {/* Breakdown */}
            {scoreRevealed && data?.breakdown && (
              <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
                {data.breakdown.map((item, i) => {
                  const cfg = BREAKDOWN_CONFIG[item.label] || { icon: '•', color: '#7C3AED', bg: 'rgba(124,58,237,.12)' }
                  const pct = (item.points / item.max) * 100
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                        style={{ background: cfg.bg }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/80 text-xs font-semibold truncate">{item.label}</span>
                          <span className="text-xs font-black tabular-nums ml-2 shrink-0" style={{ color: item.achieved ? cfg.color : '#6b7280' }}>
                            {item.points}<span className="text-white/20">/{item.max}</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: item.achieved ? cfg.color : '#374151' }} />
                        </div>
                        {!item.achieved && <p className="text-white/30 text-[10px] mt-0.5">{item.tip}</p>}
                      </div>
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
            { label: 'Income',  val: `${sym}${totalIncome.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: 'this month', from: '#059669', to: '#0D9488', icon: '💵' },
            { label: 'Spent',   val: `${sym}${totalSpent.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}`,  sub: 'this month', from: '#DC2626', to: '#DB2777', icon: '💸' },
            { label: 'Balance', val: `${balance >= 0 ? '+' : '-'}${sym}${Math.abs(balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, sub: balance >= 0 ? 'surplus' : 'deficit', from: balance >= 0 ? '#2563EB' : '#EA580C', to: balance >= 0 ? '#7C3AED' : '#DC2626', icon: '⚖️' },
            { label: 'Streak',  val: `${streak}d`, sub: 'tracking streak', from: '#F59E0B', to: '#F97316', icon: '🔥' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-white relative overflow-hidden shadow-lg"
              style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
              <div className="absolute -top-3 -right-3 text-5xl opacity-10 select-none leading-none">{s.icon}</div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-xl font-black tabular-nums leading-none text-white">{s.val}</p>
              <p className="text-white/60 text-[11px] mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── MONTHLY INSIGHTS ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Savings Rate */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1px solid #bbf7d0' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Savings Rate</p>
            {savingsRate !== null ? (
              <>
                <p className="text-2xl font-black tabular-nums"
                  style={{ color: savingsRate >= 20 ? '#059669' : savingsRate >= 10 ? '#D97706' : '#DC2626' }}>
                  {savingsRate.toFixed(1)}%
                </p>
                <p className="text-xs text-emerald-700/60 mt-1">{savingsRate >= 20 ? 'Excellent!' : savingsRate >= 10 ? 'Aim for 20%+' : savingsRate >= 0 ? 'Cut some costs' : 'Over budget'}</p>
              </>
            ) : <p className="text-sm text-emerald-700/50 mt-1">Add income first</p>}
          </div>
          {/* Daily Burn */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1px solid #fed7aa' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">Daily Burn</p>
            {dailyBurn !== null ? (
              <>
                <p className="text-2xl font-black tabular-nums text-orange-600">{sym}{dailyBurn.toFixed(2)}</p>
                <p className="text-xs text-orange-500/60 mt-1">avg per day</p>
              </>
            ) : <p className="text-sm text-orange-500/50 mt-1">No expenses yet</p>}
          </div>
          {/* Budget Health */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid #ddd6fe' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mb-1">Budget Health</p>
            {data?.budgetList?.length > 0 ? (
              <>
                <p className="text-2xl font-black" style={{ color: data.breakdown?.find(b=>b.label==='Under Budget')?.achieved ? '#059669' : '#DC2626' }}>
                  {data.breakdown?.find(b=>b.label==='Under Budget')?.achieved ? 'On Track' : 'Over'}
                </p>
                <p className="text-xs text-violet-500/60 mt-1">{data.breakdown?.find(b=>b.label==='Under Budget')?.tip}</p>
              </>
            ) : <p className="text-sm text-violet-500/50 mt-1">No budgets set</p>}
          </div>
          {/* Transactions */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '1px solid #fbcfe8' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-500 mb-1">Transactions</p>
            <p className="text-2xl font-black tabular-nums text-pink-600">{data?.monthExpenseCount ?? 0}</p>
            <p className="text-xs text-pink-500/60 mt-1">this month · goal 10</p>
          </div>
        </div>

        {/* ── SPENDING PERSONALITY ── */}
        <div className="rounded-3xl p-5 text-white overflow-hidden relative shadow-lg"
          style={{ background: `linear-gradient(135deg, ${personality.from}, ${personality.to})` }}>
          <div className="absolute -bottom-4 -right-4 text-8xl opacity-15 select-none leading-none">{personality.emoji}</div>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">Spending Profile</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{personality.emoji}</span>
            <h3 className="text-xl font-black">{personality.label}</h3>
          </div>
        </div>

        {/* ── MOOD TRACKER ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'linear-gradient(135deg,#ec4899,#f43f5e)', boxShadow: '0 4px 10px #ec489955' }}>
              🎨
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">How are you feeling?</p>
              <p className="text-xs text-gray-400">About your finances today</p>
            </div>
          </div>
          <div className="flex justify-between mb-3">
            {moods.map(m => (
              <button key={m.value} onClick={() => saveMood(m.value)}
                className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-2xl transition-all active:scale-90 ${
                  selectedMood === m.value
                    ? 'bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-300 dark:ring-pink-700 scale-110'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{m.label}</span>
              </button>
            ))}
          </div>
          {moodLoading && <div className="h-9 bg-pink-50 dark:bg-pink-900/20 rounded-xl animate-pulse" />}
          {moodResponse && !moodLoading && (
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl px-4 py-3 border border-pink-100 dark:border-pink-800/30">
              <p className="text-sm text-pink-700 dark:text-pink-300 leading-relaxed">{moodResponse}</p>
            </div>
          )}
        </div>

        {/* ── QUOTE + JOKE ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-3xl p-5 shadow-sm" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid #ddd6fe' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  💬
                </div>
                <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">Daily Quote</p>
              </div>
              <button onClick={fetchQuote} disabled={quoteLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-100 text-violet-500 hover:bg-violet-200 transition disabled:opacity-40 text-sm font-bold">
                {quoteLoading ? '…' : '↻'}
              </button>
            </div>
            {quoteLoading
              ? <div className="space-y-2"><div className="h-4 bg-violet-100 rounded-lg animate-pulse"/><div className="h-4 bg-violet-100 rounded-lg w-3/4 animate-pulse"/></div>
              : <><p className="text-sm text-violet-900 leading-relaxed italic">"{quote.text}"</p><p className="text-xs text-violet-500 mt-2 font-medium">— {quote.author}</p></>
            }
          </div>
          <div className="rounded-3xl p-5 shadow-sm" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                  😄
                </div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Finance Joke</p>
              </div>
              <button onClick={fetchJoke} disabled={jokeLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100 text-amber-500 hover:bg-amber-200 transition disabled:opacity-40 text-sm font-bold">
                {jokeLoading ? '…' : '↻'}
              </button>
            </div>
            {jokeLoading
              ? <div className="space-y-2"><div className="h-4 bg-amber-100 rounded-lg animate-pulse"/><div className="h-4 bg-amber-100 rounded-lg w-2/3 animate-pulse"/></div>
              : <p className="text-sm text-amber-900 leading-relaxed italic">"{joke}"</p>
            }
          </div>
        </div>

        {/* ── FEATURE BUTTONS ── */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowTimeMachine(true)}
            className="rounded-3xl p-5 text-white text-left shadow-xl transition-all active:scale-[0.97] hover:brightness-105"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#4338ca)', boxShadow: '0 8px 24px #6d28d955' }}>
            <div className="text-3xl mb-3">🕰️</div>
            <p className="text-base font-black">Time Machine</p>
            <p className="text-white/60 text-xs mt-0.5">Travel to any year in history</p>
          </button>
          <button onClick={() => setShowGame(true)}
            className="rounded-3xl p-5 text-white text-left shadow-xl transition-all active:scale-[0.97] hover:brightness-105"
            style={{ background: 'linear-gradient(135deg,#0891b2,#0d9488)', boxShadow: '0 8px 24px #0891b255' }}>
            <div className="text-3xl mb-3">🎮</div>
            <p className="text-base font-black">Mini Games</p>
            <p className="text-white/60 text-xs mt-0.5">{highScore > 0 ? `🏆 Best: ${highScore}` : '7 games to play'}</p>
          </button>
        </div>

        {/* ── PERSONAL NOTES ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'linear-gradient(135deg,#6b7280,#374151)' }}>
              📝
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">Personal Notes</p>
              <p className="text-xs text-gray-400">Your private space</p>
            </div>
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Reminders, thoughts, goals…" rows={3}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none transition" />
          <button onClick={saveNote}
            className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-bold transition active:scale-95"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            {noteSaved ? '✓ Saved' : 'Save Note'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 dark:text-gray-700 pb-2">
          Spendly · Track smarter, spend better
        </p>

      </div>
    </Layout>
  )
}
