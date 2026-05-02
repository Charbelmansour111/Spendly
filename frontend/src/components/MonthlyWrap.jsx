import { useState, useEffect, useRef, useCallback } from 'react'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food:'🍔', Coffee:'☕', Transport:'🚗', Shopping:'🛍️', Entertainment:'🎬', Health:'🏥', Fitness:'🏋️', Education:'🎓', Bills:'💡', Travel:'✈️', Gifts:'🎁', Subscriptions:'📱', Other:'📦' }

const SLIDE_THEMES = [
  { bg: 'from-violet-700 via-violet-800 to-indigo-900', accent: 'text-violet-200', blob1: 'bg-violet-400', blob2: 'bg-indigo-400' },
  { bg: 'from-orange-500 via-pink-600 to-rose-700',    accent: 'text-orange-200', blob1: 'bg-orange-400', blob2: 'bg-pink-400' },
  { bg: 'from-emerald-600 via-teal-700 to-cyan-800',   accent: 'text-emerald-200', blob1: 'bg-emerald-400', blob2: 'bg-teal-400' },
  { bg: 'from-blue-600 via-indigo-700 to-violet-800',  accent: 'text-blue-200', blob1: 'bg-blue-400', blob2: 'bg-violet-400' },
  { bg: 'from-pink-600 via-rose-700 to-red-800',       accent: 'text-pink-200', blob1: 'bg-pink-400', blob2: 'bg-rose-400' },
  { bg: 'from-amber-500 via-orange-600 to-red-700',    accent: 'text-amber-200', blob1: 'bg-amber-400', blob2: 'bg-orange-400' },
]

const SLIDE_EMOJIS = ['🎊', '🛍️', '💸', '🧾', '💰', '🚀']
const SLIDE_TITLES = ['Hey there!', 'Top Category', 'Biggest Flex', 'Transactions', 'The Bottom Line', 'Pro Tip']

function CountUp({ target, prefix = '', suffix = '', duration = 1200 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(target * ease)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <span>{prefix}{val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}</span>
}

function ProgressBar({ pct, color = 'bg-white' }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(Math.min(pct, 100)), 100); return () => clearTimeout(t) }, [pct])
  return (
    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
      <div className={`${color} h-2 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${width}%` }} />
    </div>
  )
}

