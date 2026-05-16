import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Bills: '💡', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦' }
const CAT_COLORS = {
  Subscriptions: 'bg-violet-500', Entertainment: 'bg-green-500', Shopping: 'bg-pink-500',
  Food: 'bg-orange-500', Coffee: 'bg-amber-700', Transport: 'bg-blue-500', Health: 'bg-red-500',
  Fitness: 'bg-yellow-500', Education: 'bg-indigo-500', Bills: 'bg-sky-500',
  Travel: 'bg-teal-500', Gifts: 'bg-fuchsia-500', Other: 'bg-gray-400',
}

function getLogoUrl(name) {
  const n = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const map = {
    netflix: 'netflix.com', spotify: 'spotify.com', amazon: 'amazon.com', amazonprime: 'amazon.com',
    prime: 'amazon.com', primevideo: 'primevideo.com', youtube: 'youtube.com', youtubepremium: 'youtube.com',
    apple: 'apple.com', appletv: 'apple.com', applemusic: 'apple.com', icloud: 'icloud.com',
    disney: 'disneyplus.com', disneyplus: 'disneyplus.com', hbo: 'hbomax.com', hbomax: 'hbomax.com',
    max: 'max.com', hulu: 'hulu.com', twitch: 'twitch.tv', crunchyroll: 'crunchyroll.com',
    paramount: 'paramountplus.com', paramountplus: 'paramountplus.com', peacock: 'peacocktv.com',
    dropbox: 'dropbox.com', google: 'google.com', googleone: 'one.google.com', googledrive: 'google.com',
    microsoft: 'microsoft.com', office: 'microsoft.com', office365: 'microsoft.com',
    xbox: 'xbox.com', playstation: 'playstation.com', psn: 'playstation.com', steam: 'steampowered.com',
    canva: 'canva.com', figma: 'figma.com', notion: 'notion.so', slack: 'slack.com', zoom: 'zoom.us',
    linkedin: 'linkedin.com', twitter: 'twitter.com', x: 'x.com', instagram: 'instagram.com',
    duolingo: 'duolingo.com', audible: 'audible.com', github: 'github.com', gitlab: 'gitlab.com',
    adobe: 'adobe.com', adobecc: 'adobe.com', photoshop: 'adobe.com', grammarly: 'grammarly.com',
    chatgpt: 'openai.com', openai: 'openai.com', claudeai: 'anthropic.com', anthropic: 'anthropic.com',
    nordvpn: 'nordvpn.com', expressvpn: 'expressvpn.com', midjourney: 'midjourney.com',
    starbucks: 'starbucks.com', uber: 'uber.com', lyft: 'lyft.com', doordash: 'doordash.com',
    showtime: 'showtime.com', deezer: 'deezer.com', tidal: 'tidal.com',
  }
  for (const [key, domain] of Object.entries(map)) {
    if (n.includes(key)) return `https://logo.clearbit.com/${domain}`
  }
  return null
}

function SubLogo({ name, category }) {
  const [ok, setOk] = useState(true)
  const url = getLogoUrl(name)
  if (url && ok) return (
    <img src={url} alt={name} className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-sm shrink-0"
      onError={() => setOk(false)} />
  )
  return <span className="text-2xl shrink-0">{CAT_ICONS[category] || '📱'}</span>
}

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

function RenewalBadge({ days }) {
  if (days === null) return null
  const isOverdue = days < 0
  const isToday   = days === 0
  const isUrgent  = days > 0 && days <= 5
  const isWarning = days > 5 && days <= 14
  const label = isOverdue ? `${Math.abs(days)}d overdue` : isToday ? 'Due today' : `${days}d`
  const cls = isOverdue || isToday
    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    : isUrgent
    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    : isWarning
    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cls}`}>{label}</span>
  )
}

function CooldownBar({ days, billing_cycle }) {
  if (days === null) return null
  const totalDays = billing_cycle === 'weekly' ? 7 : billing_cycle === 'yearly' ? 365 : 30
  const pct = Math.max(0, Math.min(100, (days / totalDays) * 100))
  const isOverdue = days < 0
  const isUrgent  = !isOverdue && days <= 5
  const isWarning = !isOverdue && days > 5 && days <= 14
  const barColor  = isOverdue || isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-gray-400">Renewal progress</span>
        <span className="text-gray-500 dark:text-gray-400 font-medium tabular-nums">
          {isOverdue ? `Overdue by ${Math.abs(days)}d` : days === 0 ? 'Renews today' : `${days}d remaining`}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${isOverdue ? 100 : pct}%` }} />
      </div>
    </div>
  )
}

