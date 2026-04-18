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
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [joke, setJoke] = useState('')
  const [jokeLoading, setJokeLoading] = useState(false)
  const [quote, setQuote] = useState({ text: '', author: '' })
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [moodResponse, setMoodResponse] = useState('')
  const [moodResponseLoading, setMoodResponseLoading] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  const [showGame, setShowGame] = useState(false)
  const [highScore] = useState(() => parseInt(localStorage.getItem('moneyDefenderHS') || '0'))
  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const dayOfMonth = today.getDate()

  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
  }, [])

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
      const res = await API.get('/wellness')
      setData(res.data)
      setNote(res.data.note?.content || '')
      if (res.data.mood?.mood) setSelectedMood(res.data.mood.mood)
    } catch { console.log('Error fetching wellness') }
    setLoading(false)
  }, [])

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

  // Computed stats
  const savingsRate = data?.totalIncome > 0 ? ((data.balance / data.totalIncome) * 100) : null
  const dailyBurn = data?.totalSpent > 0 && dayOfMonth > 0 ? (data.totalSpent / dayOfMonth) : null
  const budgetUnder = data?.breakdown?.find(b => b.label === 'Under Budget')
  const budgetsOk = budgetUnder?.achieved

  const getPersonality = () => {
    if (!data || data.totalSpent === 0) return { label: 'Just Getting Started', emoji: '🌱', color: 'from-gray-500 to-gray-600', desc: 'Start logging expenses to unlock your financial identity.' }
    const rate = data.totalIncome > 0 ? data.balance / data.totalIncome : -1
    if (rate >= 0.3) return { label: 'Wealth Builder', emoji: '🏗️', color: 'from-emerald-500 to-teal-600', desc: "Saving 30%+ of income — you're building real wealth." }
    if (data.score >= 80) return { label: 'The Disciplined One', emoji: '🎯', color: 'from-violet-500 to-purple-600', desc: 'Consistent, under budget, and crushing your goals.' }
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
        <div className="bg-linear-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white overflow-hidden relative">
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
              <p className="text-violet-200 text-xs mb-4">Based on your {monthName} activity</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Income', value: `${currencySymbol}${(data?.totalIncome || 0).toFixed(2)}`, color: 'text-emerald-600', icon: '📥' },
            { label: 'Spent', value: `${currencySymbol}${(data?.totalSpent || 0).toFixed(2)}`, color: 'text-red-500', icon: '💸' },
            { label: 'Balance', value: `${(data?.balance || 0) >= 0 ? '+' : ''}${currencySymbol}${Math.abs(data?.balance || 0).toFixed(2)}`, color: (data?.balance || 0) >= 0 ? 'text-violet-600' : 'text-red-500', icon: '💰' },
            { label: 'Streak', value: `${data?.streak || 0}d 🔥`, color: 'text-orange-500', icon: '📅' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-lg mb-1">{s.icon}</p>
              <p className={`text-base font-bold ${s.color} leading-tight`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
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
            {data?.breakdown ? (
              <>
                <p className={`text-2xl font-bold ${budgetsOk ? 'text-emerald-600' : 'text-red-500'}`}>
                  {budgetsOk ? '✓ Good' : '✗ Over'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {budgetsOk ? 'Under all budgets' : 'Exceeded a budget limit'}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No budgets set</p>
            )}
          </div>

          {/* Tracking Consistency */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Tracking</p>
            {data?.breakdown ? (() => {
              const item = data.breakdown.find(b => b.label === 'Consistent Tracking')
              const pct = item ? Math.round((item.points / item.max) * 100) : 0
              return (
                <>
                  <p className={`text-2xl font-bold ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-yellow-500' : 'text-gray-500'}`}>{pct}%</p>
                  <p className="text-xs text-gray-400 mt-1">Consistency score</p>
                </>
              )
            })() : <p className="text-sm text-gray-400 mt-1">No data yet</p>}
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
          {data?.achievements?.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {data.achievements.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-3">
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{a.title}</p>
                    <p className="text-[10px] text-gray-400 leading-snug">{a.desc}</p>
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
              <p className="text-xs font-bold text-gray-500 mb-2">Next to unlock:</p>
              <div className="space-y-1">
                {data.breakdown.filter(b => !b.achieved && b.tip).slice(0, 2).map((b, i) => (
                  <p key={i} className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="text-violet-400">→</span>{b.tip}
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
