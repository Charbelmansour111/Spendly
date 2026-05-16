import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import { AIChatInput } from '../components/ui/AIChatInput'

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
    chatgpt: 'openai.com', openai: 'openai.com', nordvpn: 'nordvpn.com', expressvpn: 'expressvpn.com',
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

export default function Subscriptions() {
  const [subs, setSubs]                   = useState([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [subExpenses, setSubExpenses]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [aiAudit, setAiAudit]             = useState('')
  const [aiLoading, setAiLoading]         = useState(false)
  const [deleteId, setDeleteId]           = useState(null)
  const [chatInput, setChatInput]         = useState('')
  const [chatLoading, setChatLoading]     = useState(false)
  const [chatMessages, setChatMessages]   = useState([])
  const [micLangMode, setMicLangMode]     = useState('en')
  const [listening, setListening]         = useState(false)
  const chatBottomRef = useRef(null)
  const aiRequested = useRef(false)
  const recognitionRef = useRef(null)
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'
  const today = new Date()

  const load = () => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    Promise.all([API.get('/subscriptions'), API.get('/income'), API.get('/expenses')])
      .then(([subRes, incRes, expRes]) => {
        setSubs(subRes.data || [])
        const thisMonthInc = (incRes.data || []).filter(i => {
          const d = new Date(i.date || i.created_at)
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
        }).reduce((s, i) => s + safeNum(i.amount), 0)
        setMonthlyIncome(thisMonthInc)
        setSubExpenses(
          (expRes.data || [])
            .filter(e => e.category === 'Subscriptions')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 8)
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

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

  const buildSubContext = () => {
    if (subs.length === 0) return ''
    const list = subs.map(s => {
      const days = daysUntil(s.next_billing_date)
      const renewal = days !== null
        ? (days < 0 ? `overdue by ${Math.abs(days)} days` : days === 0 ? 'renews today' : `renews in ${days} days`)
        : 'no renewal date'
      return `${s.name} (${s.category}, ${s.billing_cycle}, ${sym}${safeNum(s.amount).toFixed(2)}/period, ${renewal})`
    }).join('; ')
    return `\n\nContext — My active subscriptions: ${list}. Monthly total: ${sym}${monthlyTotal.toFixed(2)}.`
  }

  const sendChat = async (text) => {
    const msg = (text || chatInput).trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const fullMsg = msg + buildSubContext()
      const r = await API.post('/insights/chat', { message: fullMsg })
      setChatMessages(prev => [...prev, { role: 'ai', content: r.data.reply || '' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I had trouble connecting. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const startMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = micLangMode === 'ar' ? 'ar-LB' : 'en-US'
    rec.interimResults = false
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setChatInput(t); setListening(false) }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  const stopMic = () => { recognitionRef.current?.stop(); setListening(false) }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track recurring payments and renewals</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : subs.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">No subscriptions yet</p>
              <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto leading-relaxed">
                Add subscriptions from the Transactions page by marking an expense as recurring.
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
                        <div className="w-11 h-11 flex items-center justify-center shrink-0">
                          <SubLogo name={sub.name} category={sub.category} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{sub.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400 capitalize">{sub.billing_cycle}</span>
                            {days !== null && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                isSoon    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400'
                              }`}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                {isOverdue
                                  ? `Overdue ${Math.abs(days)}d`
                                  : days === 0 ? 'Renews today'
                                  : `${days}d cooldown`}
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

            {/* Subscription expenses pulled from Transactions */}
            {subExpenses.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">From Transactions</p>
                    <p className="text-xs text-gray-400 mt-0.5">Expenses tagged "Subscriptions" in your history</p>
                  </div>
                  <a href="/transactions" className="text-xs font-semibold text-violet-600 hover:underline shrink-0">View all →</a>
                </div>
                <div className="space-y-2">
                  {subExpenses.map(e => (
                    <div key={e.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 bg-violet-50 dark:bg-violet-900/30">
                        <SubLogo name={e.description} category={e.category} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{e.description || 'Subscription'}</p>
                        <p className="text-[11px] text-gray-400">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <p className="text-xs font-bold text-red-500 tabular-nums shrink-0">-{sym}{safeNum(e.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Chat */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-50 dark:border-gray-700/60">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Ask AI about your subscriptions</p>
                <p className="text-xs text-gray-400 mt-0.5">The AI knows all your subscription details automatically</p>
              </div>

              {chatMessages.length > 0 && (
                <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'ai' && (
                        <div className="w-7 h-7 rounded-xl bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L13.09 8.26L19 6L15.45 11.27L22 12L15.45 12.73L19 18L13.09 15.74L12 22L10.91 15.74L5 18L8.55 12.73L2 12L8.55 11.27L5 6L10.91 8.26L12 2Z"/></svg>
                        </div>
                      )}
                      <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-violet-600 text-white rounded-br-md'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-md'
                      }`}>
                        {msg.role === 'ai' ? renderMarkdown(msg.content) : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="w-7 h-7 rounded-xl bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 mr-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L13.09 8.26L19 6L15.45 11.27L22 12L15.45 12.73L19 18L13.09 15.74L12 22L10.91 15.74L5 18L8.55 12.73L2 12L8.55 11.27L5 6L10.91 8.26L12 2Z"/></svg>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                        {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              )}

              <div className="px-4 pb-4 pt-3">
                <AIChatInput
                  input={chatInput}
                  setInput={setChatInput}
                  loading={chatLoading}
                  listening={listening}
                  onSend={() => sendChat()}
                  onStartMic={startMic}
                  onStopMic={stopMic}
                  micLangMode={micLangMode}
                  onToggleMicLang={() => setMicLangMode(m => m === 'en' ? 'ar' : 'en')}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </Layout>
  )
}
