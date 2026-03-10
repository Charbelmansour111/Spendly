import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }
const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']

function Toast({ message, type, onClose }) {
  // Fix: Added onClose to dependency array
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span>{message}</span><button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
    </div>
  )
}

export default function Reports() {
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  
  // Fix: Initialize as state to avoid hydration mismatch and SSR errors
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [user, setUser] = useState({})

  const showToast = (msg, type = 'success') => setToast({ message: msg, type })
  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()

  // Fix: Load localStorage data on mount (Client-side only)
  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency') || 'USD'
    setCurrencySymbol(CURRENCY_SYMBOLS[storedCurrency] || '$')
    
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) setUser(JSON.parse(storedUser))
    } catch (e) { console.error("Error parsing user", e) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    
    // Fix: Define fetch logic inside effect to avoid dependency warnings
    const fetchAll = async () => {
      setLoading(true)
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [e, i] = await Promise.all([
          API.get('/expenses', { headers }),
          API.get(`/income?month=${selectedMonth + 1}&year=${selectedYear}`, { headers })
        ])
        setExpenses(e.data); setIncome(i.data)
      } catch { showToast('Error loading data', 'error') }
      setLoading(false)
    }
    
    fetchAll()
  }, [selectedMonth, selectedYear])

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  const total = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalIncome = income.reduce((sum, i) => sum + parseFloat(i.amount), 0)
  const balance = totalIncome - total

  const categoryData = monthExpenses.reduce((acc, e) => {
    const ex = acc.find(i => i.name === e.category)
    if (ex) ex.value += parseFloat(e.amount)
    else acc.push({ name: e.category, value: parseFloat(e.amount) })
    return acc
  }, [])

 const exportPDF = () => {
  const doc = new jsPDF()
  doc.setFontSize(24); doc.setTextColor(79, 70, 229); doc.text('Spendly', 14, 20)
  doc.setFontSize(11); doc.setTextColor(100, 100, 100)
  doc.text(`Report for: ${user?.name || 'User'}`, 14, 30)
  doc.text(`Period: ${monthName}`, 14, 37)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 44)
  doc.setFontSize(14); doc.setTextColor(0, 0, 0)
  doc.text(`Total Income: ${currencySymbol}${totalIncome.toFixed(2)}`, 14, 57)
  doc.text(`Total Spent: ${currencySymbol}${total.toFixed(2)}`, 14, 65)
  doc.text(`Balance: ${currencySymbol}${balance.toFixed(2)}`, 14, 73)
  autoTable(doc, {
    startY: 87,
    head: [['Category', 'Amount', '%']],
    body: categoryData.map(c => [
      c.name,
      `${currencySymbol}${c.value.toFixed(2)}`,
      total > 0 ? `${((c.value / total) * 100).toFixed(0)}%` : '0%'
    ]),
    headStyles: { fillColor: [79, 70, 229] }
  })
  const firstTableEnd = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 120
  autoTable(doc, {
    startY: firstTableEnd,
    head: [['Date', 'Category', 'Description', 'Amount']],
    body: monthExpenses.map(e => [
      e.date?.split('T')[0],
      e.category,
      e.description || '-',
      `${currencySymbol}${parseFloat(e.amount).toFixed(2)}`
    ]),
    headStyles: { fillColor: [79, 70, 229] }
  })
  doc.save(`spendly-${monthName.replace(' ', '-')}.pdf`)
  showToast('📄 PDF downloaded!')
}

  const exportCSV = () => {
    const rows = [['SUMMARY'], ['Period', monthName], ['Total Income', `${currencySymbol}${totalIncome.toFixed(2)}`], ['Total Spent', `${currencySymbol}${total.toFixed(2)}`], ['Balance', `${currencySymbol}${balance.toFixed(2)}`], [], ['EXPENSES'], ['Date', 'Category', 'Description', 'Amount']]
    monthExpenses.forEach(e => rows.push([e.date?.split('T')[0], e.category, e.description || '', parseFloat(e.amount).toFixed(2)]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `spendly-${monthName.replace(' ', '-')}.csv`; link.click()
    showToast('📊 CSV downloaded!')
  }

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📄 Reports</h1>
          <p className="text-gray-400 mt-1">View and export your monthly financial reports</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-8 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <button onClick={prevMonth} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition text-lg font-bold text-gray-600 dark:text-gray-300">‹</button>
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-white text-lg">{monthName}</p>
            {isCurrentMonth && <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 px-2 py-0.5 rounded-full">Current Month</span>}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} className={`w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition text-lg font-bold ${isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600'}`}>›</button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">↑ Income</p>
            <p className="text-2xl font-bold text-green-600">{currencySymbol}{totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">↓ Spent</p>
            <p className="text-2xl font-bold text-red-500">{currencySymbol}{total.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">= Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>{balance >= 0 ? '+' : ''}{currencySymbol}{balance.toFixed(2)}</p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Export {monthName} Report</h2>
          <p className="text-gray-400 text-sm mb-4">Download your financial data in your preferred format</p>
          <div className="flex gap-3">
            <button onClick={exportPDF} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
              📄 Download PDF
            </button>
            <button onClick={exportCSV} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2">
              📊 Download CSV
            </button>
          </div>
        </div>

        {/* Charts */}
        {categoryData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => `${currencySymbol}${v.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Category Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => `${currencySymbol}${v.toFixed(2)}`} />
                  <Bar dataKey="value" fill="#4F46E5" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Expense Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">All Expenses — {monthName}</h3>
          {monthExpenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><p className="text-4xl mb-2">📭</p><p>No expenses for {monthName}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Category</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Description</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {monthExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-2 text-gray-500">{e.date?.split('T')[0]}</td>
                      <td className="py-3 px-2"><span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full text-xs">{e.category}</span></td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{e.description || '—'}</td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-800 dark:text-white">{currencySymbol}{parseFloat(e.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                    <td colSpan={3} className="py-3 px-2 font-bold text-gray-800 dark:text-white">Total</td>
                    <td className="py-3 px-2 text-right font-bold text-red-500">{currencySymbol}{total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}