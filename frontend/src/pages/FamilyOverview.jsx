import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor } from '../data/avatars'

const BASE = 'https://spendly-backend-et20.onrender.com/api'
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Bills: '💡', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦' }

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
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function FamilyOverview() {
  const navigate = useNavigate()
  const { wallets } = useWallet()
  const token = localStorage.getItem('token')
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'

  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [netWorth, setNetWorth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const personalWallets = wallets.filter(w => !w.is_total_wallet)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    const h = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${BASE}/wallets/total/summary`, { headers: h }).then(r => r.json()),
      fetch(`${BASE}/wallets/total/transactions`, { headers: h }).then(r => r.json()),
      fetch(`${BASE}/net-worth`, { headers: h }).then(r => r.json()),
    ])
      .then(([s, tx, nw]) => {
        setSummary(s)
        setTransactions(Array.isArray(tx) ? tx : [])
        if (nw && !nw.message) setNetWorth(nw)
      })
      .catch(() => setError('Failed to load family data'))
      .finally(() => setLoading(false))
  }, [token])

  const savings = summary ? parseFloat(summary.total_income || 0) - parseFloat(summary.total_expenses || 0) : 0
  const savingsRate = summary?.total_income > 0
    ? ((savings / summary.total_income) * 100).toFixed(0)
    : 0

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-purple-500 to-violet-600 flex items-center justify-center text-xl shadow-sm">
              👨‍👩‍👧‍👦
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Family Overview</h1>
              <p className="text-gray-400 text-xs">
                {personalWallets.length} wallet{personalWallets.length !== 1 ? 's' : ''} · This month
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/wallets')}
            className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-3 py-1.5 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/50 transition"
          >
            Switch Wallet
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {!loading && summary && (
          <>
            {/* ── DASHBOARD STATS ── */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Income"
                value={fmt(summary.total_income, sym)}
                icon="💰"
                color="text-emerald-600 dark:text-emerald-400"
                sub="All wallets this month"
              />
              <StatCard
                label="Expenses"
                value={fmt(summary.total_expenses, sym)}
                icon="💸"
                color="text-red-500 dark:text-red-400"
                sub="All wallets this month"
              />
              <StatCard
                label="Net Savings"
                value={fmt(savings, sym)}
                icon="📊"
                color={savings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
                sub={`${savingsRate}% savings rate`}
              />
              <StatCard
                label="Savings Goals"
                value={fmt(summary.total_savings, sym)}
                icon="🎯"
                color="text-blue-600 dark:text-blue-400"
                sub="Across all goals"
              />
            </div>

            {/* ── NET WORTH ── */}
            {netWorth && (
              <div className="bg-linear-to-br from-violet-600 to-purple-700 rounded-2xl p-5 shadow-md">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">Net Worth</p>
                <p className="text-white text-3xl font-bold tabular-nums mb-4">
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

            {/* ── WALLETS INCLUDED ── */}
            {personalWallets.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                  Wallets Included
                </p>
                <div className="space-y-2">
                  {personalWallets.map(w => {
                    const color = getWalletColor(w.color)
                    return (
                      <div key={w.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-linear-to-br ${color.gradient} overflow-hidden shrink-0 flex items-center justify-center`}>
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

            {/* ── RECENT TRANSACTIONS ── */}
            {transactions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">Recent Transactions</p>
                  <span className="text-xs text-gray-400">All wallets</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {transactions.slice(0, 10).map(tx => {
                    const walletColor = getWalletColor(tx.wallet_color)
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
                          {CAT_ICONS[tx.category] || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                            {tx.description || tx.category}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full bg-linear-to-br ${walletColor.gradient}`} />
                            <p className="text-xs text-gray-400 truncate">{tx.wallet_name} · {fmtDate(tx.date)}</p>
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

            {/* ── CATEGORY BREAKDOWN ── */}
            {summary.category_breakdown?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">Spending by Category</p>
                <div className="space-y-3">
                  {summary.category_breakdown.slice(0, 6).map(cat => {
                    const total = parseFloat(cat.total)
                    const pct = summary.total_expenses > 0
                      ? Math.min((total / parseFloat(summary.total_expenses)) * 100, 100)
                      : 0
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <span>{CAT_ICONS[cat.category] || '📦'}</span>
                            {cat.category}
                          </span>
                          <span className="text-gray-400">{fmt(total, sym)} · {pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-violet-500 to-violet-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── 6-MONTH TREND ── */}
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
                          <div
                            className="w-full bg-linear-to-t from-violet-600 to-violet-400 rounded-t-lg"
                            style={{ height: `${pct}%`, minHeight: 4 }}
                          />
                          <span className="text-gray-400 dark:text-gray-500 text-[9px] font-medium">
                            {m.month.slice(5)}
                          </span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* ── PRIVACY NOTE ── */}
            <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30 rounded-xl p-3">
              <span className="text-gray-400 text-sm shrink-0">🔒</span>
              <p className="text-gray-400 text-xs leading-relaxed">
                Family Overview shows combined totals only. Individual wallet details remain private and require their own PIN.
              </p>
            </div>
          </>
        )}

        {!loading && !summary && !error && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">👨‍👩‍👧‍👦</p>
            <p className="font-semibold text-gray-600 dark:text-gray-300">No wallet data yet</p>
            <p className="text-sm mt-1">Create personal wallets and add transactions to see the overview.</p>
            <button onClick={() => navigate('/create-wallet')} className="mt-5 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition">
              Create a Wallet
            </button>
          </div>
        )}

      </div>
    </Layout>
  )
}
