import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6']
const CAT_ICONS = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }

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

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
      <span className="text-base">{icon}</span>
      <div>
        <p className="text-sm font-bold text-gray-800 dark:text-white">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
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

  // ── Derived ────────────────────────────────────────────
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })
  const total       = monthExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const totalIncome = income.reduce((s, i) => s + safeNum(i.amount), 0)
  const balance     = totalIncome - total
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0'

  const prevMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === prevMonthNum && d.getFullYear() === prevYearNum
  })
  const prevTotal       = prevMonthExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const prevTotalIncome = prevIncome.reduce((s, i) => s + safeNum(i.amount), 0)
  const spendingChange = prevTotal > 0 ? (((total - prevTotal) / prevTotal) * 100).toFixed(0) : null
  const incomeChange   = prevTotalIncome > 0 ? (((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(0) : null

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
    return weeks.map((v, i) => ({ label: `Wk ${i + 1}`, amount: parseFloat(v.toFixed(2)) })).filter(w => w.amount > 0)
  })()

  // Daily spending
  const dailyData = (() => {
    const days = {}
    monthExpenses.forEach(e => {
      const day = new Date(e.date).getDate()
      days[day] = (days[day] || 0) + safeNum(e.amount)
    })
    return Object.entries(days)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([day, amount]) => ({ day: `${day}`, amount: parseFloat(amount.toFixed(2)) }))
  })()

  // Per-day stats
  const daysInMonth    = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const avgPerDay      = daysInMonth > 0 ? total / daysInMonth : 0
  const busiestDay     = dailyData.reduce((max, d) => d.amount > (max?.amount || 0) ? d : max, null)
  const biggestExpense = [...monthExpenses].sort((a, b) => safeNum(b.amount) - safeNum(a.amount))[0]

  // Income by source
  const incomeBySource = income.reduce((acc, i) => {
    const src = i.source || 'Other'
    const f = acc.find(x => x.name === src)
    if (f) f.value += safeNum(i.amount)
    else acc.push({ name: src, value: safeNum(i.amount) })
    return acc
  }, []).sort((a, b) => b.value - a.value)

  // 6-month income vs spending chart
  const trendChartData = trends.map(t => ({
    label: t.label,
    Income:  safeNum(t.income),
    Spent:   safeNum(t.spending),
    Balance: safeNum(t.balance),
  }))

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
    doc.setFontSize(24); doc.setTextColor(79, 70, 229); doc.text('Spendly', 14, 20)
    doc.setFontSize(11); doc.setTextColor(100, 100, 100)
    doc.text('Report for: ' + (user?.name || 'User'), 14, 30)
    doc.text('Period: ' + monthName, 14, 37)
    doc.text('Generated: ' + new Date().toLocaleDateString(), 14, 44)
    doc.setFontSize(13); doc.setTextColor(0, 0, 0)
    doc.text('SUMMARY', 14, 57)
    doc.setFontSize(11)
    doc.text(`Income (${income.length} entries): ${sym}${totalIncome.toFixed(2)}`, 14, 65)
    doc.text(`Expenses (${monthExpenses.length} entries): ${sym}${total.toFixed(2)}`, 14, 72)
    doc.text(`Balance: ${balance >= 0 ? '+' : '-'}${sym}${Math.abs(balance).toFixed(2)}`, 14, 79)
    doc.text(`Savings Rate: ${savingsRate}%`, 14, 86)
    autoTable(doc, {
      startY: 96,
      head: [['Category', 'Count', 'Amount', '%']],
      body: categoryData.map(c => [
        c.name,
        monthExpenses.filter(e => e.category === c.name).length,
        sym + c.value.toFixed(2),
        total > 0 ? ((c.value / total) * 100).toFixed(0) + '%' : '0%'
      ]),
      headStyles: { fillColor: [79, 70, 229] }
    })
    const y1 = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 140
    autoTable(doc, {
      startY: y1,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: [...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(e => [e.date?.split('T')[0], e.category, e.description || '-', sym + safeNum(e.amount).toFixed(2)]),
      headStyles: { fillColor: [79, 70, 229] }
    })
    const y2 = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 200
    if (income.length > 0) {
      autoTable(doc, {
        startY: y2,
        head: [['Source', 'Amount', 'Recurring']],
        body: income.map(i => [i.source || 'Other', sym + safeNum(i.amount).toFixed(2), i.is_recurring ? 'Yes' : 'No']),
        headStyles: { fillColor: [16, 185, 129] }
      })
    }
    doc.save('spendly-' + monthName.replace(' ', '-') + '.pdf')
    showToast('PDF downloaded!')
  }

  const exportCSV = () => {
    const rows = [
      ['SUMMARY'], ['Period', monthName], ['Total Income', sym + totalIncome.toFixed(2)],
      ['Income Entries', income.length], ['Total Spent', sym + total.toFixed(2)],
      ['Expense Entries', monthExpenses.length], ['Balance', (balance >= 0 ? '+' : '-') + sym + Math.abs(balance).toFixed(2)],
      ['Savings Rate', savingsRate + '%'], [],
      ['EXPENSES'], ['Date', 'Category', 'Description', 'Amount', 'Recurring']
    ]
    ;[...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(e => rows.push([e.date?.split('T')[0], e.category, e.description || '', safeNum(e.amount).toFixed(2), e.is_recurring ? 'Yes' : 'No']))
    rows.push([], ['INCOME'], ['Source', 'Amount', 'Recurring'])
    income.forEach(i => rows.push([i.source || 'Other', safeNum(i.amount).toFixed(2), i.is_recurring ? 'Yes' : 'No']))
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
          <p className="text-gray-400 text-sm mt-0.5">Monthly breakdown · deep analytics · export</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-5 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
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

        {/* ── ANALYTICS TAB ───────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">

            {/* Summary Cards — bubble style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Income',       value: fmt(totalIncome, sym), bg: 'bg-emerald-500', icon: '💰', change: incomeChange,   positiveGood: true },
                { label: 'Spent',        value: fmt(total, sym),       bg: 'bg-red-500',     icon: '💸', change: spendingChange, positiveGood: false },
                { label: 'Balance',      value: (balance >= 0 ? '+' : '') + fmt(balance, sym), bg: balance >= 0 ? 'bg-violet-600' : 'bg-orange-500', icon: balance >= 0 ? '📈' : '📉', change: null },
                { label: 'Savings Rate', value: savingsRate + '%',     bg: parseFloat(savingsRate) >= 20 ? 'bg-teal-500' : 'bg-amber-500', icon: '🎯', change: null },
              ].map((s, i) => (
                <button key={i} onClick={() => setModalData({ label: s.label + ' — ' + monthName, value: s.value })}
                  className="relative overflow-hidden rounded-3xl p-4 shadow-sm text-left min-w-0 active:scale-95 transition-transform group">
                  <div className={`absolute inset-0 ${s.bg} opacity-90`} />
                  <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                  <div className="absolute -bottom-3 -left-3 w-12 h-12 rounded-full bg-white/10" />
                  <div className="relative">
                    <span className="text-2xl block mb-2">{s.icon}</span>
                    <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">{s.label}</p>
                    <p className="text-white font-black text-base tabular-nums truncate mt-0.5 leading-tight">{s.value}</p>
                    {s.change !== null && (
                      <p className={`text-xs mt-1.5 font-bold px-2 py-0.5 rounded-full inline-block ${(s.positiveGood ? s.change > 0 : s.change < 0) ? 'bg-white/25 text-white' : 'bg-black/20 text-white/80'}`}>
                        {s.change > 0 ? '▲' : '▼'} {Math.abs(s.change)}%
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Per-day stat strip */}
            {monthExpenses.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">Avg / Day</p>
                  <p className="text-sm font-bold text-violet-600 tabular-nums">{fmt(avgPerDay, sym)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{daysInMonth} days</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">Busiest Day</p>
                  <p className="text-sm font-bold text-orange-500 tabular-nums">{busiestDay ? `Day ${busiestDay.day}` : '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{busiestDay ? fmt(busiestDay.amount, sym) : ''}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">Biggest Spend</p>
                  <p className="text-sm font-bold text-red-500 tabular-nums truncate">{biggestExpense ? fmt(biggestExpense.amount, sym) : '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{biggestExpense?.description || biggestExpense?.category || ''}</p>
                </div>
              </div>
            )}

            {/* AI Report Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
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
                <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{renderMarkdown(aiSummary)}</div>
              )}
              {!aiSummary && !aiLoading && (
                <p className="text-sm text-gray-400">Tap Analyze for a data-driven breakdown of your month.</p>
              )}
            </div>

            {/* Daily spending chart */}
            {dailyData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="📅" title="Daily Spending" subtitle={`Every day you spent money in ${monthName}`} />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dailyData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" width={40} />
                    <Tooltip formatter={v => fmt(v, sym)} labelFormatter={l => `Day ${l}`} />
                    <Bar dataKey="amount" fill="#7C3AED" radius={[3, 3, 0, 0]} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie + Weekly side by side */}
            {categoryData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <SectionHeader icon="🍕" title="Spending by Category" />
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v, sym)} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <SectionHeader icon="📆" title="Weekly Spending" />
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={v => fmt(v, sym)} />
                      <Bar dataKey="amount" fill="#4F46E5" radius={[5, 5, 0, 0]} name="Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Income by source */}
            {incomeBySource.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="💵" title="Income by Source" subtitle={`${income.length} income entr${income.length !== 1 ? 'ies' : 'y'} this month`} />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={incomeBySource} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#9CA3AF" width={60} />
                    <Tooltip formatter={v => fmt(v, sym)} />
                    <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} name="Income" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 6-Month Income vs Spending */}
            {trendChartData.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="📈" title="6-Month Income vs Spending" subtitle="How your cash flow evolved" />
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendChartData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <Tooltip formatter={v => fmt(v, sym)} />
                    <Line type="monotone" dataKey="Income"  stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Spent"   stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Balance" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 6-Month savings rate */}
            {trends.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="💰" title="6-Month Savings Rate" subtitle="% of income kept each month" />
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={trends.map(t => ({ ...t, rate: t.income > 0 ? parseFloat(((t.balance / t.income) * 100).toFixed(1)) : 0 }))}
                    margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" unit="%" domain={['auto', 'auto']} />
                    <Tooltip formatter={v => v + '%'} />
                    <Line type="monotone" dataKey="rate" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} name="Savings Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Month vs Previous comparison */}
            {prevTotal > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <SectionHeader icon="🔁" title={`${monthName} vs ${prevMonthName}`} subtitle="Category-by-category spending change" />
                <div className="space-y-3">
                  {categoryData.map(c => {
                    const prev = prevCategoryData[c.name] || 0
                    const diff = prev > 0 ? ((c.value - prev) / prev) * 100 : null
                    const maxVal = Math.max(c.value, prev)
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-200">{CAT_ICONS[c.name] || '📦'} {c.name}</span>
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

          </div>
        )}

        {/* ── MONTHLY RECAP TAB ───────────────────────────── */}
        {activeTab === 'recap' && (() => {
          const rate = parseFloat(savingsRate)
          const score = rate >= 20 ? { grade: 'A', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Excellent' }
            : rate >= 10 ? { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Good' }
            : rate >= 0  ? { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Average' }
            : { grade: 'F', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Over Budget' }
          const topCat   = categoryData[0]
          const worstCat = categoryData.reduce((worst, c) => {
            const diff = (prevCategoryData[c.name] || 0) > 0 ? c.value - prevCategoryData[c.name] : 0
            return (!worst || diff > ((prevCategoryData[worst.name] || 0) > 0 ? worst.value - prevCategoryData[worst.name] : 0)) ? c : worst
          }, null)
          const bestCat = categoryData.reduce((best, c) => {
            const diff = (prevCategoryData[c.name] || 0) > 0 ? c.value - prevCategoryData[c.name] : 0
            return (!best || diff < ((prevCategoryData[best.name] || 0) > 0 ? best.value - prevCategoryData[best.name] : 0)) ? c : best
          }, null)

          return (
            <div className="space-y-5">

              {/* Hero score */}
              <div className="bg-linear-to-br from-slate-700 to-slate-900 rounded-2xl px-5 py-4 text-white">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-2">{monthName} Summary</p>
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
                    { label: 'Income', val: fmt(totalIncome, sym), color: 'text-green-300' },
                    { label: 'Spent',  val: fmt(total, sym),        color: 'text-red-300' },
                    { label: 'Saved',  val: (balance >= 0 ? '+' : '') + fmt(balance, sym), color: balance >= 0 ? 'text-white' : 'text-red-300' },
                  ].map(s => (
                    <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-white/60 text-xs mb-1">{s.label}</p>
                      <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly totals table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <SectionHeader icon="📋" title="Monthly Summary Table" subtitle={`Full financial overview for ${monthName}`} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                        <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="text-center py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Entries</th>
                        <th className="text-right py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-50 dark:border-gray-700/50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span className="font-semibold text-gray-800 dark:text-white">Income</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                            {income.length}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-green-600 tabular-nums">+{fmt(totalIncome, sym)}</td>
                      </tr>
                      <tr className="border-b border-gray-50 dark:border-gray-700/50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span className="font-semibold text-gray-800 dark:text-white">Expenses</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                            {monthExpenses.length}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-red-500 tabular-nums">-{fmt(total, sym)}</td>
                      </tr>
                      {categoryData.map((c, i) => (
                        <tr key={c.name} className="border-b border-gray-50 dark:border-gray-700/30">
                          <td className="py-2 px-3 pl-8">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{CAT_ICONS[c.name] || '📦'} {c.name}</span>
                          </td>
                          <td className="py-2 px-3 text-center text-xs text-gray-400">
                            {monthExpenses.filter(e => e.category === c.name).length}
                          </td>
                          <td className="py-2 px-3 text-right text-xs text-gray-500 tabular-nums">{fmt(c.value, sym)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                        <td className="py-3 px-3 font-black text-gray-900 dark:text-white text-sm">Balance</td>
                        <td className="py-3 px-3 text-center text-xs text-gray-400">{income.length + monthExpenses.length} total</td>
                        <td className={`py-3 px-3 text-right font-black text-sm tabular-nums ${balance >= 0 ? 'text-violet-600' : 'text-red-500'}`}>
                          {balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance), sym)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-3">
                {topCat && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">🏆</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Top Spending Category</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{topCat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-violet-600 tabular-nums shrink-0">{fmt(topCat.value, sym)}</p>
                  </div>
                )}
                {spendingChange !== null && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${parseInt(spendingChange) <= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {parseInt(spendingChange) <= 0 ? '📉' : '📈'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">vs {prevMonthName.split(' ')[0]}</p>
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
                      <p className="text-xs text-gray-400">Most Overspent vs Last Month</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{worstCat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-red-500 tabular-nums shrink-0">+{fmt(worstCat.value - prevCategoryData[worstCat.name], sym)}</p>
                  </div>
                )}
                {bestCat && prevCategoryData[bestCat.name] > 0 && bestCat.value < prevCategoryData[bestCat.name] && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">✅</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Most Improved vs Last Month</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{bestCat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-green-500 tabular-nums shrink-0">-{fmt(prevCategoryData[bestCat.name] - bestCat.value, sym)}</p>
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

              {/* Export */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="📤" title={`Export ${monthName} Report`} subtitle="Download your full financial data" />
                <div className="flex gap-3">
                  <button onClick={exportPDF} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition text-sm flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    PDF Report
                  </button>
                  <button onClick={exportCSV} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition text-sm flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    CSV Spreadsheet
                  </button>
                </div>
              </div>

              {/* All Expenses table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="💸" title={`All Expenses — ${monthName}`} subtitle={`${monthExpenses.length} expense${monthExpenses.length !== 1 ? 's' : ''} · total ${fmt(total, sym)}`} />
                {loading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
                ) : monthExpenses.length === 0 ? (
                  <div className="text-center py-10 text-gray-400"><p className="text-3xl mb-2">📭</p><p className="text-sm">No expenses for {monthName}</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs">Date</th>
                          <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs">Category</th>
                          <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs hidden md:table-cell">Description</th>
                          <th className="text-center py-2.5 px-2 text-gray-500 font-medium text-xs hidden sm:table-cell">Recurring</th>
                          <th className="text-right py-2.5 px-2 text-gray-500 font-medium text-xs">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
                          <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2.5 px-2 text-gray-500 text-xs whitespace-nowrap">{e.date?.split('T')[0]}</td>
                            <td className="py-2.5 px-2"><span className="bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full text-xs whitespace-nowrap">{e.category}</span></td>
                            <td className="py-2.5 px-2 text-gray-600 dark:text-gray-300 text-xs hidden md:table-cell">{e.description || '--'}</td>
                            <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                              {e.is_recurring && <span className="text-xs text-purple-500 font-medium">↻</span>}
                            </td>
                            <td className="py-2.5 px-2 text-right font-semibold text-gray-800 dark:text-white text-xs tabular-nums whitespace-nowrap">{sym}{safeNum(e.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                          <td colSpan={4} className="py-3 px-2 font-bold text-gray-800 dark:text-white text-sm">Total ({monthExpenses.length} expenses)</td>
                          <td className="py-3 px-2 text-right font-bold text-red-500 tabular-nums text-sm">{sym}{total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* All Income table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="💵" title={`All Income — ${monthName}`} subtitle={`${income.length} entr${income.length !== 1 ? 'ies' : 'y'} · total ${fmt(totalIncome, sym)}`} />
                {income.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><p className="text-3xl mb-2">💰</p><p className="text-sm">No income logged for {monthName}</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs">Source</th>
                          <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs hidden md:table-cell">Description</th>
                          <th className="text-center py-2.5 px-2 text-gray-500 font-medium text-xs hidden sm:table-cell">Recurring</th>
                          <th className="text-right py-2.5 px-2 text-gray-500 font-medium text-xs">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {income.map(inc => (
                          <tr key={inc.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2.5 px-2"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full text-xs whitespace-nowrap">{inc.source || 'Other'}</span></td>
                            <td className="py-2.5 px-2 text-gray-600 dark:text-gray-300 text-xs hidden md:table-cell">{inc.description || '--'}</td>
                            <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                              {inc.is_recurring && <span className="text-xs text-purple-500 font-medium">↻</span>}
                            </td>
                            <td className="py-2.5 px-2 text-right font-semibold text-green-600 text-xs tabular-nums whitespace-nowrap">+{sym}{safeNum(inc.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                          <td colSpan={3} className="py-3 px-2 font-bold text-gray-800 dark:text-white text-sm">Total ({income.length} entr{income.length !== 1 ? 'ies' : 'y'})</td>
                          <td className="py-3 px-2 text-right font-bold text-green-600 tabular-nums text-sm">+{sym}{totalIncome.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )
        })()}

      </div>
    </Layout>
  )
}
