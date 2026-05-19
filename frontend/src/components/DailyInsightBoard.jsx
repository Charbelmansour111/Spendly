import { useState, useEffect, useRef, useCallback } from 'react'
import API from '../utils/api'

const THEME_GRADIENTS = {
  amber:  'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
  orange: 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)',
  red:    'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
  green:  'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
  blue:   'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
  indigo: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)',
}

// Animate a number counting up from 0 to target
function useCountUp(target, active) {
  const [display, setDisplay] = useState(0)
  const frame = useRef(null)

  useEffect(() => {
    if (!active || typeof target !== 'number') { setDisplay(target); return }
    let start = null
    const duration = 900
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [target, active])

  return display
}

// Extract the leading number from a headline string for animation
function extractLeadingNumber(headline) {
  const match = headline?.match(/^(\d+\.?\d*)/)
  return match ? parseFloat(match[1]) : null
}

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 24,
      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
      padding: '20px 20px 16px',
      minHeight: 212,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }
        .di-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="di-shimmer" style={{ width: 100, height: 10 }} />
        <div className="di-shimmer" style={{ width: 32, height: 32, borderRadius: 12 }} />
      </div>
      {/* Headline */}
      <div className="di-shimmer" style={{ width: '75%', height: 36, marginTop: 4 }} />
      {/* Subtext lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div className="di-shimmer" style={{ width: '100%', height: 12 }} />
        <div className="di-shimmer" style={{ width: '85%', height: 12 }} />
      </div>
      {/* Separator + commentary */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="di-shimmer" style={{ width: '90%', height: 10 }} />
      </div>
      {/* Footer row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <div className="di-shimmer" style={{ width: 60, height: 10 }} />
        <div className="di-shimmer" style={{ width: 60, height: 10 }} />
      </div>
    </div>
  )
}

// Client-side fallback insight from already-loaded dashboard data
function buildFallback(expenses, incomeList, budgets) {
  try {
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()

    const monthExp = (expenses || []).filter(e => {
      const d = new Date(e.date)
      return d.getMonth() + 1 === m && d.getFullYear() === y
    })
    const totalSpent = monthExp.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

    const monthIncome = (incomeList || []).filter(i => Number(i.month) === m && Number(i.year) === y)
    const income = monthIncome.reduce((s, i) => s + parseFloat(i.amount || 0), 0)

    const saved = Math.max(0, income - totalSpent)
    const rate = income > 0 ? Math.round((saved / income) * 100) : 0
    const theme = rate >= 15 ? 'green' : rate >= 10 ? 'amber' : 'red'
    const diff = Math.abs(rate - 20)
    const dir = rate >= 20 ? 'above' : 'below'

    return {
      type: 'savings_rate',
      headline: `Saving ${rate}% this month`,
      subtext: `That's $${Math.round(saved)} saved so far. The healthy target is 20% — you're ${diff}% ${dir} target.`,
      color_theme: theme,
      icon: '💰',
      data: { rate, saved_amount: Math.round(saved) },
      ai_commentary: rate >= 20 ? "Great discipline — you're ahead of the 20% savings target." : `${diff}% away from 20% — small cuts add up.`,
      generated_at: now.toISOString().split('T')[0],
      is_fallback: true,
    }
  } catch {
    return {
      type: 'savings_rate',
      headline: 'Your financial snapshot',
      subtext: 'Log expenses and income to unlock your personalized daily AI insight.',
      color_theme: 'indigo',
      icon: '💡',
      data: {},
      ai_commentary: 'Every expense logged is a step toward financial clarity.',
      generated_at: new Date().toISOString().split('T')[0],
      is_fallback: true,
    }
  }
}

export default function DailyInsightBoard({ expenses = [], incomeList = [], budgets = [], isActive = false }) {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [justRefreshed, setJustRefreshed] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const hasActivated = useRef(false)

  const fetchInsight = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    else setLoading(true)

    try {
      const r = await API.get(`/daily-insight${force ? '?force=true' : ''}`)
      setInsight(r.data)
      setAnimateIn(false)
      setTimeout(() => setAnimateIn(true), 50)
      if (force) { setJustRefreshed(true); setTimeout(() => setJustRefreshed(false), 3000) }
    } catch {
      setInsight(buildFallback(expenses, incomeList, budgets))
      setAnimateIn(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [expenses, incomeList, budgets])

  // Initial load (cached insight)
  useEffect(() => { fetchInsight() }, [])

  // Refresh with a new random insight every time the user swipes into this panel
  useEffect(() => {
    if (!isActive) return
    if (!hasActivated.current) {
      hasActivated.current = true
      return // first activation — already loaded above
    }
    fetchInsight(true)
  }, [isActive])

  const gradient = THEME_GRADIENTS[insight?.color_theme] || THEME_GRADIENTS.indigo
  const leadingNum = extractLeadingNumber(insight?.headline)
  const animated = useCountUp(leadingNum, animateIn && leadingNum !== null)

  // Build animated headline: replace leading number with animated count
  const animatedHeadline = (() => {
    if (!insight?.headline) return ''
    if (leadingNum === null) return insight.headline
    return insight.headline.replace(/^\d+\.?\d*/, String(animated))
  })()

  const today = new Date().toLocaleDateString('default', { month: 'short', day: 'numeric' })

  if (loading) return <SkeletonCard />

  return (
    <div style={{
      borderRadius: 24,
      background: gradient,
      padding: '18px 20px 14px',
      minHeight: 212,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      opacity: animateIn ? 1 : 0,
      transform: animateIn ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity 0.35s ease, transform 0.35s ease',
    }}>
      {/* Decorative circle */}
      <div style={{
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)',
        top: -60,
        right: -60,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        bottom: -40,
        left: -30,
        pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, position: 'relative' }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase',
          marginTop: 2,
        }}>
          Today's Insight
        </span>
        <span style={{ fontSize: 26, lineHeight: 1 }}>{insight?.icon || '💡'}</span>
      </div>

      {/* Headline */}
      <div style={{
        fontSize: insight?.headline?.length > 20 ? 22 : 26,
        fontWeight: 800,
        color: 'white',
        lineHeight: 1.15,
        marginBottom: 8,
        position: 'relative',
        letterSpacing: '-0.02em',
      }}>
        {animatedHeadline}
      </div>

      {/* Subtext */}
      <div style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.78)',
        lineHeight: 1.5,
        flex: 1,
        position: 'relative',
      }}>
        {insight?.subtext}
      </div>

      {/* Separator + AI commentary */}
      {insight?.ai_commentary && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.18)',
          paddingTop: 10,
          marginTop: 10,
          position: 'relative',
        }}>
          <p style={{
            fontSize: 11,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.4,
            margin: 0,
          }}>
            "{insight.ai_commentary}"
          </p>
        </div>
      )}

      {/* Footer row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        position: 'relative',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          {justRefreshed ? 'Updated just now' : today}
        </span>

        <button
          onClick={() => !refreshing && fetchInsight(true)}
          title="Refresh insight"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 8,
            padding: '4px 10px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 10,
            fontWeight: 600,
            cursor: refreshing ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'background 0.15s',
          }}
        >
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ flexShrink: 0, animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
          >
            <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          {refreshing ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
