import { useEffect, useState, useCallback } from 'react'
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

export default function Insights() {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  
  // Fix: Initialize as state to avoid SSR crash and hydration mismatch
  const [currencySymbol, setCurrencySymbol] = useState('$')
  
  const today = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Fix: Load currency from localStorage on mount (Client-side only)
  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
  }, [])

  // Fix: Wrap fetchData in useCallback to stabilize the function reference
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [e, i] = await Promise.all([
        API.get('/expenses', { headers }),
        API.get(`/income?month=${today.getMonth() + 1}&year=${today.getFullYear()}`, { headers })
      ])
      setExpenses(e.data); setIncome(i.data)
    } catch { console.log('Error fetching data') }
  }, [today]) // 'today' is stable enough here, but good practice to list dependencies

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchData()
  }, [fetchData]) // Fix: Added fetchData to dependency array

  const getInsights = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/insights', { headers: { Authorization: `Bearer ${token}` } })
      setInsight(res.data.insight)
    } catch { setInsight('Error getting insights. Try again.') }
    setLoading(false)
  }

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })
  const total = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalIncome = income.reduce((sum, i) => sum + parseFloat(i.amount), 0)
  const topCategory = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {})
  const topCat = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]
  const insightLines = insight ? insight.split('\n').filter(l => l.trim() !== '') : []

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🤖 AI Insights</h1>
          <p className="text-gray-400 mt-1">Get personalized spending analysis powered by Gemini AI</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Spent This Month</p>
            <p className="text-xl font-bold text-red-500">{currencySymbol}{total.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{monthName}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Income</p>
            <p className="text-xl font-bold text-green-600">{currencySymbol}{totalIncome.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalIncome > 0 ? `${(((totalIncome - total) / totalIncome) * 100).toFixed(0)}% saved` : 'No income'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Top Category</p>
            <p className="text-xl font-bold text-indigo-600">{topCat ? topCat[0] : '—'}</p>
            <p className="text-xs text-gray-400 mt-1">{topCat ? `${currencySymbol}${topCat[1].toFixed(2)}` : 'No expenses'}</p>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center mb-8">
          <p className="text-4xl mb-3">🤖</p>
          <h2 className="text-xl font-bold mb-2">Ready to analyze your spending?</h2>
          <p className="text-indigo-200 text-sm mb-6">Gemini AI will review your {monthName} transactions and give you personalized tips to save more money.</p>
          <button onClick={getInsights} disabled={loading || monthExpenses.length === 0} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? '🔄 Analyzing...' : monthExpenses.length === 0 ? 'No expenses this month' : '✨ Analyze My Spending'}
          </button>
        </div>

        {/* Results */}
        {insightLines.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💡</span>
              <h3 className="font-semibold text-gray-800 dark:text-white text-lg">Your Personalized Insights</h3>
            </div>
            <div className="space-y-3">
              {insightLines.map((line, i) => (
                <div key={i} className="flex gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{renderMarkdown(line)}</p>
                </div>
              ))}
            </div>
            <button onClick={getInsights} disabled={loading} className="mt-4 w-full border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
              🔄 Refresh Analysis
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}