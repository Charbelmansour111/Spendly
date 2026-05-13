import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../hooks/useDarkMode'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

const BASE = 'https://spendly-backend-et20.onrender.com/api'
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Bills: '💡', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦' }

const TABS = [
  { key: 'dashboard',    label: 'Dashboard',    icon: '📊' },
  { key: 'transactions', label: 'Transactions', icon: '💸' },
  { key: 'networth',     label: 'Net Worth',    icon: '📈' },
  { key: 'report',       label: 'Report',       icon: '📋' },
]

function fmt(amount, sym) {
  return sym + Math.abs(parseFloat(amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ summary, netWorth, personalWallets, sym }) {
  const income   = parseFloat(summary.total_income   || 0)
  const expenses = parseFloat(summary.total_expenses || 0)
  const savings  = income - expenses
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : 0

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Income"        value={fmt(income, sym)}                 icon="💰" color="text-emerald-600 dark:text-emerald-400" sub="All wallets · this month" />
        <StatCard label="Expenses"      value={fmt(expenses, sym)}               icon="💸" color="text-red-500 dark:text-red-400"         sub="All wallets · this month" />
        <StatCard label="Net Savings"   value={fmt(Math.abs(savings), sym)}      icon="📊"
          color={savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
          sub={`${savingsRate}% savings rate`} />
        <StatCard label="Savings Goals" value={fmt(summary.total_savings, sym)}  icon="🎯" color="text-blue-600 dark:text-blue-400"      sub="Across all goals" />
      </div>

      {/* Net worth quick card */}
      {netWorth && (
        <div className="bg-linear-to-br from-violet-600 to-purple-700 rounded-2xl p-5 shadow-md">
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">Net Worth</p>
          <p className="text-white text-3xl font-black tabular-nums mb-4">
            {netWorth.netWorth < 0 ? '-' : ''}{fmt(Math.abs(netWorth.netWorth), sym)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-xl px-3 py-2.5">
              <p className="text-white/60 text-[10px] mb-0.5">Total Assets</p>
              <p className="text-white font-bold text-sm tabular-nums">{fmt(netWorth.totalAssets, sym)}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2.5">
              <p className="text-white/60 text-[10px] mb-0.5">Total Liabilities</p>
              <p className="text-white font-bold text-sm tabular-nums">{fmt(netWorth.totalLiabilities, sym)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Wallets included */}
      {personalWallets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Wallets Included</p>
          <div className="space-y-2.5">
            {personalWallets.map(w => {
              const color = getWalletColor(w.color)
              return (
                <div key={w.id} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-linear-to-br ${color.gradient} overflow-hidden shrink-0 flex items-center justify-center`}>
                    <img src={getAvatarUrl(w)} alt={w.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{w.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{w.color}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full bg-linear-to-br ${color.gradient}`} />
                </div>
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
            {summary.category_breakdown.slice(0, 6).map(cat => {
              const total = parseFloat(cat.total)
              const pct = expenses > 0 ? Math.min((total / expenses) * 100, 100) : 0
              return (
                <div key={cat.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <span>{CAT_ICONS[cat.category] || '📦'}</span>{cat.category}
                    </span>
                    <span className="text-gray-400">{fmt(total, sym)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-linear-to-r from-violet-500 to-violet-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
          <div className="flex items-end gap-2 h-24">
            {(() => {
              const max = Math.max(...summary.monthly_trend.map(m => parseFloat(m.total)), 1)
              return summary.monthly_trend.map(m => {
                const pct = (parseFloat(m.total) / max) * 100
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-linear-to-t from-violet-600 to-violet-400 rounded-t-lg" style={{ height: `${pct}%`, minHeight: 4 }} />
                    <span className="text-gray-400 dark:text-gray-500 text-[9px] font-medium">{m.month.slice(5)}</span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30 rounded-xl p-3">
        <span className="text-gray-400 text-sm shrink-0">🔒</span>
        <p className="text-gray-400 text-xs leading-relaxed">
          Family Overview shows combined totals only. Individual wallet details remain private and require their own PIN.
        </p>
      </div>
    </div>
  )
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function TransactionsTab({ transactions, sym }) {
  const [search, setSearch] = useState('')

  const filtered = transactions.filter(tx => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (tx.description || '').toLowerCase().includes(q) ||
      (tx.category || '').toLowerCase().includes(q) ||
      (tx.wallet_name || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search all transactions…"
          className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs">✕</button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700/50">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions found</p>
          {search && <p className="text-gray-400 text-sm mt-1">Try a different search term</p>}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <div className="px-4 pt-4 pb-2.5 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50">
            <p className="text-sm font-bold text-gray-800 dark:text-white">All Expenses</p>
            <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 px-2.5 py-1 rounded-full font-medium">{filtered.length} transactions</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {filtered.map(tx => {
              const walletColor = getWalletColor(tx.wallet_color)
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/70 flex items-center justify-center text-xl shrink-0">
                    {CAT_ICONS[tx.category] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Category name — no description */}
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                      {tx.category}
                    </p>
                    {/* Wallet name prominently with colored dot */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full bg-linear-to-br ${walletColor.gradient} shrink-0`} />
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{tx.wallet_name}</p>
                      <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
                      <p className="text-xs text-gray-400 shrink-0">{fmtDate(tx.date)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums shrink-0">
                    -{fmt(tx.amount, sym)}
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
        <p className="text-gray-400 text-sm mt-1">Add assets and liabilities from the Net Worth page.</p>
      </div>
    )
  }

  const items       = netWorth.items || []
  const assets      = items.filter(i => i.type === 'asset')
  const liabilities = items.filter(i => i.type === 'liability')
  const isPositive  = netWorth.netWorth >= 0
  const totalAssets = parseFloat(netWorth.totalAssets || 0)
  const totalLiab   = parseFloat(netWorth.totalLiabilities || 0)
  const total       = totalAssets + totalLiab || 1
  const assetPct    = Math.round((totalAssets / total) * 100)

  return (
    <div className="space-y-4">
      {/* Main net worth card */}
      <div className={`bg-linear-to-br ${isPositive ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'} rounded-2xl p-6 shadow-md text-center`}>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">Total Net Worth</p>
        <p className="text-white text-4xl font-black tabular-nums mb-1">
          {netWorth.netWorth < 0 ? '-' : ''}{fmt(Math.abs(netWorth.netWorth), sym)}
        </p>
        <p className="text-white/60 text-sm">{isPositive ? 'Assets exceed liabilities ✓' : 'Liabilities exceed assets'}</p>

        {/* Visual bar */}
        <div className="mt-5 h-2.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/60 rounded-full transition-all" style={{ width: `${assetPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-white/60 font-medium">
          <span>Assets {assetPct}%</span>
          <span>Liabilities {100 - assetPct}%</span>
        </div>
      </div>

      {/* Assets vs Liabilities cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-base mb-3">📈</div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assets</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">{fmt(totalAssets, sym)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{assets.length} item{assets.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-base mb-3">📉</div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Liabilities</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 tabular-nums mt-1">{fmt(totalLiab, sym)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{liabilities.length} item{liabilities.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Cash balance */}
      {netWorth.cashBalance !== undefined && parseFloat(netWorth.cashBalance) !== 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">💵</div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cash Balance</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{fmt(netWorth.cashBalance, sym)}</p>
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
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.name || item.label}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(item.value || item.amount, sym)}</p>
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
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.name || item.label}</p>
                <p className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums">{fmt(item.value || item.amount, sym)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Report Tab ────────────────────────────────────────────────────────────────
function ReportTab({ summary, sym }) {
  const income   = parseFloat(summary.total_income   || 0)
  const expenses = parseFloat(summary.total_expenses || 0)
  const savings  = income - expenses
  const savingsRate = income > 0 ? Math.round((savings / income) * 100)  : 0
  const spendPct    = income > 0 ? Math.min(Math.round((expenses / income) * 100), 100) : 0

  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Monthly overview card */}
      <div className="bg-linear-to-br from-slate-800 to-slate-900 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 shadow-md">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">{monthName}</p>
        <p className="text-white text-2xl font-black mb-5">{fmt(expenses, sym)} <span className="text-white/50 text-base font-medium">spent</span></p>

        <div className="space-y-3">
          {/* Income */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />Income
              </span>
              <span className="text-white font-bold">{fmt(income, sym)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
          {/* Expenses */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-red-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />Expenses
              </span>
              <span className="text-white font-bold">{fmt(expenses, sym)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full">
              <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${spendPct}%` }} />
            </div>
          </div>
          {/* Saved */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-blue-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />Saved
              </span>
              <span className={`font-bold ${savings >= 0 ? 'text-blue-300' : 'text-red-400'}`}>
                {savings >= 0 ? fmt(savings, sym) : '-' + fmt(Math.abs(savings), sym)}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full">
              {savingsRate > 0 && (
                <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${Math.min(savingsRate, 100)}%` }} />
              )}
            </div>
          </div>
        </div>

        {/* Savings rate badge */}
        <div className="mt-5 flex items-center gap-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
            savingsRate >= 20 ? 'bg-emerald-500/20 border border-emerald-500/30' :
            savingsRate > 0  ? 'bg-amber-500/20 border border-amber-500/30' :
            'bg-red-500/20 border border-red-500/30'
          }`}>
            <span className={`text-2xl font-black tabular-nums ${
              savingsRate >= 20 ? 'text-emerald-400' : savingsRate > 0 ? 'text-amber-400' : 'text-red-400'
            }`}>{savingsRate}%</span>
            <span className="text-white/60 text-xs">savings rate</span>
          </div>
          <p className="text-white/40 text-xs leading-tight">
            {savingsRate >= 20 ? 'Great job!' : savingsRate > 0 ? 'Room to improve' : 'Spending exceeds income'}
          </p>
        </div>
      </div>

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
              const pct   = expenses > 0 ? Math.min((total / expenses) * 100, 100) : 0
              const hue   = 260 - i * 22
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center shrink-0">{CAT_ICONS[cat.category] || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{cat.category}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `hsl(${hue},65%,58%)` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 tabular-nums w-20 text-right shrink-0">{fmt(total, sym)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 6-month trend (horizontal bars) */}
      {summary.monthly_trend?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-4">Monthly Spending</p>
          <div className="space-y-2.5">
            {(() => {
              const max = Math.max(...summary.monthly_trend.map(m => parseFloat(m.total)), 1)
              return summary.monthly_trend.map(m => {
                const pct   = (parseFloat(m.total) / max) * 100
                const label = new Date(m.month + '-01').toLocaleString('default', { month: 'short', year: '2-digit' })
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-12 font-medium shrink-0">{label}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-violet-500 to-violet-600 rounded-lg flex items-center transition-all"
                        style={{ width: `${pct}%`, minWidth: 4 }}
                      >
                        {pct > 35 && (
                          <span className="text-white text-[9px] font-bold ml-2 truncate">{fmt(parseFloat(m.total), sym)}</span>
                        )}
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
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'

  const [summary, setSummary]         = useState(null)
  const [transactions, setTransactions] = useState([])
  const [netWorth, setNetWorth]       = useState(null)
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
      fetch(`${BASE}/net-worth`,                  { headers: h }).then(r => r.json()),
    ])
      .then(([s, tx, nw]) => {
        setSummary(s)
        setTransactions(Array.isArray(tx) ? tx : [])
        if (nw && !nw.message) setNetWorth(nw)
      })
      .catch(() => setError('Failed to load family data'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* ── STICKY HEADER + TAB BAR ── */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm">
        {/* Top row */}
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/wallets')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-base shadow-sm shrink-0">
              👨‍👩‍👧‍👦
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Family Overview</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {personalWallets.length} wallet{personalWallets.length !== 1 ? 's' : ''} · Combined
              </p>
            </div>
          </div>

          <button
            onClick={toggleDark}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0 text-base"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-0 border-t border-gray-100 dark:border-gray-800">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-8">
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
            {activeTab === 'dashboard'    && <DashboardTab    summary={summary} netWorth={netWorth} personalWallets={personalWallets} sym={sym} />}
            {activeTab === 'transactions' && <TransactionsTab transactions={transactions} sym={sym} />}
            {activeTab === 'networth'     && <NetWorthTab     netWorth={netWorth} sym={sym} />}
            {activeTab === 'report'       && <ReportTab       summary={summary} sym={sym} />}
          </>
        )}

        {!loading && !summary && !error && (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">👨‍👩‍👧‍👦</p>
            <p className="font-semibold text-gray-600 dark:text-gray-300 text-lg">No wallet data yet</p>
            <p className="text-sm mt-2 mb-6">Create personal wallets and add transactions to see the overview.</p>
            <button
              onClick={() => navigate('/create-wallet')}
              className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition"
            >
              Create a Wallet
            </button>
          </div>
        )}
      </main>

    </div>
  )
}
