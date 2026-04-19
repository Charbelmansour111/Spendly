import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6']

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(amount, sym) { return sym + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 ml-2 hover:opacity-70">✕</button>
    </div>
  )
}

function NumberModal({ label, value, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-gray-400 mb-3">{label}</p>
        <p className="text-4xl font-bold text-violet-600 tabular-nums break-all">{value}</p>
        <button onClick={onClose} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-semibold shrink-0">Done</button>
      </div>
    </div>
  )
}

function renderMarkdown(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

export default function Reports() {
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [prevIncome, setPrevIncome] = useState([])
  const [trends, setTrends] = useState([])
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalData, setModalData] = useState(null)
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [sym] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [user] = useState(() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })
  const [activeTab, setActiveTab] = useState('analytics')
  const aiRequested = useRef(false)

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()

  const prevMonthNum  = selectedMonth === 0 ? 11 : selectedMonth - 1
  const prevYearNum   = selectedMonth === 0 ? selectedYear - 1 : selectedYear
  const prevMonthName = new Date(prevYearNum, prevMonthNum, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    setLoading(true)
    setAiSummary('')
    aiRequested.current = false
    Promise.all([
      API.get('/expenses'),
      API.get('/income?month=' + (selectedMonth + 1) + '&year=' + selectedYear),
      API.get('/income?month=' + (prevMonthNum + 1) + '&year=' + prevYearNum),
      API.get('/expenses/trends'),
    ])
      .then(([e, i, pi, t]) => { setExpenses(e.data); setIncome(i.data); setPrevIncome(pi.data); setTrends(t.data) })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => setLoading(false))
  }, [selectedMonth, selectedYear, prevMonthNum, prevYearNum, showToast])

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  // Current month data
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })
  const total       = monthExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const totalIncome = income.reduce((s, i) => s + safeNum(i.amount), 0)
  const balance     = totalIncome - total
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0'

  // Previous month data
  const prevMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === prevMonthNum && d.getFullYear() === prevYearNum
  })
  const prevTotal       = prevMonthExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const prevTotalIncome = prevIncome.reduce((s, i) => s + safeNum(i.amount), 0)
  const spendingChange = prevTotal > 0 ? (((total - prevTotal) / prevTotal) * 100).toFixed(0) : null
  const incomeChange   = prevTotalIncome > 0 ? (((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(0) : null

  // Category data
  const categoryData = monthExpenses.reduce((acc, e) => {
    const f = acc.find(i => i.name === e.category)
    if (f) f.value += safeNum(e.amount)
    else acc.push({ name: e.category, value: safeNum(e.amount) })
    return acc
  }, []).sort((a, b) => b.value - a.value)

  const prevCategoryData = prevMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + safeNum(e.amount)
    return acc
  }, {})

  // Weekly breakdown
  const weeklyData = (() => {
    const weeks = [0, 0, 0, 0, 0]
    monthExpenses.forEach(e => {
      const day = new Date(e.date).getDate()
      const week = Math.min(Math.floor((day - 1) / 7), 4)
      weeks[week] += safeNum(e.amount)
    })
    return weeks.map((v, i) => ({ label: `Week ${i + 1}`, amount: parseFloat(v.toFixed(2)) })).filter(w => w.amount > 0)
  })()

  const requestAI = useCallback(() => {
    if (aiRequested.current || aiLoading) return
    aiRequested.current = true
    setAiLoading(true)
    const catBreakdown = categoryData.map(c => {
      const prev = prevCategoryData[c.name] || 0
      const diff = prev > 0 ? (((c.value - prev) / prev) * 100).toFixed(0) : null
      return `${c.name}: ${sym}${c.value.toFixed(2)}${diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}% vs last month)` : ''}`
    }).join(', ')
    const msg = `Analyze my ${monthName} finances. Income: ${sym}${totalIncome.toFixed(2)} (${incomeChange !== null ? incomeChange + '% vs last month' : 'no prior data'}). Spending: ${sym}${total.toFixed(2)} (${spendingChange !== null ? spendingChange + '% vs last month' : 'no prior data'}). Balance: ${sym}${balance.toFixed(2)}. Savings rate: ${savingsRate}%. Categories: ${catBreakdown}. Give me 4 sharp, specific insights with exact numbers. Use **bold** for key figures.`
    API.post('/insights/chat', { message: msg, mode: 'sarcastic' })
      .then(r => setAiSummary(r.data.reply || ''))
      .catch(() => setAiSummary('Unable to load AI analysis right now.'))
      .finally(() => setAiLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthName, totalIncome, total, balance, savingsRate, sym, incomeChange, spendingChange])

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(24); doc.setTextColor(5, 150, 105); doc.text('Spendly', 14, 20)
    doc.setFontSize(11); doc.setTextColor(100, 100, 100)
    doc.text('Report for: ' + (user?.name || 'User'), 14, 30)
    doc.text('Period: ' + monthName, 14, 37)
    doc.text('Generated: ' + new Date().toLocaleDateString(), 14, 44)
    doc.setFontSize(14); doc.setTextColor(0, 0, 0)
    doc.text('Total Income: ' + sym + totalIncome.toFixed(2), 14, 57)
    doc.text('Total Spent: ' + sym + total.toFixed(2), 14, 65)
    doc.text('Balance: ' + sym + balance.toFixed(2), 14, 73)
    autoTable(doc, {
      startY: 87,
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryData.map(c => [c.name, sym + c.value.toFixed(2), total > 0 ? ((c.value / total) * 100).toFixed(0) + '%' : '0%']),
      headStyles: { fillColor: [5, 150, 105] }
    })
    const firstEnd = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 120
    autoTable(doc, {
      startY: firstEnd,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: monthExpenses.map(e => [e.date?.split('T')[0], e.category, e.description || '-', sym + safeNum(e.amount).toFixed(2)]),
      headStyles: { fillColor: [5, 150, 105] }
    })
    doc.save('spendly-' + monthName.replace(' ', '-') + '.pdf')
    showToast('PDF downloaded!')
  }

  const exportCSV = () => {
    const rows = [['SUMMARY'], ['Period', monthName], ['Total Income', sym + totalIncome.toFixed(2)], ['Total Spent', sym + total.toFixed(2)], ['Balance', sym + balance.toFixed(2)], [], ['EXPENSES'], ['Date', 'Category', 'Description', 'Amount']]
    monthExpenses.forEach(e => rows.push([e.date?.split('T')[0], e.category, e.description || '', safeNum(e.amount).toFixed(2)]))
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'spendly-' + monthName.replace(' ', '-') + '.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV downloaded!')
  }

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {modalData && <NumberModal label={modalData.label} value={modalData.value} onClose={() => setModalData(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">Monthly breakdown with AI insights and comparisons</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <button onClick={prevMonth} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-violet-50 hover:text-violet-600 transition text-lg font-bold text-gray-600 dark:text-gray-300">&lsaquo;</button>
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-white">{monthName}</p>
            {isCurrentMonth && <span className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-600 px-2 py-0.5 rounded-full">Current</span>}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} className={`w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition text-lg font-bold ${isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-violet-50 hover:text-violet-600'}`}>&rsaquo;</button>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-6">
          {[{ key: 'analytics', label: '📊 Analytics' }, { key: 'recap', label: '🗓️ Monthly Recap' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600 dark:text-violet-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'recap' && (() => {
          const rate = parseFloat(savingsRate)
          const score = rate >= 20 ? { grade: 'A', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Excellent' }
            : rate >= 10 ? { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Good' }
            : rate >= 0  ? { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Average' }
            : { grade: 'F', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Over Budget' }
          const topCat    = categoryData[0]
          const bestCat   = categoryData.reduce((best, c) => {
            const prev = prevCategoryData[c.name] || 0
            const diff = prev > 0 ? c.value - prev : 0
            return (!best || diff < (prevCategoryData[best.name] ? best.value - prevCategoryData[best.name] : 0)) ? c : best
          }, null)
          const worstCat  = categoryData.reduce((worst, c) => {
            const prev = prevCategoryData[c.name] || 0
            const diff = prev > 0 ? c.value - prev : 0
            return (!worst || diff > (prevCategoryData[worst.name] ? worst.value - prevCategoryData[worst.name] : 0)) ? c : worst
          }, null)
          return (
            <div className="space-y-4">
              {/* Hero score card */}
              <div className="bg-linear-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">{monthName} Summary</p>
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-2xl ${score.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-3xl font-black ${score.color}`}>{score.grade}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{score.label}</p>
                    <p className="text-white/70 text-sm mt-0.5">{rate >= 0 ? `Saved ${savingsRate}% of income` : `Spent ${fmt(Math.abs(balance), sym)} over income`}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { label: 'Income',  val: fmt(totalIncome, sym), color: 'text-green-300' },
                    { label: 'Spent',   val: fmt(total, sym),        color: 'text-red-300' },
                    { label: 'Saved',   val: (balance >= 0 ? '+' : '') + fmt(balance, sym), color: balance >= 0 ? 'text-white' : 'text-red-300' },
                  ].map(s => (
                    <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-white/60 text-xs mb-1">{s.label}</p>
                      <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-1 gap-3">
                {topCat && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">🏆</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium">Top Spending Category</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{topCat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-violet-600 tabular-nums shrink-0">{fmt(topCat.value, sym)}</p>
                  </div>
                )}

                {spendingChange !== null && (
                  <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${parseInt(spendingChange) <= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {parseInt(spendingChange) <= 0 ? '📉' : '📈'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium">vs {prevMonthName.split(' ')[0]}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">
                        {parseInt(spendingChange) <= 0 ? `Spent ${Math.abs(spendingChange)}% less` : `Spent ${spendingChange}% more`}
                      </p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${parseInt(spendingChange) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseInt(spendingChange) > 0 ? '+' : ''}{spendingChange}%
                    </span>
                  </div>
                )}

                {worstCat && prevCategoryData[worstCat.name] > 0 && worstCat.value > prevCategoryData[worstCat.name] && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">⚠️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium">Most Overspent vs Last Month</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{worstCat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-red-500 tabular-nums shrink-0">
                      +{fmt(worstCat.value - (prevCategoryData[worstCat.name] || 0), sym)}
                    </p>
                  </div>
                )}

                {bestCat && prevCategoryData[bestCat.name] > 0 && bestCat.value < prevCategoryData[bestCat.name] && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">✅</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium">Most Improved vs Last Month</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{bestCat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-green-500 tabular-nums shrink-0">
                      -{fmt(prevCategoryData[bestCat.name] - bestCat.value, sym)}
                    </p>
                  </div>
                )}
              </div>

              {/* Next month goal */}
              {totalIncome > 0 && (
                <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 rounded-2xl p-4">
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-1">Next Month Goal</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {rate >= 20
                      ? `Keep it up! Aim to maintain your ${savingsRate}% savings rate or go higher.`
                      : rate >= 0
                      ? `Try to reach a 20% savings rate — that means saving at least ${fmt(totalIncome * 0.2, sym)} next month.`
                      : `Focus on getting back to break-even. Try to cut ${fmt(Math.abs(balance), sym)} in spending next month.`}
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {activeTab === 'analytics' && <div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Income',       value: fmt(totalIncome, sym), color: 'text-green-600',  change: incomeChange,   positiveGood: true },
            { label: 'Spent',        value: fmt(total, sym),       color: 'text-red-500',    change: spendingChange, positiveGood: false },
            { label: 'Balance',      value: (balance >= 0 ? '+' : '') + fmt(balance, sym),   color: balance >= 0 ? 'text-violet-600' : 'text-red-500', change: null },
            { label: 'Savings Rate', value: savingsRate + '%',     color: parseFloat(savingsRate) >= 20 ? 'text-green-600' : 'text-orange-500', change: null },
          ].map((s, i) => (
            <button key={i} onClick={() => setModalData({ label: s.label + ' — ' + monthName, value: s.value })}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-left min-w-0 active:scale-95 transition-transform">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-base font-bold tabular-nums truncate ${s.color}`}>{s.value}</p>
              {s.change !== null && (
                <p className={`text-xs mt-0.5 font-semibold ${(s.positiveGood ? s.change > 0 : s.change < 0) ? 'text-green-500' : 'text-red-500'}`}>
                  {s.change > 0 ? '▲' : '▼'} {Math.abs(s.change)}% vs {prevMonthName.split(' ')[0]}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Month vs Previous Month Comparison */}
        {prevTotal > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">📊 {monthName} vs {prevMonthName}</h3>
            <div className="space-y-3">
              {categoryData.map(c => {
                const prev = prevCategoryData[c.name] || 0
                const diff = prev > 0 ? ((c.value - prev) / prev) * 100 : null
                const maxVal = Math.max(c.value, prev)
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{fmt(prev, sym)}</span>
                        <span className="text-gray-300">→</span>
                        <span className={`font-semibold ${diff !== null && diff > 10 ? 'text-red-500' : diff !== null && diff < -10 ? 'text-green-500' : 'text-gray-700 dark:text-gray-200'}`}>
                          {fmt(c.value, sym)}
                        </span>
                        {diff !== null && (
                          <span className={`px-1.5 py-0.5 rounded-full font-bold ${diff > 10 ? 'bg-red-100 text-red-600' : diff < -10 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-300 dark:bg-gray-500 rounded-full" style={{ width: maxVal > 0 ? `${(prev / maxVal) * 100}%` : '0%' }} />
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${diff > 10 ? 'bg-red-400' : diff < -10 ? 'bg-green-400' : 'bg-violet-400'}`} style={{ width: maxVal > 0 ? `${(c.value / maxVal) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-1.5 bg-gray-300 dark:bg-gray-500 rounded-full inline-block" />{prevMonthName}</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-1.5 bg-violet-400 rounded-full inline-block" />{monthName}</span>
            </div>
          </div>
        )}

        {/* AI Report Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">🤖 AI Report Summary</h3>
              <p className="text-xs text-gray-400 mt-0.5">Honest analysis of your {monthName} finances</p>
            </div>
            {!aiSummary && !aiLoading && (
              <button onClick={requestAI} disabled={loading}
                className="bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 transition disabled:opacity-50">
                Analyze
              </button>
            )}
            {aiSummary && (
              <button onClick={() => { setAiSummary(''); aiRequested.current = false }}
                className="text-xs text-violet-600 font-semibold hover:underline">Refresh</button>
            )}
          </div>
          {aiLoading && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${60 + i * 10}%` }} />)}
            </div>
          )}
          {aiSummary && !aiLoading && (
            <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {renderMarkdown(aiSummary)}
            </div>
          )}
          {!aiSummary && !aiLoading && (
            <p className="text-sm text-gray-400">Tap Analyze for a sarcastic, data-driven breakdown of your month.</p>
          )}
        </div>

        {/* Charts */}
        {categoryData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v, sym)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Weekly Spending</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => fmt(v, sym)} />
                  <Bar dataKey="amount" fill="#4F46E5" radius={[5, 5, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 6-Month Trend */}
        {trends.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">6-Month Savings Rate Trend</h3>
            <p className="text-xs text-gray-400 mb-4">How much of your income you kept each month</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trends.map(t => ({
                ...t,
                savingsRate: t.income > 0 ? parseFloat(((t.balance / t.income) * 100).toFixed(1)) : 0
              }))}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" unit="%" domain={['auto', 'auto']} />
                <Tooltip formatter={v => v + '%'} />
                <Line type="monotone" dataKey="savingsRate" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} name="Savings Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Export */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Export {monthName} Report</h2>
          <p className="text-gray-400 text-xs mb-4">Download your financial data</p>
          <div className="flex gap-3">
            <button onClick={exportPDF} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition text-sm">📄 PDF</button>
            <button onClick={exportCSV} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition text-sm">📊 CSV</button>
          </div>
        </div>

        {/* Expense Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">All Expenses — {monthName}</h3>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
          ) : monthExpenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><p className="text-4xl mb-2">📭</p><p className="text-sm">No expenses for {monthName}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium text-xs">Date</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium text-xs">Category</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium text-xs hidden md:table-cell">Description</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">{e.date?.split('T')[0]}</td>
                      <td className="py-3 px-2"><span className="bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full text-xs whitespace-nowrap">{e.category}</span></td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300 text-xs hidden md:table-cell">{e.description || '--'}</td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-800 dark:text-white text-xs tabular-nums whitespace-nowrap">{sym}{safeNum(e.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                    <td colSpan={3} className="py-3 px-2 font-bold text-gray-800 dark:text-white text-sm">Total</td>
                    <td className="py-3 px-2 text-right font-bold text-red-500 tabular-nums text-sm">{sym}{total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
        </div>}
      </div>
    </Layout>
  )
}
