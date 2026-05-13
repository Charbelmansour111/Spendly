import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { fetchFamilySummary } from '../utils/walletSession'
import { useWallet } from '../context/WalletContext'

const API = 'https://spendly-backend-et20.onrender.com/api'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 space-y-1">
      <p className="text-white/50 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-white'}`}>${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      {sub && <p className="text-white/40 text-xs">{sub}</p>}
    </div>
  )
}

export default function FamilyOverview() {
  const navigate = useNavigate()
  const { wallets, activeWallet } = useWallet()
  const token = localStorage.getItem('token')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchFamilySummary(token)
      .then(setSummary)
      .catch(() => setError('Failed to load family data'))
      .finally(() => setLoading(false))
  }, [token])

  const personalWallets = wallets.filter(w => !w.is_total_wallet)

  const savings = summary ? summary.total_income - summary.total_expenses : 0
  const savingsRate = summary?.total_income > 0
    ? ((savings / summary.total_income) * 100).toFixed(0)
    : 0

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-purple-700 flex items-center justify-center text-2xl">
            👨‍👩‍👧‍👦
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Family Overview</h1>
            <p className="text-white/50 text-sm">{personalWallets.length} wallet{personalWallets.length !== 1 ? 's' : ''} · This month</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-violet-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {!loading && summary && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Income" value={summary.total_income} color="text-emerald-400" sub="All wallets combined" />
              <StatCard label="Total Expenses" value={summary.total_expenses} color="text-red-400" sub="All wallets combined" />
              <StatCard label="Net Savings" value={savings} color={savings >= 0 ? 'text-emerald-400' : 'text-red-400'} sub={`${savingsRate}% savings rate`} />
              <StatCard label="Saved Amount" value={summary.total_savings} color="text-blue-400" sub="Across all goals" />
            </div>

            {/* Wallets count */}
            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">💳</div>
              <div>
                <p className="text-white font-semibold">{summary.wallets_count} Active Wallet{summary.wallets_count !== 1 ? 's' : ''}</p>
                <p className="text-white/40 text-xs">Combined family finances</p>
              </div>
            </div>

            {/* Category breakdown */}
            {summary.category_breakdown?.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                <h2 className="text-white font-semibold">Spending by Category</h2>
                <div className="space-y-2">
                  {summary.category_breakdown.slice(0, 6).map(cat => {
                    const pct = summary.total_expenses > 0
                      ? (parseFloat(cat.total) / parseFloat(summary.total_expenses) * 100).toFixed(0)
                      : 0
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/80">{cat.category}</span>
                          <span className="text-white/50">${parseFloat(cat.total).toLocaleString('en-US', { minimumFractionDigits: 2 })} · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Monthly trend */}
            {summary.monthly_trend?.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                <h2 className="text-white font-semibold">6-Month Spending Trend</h2>
                <div className="flex items-end gap-2 h-24">
                  {(() => {
                    const max = Math.max(...summary.monthly_trend.map(m => parseFloat(m.total)), 1)
                    return summary.monthly_trend.map(m => {
                      const pct = (parseFloat(m.total) / max) * 100
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-violet-500 rounded-t-sm" style={{ height: `${pct}%`, minHeight: 4 }} />
                          <span className="text-white/30 text-[9px]">{m.month.slice(5)}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* Privacy note */}
            <div className="bg-white/3 border border-white/10 rounded-xl p-3 flex items-start gap-2">
              <span className="text-white/40 text-sm">🔒</span>
              <p className="text-white/40 text-xs leading-relaxed">
                Family Overview shows combined totals only. Individual wallet details remain private and require their own PIN.
              </p>
            </div>

            {/* Switch wallet button */}
            <button
              onClick={() => navigate('/wallets')}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white font-medium transition-all text-sm"
            >
              Switch Wallet
            </button>
          </>
        )}
      </div>
    </Layout>
  )
}