export default function Subscriptions() {
  const [subs, setSubs]                   = useState([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [loading, setLoading]             = useState(true)
  const [aiAudit, setAiAudit]             = useState('')
  const [aiLoading, setAiLoading]         = useState(false)
  const [expandedId, setExpandedId]       = useState(null)
  const [paidData, setPaidData]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('fina_paid_subs_v2') || '{}') } catch { return {} }
  })
  const [partialInputs, setPartialInputs] = useState({})
  const aiRequested = useRef(false)
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'
  const today = new Date()

  const setPaidStatus = (id, status, amount) => {
    setPaidData(prev => {
      const next = { ...prev, [id]: { status, paidAmount: amount ?? prev[id]?.paidAmount ?? '' } }
      localStorage.setItem('fina_paid_subs_v2', JSON.stringify(next))
      return next
    })
  }

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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track recurring payments and renewals</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : subs.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">No subscriptions yet</p>
              <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto leading-relaxed">
                Add subscriptions from the Transactions page — select Subscriptions category to sync them here.
              </p>
              <a href="/transactions"
                className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
                Go to Transactions →
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Overview hero */}
            <div className="bg-linear-to-br from-fuchsia-500 to-pink-600 rounded-2xl px-5 py-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white" />
              </div>
              <div className="relative mb-3">
                <p className="text-white font-bold text-base">Subscriptions</p>
                <p className="text-white/70 text-xs">{subs.length} active · {sym}{monthlyTotal.toFixed(2)}/mo</p>
              </div>
              <div className="relative grid grid-cols-3 gap-2">
                <div className="bg-white/20 rounded-xl px-3 py-2.5">
                  <p className="text-white/70 text-[10px] mb-0.5">Per Year</p>
                  <p className="text-white font-bold text-sm tabular-nums">{sym}{yearlyTotal.toFixed(0)}</p>
                  <p className="text-white/50 text-[10px]">annually</p>
                </div>
                <div className="bg-white/20 rounded-xl px-3 py-2.5">
                  <p className="text-white/70 text-[10px] mb-0.5">% of Income</p>
                  <p className="text-white font-bold text-sm tabular-nums">{monthlyIncome > 0 ? pctOfIncome.toFixed(1) + '%' : '—'}</p>
                  <p className="text-white/50 text-[10px]">{pctOfIncome > 20 ? 'high' : pctOfIncome > 10 ? 'moderate' : 'healthy'}</p>
                </div>
                <div className="bg-white/20 rounded-xl px-3 py-2.5">
                  <p className="text-white/70 text-[10px] mb-0.5">Active</p>
                  <p className="text-white font-bold text-sm tabular-nums">{subs.length}</p>
                  <p className="text-white/50 text-[10px]">subscriptions</p>
                </div>
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
                    You're spending <strong>{pctOfIncome.toFixed(1)}%</strong> of monthly income on subscriptions. Experts recommend keeping this under 10–15%.
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
                {subs.length} subscription{subs.length !== 1 ? 's' : ''} · tap to see details
              </p>
              <div className="space-y-2">
                {subs.map(sub => {
                  const monthly   = toMonthly(sub.amount, sub.billing_cycle)
                  const annual    = monthly * 12
                  const days      = daysUntil(sub.next_billing_date)
                  const isOpen    = expandedId === sub.id
                  const paid      = paidData[sub.id] || { status: 'unpaid', paidAmount: '' }
                  const isPaidFull = paid.status === 'paid'
                  const isPartial  = paid.status === 'partial'
                  return (
                    <div key={sub.id}
                      className={`rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${isPaidFull ? 'bg-emerald-50 dark:bg-emerald-900/10' : isPartial ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-white dark:bg-gray-800'}`}>

                      {/* Card row — always visible, click to expand */}
                      <button
                        onClick={() => setExpandedId(isOpen ? null : sub.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-black/5 dark:active:bg-white/5 transition-colors">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 relative">
                          <SubLogo name={sub.name} category={sub.category} />
                          {isPaidFull && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold leading-none">✓</span>
                          )}
                          {isPartial && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold leading-none">½</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${isPaidFull ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-white'}`}>{sub.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400 capitalize">{sub.billing_cycle}</span>
                            {days !== null && <RenewalBadge days={days} />}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold tabular-nums text-sm ${isPaidFull ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-60' : 'text-gray-800 dark:text-white'}`}>
                            {sym}{monthly.toFixed(2)}<span className="text-xs text-gray-400 font-normal">/mo</span>
                          </p>
                          <p className="text-xs text-gray-400 tabular-nums">{sym}{annual.toFixed(0)}/yr</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                          className={`text-gray-300 shrink-0 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="border-t border-gray-100 dark:border-gray-700/50 px-4 pt-4 pb-4 space-y-4">

                          {/* Info grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                              <p className="text-[10px] text-gray-400 mb-0.5">Billing</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 capitalize">{sub.billing_cycle}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                              <p className="text-[10px] text-gray-400 mb-0.5">Per charge</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">{sym}{safeNum(sub.amount).toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                              <p className="text-[10px] text-gray-400 mb-0.5">Annual</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">{sym}{annual.toFixed(0)}</p>
                            </div>
                          </div>

                          {/* Cooldown */}
                          {days !== null && <CooldownBar days={days} billing_cycle={sub.billing_cycle} />}

                          {/* Next renewal */}
                          {sub.next_billing_date && (
                            <p className="text-xs text-gray-400">
                              Next renewal: <span className="font-semibold text-gray-600 dark:text-gray-300">
                                {new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </span>
                            </p>
                          )}

                          {/* Payment status */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment status</p>
                            <div className="flex gap-2">
                              {[
                                { key: 'unpaid',  label: 'Not Paid',  color: paid.status === 'unpaid'  ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
                                { key: 'paid',    label: 'Paid',       color: paid.status === 'paid'    ? 'bg-emerald-500 text-white'                                   : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
                                { key: 'partial', label: 'Partial',    color: paid.status === 'partial' ? 'bg-amber-400 text-white'                                     : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
                              ].map(opt => (
                                <button key={opt.key}
                                  onClick={() => setPaidStatus(sub.id, opt.key)}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${opt.color}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {paid.status === 'partial' && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-gray-400 shrink-0">Amount paid:</span>
                                <div className="flex-1 relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sym}</span>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={partialInputs[sub.id] ?? paid.paidAmount}
                                    onChange={e => {
                                      const v = e.target.value
                                      setPartialInputs(p => ({ ...p, [sub.id]: v }))
                                      setPaidStatus(sub.id, 'partial', v)
                                    }}
                                    className="w-full pl-7 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-amber-400"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </Layout>
  )
}
