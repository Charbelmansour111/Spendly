import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDarkMode } from '../hooks/useDarkMode'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor } from '../data/avatars'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const BASE = 'https://spendly-backend-et20.onrender.com/api'
const SYM = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Bills: '💡', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦', Salary: '💼', Freelance: '🖥️', Business: '🏢', Investment: '📈', Rental: '🏠' }

const TABS = [
  { key: 'dashboard',    label: 'Dashboard',    icon: '📊' },
  { key: 'transactions', label: 'Transactions', icon: '💸' },
  { key: 'reports',      label: 'Reports',      icon: '📋' },
  { key: 'networth',     label: 'Net Worth',    icon: '📈' },
]

function fmt(v, sym) {
  return sym + Math.abs(parseFloat(v || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d), now = new Date()
  const diff = Math.floor((now - dt) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Shared components ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">{label}</p>
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ summary, networth, expenses, sym, hex }) {
  const inc = parseFloat(summary?.total_income || 0)
  const exp = parseFloat(summary?.total_expenses || 0)
  const net = inc - exp
  const savingsRate = inc > 0 ? Math.round((Math.max(net, 0) / inc) * 100) : 0
  const spendPct = inc > 0 ? Math.min(Math.round((exp / inc) * 100), 100) : 0

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="rounded-2xl p-5 shadow-md text-white" style={{ background: `linear-gradient(135deg, ${hex}cc, ${hex})` }}>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-3">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-white/60 text-xs mb-0.5">Income</p>
            <p className="text-white text-2xl font-black tabular-nums">{fmt(inc, sym)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs mb-0.5">Spent</p>
            <p className="text-white text-2xl font-black tabular-nums">{fmt(exp, sym)}</p>
          </div>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-white/70 rounded-full transition-all duration-700" style={{ width: `${spendPct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${net >= 0 ? 'bg-white/20' : 'bg-red-500/40'}`}>
            {net >= 0 ? `Saved ${fmt(net, sym)}` : `Deficit ${fmt(Math.abs(net), sym)}`}
          </span>
          <span className="text-white/60 text-xs">{spendPct}% of income spent</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Income" value={fmt(inc, sym)} icon="💰" color="text-emerald-600 dark:text-emerald-400" sub="This month" />
        <StatCard label="Expenses" value={fmt(exp, sym)} icon="💸" color="text-red-500 dark:text-red-400" sub="This month" />
        <StatCard label="Savings Goals" value={fmt(summary?.total_savings || 0, sym)} icon="🎯" color="text-blue-600 dark:text-blue-400" sub="Total saved" />
        <StatCard
          label="Net Worth"
          value={(networth?.netWorth < 0 ? '-' : '') + fmt(Math.abs(networth?.netWorth || 0), sym)}
          icon="📈"
          color={(networth?.netWorth || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
          sub="Assets − debts"
        />
      </div>

      {/* Category breakdown */}
      {summary?.category_breakdown?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">Spending by Category</p>
          <div className="space-y-3">
            {summary.category_breakdown.slice(0, 7).map(cat => {
              const total = parseFloat(cat.total)
              const pct = exp > 0 ? Math.min((total / exp) * 100, 100) : 0
              return (
                <div key={cat.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <span>{CAT_ICONS[cat.category] || '📦'}</span>{cat.category}
                    </span>
                    <span className="text-gray-400">{fmt(total, sym)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: hex }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 6-month bar chart */}
      {summary?.monthly_trend?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">6-Month Trend</p>
          <div className="flex items-end gap-2 h-20">
            {(() => {
              const max = Math.max(...summary.monthly_trend.map(m => parseFloat(m.total)), 1)
              return summary.monthly_trend.map(m => {
                const pct = (parseFloat(m.total) / max) * 100
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg transition-all duration-700" style={{ height: `${Math.max(pct, 4)}%`, background: `${hex}cc` }} />
                    <span className="text-gray-400 dark:text-gray-500 text-[9px] font-medium">{m.month.slice(5)}</span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      {expenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="px-4 pt-4 pb-2.5 border-b border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800 dark:text-white">Recent Expenses</p>
            <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full">Last {Math.min(expenses.length, 5)}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {expenses.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
                  {CAT_ICONS[tx.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{tx.description || tx.category}</p>
                  <p className="text-xs text-gray-400">{fmtDate(tx.date)} · {tx.category}</p>
                </div>
                <p className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums shrink-0">-{fmt(tx.amount, sym)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function TransactionsTab({ expenses, income, sym }) {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('expenses')

  const raw =
    mode === 'expenses' ? expenses.map(e => ({ ...e, txType: 'expense' }))
    : mode === 'income'  ? income.map(i => ({ ...i, txType: 'income', date: `${i.year}-${String(i.month).padStart(2,'0')}-01`, category: i.source || 'Other' }))
    : [
        ...expenses.map(e => ({ ...e, txType: 'expense' })),
        ...income.map(i => ({ ...i, txType: 'income', date: `${i.year}-${String(i.month).padStart(2,'0')}-01`, category: i.source || 'Other' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const filtered = raw.filter(tx => {
    if (!search) return true
    const q = search.toLowerCase()
    return (tx.description || '').toLowerCase().includes(q)
      || (tx.category || '').toLowerCase().includes(q)
      || (tx.source || '').toLowerCase().includes(q)
  })

  const totalAmt = filtered.reduce((s, tx) => tx.txType === 'income' ? s + parseFloat(tx.amount) : s - parseFloat(tx.amount), 0)

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {[['expenses','💸 Expenses'],['income','💰 Income'],['all','📋 All']].map(([k,l]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${mode === k ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>}
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-400">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          <span className={`text-xs font-bold tabular-nums ${totalAmt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {totalAmt >= 0 ? '+' : ''}{fmt(totalAmt, sym)}
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700/50">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {filtered.map((tx, i) => (
              <div key={tx.id || i} className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${tx.txType === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {tx.txType === 'income' ? (CAT_ICONS[tx.source] || '💰') : (CAT_ICONS[tx.category] || '📦')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                    {tx.txType === 'income' ? (tx.source || 'Income') : (tx.description || tx.category)}
                  </p>
                  <p className="text-xs text-gray-400">{fmtDate(tx.date)}{tx.txType === 'expense' && tx.category ? ` · ${tx.category}` : ''}</p>
                </div>
                <p className={`text-sm font-bold tabular-nums shrink-0 ${tx.txType === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {tx.txType === 'income' ? '+' : '-'}{fmt(tx.amount, sym)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PIE_COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#DB2777','#0891B2','#65A30D','#7C3AED','#EA580C']
const EXPENSE_CATS = ['Food','Coffee','Transport','Shopping','Entertainment','Health','Fitness','Education','Bills','Travel','Gifts','Subscriptions','Other']
const INCOME_SOURCES = ['Salary','Freelance','Business','Investment','Rental','Other']

// ── Add Transaction Modal ─────────────────────────────────────────────────────
function AddModal({ walletId, token, hex, sym, onClose, onSaved }) {
  const [type, setType]             = useState('expense')
  const [amount, setAmount]         = useState('')
  const [category, setCategory]     = useState('Food')
  const [source, setSource]         = useState('Salary')
  const [description, setDescription] = useState('')
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')

  const now = new Date()

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid amount'); return }
    setSaving(true); setErr('')
    try {
      const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      if (type === 'expense') {
        const r = await fetch(`${BASE}/wallets/${walletId}/expenses`, {
          method: 'POST', headers: h,
          body: JSON.stringify({ amount: parseFloat(amount), category, description, date }),
        })
        if (!r.ok) throw new Error()
      } else {
        const r = await fetch(`${BASE}/wallets/${walletId}/income`, {
          method: 'POST', headers: h,
          body: JSON.stringify({ amount: parseFloat(amount), source, description, month: now.getMonth() + 1, year: now.getFullYear() }),
        })
        if (!r.ok) throw new Error()
      }
      onSaved()
    } catch { setErr('Failed to save — try again') }
    finally   { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full"/>
        </div>
        <div className="px-5 pt-2 pb-10">
          {/* Type toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-5">
            {[['expense','💸 Expense'],['income','💰 Income']].map(([k,l]) => (
              <button key={k} onClick={() => setType(k)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${type===k ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-300 pointer-events-none">{sym}</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0" step="0.01" autoFocus
                className="w-full pl-10 pr-4 py-3.5 text-2xl font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-transparent focus:ring-2 tabular-nums"
                style={{ '--tw-ring-color': hex + '80' }} />
            </div>
          </div>

          {/* Category / Source */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              {type === 'expense' ? 'Category' : 'Source'}
            </label>
            <select value={type === 'expense' ? category : source}
              onChange={e => type === 'expense' ? setCategory(e.target.value) : setSource(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': hex + '80' }}>
              {(type === 'expense' ? EXPENSE_CATS : INCOME_SOURCES).map(o => (
                <option key={o} value={o}>{CAT_ICONS[o] || '📦'} {o}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Description <span className="text-gray-300 dark:text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Add a note…"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': hex + '80' }} />
          </div>

          {/* Date (expense only) */}
          {type === 'expense' && (
            <div className="mb-5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': hex + '80' }} />
            </div>
          )}

          {err && <p className="text-red-500 dark:text-red-400 text-sm mb-3">{err}</p>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition active:scale-95 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${hex}dd, ${hex})` }}>
            {saving ? 'Saving…' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ summary, expenses, sym, hex }) {
  const inc = parseFloat(summary?.total_income || 0)
  const exp = parseFloat(summary?.total_expenses || 0)
  const net = inc - exp
  const rate = inc > 0 ? Math.round((Math.max(net, 0) / inc) * 100) : 0
  const spendPct = inc > 0 ? Math.min(Math.round((exp / inc) * 100), 100) : 0
  const now = new Date()

  // Compute category breakdown from full expenses array as fallback
  const localCats = (expenses || []).length > 0
    ? Object.entries(
        (expenses || []).reduce((acc, e) => {
          const cat = e.category || 'Other'
          acc[cat] = (acc[cat] || 0) + parseFloat(e.amount || 0)
          return acc
        }, {})
      ).map(([category, total]) => ({ category, total: String(total) }))
        .sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
    : []

  const catBreakdown = (summary?.category_breakdown?.length > 0)
    ? summary.category_breakdown
    : localCats

  const usingAllTime = summary?.category_breakdown?.length === 0 && localCats.length > 0

  // Compute monthly trend from expenses array as fallback
  const localTrend = (expenses || []).length > 0
    ? Object.entries(
        (expenses || []).reduce((acc, e) => {
          if (!e.date) return acc
          const mo = String(e.date).slice(0, 7)
          acc[mo] = (acc[mo] || 0) + parseFloat(e.amount || 0)
          return acc
        }, {})
      ).map(([month, total]) => ({ month, total: String(total) }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6)
    : []

  const monthlyTrend = (summary?.monthly_trend?.length > 0)
    ? summary.monthly_trend
    : localTrend

  const pieData = catBreakdown.map(cat => ({
    name: cat.category,
    value: parseFloat(cat.total)
  }))

  const barData = monthlyTrend.map(m => ({
    month: new Date(m.month + '-01').toLocaleString('default', { month: 'short', year: '2-digit' }),
    amount: parseFloat(m.total)
  }))

  return (
    <div className="space-y-4">
      {/* Overview card */}
      <div className="bg-linear-to-br from-slate-800 to-slate-900 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 shadow-md">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">
          {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
        <p className="text-white text-2xl font-black mb-5">{fmt(exp, sym)} <span className="text-white/40 text-base font-normal">spent</span></p>
        <div className="space-y-3">
          {[
            { label: 'Income', color: 'bg-emerald-400', textColor: 'text-emerald-400', value: fmt(inc, sym), pct: 100 },
            { label: 'Expenses', color: 'bg-red-400', textColor: 'text-red-400', value: fmt(exp, sym), pct: spendPct },
            { label: 'Saved', color: 'bg-blue-400', textColor: net >= 0 ? 'text-blue-300' : 'text-red-400', value: (net < 0 ? '-' : '') + fmt(Math.abs(net), sym), pct: Math.min(rate, 100) },
          ].map(row => (
            <div key={row.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className={`${row.textColor} font-bold flex items-center gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${row.color}`} />{row.label}
                </span>
                <span className={`font-bold ${row.textColor}`}>{row.value}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${row.color} rounded-full transition-all duration-700`} style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${rate >= 20 ? 'bg-emerald-500/20 border border-emerald-500/30' : rate > 0 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <span className={`text-2xl font-black tabular-nums ${rate >= 20 ? 'text-emerald-400' : rate > 0 ? 'text-amber-400' : 'text-red-400'}`}>{rate}%</span>
            <span className="text-white/60 text-xs">savings rate</span>
          </div>
          <p className="text-white/40 text-xs">{rate >= 20 ? 'Excellent work!' : rate > 0 ? 'Room to grow' : 'Spending > income'}</p>
        </div>
      </div>

      {/* Donut chart — category distribution */}
      {pieData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-4">Spending Distribution</p>
          <div className="flex items-center gap-4">
            <div style={{ width: 140, height: 140, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip formatter={(v) => fmt(v, sym)} contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {pieData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{d.name}</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums shrink-0">{exp > 0 ? ((d.value / exp) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
              {pieData.length > 6 && <p className="text-[10px] text-gray-400">+{pieData.length - 6} more</p>}
            </div>
          </div>
        </div>
      )}

      {/* Category breakdown bars */}
      {catBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-800 dark:text-white">Category Breakdown</p>
            <span className="text-xs text-gray-400">
              {usingAllTime ? 'All time' : 'This month'} · {catBreakdown.length} categories
            </span>
          </div>
          <div className="space-y-3">
            {catBreakdown.map((cat, i) => {
              const total = parseFloat(cat.total)
              const catTotal = catBreakdown.reduce((s, c) => s + parseFloat(c.total), 0)
              const pct = catTotal > 0 ? Math.min((total / catTotal) * 100, 100) : 0
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center shrink-0">{CAT_ICONS[cat.category] || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{cat.category}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 tabular-nums w-20 text-right shrink-0">{fmt(total, sym)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly spending bar chart */}
      {barData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-4">Monthly Spending</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => sym + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
              <RTooltip formatter={(v) => [fmt(v, sym), 'Spent']} contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }} cursor={{ fill: 'rgba(0,0,0,.04)' }} />
              <Bar dataKey="amount" fill={hex} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {catBreakdown.length === 0 && barData.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700/50">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No report data yet</p>
          <p className="text-gray-400 text-sm mt-1">Add expenses to see your spending report.</p>
        </div>
      )}
    </div>
  )
}

// ── Net Worth Tab ─────────────────────────────────────────────────────────────
function NetWorthTab({ networth, sym }) {
  if (!networth) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-14 text-center border border-gray-100 dark:border-gray-700/50">
        <p className="text-5xl mb-3">📈</p>
        <p className="font-semibold text-gray-700 dark:text-gray-200">No data yet</p>
        <p className="text-gray-400 text-sm mt-1">Add income and expenses to track your net worth.</p>
      </div>
    )
  }

  const isPos = networth.netWorth >= 0
  const ta = parseFloat(networth.totalAssets || 0)
  const tl = parseFloat(networth.totalLiabilities || 0)
  const assetPct = ta + tl > 0 ? Math.round((ta / (ta + tl)) * 100) : 100

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className={`${isPos ? 'bg-linear-to-br from-emerald-500 to-teal-600' : 'bg-linear-to-br from-red-500 to-rose-600'} rounded-2xl p-6 shadow-md text-center`}>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">Wallet Net Worth</p>
        <p className="text-white text-4xl font-black tabular-nums mb-1">
          {networth.netWorth < 0 ? '-' : ''}{fmt(Math.abs(networth.netWorth), sym)}
        </p>
        <p className="text-white/60 text-sm">{isPos ? 'Assets exceed liabilities ✓' : 'Liabilities exceed assets'}</p>
        <div className="mt-5 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/60 rounded-full transition-all duration-700" style={{ width: `${assetPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-white/60 font-medium">
          <span>Assets {assetPct}%</span>
          <span>Liabilities {100 - assetPct}%</span>
        </div>
      </div>

      {/* Assets / Liabilities mini cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-base mb-2">📈</div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Assets</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">{fmt(ta, sym)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-base mb-2">📉</div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Debts</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 tabular-nums mt-1">{fmt(tl, sym)}</p>
        </div>
      </div>

      {/* Cash balance */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl shrink-0">💵</div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cash Balance</p>
          <p className={`text-lg font-bold tabular-nums ${networth.cashBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
            {networth.cashBalance < 0 ? '-' : ''}{fmt(Math.abs(networth.cashBalance), sym)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">All-time income minus all-time expenses</p>
        </div>
      </div>

      {/* Savings goals */}
      {networth.savings?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">Savings Goals</p>
          <div className="space-y-3">
            {networth.savings.map(g => {
              const pct = parseFloat(g.target_amount) > 0 ? Math.min((parseFloat(g.saved_amount) / parseFloat(g.target_amount)) * 100, 100) : 0
              return (
                <div key={g.id}>
                  <div className="flex justify-between items-baseline text-xs mb-1.5">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{g.name}</span>
                    <span className="text-gray-400 shrink-0 ml-2">{fmt(g.saved_amount, sym)} / {fmt(g.target_amount, sym)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 text-right">{pct.toFixed(0)}% complete</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Debts */}
      {networth.debts?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-3">Active Debts</p>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {networth.debts.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.category}</p>
                </div>
                <p className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums">{fmt(d.remaining_amount, sym)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 py-1">Net worth is isolated to this wallet · Family Overview shows combined data</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WalletApp() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { wallets } = useWallet()
  const [dark, toggleDark] = useDarkMode()
  const token = localStorage.getItem('token')
  const sym = SYM[localStorage.getItem('currency') || 'USD'] || '$'

  const wallet = wallets.find(w => String(w.id) === String(id))
  const color = getWalletColor(wallet?.color)

  const [summary, setSummary]   = useState(null)
  const [expenses, setExpenses] = useState([])
  const [income, setIncome]     = useState([])
  const [networth, setNetworth] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAdd, setShowAdd]   = useState(false)
  const [refresh, setRefresh]   = useState(0)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!id) return
    setLoading(true)
    setError('')
    const h = { Authorization: `Bearer ${token}` }

    const safeGet = (url, fallback) =>
      fetch(url, { headers: h })
        .then(r => r.ok ? r.json().catch(() => fallback) : r.json().catch(() => fallback))
        .catch(() => fallback)

    Promise.all([
      safeGet(`${BASE}/wallets/${id}/summary`,  null),
      safeGet(`${BASE}/wallets/${id}/expenses`, []),
      safeGet(`${BASE}/wallets/${id}/income`,   []),
      safeGet(`${BASE}/wallets/${id}/networth`, null),
    ])
      .then(([s, exp, inc, nw]) => {
        if (s?.message === 'Not your wallet') { navigate('/wallets'); return }
        setSummary(s && !s.message ? s : null)
        setExpenses(Array.isArray(exp) ? exp : [])
        setIncome(Array.isArray(inc) ? inc : [])
        if (nw && !nw.message) setNetworth(nw)
      })
      .catch(() => setError('Could not connect to server — check your connection'))
      .finally(() => setLoading(false))
  }, [id, token, navigate, refresh])

  const activeTabStyle = { color: color.hex, borderColor: color.hex }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm">
        {/* Top bar */}
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/wallets')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {wallet ? (
              <>
                <div className={`w-8 h-8 rounded-xl overflow-hidden shrink-0 bg-linear-to-br ${color.gradient}`}>
                  <img src={getAvatarUrl(wallet)} alt={wallet.name} className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{wallet.name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{color.label} · Personal Wallet</p>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-900 dark:text-white">Wallet</p>
            )}
          </div>

          <button onClick={() => navigate(`/wallet/${id}/profile`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>

          <button onClick={toggleDark}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0 text-base">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto border-t border-gray-100 dark:border-gray-800">
          <div className="flex">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold border-b-2 transition-all"
                style={activeTab === tab.key ? activeTabStyle : { borderColor: 'transparent', color: '' }}
              >
                <span className={`text-base leading-none ${activeTab !== tab.key ? 'opacity-50' : ''}`}>{tab.icon}</span>
                <span className={activeTab !== tab.key ? 'text-gray-400 dark:text-gray-500' : ''}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 rounded-full animate-spin" style={{ borderTopColor: color.hex }} />
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {!loading && summary && (
          <>
            {activeTab === 'dashboard'    && <DashboardTab    summary={summary} networth={networth} expenses={expenses} sym={sym} hex={color.hex} />}
            {activeTab === 'transactions' && <TransactionsTab expenses={expenses} income={income} sym={sym} />}
            {activeTab === 'reports'      && <ReportsTab      summary={summary} expenses={expenses} sym={sym} hex={color.hex} />}
            {activeTab === 'networth'     && <NetWorthTab     networth={networth} sym={sym} />}
          </>
        )}

        {!loading && !summary && !error && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">💼</p>
            <p className="font-semibold text-gray-600 dark:text-gray-300 text-lg">No data yet</p>
            <p className="text-sm mt-2 mb-6">Tap + to add your first transaction to this wallet.</p>
            <button onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm transition active:scale-95"
              style={{ background: `linear-gradient(135deg, ${color.hex}cc, ${color.hex})` }}>
              <span className="text-lg">+</span> Add Transaction
            </button>
          </div>
        )}
      </main>

      {/* ── FAB ── */}
      {!loading && (
        <button onClick={() => setShowAdd(true)}
          className="fixed bottom-6 right-5 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white text-3xl font-light transition active:scale-95 z-20"
          style={{ background: `linear-gradient(135deg, ${color.hex}cc, ${color.hex})`, boxShadow: `0 8px 30px ${color.hex}55` }}>
          +
        </button>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <AddModal
          walletId={id}
          token={token}
          hex={color.hex}
          sym={sym}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); setRefresh(r => r + 1) }}
        />
      )}
    </div>
  )
}