export default function MonthlyWrap({ onClose }) {
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year]  = useState(now.getFullYear())

  const [phase,  setPhase]  = useState('loading') // loading | playing | done | error
  const [slides, setSlides] = useState([])
  const [stats,  setStats]  = useState(null)
  const [idx,    setIdx]    = useState(0)
  const [anim,   setAnim]   = useState(false) // slide-in trigger
  const ttsRef              = useRef(null)
  const autoRef             = useRef(null)

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.05; u.pitch = 1.1; u.volume = 0.9
    ttsRef.current = u
    window.speechSynthesis.speak(u)
  }, [])

  const goTo = useCallback((i, autoAdvance = false) => {
    setAnim(false)
    setTimeout(() => {
      setIdx(i)
      setAnim(true)
      if (autoAdvance && slides[i]) speak(slides[i])
    }, 180)
  }, [slides, speak])

  const next = useCallback(() => {
    if (idx < slides.length - 1) goTo(idx + 1, true)
    else setPhase('done')
  }, [idx, slides.length, goTo])

  const prev = () => {
    if (idx > 0) goTo(idx - 1, false)
  }

  // Auto-advance every 6s
  useEffect(() => {
    if (phase !== 'playing') return
    clearTimeout(autoRef.current)
    autoRef.current = setTimeout(next, 6000)
    return () => clearTimeout(autoRef.current)
  }, [idx, phase, next])

  // Load data
  useEffect(() => {
    API.post('/insights/monthly-wrap', { month, year })
      .then(({ data }) => {
        if (!data.slides) { setPhase('error'); return }
        setSlides(data.slides)
        setStats(data.stats)
        setTimeout(() => {
          setPhase('playing')
          setAnim(true)
          speak(data.slides[0])
        }, 400)
      })
      .catch(() => setPhase('error'))
  }, [month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup TTS on unmount
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const theme   = SLIDE_THEMES[idx % SLIDE_THEMES.length]
  const monthLong = stats?.month || new Date(year, month-1,1).toLocaleString('en-US',{month:'long'})

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        <p className="text-white font-bold text-lg">Cooking your {monthLong} Wrapped… 🍳</p>
        <p className="text-white/60 text-sm">AI is reading your finances with great concern</p>
      </div>
    </Overlay>
  )

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (phase === 'error') return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <p className="text-5xl">😬</p>
        <p className="text-white font-bold text-lg">No data for {monthLong}</p>
        <p className="text-white/60 text-sm">Add some expenses first and come back!</p>
        <button onClick={onClose} className="mt-2 bg-white text-violet-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-50 transition">Close</button>
      </div>
    </Overlay>
  )

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (phase === 'done') return (
    <Overlay onClose={onClose} bg="from-violet-700 via-violet-800 to-indigo-900">
      <div className="flex flex-col items-center gap-5 text-center px-6">
        <p className="text-6xl animate-bounce">🎉</p>
        <p className="text-white font-black text-2xl">That's your {monthLong}!</p>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          You spent <strong className="text-white">{sym}{stats?.total?.toFixed(2)}</strong>,
          made <strong className="text-white">{stats?.txCount}</strong> transactions, and
          {stats?.saved >= 0
            ? <> saved <strong className="text-white">{sym}{stats?.saved?.toFixed(2)}</strong> 💪</>
            : <> went <strong className="text-red-300">{sym}{Math.abs(stats?.saved)?.toFixed(2)}</strong> over budget 😬</>
          }
        </p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => { setIdx(0); setAnim(true); setPhase('playing'); speak(slides[0]) }}
            className="bg-white/20 text-white border border-white/30 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/30 transition">
            🔁 Replay
          </button>
          <button onClick={onClose}
            className="bg-white text-violet-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-50 transition">
            Done
          </button>
        </div>
      </div>
    </Overlay>
  )

  // ── PLAYING ────────────────────────────────────────────────────────────────
  const slide = slides[idx]
  const isLast = idx === slides.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" onClick={e => { if(e.target === e.currentTarget) onClose() }}>

      {/* Background gradient */}
      <div className={`absolute inset-0 bg-linear-to-br ${theme.bg} transition-all duration-700`} />

      {/* Decorative blobs */}
      <div className={`absolute -top-20 -right-20 w-72 h-72 rounded-full ${theme.blob1} opacity-20 blur-3xl`} />
      <div className={`absolute -bottom-20 -left-20 w-72 h-72 rounded-full ${theme.blob2} opacity-20 blur-3xl`} />

      {/* Dot progress + close */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-safe pt-5">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i, true)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'bg-white w-6' : i < idx ? 'bg-white/60 w-3' : 'bg-white/30 w-3'}`} />
          ))}
        </div>
        <button onClick={() => { window.speechSynthesis?.cancel(); onClose() }}
          className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition text-sm font-bold">✕</button>
      </div>

      {/* Month badge */}
      <div className="relative z-10 flex justify-center mt-4">
        <span className="bg-white/15 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide uppercase">
          {monthLong} {year} Wrapped
        </span>
      </div>

      {/* Main slide content */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center transition-all duration-300 ${anim ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        {/* Slide emoji */}
        <div className="text-7xl mb-5 drop-shadow-lg" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {SLIDE_EMOJIS[idx]}
        </div>

        {/* Slide title */}
        <p className={`text-xs font-black uppercase tracking-widest mb-3 ${theme.accent}`}>{SLIDE_TITLES[idx]}</p>

        {/* Big stat depending on slide index */}
        {idx === 0 && stats && (
          <p className="text-5xl font-black text-white mb-4 tabular-nums drop-shadow">
            <CountUp target={stats.total} prefix={sym} />
          </p>
        )}
        {idx === 1 && stats?.topCat && (
          <div className="flex flex-col items-center gap-2 mb-4">
            <span className="text-5xl">{CAT_ICONS[stats.topCat] || '📦'}</span>
            <p className="text-3xl font-black text-white">{stats.topCat}</p>
            <p className="text-white/70 text-sm">{sym}{stats.topCatAmt?.toFixed(2)} this month</p>
            {stats.total > 0 && <ProgressBar pct={(stats.topCatAmt / stats.total) * 100} />}
          </div>
        )}
        {idx === 2 && stats?.biggestDesc && (
          <div className="mb-4 bg-white/10 rounded-2xl px-5 py-4">
            <p className="text-white font-semibold text-sm mb-1 truncate max-w-xs">{stats.biggestDesc}</p>
            <p className="text-4xl font-black text-white tabular-nums">{sym}{stats.biggestAmt?.toFixed(2)}</p>
          </div>
        )}
        {idx === 3 && (
          <p className="text-6xl font-black text-white mb-4">{stats?.txCount}</p>
        )}
        {idx === 4 && stats && (
          <div className="mb-4">
            <p className={`text-5xl font-black mb-1 tabular-nums ${stats.saved >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {stats.saved >= 0 ? '+' : '-'}{sym}{Math.abs(stats.saved)?.toFixed(2)}
            </p>
            <p className="text-white/70 text-sm">{stats.saved >= 0 ? 'Saved vs income' : 'Over budget'}</p>
            {stats.totalInc > 0 && <ProgressBar pct={Math.min((stats.total / stats.totalInc) * 100, 100)} color={stats.saved >= 0 ? 'bg-green-400' : 'bg-red-400'} />}
          </div>
        )}
        {idx === 5 && (
          <div className="text-6xl mb-4">💡</div>
        )}

        {/* AI-generated text */}
        <p className="text-white text-base font-semibold leading-relaxed max-w-sm">{slide}</p>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-safe pb-8 pt-4">
        <button onClick={prev} disabled={idx === 0}
          className="w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full text-white transition disabled:opacity-0">
          ←
        </button>
        <button onClick={() => {
          const u = new SpeechSynthesisUtterance(slide)
          u.rate = 1.05; u.pitch = 1.1
          window.speechSynthesis?.cancel()
          window.speechSynthesis?.speak(u)
        }}
          className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          Read aloud
        </button>
        <button onClick={next}
          className="w-10 h-10 flex items-center justify-center bg-white text-violet-700 font-black rounded-full hover:bg-violet-50 transition shadow-lg text-sm">
          {isLast ? '✓' : '→'}
        </button>
      </div>
    </div>
  )
}

function Overlay({ children, onClose, bg = 'from-violet-800 via-violet-900 to-indigo-950' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className={`absolute inset-0 bg-linear-to-br ${bg}`} />
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-400 opacity-20 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-indigo-400 opacity-20 blur-3xl" />
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold transition">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
