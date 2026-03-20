import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return <span key={i}>{part}</span>
  })
}

const QUICK_QUESTIONS = [
  "Where am I overspending?",
  "How can I save more this month?",
  "Am I on track with my budget?",
  "What is my biggest expense?",
  "Give me a savings tip",
  "How is my spending this month?",
]

export default function Insights() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm Spendly AI, your personal finance assistant. I can see your real spending data and I'm here to help. Ask me anything about your finances!"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const messagesEndRef = useRef(null)
  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [e, i] = await Promise.all([
        API.get('/expenses', { headers }),
        API.get(`/income?month=${today.getMonth() + 1}&year=${today.getFullYear()}`, { headers })
      ])
      setExpenses(e.data)
      setIncome(i.data)
    } catch { console.log('Error fetching data') }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchData()
  }, [fetchData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const history = messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0)

      const res = await API.post('/insights/chat',
        { message: userMessage, history },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again! 🔄' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })
  const total = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalIncome = income.reduce((sum, i) => sum + parseFloat(i.amount), 0)
  const topCategory = Object.entries(
    monthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-screen">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🤖 AI Finance Assistant</h1>
          <p className="text-gray-400 mt-1">Ask me anything about your finances — I know your real spending data</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Spent</p>
            <p className="text-lg font-bold text-red-500">{currencySymbol}{total.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{monthName}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Income</p>
            <p className="text-lg font-bold text-green-600">{currencySymbol}{totalIncome.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalIncome > 0 ? `${(((totalIncome - total) / totalIncome) * 100).toFixed(0)}% saved` : 'No income'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Top Category</p>
            <p className="text-lg font-bold text-indigo-600">{topCategory ? topCategory[0] : '—'}</p>
            <p className="text-xs text-gray-400 mt-1">{topCategory ? `${currencySymbol}${topCategory[1].toFixed(2)}` : 'No expenses'}</p>
          </div>
        </div>

        {/* Chat Box */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden mb-4" style={{ minHeight: '400px', maxHeight: '500px' }}>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'}`}>
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm">🤖</div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your finances..."
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Questions */}
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  )
}