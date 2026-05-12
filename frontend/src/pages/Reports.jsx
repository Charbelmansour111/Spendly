import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts'
import { METHOD_ICONS, METHOD_COLORS } from '../utils/paymentMethods'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6']
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Bills: '💡', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦' }

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

function HeatmapCalendar({ year, month, monthExpenses, monthIncome, sym, fmt, monthName }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  const spendMap = {}
  monthExpenses.forEach(e => {
    const d = new Date(e.date).getDate()
    spendMap[d] = (spendMap[d] || 0) + safeNum(e.amount)
  })
  const maxSpend = Math.max(...Object.values(spendMap), 1)

  const intensity = (day) => {
    const s = spendMap[day] || 0
    if (s === 0) return 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-600'
    const r = s / maxSpend
    if (r < 0.25) return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
    if (r < 0.5)  return 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
    if (r < 0.75) return 'bg-orange-200 dark:bg-orange-800/60 text-orange-800 dark:text-orange-300'
    return 'bg-red-300 dark:bg-red-700/60 text-red-900 dark:text-red-200'
  }

  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const dayExpenses = selectedDay ? monthExpenses.filter(e => new Date(e.date).getDate() === selectedDay) : []
  const dayIncome   = selectedDay ? (monthIncome || []).filter(i => new Date(i.created_at).getDate() === selectedDay) : []
  const hasActivity = dayExpenses.length > 0 || dayIncome.length > 0

  return (
    <div>
      <div className="grid grid-cols-7 mb-1.5">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`b${i}`} />
          const isFuture = isCurrentMonth && day > today.getDate()
          const isToday  = isCurrentMonth && day === today.getDate()
          const isSelected = selectedDay === day
          const spend = spendMap[day] || 0
          return (
            <button key={day}
              onClick={() => !isFuture && setSelectedDay(isSelected ? null : day)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-px transition-all select-none
                ${intensity(day)}
                ${isFuture ? 'opacity-25 cursor-default' : 'cursor-pointer active:scale-95'}
                ${isToday ? 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-gray-800' : ''}
                ${isSelected ? 'ring-2 ring-violet-600 scale-105' : ''}
              `}>
              <span className="text-[10px] font-bold leading-none">{day}</span>
              {spend > 0 && (
                <span className="text-[8px] font-semibold leading-none tabular-nums opacity-80">
                  {sym}{spend >= 1000 ? (spend / 1000).toFixed(1) + 'k' : Math.round(spend)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-[10px] text-gray-400">None</span>
        {['bg-emerald-200','bg-amber-200','bg-orange-300','bg-red-400'].map((c,i) => (
          <div key={i} className={`w-5 h-5 rounded-md ${c}`} />
        ))}
        <span className="text-[10px] text-gray-400">High</span>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-3">{monthName} {selectedDay}</p>

          {!hasActivity ? (
            <div className="text-center py-5">
              <p className="text-2xl mb-1">📭</p>
              <p className="text-sm text-gray-400">No transactions that day</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Expenses */}
              {dayExpenses.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">
                    Spending · {fmt(dayExpenses.reduce((s,e) => s + safeNum(e.amount), 0), sym)}
                  </p>
                  <div className="space-y-2">
                    {dayExpenses.map(e => (
                      <div key={e.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-sm shrink-0">
                          {CAT_ICONS[e.category] || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{e.description || e.category}</p>
                          <p className="text-[10px] text-gray-400">{e.category}</p>
                        </div>
                        <p className="text-xs font-bold text-red-500 tabular-nums shrink-0">-{fmt(e.amount, sym)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Income */}
              {dayIncome.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-2">
                    Income · {fmt(dayIncome.reduce((s,i) => s + safeNum(i.amount), 0), sym)}
                  </p>
                  <div className="space-y-2">
                    {dayIncome.map(inc => (
                      <div key={inc.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-sm shrink-0">
                          💰
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{inc.source || 'Income'}</p>
                        </div>
                        <p className="text-xs font-bold text-emerald-500 tabular-nums shrink-0">+{fmt(inc.amount, sym)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const QUICK_QUESTIONS = [
  "Where am I overspending?", "How can I save more?", "Am I on track?",
  "Delete my last expense", "Biggest expense this month?", "Give me a tip",
]
const CHAT_GREETING = "I've analyzed your spending data. Ask me anything — budgeting tips, expense insights, or just delete that embarrassing takeout order. 😏"

function ActionCard({ action, sym, state, onConfirm, onCancel }) {
  const e = action.expense
  const dateStr = (e.date || '').split('T')[0]
  if (state === 'done') return <div className="mt-2 flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-2 rounded-xl"><span>✓</span> Done — expense {action.type === 'delete' ? 'deleted' : 'updated'}.</div>
  if (state === 'error') return <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-2 rounded-xl">✗ Something went wrong. Try again.</div>
  if (state === 'cancelled') return null
  return (
    <div className="mt-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl p-3">
      {action.type === 'delete' ? (
        <>
          <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">Confirm delete</p>
          <div className="flex items-center justify-between mb-3">
            <div><p className="text-sm font-semibold text-gray-800 dark:text-white">{e.description || e.category}</p><p className="text-xs text-gray-400">{e.category} · {dateStr}</p></div>
            <p className="font-bold text-red-500 text-sm tabular-nums">{sym}{parseFloat(e.amount).toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onConfirm} className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-xl">Delete</button>
            <button onClick={onCancel} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white text-xs py-2 rounded-xl">Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-bold text-violet-500 uppercase tracking-wide mb-2">Confirm update</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">{e.description || e.category}</p>
          {action.updates?.amount && <p className="text-xs text-gray-400 mb-2">{sym}{parseFloat(e.amount).toFixed(2)} → {sym}{parseFloat(action.updates.amount).toFixed(2)}</p>}
          <div className="flex gap-2">
            <button onClick={onConfirm} className="flex-1 bg-violet-600 text-white text-xs font-bold py-2 rounded-xl">Confirm</button>
            <button onClick={onCancel} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:white text-xs py-2 rounded-xl">Cancel</button>
          </div>
        </>
      )}
    </div>
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
  const [paymentStats, setPaymentStats] = useState([])
  const [forecast, setForecast] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(true)
  const [forecastPeriod, setForecastPeriod] = useState(30)
  // AI Chat tab state
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: CHAT_GREETING }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('spendly_insights_tts') === 'true')
  const [listening, setListening] = useState(false)
  const chatEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const micLang = localStorage.getItem('spendly_lang_mic') || 'en-US'
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
    setForecastLoading(true)
    Promise.all([
      API.get('/expenses'),
      API.get('/income?month=' + (selectedMonth + 1) + '&year=' + selectedYear),
      API.get('/income?month=' + (prevMonthNum + 1) + '&year=' + prevYearNum),
      API.get('/expenses/trends'),
      API.get('/expenses/payment-method-stats?month=' + (selectedMonth + 1) + '&year=' + selectedYear),
      API.get('/expenses/forecast'),
    ])
      .then(([e, i, pi, t, pm, fc]) => { setExpenses(e.data); setIncome(i.data); setPrevIncome(pi.data); setTrends(t.data); setPaymentStats(pm.data || []); setForecast(fc.data || null) })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => { setLoading(false); setForecastLoading(false) })
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

  // ── AI Chat handlers ──
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const chatSpeak = (text) => {
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
  const sendChatMessage = async (text) => {
    const msg = text || chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const history = chatMessages.filter((_, i) => i > 0)
      const res = await API.post('/insights/chat', { message: msg, history, mode: 'sarcastic' })
      const { reply, action } = res.data
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply, action: action || null, actionState: action ? 'pending' : null }])
      if (ttsEnabled) chatSpeak(reply)
    } catch (e) {
      const detail = e?.response?.data?.message || e?.response?.status || e?.message || 'unknown'
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${detail}` }])
    }
    setChatLoading(false)
  }
  const executeChatAction = async (msgIdx, action) => {
    try {
      if (action.type === 'delete') {
        await API.delete(`/expenses/${action.expense.id}`)
      } else {
        const e = action.expense; const u = action.updates || {}
        await API.put(`/expenses/${action.expense.id}`, { amount: parseFloat(u.amount || e.amount), category: u.category || e.category, description: u.description || e.description, date: (e.date || '').split('T')[0] || e.date, is_recurring: e.is_recurring, recurring_frequency: e.recurring_frequency || 'monthly' })
      }
      setChatMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, actionState: 'done' } : m))
    } catch {
      setChatMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, actionState: 'error' } : m))
    }
  }
  const cancelChatAction = (msgIdx) => setChatMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, actionState: 'cancelled' } : m))
  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    window.speechSynthesis?.cancel()
    const rec = new SR()
    rec.lang = micLang; rec.interimResults = false; rec.maxAlternatives = 1
    recognitionRef.current = rec
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => { const text = e.results[0][0].transcript.trim(); if (text) sendChatMessage(text) }
    rec.start()
  }
  const stopMic = () => { recognitionRef.current?.stop(); setListening(false) }

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {modalData && <NumberModal label={modalData.label} value={modalData.value} onClose={() => setModalData(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
            <p className="text-gray-400 text-sm mt-0.5">Monthly breakdown · deep analytics · AI assistant</p>
          </div>
          <a href="/transactions" className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 px-3 py-2 rounded-xl hover:bg-violet-100 transition mt-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 2L3 6v13a1 1 0 001 1h16a1 1 0 001-1V6l-3-4H6z"/><path d="M8 11h8M8 15h5"/><path d="M3 6h18"/></svg>
            Transactions
          </a>
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
          {[{ key: 'analytics', label: '📊 Analytics' }, { key: 'recap', label: '🗓️ Monthly Recap' }, { key: 'ai', label: '🤖 AI Chat' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600 dark:text-violet-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── AI CHAT TAB ─────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="flex flex-col" style={{ minHeight: 560 }}>

            {/* Gradient Header */}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 mb-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-white text-sm leading-tight">AI Finance Assistant</p>
                  <p className="text-xs text-white/70 leading-tight">Powered by your real data</p>
                </div>
              </div>
              <button onClick={toggleTts}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${ttsEnabled ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
                {ttsEnabled
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                }
                {ttsEnabled ? 'Voice On' : 'Voice Off'}
              </button>
            </div>

            {/* Message list — open canvas, no card box */}
            <div className="flex-1 overflow-y-auto space-y-5 px-1 mb-4" style={{ minHeight: 300 }}>
              {chatMessages.map((msg, i) => (
                msg.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="flex flex-col items-end max-w-[80%]">
                      <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-violet-600 text-white text-sm leading-relaxed shadow-sm" dir="auto">
                        {msg.content}
                      </div>
                      {msg.action && (
                        <ActionCard action={msg.action} sym={sym} state={msg.actionState}
                          onConfirm={() => executeChatAction(i, msg.action)}
                          onCancel={() => cancelChatAction(i)} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                      </svg>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 pb-4 border-b border-gray-100 dark:border-gray-700/50" dir="auto">
                        {renderMarkdown(msg.content)}
                      </div>
                      {msg.action && (
                        <ActionCard action={msg.action} sym={sym} state={msg.actionState}
                          onConfirm={() => executeChatAction(i, msg.action)}
                          onCancel={() => cancelChatAction(i)} />
                      )}
                    </div>
                  </div>
                )
              ))}

              {chatLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2.5">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: d + 'ms', animationDuration: '0.9s' }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick question chips — horizontal scroll above input */}
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendChatMessage(q)} disabled={chatLoading}
                    className="shrink-0 px-3.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition disabled:opacity-40 whitespace-nowrap shadow-sm">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input bar */}
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border bg-white dark:bg-gray-800 shadow-lg transition ${listening ? 'border-red-400 ring-2 ring-red-200 dark:ring-red-900' : 'border-gray-200 dark:border-gray-700 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:focus-within:ring-violet-900'}`}>
              <button onClick={listening ? stopMic : startMic} disabled={chatLoading}
                className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition ${listening ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30'}`}>
                {listening
                  ? <span className="flex gap-0.5 items-end h-4">{[4,7,5].map((h,i) => <span key={i} className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: h+'px', animationDelay: i*0.12+'s' }} />)}</span>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                }
              </button>
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                placeholder={listening ? 'Listening…' : 'Ask anything about your finances…'}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none min-w-0" />
              <button onClick={() => sendChatMessage()} disabled={chatLoading || !chatInput.trim()}
                className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition ${chatInput.trim() && !chatLoading ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 cursor-not-allowed'}`}>
                {chatLoading
                  ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
              </button>
            </div>
          </div>
        )}

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

            {/* Spending Heatmap Calendar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
              <SectionHeader icon="📅" title="Spending Calendar" subtitle={`Tap any day to see transactions · ${monthName}`} />
              <HeatmapCalendar
                year={selectedYear}
                month={selectedMonth}
                monthExpenses={monthExpenses}
                monthIncome={income}
                sym={sym}
                fmt={fmt}
                monthName={monthName}
              />
            </div>

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

            {/* Payment Method Breakdown */}
            {paymentStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <SectionHeader icon="💳" title="Payment Methods" subtitle={`How you pay — ${monthExpenses.length} expense${monthExpenses.length !== 1 ? 's' : ''} this month`} />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {paymentStats.map(s => {
                    const totalCount = paymentStats.reduce((sum, x) => sum + parseInt(x.count), 0)
                    const pct = totalCount > 0 ? Math.round((parseInt(s.count) / totalCount) * 100) : 0
                    return (
                      <div key={s.payment_method} className={`rounded-2xl px-4 py-3 ${METHOD_COLORS[s.payment_method] || 'bg-gray-100 text-gray-700'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{METHOD_ICONS[s.payment_method] || '💳'}</span>
                          <span className="font-bold text-sm">{s.payment_method || 'Card'}</span>
                        </div>
                        <p className="text-2xl font-black tabular-nums leading-tight">{s.count}</p>
                        <p className="text-xs opacity-70 mt-0.5">{pct}% of transactions · {sym}{parseFloat(s.total).toFixed(2)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cash Flow Forecast */}
            {(() => {
              const periodDays = forecastPeriod
              const slicedDays = forecast?.days?.slice(0, periodDays) || []
              const hasRecurring = slicedDays.some(d => d.income > 0 || d.expense > 0)
              const projIncome  = slicedDays.reduce((s, d) => s + d.income,  0)
              const projExpense = slicedDays.reduce((s, d) => s + d.expense, 0)
              const projNet     = projIncome - projExpense
              const lowest      = forecast?.summary?.lowest_balance ?? 0
              const lowestDate  = forecast?.summary?.lowest_balance_date ?? ''
              const maxAbsNet   = slicedDays.reduce((m, d) => Math.max(m, Math.abs(d.net)), 1)

              return (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <SectionHeader icon="🔮" title="Cash Flow Forecast" subtitle="90-day projection from recurring items" />

                  {/* Period toggle */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-4 w-fit gap-1">
                    {[30, 60, 90].map(p => (
                      <button key={p} onClick={() => setForecastPeriod(p)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${forecastPeriod === p ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600 dark:text-violet-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                        {p} days
                      </button>
                    ))}
                  </div>

                  {forecastLoading ? (
                    <div className="space-y-2">
                      <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                      <div className="grid grid-cols-3 gap-3">
                        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
                      </div>
                    </div>
                  ) : !hasRecurring ? (
                    <div className="text-center py-10">
                      <p className="text-3xl mb-2">📅</p>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No recurring items found</p>
                      <p className="text-xs text-gray-400 mt-1">Mark expenses or income as recurring to see your forecast</p>
                    </div>
                  ) : (
                    <>
                      {/* Shortfall warning */}
                      {lowest < 0 && (
                        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 mb-4">
                          <span className="text-base shrink-0">⚠️</span>
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                            Projected shortfall on <span className="font-black">{lowestDate}</span> — balance drops to <span className="font-black">{sym}{Math.abs(lowest).toFixed(2)}</span> below zero
                          </p>
                        </div>
                      )}

                      {/* Bar chart */}
                      <div className="overflow-x-auto pb-1">
                        <div className="relative" style={{ minWidth: Math.max(slicedDays.length * 6, 280) + 'px' }}>
                          {/* Running balance label strip */}
                          <div className="flex items-end gap-px mb-1" style={{ height: '14px' }}>
                            {slicedDays.map((d, i) => (
                              <div key={i} className="flex-1 flex items-center justify-center" style={{ minWidth: 4 }}>
                                {i % 7 === 0 && (
                                  <span className="text-[8px] text-gray-400 tabular-nums whitespace-nowrap" style={{ transform: 'translateX(-50%)', position: 'absolute', left: `${(i / slicedDays.length) * 100}%` }}>
                                    {sym}{d.running >= 0 ? '' : '-'}{Math.abs(d.running) >= 1000 ? (Math.abs(d.running) / 1000).toFixed(1) + 'k' : Math.abs(d.running).toFixed(0)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Bars */}
                          <div className="flex items-center gap-px" style={{ height: '80px' }}>
                            {slicedDays.map((d, i) => {
                              const pct = maxAbsNet > 0 ? (Math.abs(d.net) / maxAbsNet) * 100 : 0
                              const isPos = d.net >= 0
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-center h-full" style={{ minWidth: 4 }} title={`${d.date}\nIncome: ${sym}${d.income.toFixed(2)}\nExpense: ${sym}${d.expense.toFixed(2)}\nNet: ${d.net >= 0 ? '+' : ''}${sym}${d.net.toFixed(2)}\nRunning: ${sym}${d.running.toFixed(2)}`}>
                                  {isPos ? (
                                    <>
                                      <div style={{ flex: 1 }} />
                                      <div className="w-full rounded-t-sm bg-emerald-400 dark:bg-emerald-500" style={{ height: `${pct}%` }} />
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-full rounded-b-sm bg-red-400 dark:bg-red-500" style={{ height: `${pct}%` }} />
                                      <div style={{ flex: 1 }} />
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Zero line */}
                          <div className="w-full border-t border-gray-300 dark:border-gray-600" />

                          {/* X-axis date labels */}
                          <div className="relative mt-1" style={{ height: '16px' }}>
                            {slicedDays.map((d, i) => i % 7 === 0 && (
                              <span key={i} className="text-[9px] text-gray-400 absolute whitespace-nowrap" style={{ left: `${(i / slicedDays.length) * 100}%`, transform: 'translateX(-50%)' }}>
                                {d.date.slice(5)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Stat cards */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Projected Income</p>
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{sym}{projIncome.toFixed(2)}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold uppercase tracking-wide mb-1">Projected Expenses</p>
                          <p className="text-sm font-black text-red-600 dark:text-red-400 tabular-nums">{sym}{projExpense.toFixed(2)}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${projNet >= 0 ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${projNet >= 0 ? 'text-violet-600 dark:text-violet-400' : 'text-orange-600 dark:text-orange-400'}`}>Net Balance</p>
                          <p className={`text-sm font-black tabular-nums ${projNet >= 0 ? 'text-violet-700 dark:text-violet-300' : 'text-orange-600 dark:text-orange-400'}`}>
                            {projNet >= 0 ? '+' : '-'}{sym}{Math.abs(projNet).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

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
                      {categoryData.map((c) => (
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
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-sm">No expenses for {monthName}</p>
                    <a href="/transactions" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-4 py-2 rounded-xl hover:bg-violet-100 transition">Add Transactions →</a>
                  </div>
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
