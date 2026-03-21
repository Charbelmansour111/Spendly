import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import ZombieGame from '../components/ZombieGame'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

function ScoreRing({ score }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444'
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-800 dark:text-white">{score}</span>
          <span className="text-xs text-gray-400">out of 100</span>
        </div>
      </div>
      <div className="mt-2 px-4 py-1 rounded-full text-white font-bold text-lg" style={{ backgroundColor: color }}>
        Grade {grade}
      </div>
    </div>
  )
}

export default function Wellness() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [goalSaved, setGoalSaved] = useState(false)
  const [visionTitle, setVisionTitle] = useState('')
  const [visionPreview, setVisionPreview] = useState(null)
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [joke, setJoke] = useState('')
  const [jokeLoading, setJokeLoading] = useState(false)
  const [quote, setQuote] = useState({ text: '', author: '' })
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [moodResponse, setMoodResponse] = useState('')
  const [moodResponseLoading, setMoodResponseLoading] = useState(false)
  const [selectedMood, setSelectedMood] = useState(null)
  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const [showGame, setShowGame] = useState(false)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('zombieHighScore') || '0'))

  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
  }, [])

  const fetchJoke = useCallback(async () => {
    setJokeLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/wellness/joke', { headers: { Authorization: `Bearer ${token}` } })
      setJoke(res.data.joke)
    } catch { setJoke("Why did the banker switch careers? He lost interest! 😂") }
    setJokeLoading(false)
  }, [])

  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/wellness/quote', { headers: { Authorization: `Bearer ${token}` } })
      setQuote(res.data)
    } catch { setQuote({ text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" }) }
    setQuoteLoading(false)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/wellness', { headers: { Authorization: `Bearer ${token}` } })
      setData(res.data)
      setNote(res.data.note?.content || '')
      setMonthlyGoal(res.data.monthlyGoal?.goal || '')
      if (res.data.vision?.image_url) setVisionPreview(res.data.vision.image_url)
      if (res.data.vision?.title) setVisionTitle(res.data.vision.title)
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

  const saveNote = async () => {
    try {
      const token = localStorage.getItem('token')
      await API.post('/wellness/note', { content: note }, { headers: { Authorization: `Bearer ${token}` } })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } catch { console.log('Error saving note') }
  }

  const saveGoal = async () => {
    try {
      const token = localStorage.getItem('token')
      await API.post('/wellness/goal', { goal: monthlyGoal }, { headers: { Authorization: `Bearer ${token}` } })
      setGoalSaved(true)
      setTimeout(() => setGoalSaved(false), 2000)
    } catch { console.log('Error saving goal') }
  }

  const saveMood = async (mood) => {
  setSelectedMood(mood)
  setMoodResponseLoading(true)
  setMoodResponse('')
  try {
    const token = localStorage.getItem('token')
    await API.post('/wellness/mood', { mood }, { headers: { Authorization: `Bearer ${token}` } })
    const res = await API.post('/wellness/mood-response', { mood }, { headers: { Authorization: `Bearer ${token}` } })
    setMoodResponse(res.data.message)
    fetchData()
  } catch { 
    setMoodResponse("💚 Thanks for sharing! Keep tracking your finances.")
  }
  setMoodResponseLoading(false)
}

  const handleVisionUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      setVisionPreview(base64)
      try {
        const token = localStorage.getItem('token')
        await API.post('/wellness/vision',
          { title: visionTitle || 'My Goal', image_url: base64 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } catch { console.log('Error saving vision') }
    }
    reader.readAsDataURL(file)
  }

  const moods = [
    { emoji: '😄', label: 'Great', value: 'great' },
    { emoji: '😊', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '😟', label: 'Worried', value: 'worried' },
    { emoji: '😰', label: 'Stressed', value: 'stressed' },
  ]

  if (loading) return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-64" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          </div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          </div>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💚 My Wellness</h1>
          <p className="text-gray-400 mt-1">Your personal financial wellbeing space</p>
        </div>

        {/* Health Score */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={data?.score || 0} />
            <div className="flex-1 w-full">
              <h2 className="text-xl font-bold mb-1">Financial Health Score</h2>
              <p className="text-indigo-200 text-sm mb-4">{monthName}</p>
              <div className="space-y-2">
                {data?.breakdown?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg">{item.achieved ? '✅' : '❌'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.label}</span>
                        <span className="font-bold">{item.points}/{item.max}</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full">
                        <div className="h-1.5 bg-white rounded-full transition-all duration-700"
                          style={{ width: `${(item.points / item.max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mini Summary + Streak */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Income</p>
            <p className="text-lg font-bold text-green-600">{currencySymbol}{data?.totalIncome?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Spent</p>
            <p className="text-lg font-bold text-red-500">{currencySymbol}{data?.totalSpent?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Saved</p>
            <p className={`text-lg font-bold ${(data?.balance || 0) >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
              {(data?.balance || 0) >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(data?.balance || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Streak 🔥</p>
            <p className="text-lg font-bold text-orange-500">{data?.streak || 0} days</p>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">🏅 Achievements</h3>
          {data?.achievements?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.achievements.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Start tracking to unlock achievements! 🚀</p>
          )}
          {data?.breakdown?.filter(b => !b.achieved && b.tip).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">💡 Tips to improve your score:</p>
              <div className="space-y-1">
                {data.breakdown.filter(b => !b.achieved && b.tip).map((b, i) => (
                  <p key={i} className="text-xs text-gray-500 dark:text-gray-400">• {b.tip}</p>
                ))}
              </div>
            </div>
          )}
        </div>

{/* Mini Game */}
<div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 border border-gray-700">
  <div className="flex justify-between items-center">
    <div>
      <h3 className="text-white font-bold text-lg">🧟 Money Defender</h3>
      <p className="text-gray-400 text-sm mt-1">Feeling bored? Defend your wallet from spending zombies!</p>
      {highScore > 0 && <p className="text-yellow-400 text-xs mt-1">🏆 Your best: {highScore}</p>}
    </div>
    <button onClick={() => setShowGame(true)}
      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2">
      🎮 Play
    </button>
  </div>
</div>

{showGame && <ZombieGame onClose={() => setShowGame(false)} />}

        {/* Mood + Joke */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Mood Tracker */}
<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">🎨 How do you feel today?</h3>
  <p className="text-xs text-gray-400 mb-4">About your finances</p>
  <div className="flex justify-between mb-4">
    {moods.map((m) => (
      <button key={m.value} onClick={() => saveMood(m.value)}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${selectedMood === m.value || data?.mood?.mood === m.value ? 'bg-indigo-100 dark:bg-indigo-900/30 scale-110' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
        <span className="text-2xl">{m.emoji}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{m.label}</span>
      </button>
    ))}
  </div>
  {moodResponseLoading && (
    <div className="animate-pulse h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl" />
  )}
  {moodResponse && !moodResponseLoading && (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3">
      <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">{moodResponse}</p>
    </div>
  )}
</div>

          {/* AI Joke */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">😄 Finance Joke</h3>
              <button onClick={fetchJoke} disabled={jokeLoading}
                className="text-xs text-orange-500 hover:text-orange-600 font-semibold disabled:opacity-50 flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full transition">
                {jokeLoading ? '⏳' : '🔄'} New joke
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Powered by AI</p>
            {jokeLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-orange-100 dark:bg-gray-600 rounded-xl w-full" />
                <div className="h-4 bg-orange-100 dark:bg-gray-600 rounded-xl w-3/4" />
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed italic">"{joke}"</p>
            )}
          </div>
        </div>

        {/* AI Quote */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 mb-6 border border-indigo-100 dark:border-indigo-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-indigo-600">💬 Motivational Quote</h3>
            <button onClick={fetchQuote} disabled={quoteLoading}
              className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold disabled:opacity-50 flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full transition">
              {quoteLoading ? '⏳' : '🔄'} New quote
            </button>
          </div>
          {quoteLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-5 bg-indigo-100 dark:bg-gray-600 rounded-xl w-3/4" />
              <div className="h-4 bg-indigo-100 dark:bg-gray-600 rounded-xl w-1/3" />
            </div>
          ) : (
            <>
              <p className="text-gray-800 dark:text-white font-medium text-base italic">"{quote.text}"</p>
              <p className="text-gray-500 text-sm mt-2">— {quote.author}</p>
            </>
          )}
        </div>

        {/* Monthly Goal + Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">🎯 My Goal This Month</h3>
            <p className="text-xs text-gray-400 mb-3">{monthName}</p>
            <textarea value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)}
              placeholder="e.g. Spend less on food and save $200..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
            <button onClick={saveGoal}
              className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
              {goalSaved ? '✅ Saved!' : 'Save Goal'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">📝 Personal Notes</h3>
            <p className="text-xs text-gray-400 mb-3">Your private space</p>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Write anything — reminders, thoughts, goals..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
            <button onClick={saveNote}
              className="mt-3 w-full bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">
              {noteSaved ? '✅ Saved!' : 'Save Note'}
            </button>
          </div>
        </div>

        {/* Vision Board */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">📸 Vision Board</h3>
          <p className="text-xs text-gray-400 mb-4">Upload an image of what you're saving for</p>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1">
              <input type="text" placeholder="What are you saving for? (e.g. Dream vacation)"
                value={visionTitle} onChange={e => setVisionTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-3" />
              <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl py-6 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                <span className="text-2xl">📸</span>
                <span className="text-sm text-indigo-600 font-medium">Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleVisionUpload} />
              </label>
            </div>
            {visionPreview && (
              <div className="md:w-48 w-full">
                <img src={visionPreview} alt="Vision" className="w-full h-40 object-cover rounded-xl shadow-sm" />
                {visionTitle && <p className="text-center text-sm font-medium text-indigo-600 mt-2">{visionTitle}</p>}
              </div>
            )}
          </div>
        </div>

        <footer className="text-center py-6 text-gray-400 text-sm">
          <p>© 2026 <span className="text-indigo-600 font-semibold">Spendly</span> — Track smarter, spend better 💸</p>
        </footer>

      </div>
    </Layout>
  )
}