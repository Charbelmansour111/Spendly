import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Tour steps ─────────────────────────────────────────────────── */
export const TOUR_KEY = 'fina_active_tour'

export const TOUR_STEPS = [
  {
    page: '/dashboard',
    icon: 'home',
    title: 'Dashboard',
    subtitle: 'Your Financial Overview',
    desc: 'See your real-time balance, monthly spending vs. income, spending forecast, and budget alerts — all at a glance.',
    tags: ['Balance', 'Quick Add', 'Spending Trends'],
    action: 'Tap + Expense or + Income to log your first entry.',
    voice: "Welcome to your Dashboard — your financial home screen. Here you can see your current balance, track monthly spending versus income, and get spending forecasts. Use the plus button to quickly log an expense or income. Everything updates in real time.",
  },
  {
    page: '/transactions',
    icon: 'transactions',
    title: 'Transactions',
    subtitle: 'Your Complete History',
    desc: 'Every expense and income entry lives here. Filter by category or date, edit entries, mark as recurring, and export as CSV.',
    tags: ['Filter', 'Edit Entries', 'CSV Export'],
    action: 'Tap any transaction to edit, delete, or view details.',
    voice: "Transactions is your complete financial history. Every expense and income entry is listed here. You can filter by category or date, edit any entry, mark it as recurring, and export everything to CSV for your records.",
  },
  {
    page: '/budgets',
    icon: 'budget',
    title: 'Budgets',
    subtitle: 'Smart Spending Limits',
    desc: 'Set monthly or weekly limits per category. The AI alerts you at 85% and gives you a cut-back plan when you go over.',
    tags: ['Monthly Limits', 'AI Alerts', 'Smart Cuts'],
    action: 'Tap + to add a budget, or try AI Suggest for instant limits.',
    voice: "Budgets lets you set spending limits per category. The AI watches your spending and warns you at 85 percent. If you go over, it gives you a specific plan to cut back. Tap the plus button to create your first budget, or tap AI Suggest to let the AI generate limits based on your history.",
  },
  {
    page: '/net-worth',
    icon: 'networth',
    title: 'Net Worth',
    subtitle: 'Assets & Liabilities',
    desc: 'Track everything you own and owe — bank accounts, investments, real estate, loans, and credit cards — in one place.',
    tags: ['Assets', 'Liabilities', 'Net Worth Trend'],
    action: 'Add an asset or liability to see your true net worth.',
    voice: "Net Worth shows your complete financial picture — everything you own minus everything you owe. Add your bank accounts, investments, property, and any loans or credit cards. Your net worth updates automatically as transactions are logged.",
  },
  {
    page: '/settings',
    icon: 'settings',
    title: 'Settings',
    subtitle: 'Personalize Everything',
    desc: 'Set your currency, toggle dark mode, manage notifications, and replay this tutorial anytime from Settings.',
    tags: ['Currency', 'Dark Mode', 'Notifications'],
    action: 'Choose your preferred currency to get started.',
    voice: "Settings is where you personalize Fina. Choose your currency, toggle dark mode, manage notifications, and replay this tutorial whenever you need it. That's the full tour — you're all set. Welcome to Fina!",
  },
]

/* ── Female voice helper ────────────────────────────────────────── */
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 1.1
  utt.pitch = 1.1
  utt.volume = 1
  const pickVoice = () => {
    const v = window.speechSynthesis.getVoices()
    return v.find(x => x.name === 'Samantha')
      || v.find(x => x.name === 'Karen')
      || v.find(x => x.name === 'Moira')
      || v.find(x => x.name.includes('Google UK English Female'))
      || v.find(x => x.name.includes('Microsoft Zira'))
      || v.find(x => x.name.includes('Microsoft Aria'))
      || v.find(x => /female|woman/i.test(x.name) && x.lang.startsWith('en'))
      || v.find(x => x.lang === 'en-GB')
      || v.find(x => x.lang === 'en-US')
      || v[0]
  }
  const trySpeak = () => { utt.voice = pickVoice(); window.speechSynthesis.speak(utt) }
  if (window.speechSynthesis.getVoices().length) trySpeak()
  else { window.speechSynthesis.onvoiceschanged = () => { trySpeak(); window.speechSynthesis.onvoiceschanged = null } }
}

