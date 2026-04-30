import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

function renderMarkdown(text) {
  return text.split('\n').map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
      return <span key={i}>{part}</span>
    })
    const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-')
    return (
      <span key={li} className={`block ${isBullet ? 'pl-1 mt-1' : li > 0 ? 'mt-2' : ''}`}>
        {parts}
      </span>
    )
  })
}

// Full number modal
function NumberModal({ label, value, sub, onClose }) {
  if (!value) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-gray-400 mb-3">{label}</p>
        <p className="text-4xl font-bold text-violet-600 tabular-nums break-all">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

const QUICK_QUESTIONS = [
  "Where am I overspending?",
  "How can I save more?",
  "Am I on track?",
  "Biggest expense?",
  "Give me a tip",
  "How is my spending?",
]

const TODAY = new Date()
const CURRENT_MONTH = TODAY.getMonth()
const CURRENT_YEAR  = TODAY.getFullYear()
const MONTH_NAME    = TODAY.toLocaleString('default', { month: 'long', year: 'numeric' })

const GREETING = "Oh, you've decided to check your finances. Brave. 😏 I've seen your spending data and... we have things to discuss. Ask me anything — I'll be honest, accurate, and maybe a little savage about it."

export default function Insights() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [currencySymbol] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [modalData, setModalData] = useState(null)
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('spendly_insights_tts') === 'true')
  const [listening, setListening]   = useState(false)
  const messagesEndRef  = useRef(null)
  const recognitionRef  = useRef(null)
  const micLang = localStorage.getItem('spendly_lang_mic') || 'en-US'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    Promise.all([API.get('/expenses'), API.get(`/income?month=${CURRENT_MONTH + 1}&year=${CURRENT_YEAR}`)])
      .then(([e, i]) => { setExpenses(e.data); setIncome(i.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const speak = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = localStorage.getItem('spendly_lang_app') || 'en-US'
    utt.rate = 0.95
    window.speechSynthesis.speak(utt)
  }

  const toggleTts = () => {
    const next = !ttsEnabled
    setTtsEnabled(next)
    localStorage.setItem('spendly_insights_tts', String(next))
    if (!next) window.speechSynthesis?.cancel()
  }

  const sendMessage = async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    try {
      const history = messages.filter((_, idx) => idx > 0)
      const res = await API.post('/insights/chat', { message: userMessage, history, mode: 'sarcastic' })
      const reply = res.data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (ttsEnabled) speak(reply)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Even I had a technical issue. The irony. Try again.' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setMessages(m => [...m, { role: 'assistant', content: "Speech recognition isn't supported in this browser. Try Chrome." }]); return }
    window.speechSynthesis?.cancel()
    const rec = new SR()
    rec.lang = micLang
    rec.interimResults = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec
    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = () => setListening(false)
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.trim()
      if (text) sendMessage(text)
    }
    rec.start()
  }

  const stopMic = () => { recognitionRef.current?.stop(); setListening(false) }

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear()
  })
  const total = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalIncome = income.reduce((sum, i) => sum + parseFloat(i.amount), 0)
  const topCategory = Object.entries(
    monthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]

  const spentStr = currencySymbol + total.toFixed(2)
  const incomeStr = currencySymbol + totalIncome.toFixed(2)
  const savedPct = totalIncome > 0 ? (((totalIncome - total) / totalIncome) * 100).toFixed(0) + '% saved' : 'No income'
  const topCatStr = topCategory ? topCategory[0] : '--'
  const topCatAmt = topCategory ? currencySymbol + topCategory[1].toFixed(2) : ''

  return (
    <Layout>
      {modalData && <NumberModal {...modalData} onClose={() => setModalData(null)} />}

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Finance Assistant</h1>
            <p className="text-gray-400 text-sm mt-0.5">Ask me anything — I know your real spending data</p>
          </div>
          <button onClick={toggleTts} title={ttsEnabled ? 'Disable voice' : 'Enable voice'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition mt-1 ${
              ttsEnabled ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-violet-600'
            }`}>
            {ttsEnabled ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            )}
            {ttsEnabled ? 'Voice On' : 'Voice Off'}
          </button>
        </div>

        {/* Overview Card */}
        <div className="bg-linear-to-br from-violet-500 to-fuchsia-600 rounded-2xl px-5 py-4 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white" />
          </div>
          <div className="relative mb-3">
            <p className="text-white font-bold text-base">AI Insights</p>
            <p className="text-white/70 text-xs">{MONTH_NAME} · {monthExpenses.length} transactions analyzed</p>
          </div>
          <div className="relative grid grid-cols-3 gap-2">
            <button onClick={() => setModalData({ label: 'Spent — ' + MONTH_NAME, value: spentStr, sub: monthExpenses.length + ' transactions' })}
              className="bg-white/20 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-white/70 text-[10px] mb-0.5">Spent</p>
              <p className="text-white font-bold text-xs tabular-nums truncate">{spentStr}</p>
            </button>
            <button onClick={() => setModalData({ label: 'Income — ' + MONTH_NAME, value: incomeStr, sub: savedPct })}
              className="bg-white/20 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-white/70 text-[10px] mb-0.5">Income</p>
              <p className="text-white font-bold text-xs tabular-nums truncate">{incomeStr}</p>
            </button>
            <button onClick={() => topCategory && setModalData({ label: 'Top Spending Category', value: topCatStr, sub: topCatAmt + ' this month' })}
              className="bg-white/20 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-white/70 text-[10px] mb-0.5">Top</p>
              <p className="text-white font-bold text-xs tabular-nums truncate">{topCatStr}</p>
            </button>
          </div>
        </div>

        {/* Chat Box */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden mb-3" style={{ minHeight: 320 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                    msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-linear-to-br from-violet-500 to-purple-600 text-white'
                  }`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">AI</div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 dark:border-gray-700 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? 'Listening…' : 'Ask anything about your finances...'}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={listening ? stopMic : startMic}
                disabled={loading}
                title={listening ? 'Stop listening' : 'Speak your question'}
                className={`px-3 py-2.5 rounded-xl transition flex items-center justify-center ${
                  listening
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-violet-100 hover:text-violet-600'
                }`}>
                {listening ? (
                  <span className="flex gap-0.5 items-end">
                    {[4,7,5].map((h, i) => (
                      <span key={i} className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i*0.12}s` }} />
                    ))}
                  </span>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-violet-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Questions — horizontal scroll, clean pills */}
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">Quick questions</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition disabled:opacity-50 whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  )
}
