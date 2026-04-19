import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
const CAT_COLORS = {
  Food: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  Transport: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  Shopping: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  Subscriptions: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  Entertainment: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  Other: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

export default function Subscriptions() {
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(true)
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    API.get('/expenses')
      .then(r => setRecurring((r.data || []).filter(e => e.is_recurring)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group by description+category → unique subscription items
  const grouped = Object.values(
    recurring.reduce((acc, e) => {
      const key = (e.description || e.category || 'Other').toLowerCase().trim()
      const display = e.description
        ? e.description.trim().replace(/\b\w/g, c => c.toUpperCase())
        : (e.category || 'Other')
      if (!acc[key]) acc[key] = { name: display, category: e.category || 'Other', charges: [], total: 0 }
      acc[key].charges.push(e)
      acc[key].total += safeNum(e.amount)
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  // Estimate avg monthly cost per item (total / months of data)
  const today = new Date()
  const monthlyEstimate = grouped.reduce((sum, item) => {
    const months = item.charges.length
    const avg = months > 0 ? item.total / months : 0
    return sum + avg
  }, 0)

  const totalCharges = recurring.length
  const categoryCounts = recurring.reduce((acc, e) => {
    acc[e.category || 'Other'] = (acc[e.category || 'Other'] || 0) + 1
    return acc
  }, {})

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })} · Your recurring expenses
          </p>
        </div>

        {/* Friendly explanation */}
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 rounded-2xl p-5 mb-6 flex gap-4">
          <span className="text-2xl shrink-0">💡</span>
          <div>
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-1">
              What is this page?
            </p>
            <p className="text-sm text-violet-700 dark:text-violet-400 leading-relaxed">
              This page automatically pulls every expense you've marked as <strong>recurring</strong> — things like
              Netflix, Spotify, gym memberships, or any regular payment. You don't add anything here.
            </p>
            <p className="text-sm text-violet-700 dark:text-violet-400 leading-relaxed mt-2">
              To track a new subscription, go to <a href="/transactions" className="underline font-semibold hover:text-violet-600">Transactions</a> → add an expense → toggle <strong>Recurring</strong> on. It'll show up here automatically. 🎉
            </p>
          </div>
        </div>

        {/* Summary cards */}
        {grouped.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">Est. Monthly</p>
              <p className="text-lg font-bold text-violet-600 tabular-nums">{sym}{monthlyEstimate.toFixed(2)}</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">per month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">Subscriptions</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{grouped.length}</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">unique items</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">Est. Yearly</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white tabular-nums">{sym}{(monthlyEstimate * 12).toFixed(0)}</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">per year</p>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <p className="text-5xl mb-3">📭</p>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">No recurring expenses yet</p>
            <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto">
              Once you mark an expense as recurring in Transactions, it'll appear here automatically.
            </p>
            <a href="/transactions"
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
              Go to Transactions →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((item, i) => {
              const avgPerCharge = item.charges.length > 0 ? item.total / item.charges.length : 0
              const colorCls = CAT_COLORS[item.category] || CAT_COLORS.Other
              return (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                  <div className={`w-11 h-11 ${colorCls} rounded-xl flex items-center justify-center text-xl shrink-0`}>
                    {CAT_ICONS[item.category] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.charges.length} charge{item.charges.length !== 1 ? 's' : ''} · {item.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-800 dark:text-white tabular-nums text-sm">
                      ~{sym}{avgPerCharge.toFixed(2)}<span className="text-xs text-gray-400 font-normal">/mo</span>
                    </p>
                    <p className="text-xs text-gray-400">{sym}{item.total.toFixed(2)} total</p>
                  </div>
                </div>
              )
            })}

            {/* Footer tip */}
            <div className="mt-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">🧹</span>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">See something you don't need?</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Go to <a href="/transactions" className="text-violet-600 font-medium hover:underline">Transactions</a>, find the expense, and turn off the recurring toggle. It'll disappear from here on the next refresh.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
