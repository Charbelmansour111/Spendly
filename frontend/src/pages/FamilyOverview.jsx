import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../hooks/useDarkMode'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

const BASE = 'https://spendly-backend-et20.onrender.com/api'
const SYM = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Bills: '💡', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦' }

const TABS = [
  { key: 'dashboard',    label: 'Dashboard',    icon: '📊' },
  { key: 'transactions', label: 'Transactions', icon: '💸' },
  { key: 'networth',     label: 'Net Worth',    icon: '📈' },
  { key: 'report',       label: 'Report',       icon: '📋' },
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
function DashboardTab({ summary, netWorth, breakdown, sym, navigate }) {
  const inc = parseFloat(summary.total_income   || 0)
  const exp = parseFloat(summary.total_expenses || 0)
  const net = inc - exp
  const rate = inc > 0 ? Math.round((Math.max(net, 0) / inc) * 100) : 0
  const spendPct = inc > 0 ? Math.min(Math.round((exp / inc) * 100), 100) : 0

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="bg-linear-to-br from-violet-600 to-purple-700 rounded-2xl p-5 shadow-lg text-white">
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-3">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} · All Wallets
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-white/60 text-xs mb-0.5">Combined Income</p>
            <p className="text-white text-2xl font-black tabular-nums">{fmt(inc, sym)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs mb-0.5">Combined Spent</p>
            <p className="text-white text-2xl font-black tabular-nums">{fmt(exp, sym)}</p>
          </div>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-white/70 rounded-full transition-all duration-700" style={{ width: `${spendPct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${net >= 0 ? 'bg-white/20' : 'bg-red-400/40'}`}>
            {net >= 0 ? `Family saved ${fmt(net, sym)}` : `Deficit ${fmt(Math.abs(net), sym)}`}
          </span>
          <span className="text-white/60 text-xs">{rate}% savings rate</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Income"       value={fmt(inc, sym)}                            icon="💰" color="text-emerald-600 dark:text-emerald-400" sub="All wallets · this month" />
        <StatCard label="Expenses"     value={fmt(exp, sym)}                            icon="💸" color="text-red-500 dark:text-red-400"         sub="All wallets · this month" />
        <StatCard label="Net Savings"  value={(net < 0 ? '-' : '') + fmt(Math.abs(net), sym)} icon="📊"
          color={net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
          sub={`${rate}% savings rate`} />
        <StatCard label="Goals Saved"  value={fmt(summary.total_savings, sym)}           icon="🎯" color="text-blue-600 dark:text-blue-400"      sub="Across all wallets" />
      </div>

      {/* Net Worth preview */}
      {netWorth && (
        <div className="bg-linear-to-br from-slate-800 to-slate-900 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Family Net Worth</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${netWorth.netWorth >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {netWorth.netWorth >= 0 ? '▲' : '▼'}
            </span>
          </div>
          <p className="text-white text-3xl font-black tabular-nums mb-3">
            {netWorth.netWorth < 0 ? '-' : ''}{fmt(Math.abs(netWorth.netWorth), sym)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-white/50 text-[10px] mb-0.5">Assets</p>
              <p className="text-emerald-400 font-bold text-sm tabular-nums">{fmt(netWorth.totalAssets, sym)}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-white/50 text-[10px] mb-0.5">Liabilities</p>
              <p className="text-red-400 font-bold text-sm tabular-nums">{fmt(netWorth.totalLiabilities, sym)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Per-wallet breakdown */}
      {breakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">Wallet Breakdown</p>
          <div className="space-y-3">
            {breakdown.map(w => {
              const wColor = getWalletColor(w.color)
              const wNet = w.income - w.expenses
              const wPct = w.income > 0 ? Math.min(Math.round((w.expenses / w.income) * 100), 100) : 0
              return (
                <button key={w.id} onClick={() => navigate(`/wallet/${w.id}/app`)}
                  className="w-full text-left group">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-linear-to-br ${wColor.gradient}`}>
                      <img src={getAvatarUrl(w)} alt={w.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">{w.name}</p>
                        <span className={`text-xs font-bold tabular-nums shrink-0 ml-2 ${wNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {wNet >= 0 ? '+' : '-'}{fmt(Math.abs(wNet), sym)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>In: {fmt(w.income, sym)}</span>
                        <span>·</span>
                        <span>Out: {fmt(w.expenses, sym)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden ml-11">
                    <div className={`h-full bg-linear-to-r ${wColor.gradient} rounded-full transition-all duration-700`} style={{ width: `${wPct}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {summary.category_breakdown?.length > 0 && (
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
                    <div className="h-full bg-linear-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 6-month trend */}
      {summary.monthly_trend?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">6-Month Spending Trend</p>
          <div className="flex items-end gap-2 h-20">
            {(() => {
              const max = Math.max(...summary.monthly_trend.map(m => parseFloat(m.total)), 1)
              return summary.monthly_trend.map(m => {
                const pct = (parseFloat(m.total) / max) * 100
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-linear-to-t from-violet-600 to-violet-400 rounded-t-lg transition-all duration-700" style={{ height: `${Math.max(pct, 4)}%` }} />
                    <span className="text-gray-400 dark:text-gray-500 text-[9px] font-medium">{m.month.slice(5)}</span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30 rounded-xl p-3">
        <span className="text-gray-400 text-sm shrink-0">🔒</span>
        <p className="text-gray-400 text-xs leading-relaxed">
          Family Overview shows combined totals only. Tap any wallet to view its full details.
        </p>
      </div>
    </div>
  )
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function TransactionsTab({ transactions, incomeItems, sym }) {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('expenses')

  const raw =
    mode === 'expenses' ? transactions.map(t => ({ ...t, txType: 'expense' }))
    : mode === 'income'  ? incomeItems.map(i => ({ ...i, txType: 'income', date: `${i.year}-${String(i.month).padStart(2,'0')}-01` }))
    : [
        ...transactions.map(t => ({ ...t, txType: 'expense' })),
        ...incomeItems.map(i => ({ ...i, txType: 'income', date: `${i.year}-${String(i.month).padStart(2,'0')}-01` }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const filtered = raw.filter(tx => {
    if (!search) return true
    const q = search.toLowerCase()
    return (tx.description || '').toLowerCase().includes(q)
      || (tx.category || '').toLowerCase().includes(q)
      || (tx.source || '').toLowerCase().includes(q)
      || (tx.wallet_name || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
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
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all transactions…"
          className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700/50">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <div className="px-4 pt-4 pb-2.5 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50">
            <p className="text-sm font-bold text-gray-800 dark:text-white">All Transactions</p>
            <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 px-2.5 py-1 rounded-full font-medium">{filtered.length}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {filtered.map((tx, i) => {
              const wc = getWalletColor(tx.wallet_color)
              return (
                <div key={tx.id || i} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${tx.txType === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-100 dark:bg-gray-700/70'}`}>
                    {tx.txType === 'income' ? '💰' : (CAT_ICONS[tx.category] || '📦')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                      {tx.txType === 'income' ? (tx.source || 'Income') : (tx.category || 'Expense')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full bg-linear-to-br ${wc.gradient} shrink-0`} />
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{tx.wallet_name}</p>
                      <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
                      <p className="text-xs text-gray-400 shrink-0">{fmtDate(tx.date)}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold tabular-nums shrink-0 ${tx.txType === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {tx.txType === 'income' ? '+' : '-'}{fmt(tx.amount, sym)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Net Worth Tab ─────────────────────────────────────────────────────────────
function NetWorthTab({ netWorth, sym }) {
  if (!netWorth) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-14 text-center border border-gray-100 dark:border-gray-700/50">
        <p className="text-5xl mb-3">📈</p>
        <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No net worth data yet</p>
        <p className="text-gray-400 text-sm">Add assets and income across wallets to see the combined picture.</p>
      </div>
    )
  }

  const isPos = netWorth.netWorth >= 0
  const ta = parseFloat(netWorth.totalAssets || 0)
  const tl = parseFloat(netWorth.totalLiabilities || 0)
  const assetPct = ta + tl > 0 ? Math.round((ta / (ta + tl)) * 100) : 100
  const items = netWorth.items || []
  const assets = items.filter(i => i.type === 'asset')
  const liabilities = items.filter(i => i.type === 'liability')

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className={`${isPos ? 'bg-linear-to-br from-emerald-500 to-teal-600' : 'bg-linear-to-br from-red-500 to-rose-600'} rounded-2xl p-6 shadow-md text-center`}>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">Family Net Worth</p>
        <p className="text-white text-4xl font-black tabular-nums mb-1">
          {netWorth.netWorth < 0 ? '-' : ''}{fmt(Math.abs(netWorth.netWorth), sym)}
        </p>
        <p className="text-white/60 text-sm">{isPos ? 'Assets exceed liabilities ✓' : 'Liabilities exceed assets'}</p>
        <div className="mt-5 h-2.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/60 rounded-full transition-all" style={{ width: `${assetPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-white/60 font-medium">
          <span>Assets {assetPct}%</span>
          <span>Liabilities {100 - assetPct}%</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-base mb-2">📈</div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Assets</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">{fmt(ta, sym)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{assets.length} item{assets.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-base mb-2">📉</div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Liabilities</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 tabular-nums mt-1">{fmt(tl, sym)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{liabilities.length} item{liabilities.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Cash balance */}
      {netWorth.cashBalance !== undefined && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl shrink-0">💵</div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Combined Cash Balance</p>
            <p className={`text-lg font-bold tabular-nums ${netWorth.cashBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
              {netWorth.cashBalance < 0 ? '-' : ''}{fmt(Math.abs(netWorth.cashBalance), sym)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Total income − total expenses across all wallets</p>
          </div>
        </div>
      )}

      {/* Assets list */}
      {assets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">Assets</p>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {assets.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(item.amount, sym)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liabilities list */}
      {liabilities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-3">Liabilities</p>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {liabilities.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
                <p className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums">{fmt(item.amount, sym)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 pb-1">Combines wallet cash + savings + debts + your global net worth items</p>
    </div>
  )
}

// ── Report Tab ────────────────────────────────────────────────────────────────
function ReportTab({ summary, breakdown, sym }) {
  const inc = parseFloat(summary.total_income   || 0)
  const exp = parseFloat(summary.total_expenses || 0)
  const net = inc - exp
  const rate = inc > 0 ? Math.round((Math.max(net, 0) / inc) * 100) : 0
  const spendPct = inc > 0 ? Math.min(Math.round((exp / inc) * 100), 100) : 0
  const now = new Date()

  return (
    <div className="space-y-4">
      {/* Overview card */}
      <div className="bg-linear-to-br from-slate-800 to-slate-900 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 shadow-md">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">
          {now.toLocaleString('default', { month: 'long', year: 'numeric' })} · All Wallets
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
            <span className="text-white/60 text-xs">family savings rate</span>
          </div>
          <p className="text-white/40 text-xs leading-tight">{rate >= 20 ? 'Excellent family finance!' : rate > 0 ? 'Room to improve' : 'Spending exceeds income'}</p>
        </div>
      </div>

      {/* Per-wallet contribution */}
      {breakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-4">Per-Wallet Spending</p>
          <div className="space-y-2.5">
            {breakdown.map((w, i) => {
              const pct = exp > 0 ? Math.min((w.expenses / exp) * 100, 100) : 0
              const wColor = getWalletColor(w.color)
              return (
                <div key={w.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg overflow-hidden shrink-0 bg-linear-to-br ${wColor.gradient}`}>
                    <img src={getAvatarUrl(w)} alt={w.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{w.name}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-linear-to-r ${wColor.gradient} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 tabular-nums w-20 text-right shrink-0">{fmt(w.expenses, sym)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {summary.category_breakdown?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-800 dark:text-white">Category Breakdown</p>
            <span className="text-xs text-gray-400">{summary.category_breakdown.length} categories</span>
          </div>
          <div className="space-y-3">
            {summary.category_breakdown.map((cat, i) => {
              const total = parseFloat(cat.total)
              const pct = exp > 0 ? Math.min((total / exp) * 100, 100) : 0
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center shrink-0">{CAT_ICONS[cat.category] || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{cat.category}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `hsl(${260 - i * 22},65%,58%)` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 tabular-nums w-20 text-right shrink-0">{fmt(total, sym)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {summary.monthly_trend?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-4">Monthly Spending</p>
          <div className="space-y-2.5">
            {(() => {
              const max = Math.max(...summary.monthly_trend.map(m => parseFloat(m.total)), 1)
              return summary.monthly_trend.map(m => {
                const pct = (parseFloat(m.total) / max) * 100
                const label = new Date(m.month + '-01').toLocaleString('default', { month: 'short', year: '2-digit' })
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-12 font-medium shrink-0">{label}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div className="h-full bg-linear-to-r from-violet-500 to-purple-600 rounded-lg flex items-center transition-all duration-700"
                        style={{ width: `${Math.max(pct, 2)}%`, minWidth: 4 }}>
                        {pct > 35 && <span className="text-white text-[9px] font-bold ml-2 truncate">{fmt(parseFloat(m.total), sym)}</span>}
                      </div>
                    </div>
                    {pct <= 35 && (
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-20 text-right tabular-nums shrink-0">{fmt(parseFloat(m.total), sym)}</span>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FamilyOverview() {
  const navigate = useNavigate()
  const { wallets } = useWallet()
  const [dark, toggleDark] = useDarkMode()
  const token = localStorage.getItem('token')
  const sym = SYM[localStorage.getItem('currency') || 'USD'] || '$'

  const [summary, setSummary]         = useState(null)
  const [transactions, setTransactions] = useState([])
  const [incomeItems, setIncomeItems] = useState([])
  const [netWorth, setNetWorth]       = useState(null)
  const [breakdown, setBreakdown]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [activeTab, setActiveTab]     = useState('dashboard')

  const personalWallets = wallets.filter(w => !w.is_total_wallet)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${BASE}/wallets/total/summary`,      { headers: h }).then(r => r.json()),
      fetch(`${BASE}/wallets/total/transactions`, { headers: h }).then(r => r.json()),
      fetch(`${BASE}/wallets/total/networth`,     { headers: h }).then(r => r.json()),
      fetch(`${BASE}/wallets/total/breakdown`,    { headers: h }).then(r => r.json()),
      fetch(`${BASE}/wallets/total/income`,       { headers: h }).then(r => r.json()),
    ])
      .then(([s, tx, nw, bd, inc]) => {
        if (!s?.message) setSummary(s)
        setTransactions(Array.isArray(tx) ? tx : [])
        if (nw && !nw.message) setNetWorth(nw)
        setBreakdown(Array.isArray(bd) ? bd : [])
        setIncomeItems(Array.isArray(inc) ? inc : [])
      })
      .catch(() => setError('Failed to load family data'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/wallets')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm shadow-sm shrink-0">
              👨‍👩‍👧‍👦
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Family Overview</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {personalWallets.length} wallet{personalWallets.length !== 1 ? 's' : ''} · Combined
              </p>
            </div>
          </div>

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
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}>
                <span className="text-base leading-none">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {!loading && summary && (
          <>
            {activeTab === 'dashboard'    && <DashboardTab    summary={summary} netWorth={netWorth} breakdown={breakdown} sym={sym} navigate={navigate} />}
            {activeTab === 'transactions' && <TransactionsTab transactions={transactions} incomeItems={incomeItems} sym={sym} />}
            {activeTab === 'networth'     && <NetWorthTab     netWorth={netWorth} sym={sym} />}
            {activeTab === 'report'       && <ReportTab       summary={summary} breakdown={breakdown} sym={sym} />}
          </>
        )}

        {!loading && !summary && !error && (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">👨‍👩‍👧‍👦</p>
            <p className="font-semibold text-gray-600 dark:text-gray-300 text-lg">No wallet data yet</p>
            <p className="text-sm mt-2 mb-6">Create personal wallets and add transactions to see the family overview.</p>
            <button onClick={() => navigate('/create-wallet')}
              className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition">
              Create a Wallet
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
