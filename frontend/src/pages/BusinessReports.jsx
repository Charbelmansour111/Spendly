import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function BusinessReports() {
  const [dayReports, setDayReports]     = useState([])
  const [monthReports, setMonthReports] = useState([])
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState('days')
  const [selectedDay, setSelectedDay]   = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [symbol, setSymbol]             = useState('$')
  const [generatingMonth, setGeneratingMonth] = useState(false)

  const today = new Date()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    if (user.account_type !== 'business') { window.location.href = '/dashboard'; return }
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [days, months] = await Promise.all([
        API.get('/business/reports/days'),
        API.get('/business/reports/months')
      ])
      setDayReports(days.data || [])
      setMonthReports(months.data || [])
    } catch {}
    setLoading(false)
  }

  const generateMonthReport = async () => {
    setGeneratingMonth(true)
    try {
      await API.post('/business/reports/months/generate', {
        month: today.getMonth() + 1,
        year: today.getFullYear()
      })
      fetchAll()
    } catch {}
    setGeneratingMonth(false)
  }

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  if (loading) return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* Day detail modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setSelectedDay(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">📅 {selectedDay.date?.split('T')[0]}</h3>
                <p className="text-xs text-gray-400">Day Report — Read Only</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* Revenue */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                <p className="text-xs text-green-500 font-semibold mb-1">REVENUE (STATIC)</p>
                <p className="text-3xl font-bold text-green-600 tabular-nums">{fmt(selectedDay.revenue, symbol)}</p>
                <p className="text-xs text-green-400 mt-1">From POS main reading — cannot be changed</p>
              </div>

              {/* Expenses + Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3">
                  <p className="text-xs text-red-400 mb-1">Total Expenses</p>
                  <p className="text-xl font-bold text-red-500 tabular-nums">{fmt(safeNum(selectedDay.expenses) + safeNum(selectedDay.external_expenses), symbol)}</p>
                  {safeNum(selectedDay.external_expenses) > 0 && <p className="text-xs text-red-300">incl. {fmt(selectedDay.external_expenses, symbol)} external</p>}
                </div>
                <div className={`rounded-2xl p-3 ${safeNum(selectedDay.profit) >= 0 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <p className="text-xs text-gray-400 mb-1">Net Profit</p>
                  <p className={`text-xl font-bold tabular-nums ${safeNum(selectedDay.profit) >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                    {safeNum(selectedDay.profit) >= 0 ? '+' : ''}{fmt(selectedDay.profit, symbol)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 space-y-2">
                {[
                  selectedDay.items_sold && { label: 'Items sold', value: selectedDay.items_sold + ' types' },
                  selectedDay.top_seller && { label: '🏆 Top seller', value: selectedDay.top_seller },
                  selectedDay.num_customers && { label: 'Customers', value: selectedDay.num_customers },
                  selectedDay.exchange_rate && { label: 'Exchange rate', value: '1$ = ' + parseFloat(selectedDay.exchange_rate).toLocaleString() + ' LL' },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedDay.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
                  <p className="text-xs text-yellow-600">{selectedDay.notes}</p>
                </div>
              )}

              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">🔒 Day reports are read-only and cannot be edited or deleted</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month detail modal */}
      {selectedMonth && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setSelectedMonth(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">📁 {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}</h3>
                <p className="text-xs text-gray-400">Monthly Report — Read Only</p>
              </div>
              <button onClick={() => setSelectedMonth(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 text-center">
                  <p className="text-xs text-green-400 mb-1">Revenue</p>
                  <p className="font-bold text-green-600 tabular-nums text-sm">{fmt(selectedMonth.total_revenue, symbol)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 text-center">
                  <p className="text-xs text-red-400 mb-1">Expenses</p>
                  <p className="font-bold text-red-500 tabular-nums text-sm">{fmt(selectedMonth.total_expenses, symbol)}</p>
                </div>
                <div className={`rounded-2xl p-3 text-center ${safeNum(selectedMonth.total_profit) >= 0 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-red-50'}`}>
                  <p className="text-xs text-gray-400 mb-1">Profit</p>
                  <p className={`font-bold tabular-nums text-sm ${safeNum(selectedMonth.total_profit) >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{fmt(selectedMonth.total_profit, symbol)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">{selectedMonth.total_days} days recorded</p>

              {/* Day breakdown */}
              {selectedMonth.scan_data && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Breakdown</p>
                  {(typeof selectedMonth.scan_data === 'string' ? JSON.parse(selectedMonth.scan_data) : selectedMonth.scan_data).map((day, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{day.date?.split('T')[0]}</p>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600 tabular-nums">{fmt(day.revenue, symbol)}</p>
                        <p className="text-xs text-gray-400">profit: {fmt(day.profit, symbol)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">🔒 Month reports are read-only and cannot be edited or deleted</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
            <p className="text-gray-400 text-sm mt-0.5">Day & month folders — read only</p>
          </div>
          <button onClick={generateMonthReport} disabled={generatingMonth}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition disabled:opacity-50">
            {generatingMonth ? 'Generating...' : '📁 Close Month'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5">
          {[{ key: 'days', label: '📅 Daily Reports' }, { key: 'months', label: '📁 Monthly Reports' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.key ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'days' && (
          <div className="space-y-3">
            {dayReports.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-semibold text-gray-700 dark:text-white">No day reports yet</p>
                <p className="text-gray-400 text-sm mt-1">Day reports are created automatically when you scan the POS</p>
              </div>
            ) : (
              dayReports.map(report => {
                const totalExp = safeNum(report.expenses) + safeNum(report.external_expenses)
                const profit = safeNum(report.profit)
                return (
                  <button key={report.id} onClick={() => setSelectedDay(report)}
                    className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition active:scale-[0.99]">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{report.date?.split('T')[0]}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {report.items_sold} items · {report.num_customers ? report.num_customers + ' customers' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 tabular-nums">{fmt(report.revenue, symbol)}</p>
                        <p className={`text-xs font-semibold tabular-nums ${profit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                          {profit >= 0 ? '+' : ''}{fmt(profit, symbol)} profit
                        </p>
                      </div>
                    </div>
                    {/* Mini bar */}
                    <div className="mt-3 flex gap-1 h-1.5">
                      <div className="bg-green-400 rounded-full" style={{ width: safeNum(report.revenue) > 0 ? '100%' : '0%' }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Revenue: {fmt(report.revenue, symbol)}</span>
                      <span>Exp: {fmt(totalExp, symbol)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'months' && (
          <div className="space-y-3">
            {monthReports.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">📁</p>
                <p className="font-semibold text-gray-700 dark:text-white">No monthly reports yet</p>
                <p className="text-gray-400 text-sm mt-1">Tap "Close Month" at the end of each month to generate one</p>
              </div>
            ) : (
              monthReports.map(report => (
                <button key={report.id} onClick={() => setSelectedMonth(report)}
                  className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">{MONTH_NAMES[report.month - 1]} {report.year}</p>
                      <p className="text-xs text-gray-400">{report.total_days} days recorded</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 tabular-nums">{fmt(report.total_revenue, symbol)}</p>
                      <p className={`text-xs font-semibold ${safeNum(report.total_profit) >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                        {fmt(report.total_profit, symbol)} profit
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}