/* ── State helpers ──────────────────────────────────────────────── */
export function getTour()        { try { return JSON.parse(localStorage.getItem(TOUR_KEY)) } catch { return null } }
export function setTour(val)     { val ? localStorage.setItem(TOUR_KEY, JSON.stringify(val)) : localStorage.removeItem(TOUR_KEY) }
export function startTour(voice) { setTour({ step: -1, voice: !!voice }) }
export function clearTour()      { localStorage.removeItem(TOUR_KEY) }

const STEP_DURATION = 8

/* ── Animated up-arrows ─────────────────────────────────────────── */
function UpArrows() {
  return (
    <div className="flex flex-col items-center" style={{ gap: '1px' }}>
      {[0, 1, 2].map(i => (
        <svg key={i} width="20" height="12" viewBox="0 0 20 12" fill="none"
          style={{
            animation: 'arrowBounce 1.3s ease-in-out infinite',
            animationDelay: `${i * 0.22}s`,
            opacity: 1 - i * 0.28,
            marginTop: i > 0 ? '-3px' : '0',
          }}>
          <polyline points="2,10 10,2 18,10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  )
}

/* ── Countdown ring ─────────────────────────────────────────────── */
function CountdownRing({ total, current }) {
  const r = 13
  const circ = 2 * Math.PI * r
  const offset = circ - (current / total) * circ
  return (
    <svg width="32" height="32" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear' }} />
      <text x="16" y="16" textAnchor="middle" dominantBaseline="middle" fill="white"
        fontSize="9" fontWeight="bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: '16px 16px' }}>
        {current}
      </text>
    </svg>
  )
}

/* ── Main component ─────────────────────────────────────────────── */
export default function TourBanner() {
  const [tour, setTourState] = useState(() => getTour())
  const [cardVisible, setCardVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState(STEP_DURATION)
  const spokenStep = useRef(null)
  const timerRef = useRef(null)
  const goNextRef = useRef(null)

  const save = useCallback((updated) => { setTour(updated); setTourState(updated) }, [])
  const finish = useCallback(() => { window.speechSynthesis?.cancel(); clearTour(); setTourState(null) }, [])

  /* listen for tour start triggered by Onboarding */
  useEffect(() => {
    const onUpdate = () => setTourState(getTour())
    window.addEventListener('fina_tour_update', onUpdate)
    return () => window.removeEventListener('fina_tour_update', onUpdate)
  }, [])

  /* slide-in animation for welcome */
  useEffect(() => {
    if (tour?.step === -1) {
      const t = setTimeout(() => setCardVisible(true), 60)
      return () => clearTimeout(t)
    } else { setCardVisible(false) }
  }, [tour?.step])

  /* auto-advance timer per step */
  useEffect(() => {
    if (!tour || tour.step < 0) return
    setTimeLeft(STEP_DURATION)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [tour?.step])

  /* auto-advance when timer hits 0 */
  useEffect(() => {
    if (timeLeft === 0 && tour && tour.step >= 0) {
      goNextRef.current?.()
    }
  }, [timeLeft])

  /* voice narration */
  useEffect(() => {
    if (!tour || !tour.voice) return
    const key = tour.step
    if (spokenStep.current === key) return
    spokenStep.current = key
    if (key === -1) {
      const t = setTimeout(() => speak("Hello! Welcome to Fina — your personal finance companion. I'm here to guide you through everything. Would you like to start the tour?"), 500)
      return () => { clearTimeout(t); window.speechSynthesis?.cancel() }
    }
    const step = TOUR_STEPS[key]
    if (!step) return
    const t = setTimeout(() => speak(step.voice), 300)
    return () => { clearTimeout(t); window.speechSynthesis?.cancel() }
  }, [tour?.step, tour?.voice])

  const toggleVoice = () => {
    const next = { ...tour, voice: !tour.voice }
    if (!next.voice) window.speechSynthesis?.cancel()
    else {
      if (tour.step === -1) speak("Hello! Welcome to Fina — your personal finance companion.")
      else if (TOUR_STEPS[tour.step]) speak(TOUR_STEPS[tour.step].voice)
    }
    save(next)
  }

  const goNext = useCallback(() => {
    if (!tour) return
    if (tour.step === TOUR_STEPS.length - 1) { finish(); return }
    const nextStep = tour.step + 1
    save({ ...tour, step: nextStep })
    spokenStep.current = null
    const nextPage = TOUR_STEPS[nextStep].page
    if (window.location.pathname !== nextPage) window.location.href = nextPage
  }, [tour, finish, save])

  goNextRef.current = goNext

  const goBack = () => {
    if (tour.step <= 0) return
    const prevStep = tour.step - 1
    save({ ...tour, step: prevStep })
    spokenStep.current = null
    const prevPage = TOUR_STEPS[prevStep].page
    if (window.location.pathname !== prevPage) window.location.href = prevPage
  }

  const startFromWelcome = () => {
    window.speechSynthesis?.cancel()
    spokenStep.current = null
    save({ ...tour, step: 0 })
    if (window.location.pathname !== '/dashboard') window.location.href = '/dashboard'
  }

  const path = window.location.pathname
  const authPages = ['/', '/login', '/register', '/verify-email', '/forgot-password', '/account-type', '/terms', '/privacy']
  if (!tour || authPages.includes(path)) return null

  /* ── Welcome modal (step -1) ── */
  if (tour.step === -1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a0a2e 40%, #0d1b3e 70%, #060c1a 100%)' }}>
        <style>{`
          @keyframes tourSlideUp {
            from { opacity:0; transform:translateY(36px) scale(0.95); }
            to   { opacity:1; transform:translateY(0) scale(1); }
          }
          @keyframes tourWave {
            0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-18deg)} 40%{transform:rotate(18deg)}
            60%{transform:rotate(-12deg)} 80%{transform:rotate(12deg)}
          }
          @keyframes tourFloat {
            0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)}
          }
          @keyframes tourOrb {
            0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(8px,-12px) scale(1.05)}
            66%{transform:translate(-6px,8px) scale(0.97)}
          }
          @keyframes arrowBounce {
            0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)}
          }
          .tour-slide-up { animation: tourSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
          .tour-wave     { display:inline-block; animation: tourWave 1.6s ease-in-out 0.7s 2; transform-origin:70% 80%; }
          .tour-float-a  { animation: tourFloat 3.8s ease-in-out infinite; }
          .tour-float-b  { animation: tourFloat 5s ease-in-out infinite 0.8s; }
          .tour-orb-a    { animation: tourOrb 7s ease-in-out infinite; }
          .tour-orb-b    { animation: tourOrb 9s ease-in-out infinite 1.5s; }
        `}</style>

        {/* background orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full tour-orb-a pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full tour-orb-b pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)' }} />

        <div className={`w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl relative ${cardVisible ? 'tour-slide-up' : 'opacity-0'}`}
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}>

          {/* Header */}
          <div className="relative px-7 pt-9 pb-8 text-white text-center overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #1e1040 0%, #2d1b69 50%, #1e3a8a 100%)' }}>
            <div className="absolute inset-0"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(139,92,246,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.2) 0%, transparent 50%)' }} />
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-violet-500/10 rounded-full tour-float-a" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-blue-500/10 rounded-full tour-float-b" />

            {/* floating mini badges */}
            <div className="absolute top-5 left-4 tour-float-b">
              <div className="backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-[9px] font-bold text-white/70 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.08)' }}>💰 Balance</div>
            </div>
            <div className="absolute top-5 right-4 tour-float-a">
              <div className="backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-[9px] font-bold text-white/70 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.08)' }}>🎯 Budgets</div>
            </div>
            <div className="absolute bottom-7 right-4 tour-float-b" style={{ animationDelay: '1.2s' }}>
              <div className="backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-[9px] font-bold text-white/70 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.08)' }}>📊 Analytics</div>
            </div>

            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/15"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <span className="text-3xl tour-wave">👋</span>
              </div>
              <h2 className="text-2xl font-black mb-2">Welcome to Fina!</h2>
              <p className="text-white/55 text-sm leading-relaxed">Your smart personal finance companion. Take a 2-minute guided tour and get the most out of every feature.</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-white/35 text-[11px]">5 pages</span>
                <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <span className="text-white/35 text-[11px]">~2 minutes</span>
                <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <span className="text-white/35 text-[11px]">fully interactive</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-gray-900 px-6 py-5 space-y-3">
            {/* Voice toggle */}
            <button onClick={toggleVoice} className="cursor-pointer w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all"
              style={tour.voice
                ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.06)' }
                : { borderColor: 'var(--color-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                style={{ background: tour.voice ? '#7C3AED' : 'var(--color-border)' }}>
                {tour.voice
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                }
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: tour.voice ? '#7C3AED' : 'var(--color-text-primary)' }}>AI Voice Guide</p>
                <p className="text-xs text-gray-400 mt-0.5">{tour.voice ? 'On — explains each step aloud' : 'Off — read at your own pace'}</p>
              </div>
              <div className="w-10 h-6 rounded-full relative transition-colors" style={{ background: tour.voice ? '#7C3AED' : '#D1D5DB' }}>
                <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200" style={{ left: tour.voice ? '20px' : '4px' }} />
              </div>
            </button>

            <button onClick={startFromWelcome} className="cursor-pointer w-full text-white py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start the Tour
            </button>

            <button onClick={finish} className="cursor-pointer w-full py-2.5 text-gray-400 text-sm hover:text-gray-600 dark:hover:text-gray-300 transition">
              Skip — I'll explore myself
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Step banner (steps 0–N) ── */
  const current = TOUR_STEPS[tour.step]
  if (!current) return null
  const isLast = tour.step === TOUR_STEPS.length - 1
  const progress = ((tour.step + 1) / TOUR_STEPS.length) * 100

  return (
    <div className="fixed bottom-24 md:bottom-4 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <style>{`
        @keyframes arrowBounce {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)}
        }
        @keyframes tourStepIn {
          from{opacity:0;transform:translateY(14px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes tagPulse {
          0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-2px) scale(1.02)}
        }
      `}</style>

      <div className="w-full max-w-md pointer-events-auto" style={{ animation: 'tourStepIn 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
        {/* Animated arrows pointing up at content */}
        <div className="flex justify-center mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <UpArrows />
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}>

          {/* Header gradient */}
          <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1e1040 0%, #2d1b69 55%, #1e3a8a 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
                  <span className="text-white text-xs font-black">{tour.step + 1}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{current.title}</p>
                  <p className="text-white/45 text-[10px]">{current.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Dot indicators */}
                <div className="flex gap-1 mr-0.5">
                  {TOUR_STEPS.map((_, i) => (
                    <span key={i} className="rounded-full transition-all duration-300"
                      style={{
                        width: i === tour.step ? '14px' : '6px',
                        height: '6px',
                        background: i === tour.step ? 'white' : i < tour.step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)',
                      }} />
                  ))}
                </div>

                {/* Countdown ring */}
                <CountdownRing total={STEP_DURATION} current={timeLeft} />

                {/* Voice toggle */}
                <button onClick={toggleVoice} className="cursor-pointer p-1.5 rounded-lg transition"
                  style={{ background: tour.voice ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ color: tour.voice ? 'white' : 'rgba(255,255,255,0.35)' }}>
                    {tour.voice
                      ? <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
                      : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
                    }
                  </svg>
                </button>

                {/* Close */}
                <button onClick={finish} className="cursor-pointer p-1.5 rounded-lg transition"
                  style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: 'rgba(255,255,255,0.75)' }} />
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3.5">
            {/* Feature tags */}
            <div className="flex gap-1.5 mb-2.5 flex-wrap">
              {current.tags.map((tag, i) => (
                <span key={tag} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg border"
                  style={{
                    background: 'rgba(124,58,237,0.07)',
                    color: '#7C3AED',
                    borderColor: 'rgba(124,58,237,0.15)',
                    animation: `tagPulse 2.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.45}s`,
                  }}>
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{current.desc}</p>

            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#7C3AED' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              {current.action}
            </p>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2 mt-3">
              {tour.step > 0 && (
                <button onClick={goBack} className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold transition border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  ← Back
                </button>
              )}
              <button onClick={goNext} className="cursor-pointer flex-1 py-2 rounded-xl text-white text-xs font-bold transition active:scale-95"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                {isLast ? "Done — Let's go! 🚀" : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
