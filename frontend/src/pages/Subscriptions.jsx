import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
const CAT_COLORS = {
  Subscriptions: 'bg-violet-500', Entertainment: 'bg-green-500',
  Shopping: 'bg-pink-500', Food: 'bg-orange-500', Transport: 'bg-blue-500', Other: 'bg-gray-400',
}
const CATEGORIES = ['Subscriptions', 'Entertainment', 'Food', 'Shopping', 'Transport', 'Other']
const CYCLES = ['monthly', 'yearly', 'weekly']

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

function toMonthly(amount, cycle) {
  const a = safeNum(amount)
  if (cycle === 'yearly') return a / 12
  if (cycle === 'weekly') return a * 4.33
  return a
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0)
  return Math.round((due - today) / (1000 * 60 * 60 * 24))
}

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-•]\s+/gm, '• ')
    .split('\n').map((line, i) => <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />)
}

const EMPTY_FORM = { name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '', category: 'Subscriptions' }

export default function Subscriptions() {
  const [subs, setSubs]           = useState([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [aiAudit, setAiAudit]     = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [deleteId, setDeleteId]   = useState(null)
  const aiRequested = useRef(false)
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'
  const today = new Date()

  const load = () => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    Promise.all([API.get('/subscriptions'), API.get('/income')])
      .then(([subRes, incRes]) => {
        setSubs(subRes.data || [])
        const thisMonthInc = (incRes.data || []).filter(i => {
          const d = new Date(i.date || i.created_at)
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
        }).reduce((s, i) => s + safeNum(i.amount), 0)
        setMonthlyIncome(thisMonthInc)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const monthlyTotal = subs.reduce((s, sub) => s + toMonthly(sub.amount, sub.billing_cycle), 0)
  const yearlyTotal  = monthlyTotal * 12
  const pctOfIncome  = monthlyIncome > 0 ? (monthlyTotal / monthlyIncome) * 100 : 0

  const catBreakdown = Object.entries(
    subs.reduce((acc, sub) => {
      const cat = sub.category || 'Other'
      acc[cat] = (acc[cat] || 0) + toMonthly(sub.amount, sub.billing_cycle)
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.amount) return
    setSaving(true)
    try {
      await API.post('/subscriptions', form)
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await API.delete(`/subscriptions/${id}`); setSubs(s => s.filter(x => x.id !== id)) } catch {}
    setDeleteId(null)
  }

  const requestAudit = () => {
    if (aiRequested.current || subs.length === 0) return
    aiRequested.current = true
    setAiLoading(true)
    const list = subs.map(s => `${s.name} (${s.category}): ${sym}${toMonthly(s.amount, s.billing_cycle).toFixed(2)}/mo`).join(', ')
    const msg = `I have ${subs.length} subscriptions costing ${sym}${monthlyTotal.toFixed(2)}/month (${sym}${yearlyTotal.toFixed(0)}/year). Here's the list: ${list}. Which ones seem redundant or overpriced? Give a brutally honest breakdown — short, specific, actionable.`
    API.post('/insights/chat', { message: msg, mode: 'sarcastic' })
      .then(r => setAiAudit(r.data.reply || ''))
      .catch(() => setAiAudit('Could not load AI analysis. Try again later.'))
      .finally(() => setAiLoading(false))
  }

  const cls = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-700/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition"

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
            <p className="text-sm text-gray-400 mt-0.5">Track recurring payments and renewals</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 active:scale-95 transition shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-5 space-y-3 border border-violet-100 dark:border-violet-800/40">
            <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">New Subscription</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input placeholder="Name (e.g. Netflix, Spotify)" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={cls} required />
              </div>
              <input type="number" placeholder="Amount" min="0" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={cls} required />
              <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))} className={cls}>
                {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <input type="date" value={form.next_billing_date}
                onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))} className={cls}
                title="Next billing date" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={cls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition disabled:opacity-60">
                {saving ? 'Adding…' : 'Add Subscription'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : subs.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">No subscriptions yet</p>
              <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto leading-relaxed">
                Add your subscriptions to track renewal dates, monthly costs, and get AI-powered advice on what to cut.
              </p>
              <button onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
                + Add your first subscription
              </button>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-2xl p-4 flex gap-3">
              <span className="text-xl shrink-0">💡</span>
              <p className="text-sm text-violet-700 dark:text-violet-400 leading-relaxed">
                Add Netflix, Spotify, gym, insurance — anything billed on a schedule. You'll see exactly how much you're spending and when each one renews.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
                <p className="text-xs text-gray-400 mb-1">Monthly</p>
                <p className="text-lg font-bold text-violet-600 tabular-nums">{sym}{monthlyTotal.toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
                <p className="text-xs text-gray-400 mb-1">Per year</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white tabular-nums">{sym}{yearlyTotal.toFixed(0)}</p>
              </div>
              <div className={`rounded-2xl p-4 shadow-sm text-center ${pctOfIncome > 20 ? 'bg-red-50 dark:bg-red-900/20' : pctOfIncome > 10 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <p className="text-xs text-gray-400 mb-1">% of income</p>
                <p className={`text-lg font-bold tabular-nums ${pctOfIncome > 20 ? 'text-red-500' : pctOfIncome > 10 ? 'text-amber-600' : 'text-green-600'}`}>
                  {monthlyIncome > 0 ? `${pctOfIncome.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>

            {/* Income % warning */}
            {pctOfIncome > 15 && monthlyIncome > 0 && (
              <div className={`rounded-2xl p-4 flex items-start gap-3 border ${pctOfIncome > 25 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40'}`}>
                <span className="text-xl shrink-0">{pctOfIncome > 25 ? '🚨' : '⚠️'}</span>
                <div>
                  <p className={`text-sm font-semibold mb-0.5 ${pctOfIncome > 25 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {pctOfIncome > 25 ? 'Subscriptions are eating your budget' : 'Above the healthy range'}
                  </p>
                  <p className={`text-xs leading-relaxed ${pctOfIncome > 25 ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`}>
                    You're spending <strong>{pctOfIncome.toFixed(1)}%</strong> of monthly income on subscriptions. Experts recommend keeping this under 10–15%. Run the AI audit below to see what to cut.
                  </p>
                </div>
              </div>
            )}

            {/* Category breakdown */}
            {catBreakdown.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Breakdown by category</p>
                <div className="space-y-3">
                  {catBreakdown.map(([cat, amount]) => {
                    const pct = monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{CAT_ICONS[cat] || '📦'}</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{cat}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 tabular-nums">{sym}{amount.toFixed(2)}/mo</span>
                            <span className="text-xs font-bold text-gray-500 w-8 text-right tabular-nums">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${CAT_COLORS[cat] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* AI Audit */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">🤖 AI Subscription Audit</p>
                  <p className="text-xs text-gray-400 mt-0.5">Brutally honest — which ones are actually worth it?</p>
                </div>
                {!aiAudit && !aiLoading && (
                  <button onClick={requestAudit}
                    className="bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 transition shrink-0">
                    Audit
                  </button>
                )}
                {aiAudit && (
                  <button onClick={() => { setAiAudit(''); aiRequested.current = false }}
                    className="text-xs text-violet-600 font-semibold hover:underline shrink-0">Refresh</button>
                )}
              </div>
              {aiLoading && (
                <div className="mt-3 space-y-2">
                  {[80, 70, 90, 60].map((w, i) => (
                    <div key={i} className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}
              {aiAudit && !aiLoading && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {renderMarkdown(aiAudit)}
                </div>
              )}
              {!aiAudit && !aiLoading && (
                <p className="mt-2 text-xs text-gray-400">Tap Audit and the AI will analyse all {subs.length} subscriptions and flag the ones worth reconsidering.</p>
              )}
            </div>

            {/* Subscription list */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                {subs.length} subscription{subs.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {subs.map(sub => {
                  const monthly = toMonthly(sub.amount, sub.billing_cycle)
                  const annual  = monthly * 12
                  const days    = daysUntil(sub.next_billing_date)
                  const isOverdue = days !== null && days < 0
                  const isSoon    = days !== null && days >= 0 && days <= 7
                  return (
                    <div key={sub.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                      <div className="flex items-center gap-4 p-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          sub.category === 'Subscriptions' ? 'bg-violet-100 dark:bg-violet-900/30' :
                          sub.category === 'Entertainment' ? 'bg-green-100 dark:bg-green-900/30' :
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {CAT_ICONS[sub.category] || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{sub.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400 capitalize">{sub.billing_cycle}</span>
                            {days !== null && (
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                isSoon    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {isOverdue ? `Overdue ${Math.abs(days)}d` : days === 0 ? 'Renews today' : `Renews in ${days}d`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 mr-1">
                          <p className="font-bold text-gray-800 dark:text-white tabular-nums text-sm">
                            {sym}{monthly.toFixed(2)}<span className="text-xs text-gray-400 font-normal">/mo</span>
                          </p>
                          <p className="text-xs text-gray-400">{sym}{annual.toFixed(0)}/yr</p>
                        </div>
                        <button
                          onClick={() => setDeleteId(deleteId === sub.id ? null : sub.id)}
                          className="text-gray-300 hover:text-red-400 transition shrink-0 p-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                      {deleteId === sub.id && (
                        <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-700/40 pt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Remove <strong>{sub.name}</strong> from your subscriptions?</p>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleDelete(sub.id)}
                              className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-600 transition">
                              Remove
                            </button>
                            <button onClick={() => setDeleteId(null)}
                              className="text-xs border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Savings tip */}
            {subs.length >= 3 && (() => {
              const cheapestTwo = [...subs]
                .sort((a, b) => toMonthly(a.amount, a.billing_cycle) - toMonthly(b.amount, b.billing_cycle))
                .slice(0, 2)
              const savingsPerYear = cheapestTwo.reduce((s, x) => s + toMonthly(x.amount, x.billing_cycle) * 12, 0).toFixed(0)
              return (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-xl shrink-0">💰</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-400 mb-0.5">Potential savings</p>
                    <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                      Cutting your 2 cheapest subscriptions would save{' '}
                      <strong>{sym}{savingsPerYear}/year</strong>.{' '}
                      Run the AI audit above to see which ones are worth cutting.
                    </p>
                  </div>
                </div>
              )
            })()}

          </div>
        )}
      </div>
    </Layout>
  )
}
