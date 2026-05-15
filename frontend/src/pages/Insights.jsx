import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import { AIChatInput } from '../components/ui/AIChatInput'

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
  "Delete my last expense",
  "Biggest expense?",
  "Give me a tip",
]

function ActionCard({ action, sym, state, onConfirm, onCancel }) {
  const e = action.expense
  const dateStr = (e.date || '').split('T')[0]

  if (state === 'done') return (
    <div className="mt-2 flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-2 rounded-xl">
      <span>✓</span> Done — expense {action.type === 'delete' ? 'deleted' : 'updated'} successfully.
    </div>
  )
  if (state === 'error') return (
    <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-2 rounded-xl">
      ✗ Something went wrong. Try again.
    </div>
  )
  if (state === 'cancelled') return null

  return (
    <div className="mt-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl p-3">
      {action.type === 'delete' ? (
        <>
          <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">Confirm delete</p>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{e.description || e.category}</p>
              <p className="text-xs text-gray-400">{e.category} · {dateStr}</p>
            </div>
            <p className="font-bold text-red-500 tabular-nums text-sm">{sym}{parseFloat(e.amount).toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-xl transition">Delete</button>
            <button onClick={onCancel}  className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold py-2 rounded-xl transition">Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-bold text-violet-500 uppercase tracking-wide mb-2">Confirm update</p>
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">{e.description || e.category}</p>
            <p className="text-xs text-gray-400 mb-2">{e.category} · {dateStr}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {action.updates?.amount && (
                <>
                  <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-1 rounded-lg line-through tabular-nums">
                    {sym}{parseFloat(e.amount).toFixed(2)}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold px-2 py-1 rounded-lg tabular-nums">
                    {sym}{parseFloat(action.updates.amount).toFixed(2)}
                  </span>
                </>
              )}
              {action.updates?.category && action.updates.category !== e.category && (
                <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 px-2 py-1 rounded-lg">
                  → {action.updates.category}
                </span>
              )}
              {action.updates?.description && action.updates.description !== e.description && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-1 rounded-lg">
                  "{action.updates.description}"
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onConfirm} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 rounded-xl transition">Confirm</button>
            <button onClick={onCancel}  className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold py-2 rounded-xl transition">Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}

const TODAY = new Date()
const CURRENT_MONTH = TODAY.getMonth()
const CURRENT_YEAR  = TODAY.getFullYear()
const MONTH_NAME    = TODAY.toLocaleString('default', { month: 'long', year: 'numeric' })

const GREETING = "Oh, you've decided to check your finances. Brave. 😏 I've seen your spending data and... we have things to discuss. Ask me anything — I'll be honest, accurate, and maybe a little savage about it.\n\n*Tip: you can speak to me in English or Lebanese Arabic (re7et, shu, w, 3m...) — I'll understand and reply in both scripts.*"

const CAT_ICONS = { Food:'🍔', Transport:'🚗', Shopping:'🛍️', Subscriptions:'📱', Entertainment:'🎬', Other:'📦' }

export default function Insights() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [currencySymbol] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [micLangMode, setMicLangMode] = useState(() => localStorage.getItem('fina_mic_lang') || 'en')
  const [modalData, setModalData] = useState(null)
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('fina_insights_tts') === 'true')
  const [listening, setListening]   = useState(false)
  const messagesEndRef  = useRef(null)
  const recognitionRef  = useRef(null)
  const micLang = localStorage.getItem('fina_lang_mic') || 'en-US'

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
    utt.lang = localStorage.getItem('fina_lang_app') || 'en-US'
    utt.rate = 0.95
    window.speechSynthesis.speak(utt)
  }

  const toggleTts = () => {
    const next = !ttsEnabled
    setTtsEnabled(next)
    localStorage.setItem('fina_insights_tts', String(next))
    if (!next) window.speechSynthesis?.cancel()
  }

  const sendMessage = async (text, silent = false) => {
    const userMessage = text || input.trim()
    if (!userMessage || loading) return
    setInput('')
    if (!silent) setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    try {
      const history = messages.filter(m => m.role === 'user' || m.role === 'assistant')
      const res = await API.post('/insights/chat', { message: userMessage, history, mode: 'sarcastic' })
      const { reply, action, pendingTransactions } = res.data
      setMessages(prev => {
        const next = [...prev, { role: 'assistant', content: reply, action: action || null, actionState: action ? 'pending' : null }]
        if (pendingTransactions && pendingTransactions.length > 0) {
          next.push({ role: 'confirm', transactions: pendingTransactions, confirmed: false, skipped: false })
        }
        return next
      })
      if (ttsEnabled) speak(reply)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Even I had a technical issue. The irony. Try again.' }])
    }
    setLoading(false)
  }

  const confirmTransactions = async (transactions, msgIdx) => {
    setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, confirmed: true } : m))
    const today = new Date().toISOString().split('T')[0]
    for (const tx of transactions) {
      try {
        await API.post('/expenses', {
          amount: tx.amount,
          category: tx.category || 'Other',
          description: tx.description,
          date: tx.date || today,
          is_recurring: false
        })
      } catch { /* skip individual failures */ }
    }
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: transactions.length === 1
          ? `✅ Logged! Ba3den, fi shi tene nse7to? / هل في معاملة تانية بدك تضيفها؟`
          : `✅ All ${transactions.length} logged! Ba3den, fi shi tene? / في شي تاني؟`
      }])
    }, 400)
  }

  const skipTransactions = (msgIdx) => {
    setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, skipped: true } : m))
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'No worries! 👌 Fi shi tene bte7ke 3anno? / في شي تاني بدك تحكيه؟'
      }])
    }, 300)
  }

  const executeAction = async (msgIdx, action) => {
    try {
      if (action.type === 'delete') {
        await API.delete(`/expenses/${action.expense.id}`)
      } else {
        const e = action.expense
        const u = action.updates || {}
        await API.put(`/expenses/${action.expense.id}`, {
          amount:              parseFloat(u.amount  || e.amount),
          category:            u.category    || e.category,
          description:         u.description || e.description,
          date:                (e.date || '').split('T')[0] || e.date,
          is_recurring:        e.is_recurring,
          recurring_frequency: e.recurring_frequency || 'monthly',
        })
      }
      setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, actionState: 'done' } : m))
      API.get('/expenses').then(r => setExpenses(r.data)).catch(() => {})
    } catch {
      setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, actionState: 'error' } : m))
    }
  }

  const cancelAction = (msgIdx) => {
    setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, actionState: 'cancelled' } : m))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const toggleMicLang = () => {
    const next = micLangMode === 'en' ? 'ar' : 'en'
    setMicLangMode(next)
    localStorage.setItem('fina_mic_lang', next)
  }

  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setMessages(m => [...m, { role: 'assistant', content: "Speech recognition isn't supported in this browser. Try Chrome." }]); return }
    window.speechSynthesis?.cancel()
    const rec = new SR()
    rec.lang = micLangMode === 'ar' ? 'ar' : (localStorage.getItem('fina_lang_mic') || 'en-US')
    rec.interimResults = false
    rec.maxAlternatives = 3
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
        <div className="bg-linear-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800 rounded-3xl px-5 py-5 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white" />
          </div>
          <div className="relative">
            <p className="text-gray-300 text-xs font-medium mb-0.5">AI Insights — {MONTH_NAME}</p>
            <p className="text-white font-bold text-lg">{monthExpenses.length} transactions analyzed</p>
            <p className="text-gray-400 text-xs mt-0.5">{savedPct}</p>
          </div>
          <div className="relative grid grid-cols-3 gap-2 mt-4">
            <button onClick={() => setModalData({ label: 'Spent — ' + MONTH_NAME, value: spentStr, sub: monthExpenses.length + ' transactions' })}
              className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
              <p className="text-red-300 text-xs mb-0.5">Spent</p>
              <p className="text-white font-bold text-sm tabular-nums truncate">{spentStr}</p>
            </button>
            <button onClick={() => setModalData({ label: 'Income — ' + MONTH_NAME, value: incomeStr, sub: savedPct })}
              className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
              <p className="text-green-300 text-xs mb-0.5">Income</p>
              <p className="text-white font-bold text-sm tabular-nums truncate">{incomeStr}</p>
            </button>
            <button onClick={() => topCategory && setModalData({ label: 'Top Category', value: topCatStr, sub: topCatAmt + ' this month' })}
              className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
              <p className="text-gray-300 text-xs mb-0.5">Top</p>
              <p className="text-white font-bold text-sm tabular-nums truncate">{topCatStr}</p>
            </button>
          </div>
        </div>

        {/* Chat Box */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden mb-3" style={{ minHeight: 320 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => {
              if (msg.role === 'confirm') {
                return (
                  <div key={i} className="flex justify-start w-full">
                    <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-2xl p-4 w-full max-w-[90%]">
                      <p className="font-semibold text-violet-700 dark:text-violet-300 text-sm mb-3">📋 Shu fhemto / What I understood:</p>
                      <div className="space-y-2 mb-4">
                        {msg.transactions.map((tx, ti) => (
                          <div key={ti} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CAT_ICONS[tx.category] || '📦'}</span>
                              <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{tx.description}</p>
                                <p className="text-xs text-gray-400">{tx.category} · {tx.date}</p>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-violet-600">{currencySymbol}{parseFloat(tx.amount).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                      {!msg.confirmed && !msg.skipped && (
                        <div className="flex gap-2">
                          <button onClick={() => confirmTransactions(msg.transactions, i)}
                            className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition">
                            ✓ Log {msg.transactions.length > 1 ? `all ${msg.transactions.length}` : 'it'}
                          </button>
                          <button onClick={() => skipTransactions(i)}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl font-semibold text-sm">
                            Skip
                          </button>
                        </div>
                      )}
                      {msg.confirmed && <p className="text-green-600 dark:text-green-400 text-sm font-bold text-center">✅ Logged successfully!</p>}
                      {msg.skipped && <p className="text-gray-400 text-sm text-center">Skipped</p>}
                    </div>
                  </div>
                )
              }
              return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                    msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-linear-to-br from-violet-500 to-purple-600 text-white'
                  }`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="flex flex-col max-w-full">
                    <div dir="auto" className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-sm'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                    }`}>
                      {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                    </div>
                    {msg.action && (
                      <ActionCard
                        action={msg.action}
                        sym={currencySymbol}
                        state={msg.actionState}
                        onConfirm={() => executeAction(i, msg.action)}
                        onCancel={() => cancelAction(i)}
                      />
                    )}
                  </div>
                </div>
              </div>
              )
            })}
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
          <div className="border-t border-gray-100 dark:border-gray-700/60 p-3">
            <AIChatInput
              input={input}
              setInput={setInput}
              loading={loading}
              listening={listening}
              onSend={() => sendMessage()}
              onStartMic={startMic}
              onStopMic={stopMic}
              micLangMode={micLangMode}
              onToggleMicLang={toggleMicLang}
              onKeyDown={handleKeyDown}
            />
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
                className="shrink-0 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition disabled:opacity-50 whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  )
}
