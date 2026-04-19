import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Tour steps ─────────────────────────────────────────────────── */
export const TOUR_KEY = 'spendly_active_tour'

export const TOUR_STEPS = [
  {
    page: '/dashboard',
    emoji: '🏠',
    title: 'Your Dashboard',
    desc: 'Your financial home screen — balance, spending vs income, spending forecast, upcoming bills, and budget alerts all in one place.',
    action: '👀 Scroll down to explore your overview.',
    voice: "This is your Dashboard — your financial home screen. Here you'll find your balance, monthly spending, income, a spending forecast, upcoming bills, and budget alerts, all updating in real time.",
  },
  {
    page: '/transactions',
    emoji: '💸',
    title: 'Log an Expense',
    desc: 'Every expense and income entry lives here. Tap + to add your first expense — or use the mic to speak it.',
    action: '👆 Tap the purple + button to add an expense now.',
    voice: "This is Transactions. Tap the plus button to log an expense. Or tap the purple mic button and say something like: spent 15 dollars on lunch — it logs it instantly.",
  },
  {
    page: '/budgets',
    emoji: '🎯',
    title: 'Set a Spending Budget',
    desc: 'Set a monthly limit per category. The AI warns you at 85% and gives you a cut-back plan when you go over.',
    action: '👆 Tap + to create your first budget.',
    voice: "Budgets lets you set monthly spending limits per category. Tap the plus button to create your first budget. The AI warns you at 85 percent and gives you a specific plan if you go over.",
  },
  {
    page: '/goals',
    emoji: '🏆',
    title: 'Save & Track Debt',
    desc: 'Create savings goals for anything — vacation, emergency fund. Or switch to Debt to track loans and credit cards.',
    action: '👆 Tap + to set a savings goal or add a debt.',
    voice: "Goals is two features in one. Set a savings goal for anything you want, or tap Debt to track loans and credit cards with a visual payoff progress bar.",
  },
  {
    page: '/subscriptions',
    emoji: '📱',
    title: 'Track Subscriptions',
    desc: 'Add your recurring payments — Netflix, gym, insurance. See renewal countdowns and get an AI audit of what to cut.',
    action: '👆 Tap + Add to log your first subscription.',
    voice: "Subscriptions tracks all your recurring payments. Add Netflix, Spotify, your gym, or any monthly bill. You'll see renewal countdowns and an AI audit that tells you which ones are worth keeping.",
  },
  {
    page: '/insights',
    emoji: '🤖',
    title: 'Ask the AI',
    desc: 'Chat with your AI finance advisor — it knows your real numbers. Type or tap the mic to speak.',
    action: '🎤 Try: "Where am I overspending this month?"',
    voice: "This is your AI Finance Assistant. It knows all your transaction data and gives honest, specific advice. Tap the mic or type a question. Try asking: where am I overspending this month? That's the full tour — you're all set. Good luck!",
  },
]

/* ── Female voice helper ────────────────────────────────────────── */
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate   = 1.12
  utt.pitch  = 1.15
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
export function startTour(voice) { setTour({ step: -1, voice: !!voice }) }  // -1 = welcome screen
export function clearTour()      { localStorage.removeItem(TOUR_KEY) }

/* ── Main component ─────────────────────────────────────────────── */
export default function TourBanner() {
  const [tour, setTourState] = useState(() => getTour())
  const [cardVisible, setCardVisible] = useState(false)
  const spokenStep = useRef(null)

  const save = useCallback((updated) => { setTour(updated); setTourState(updated) }, [])
  const finish = useCallback(() => { window.speechSynthesis?.cancel(); clearTour(); setTourState(null) }, [])

  /* listen for tour start triggered by Onboarding */
  useEffect(() => {
    const onUpdate = () => setTourState(getTour())
    window.addEventListener('spendly_tour_update', onUpdate)
    return () => window.removeEventListener('spendly_tour_update', onUpdate)
  }, [])

  /* slide-in animation for welcome */
  useEffect(() => {
    if (tour?.step === -1) {
      const t = setTimeout(() => setCardVisible(true), 60)
      return () => clearTimeout(t)
    } else { setCardVisible(false) }
  }, [tour?.step])

  /* speak on each step (deduplicated) */
  useEffect(() => {
    if (!tour || !tour.voice) return
    const key = tour.step
    if (spokenStep.current === key) return
    spokenStep.current = key

    if (key === -1) {
      const t = setTimeout(() => speak("Hello! Welcome to Spendly — your personal finance companion. I'm here to guide you through everything. Would you like to start the tour?"), 500)
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
      if (tour.step === -1) speak("Hello! Welcome to Spendly — your personal finance companion.")
      else if (TOUR_STEPS[tour.step]) speak(TOUR_STEPS[tour.step].voice)
    }
    save(next)
  }

  const goNext = () => {
    if (tour.step === TOUR_STEPS.length - 1) { finish(); return }
    const nextStep = tour.step + 1
    save({ ...tour, step: nextStep })
    spokenStep.current = null
    const nextPage = TOUR_STEPS[nextStep].page
    if (window.location.pathname !== nextPage) window.location.href = nextPage
  }

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
        <style>{`
          @keyframes tourSlideUp {
            from { opacity:0; transform:translateY(28px) scale(0.97); }
            to   { opacity:1; transform:translateY(0) scale(1); }
          }
          @keyframes tourWave {
            0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-18deg)} 40%{transform:rotate(18deg)} 60%{transform:rotate(-12deg)} 80%{transform:rotate(12deg)}
          }
          @keyframes tourFloat {
            0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)}
          }
          @keyframes tourShimmer {
            0%{background-position:-200% center} 100%{background-position:200% center}
          }
          .tour-slide-up  { animation: tourSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
          .tour-wave      { display:inline-block; animation: tourWave 1.8s ease-in-out 0.5s 2; transform-origin:70% 80%; }
          .tour-float-a   { animation: tourFloat 4s ease-in-out infinite; }
          .tour-float-b   { animation: tourFloat 5s ease-in-out infinite 0.9s; }
          .tour-shimmer   { background:linear-gradient(90deg,#fff 30%,rgba(255,255,255,0.45) 50%,#fff 70%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:tourShimmer 2.5s linear 0.8s 2; }
        `}</style>

        <div className={`bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${cardVisible ? 'tour-slide-up' : 'opacity-0'}`}>

          {/* Hero */}
          <div className="bg-linear-to-br from-violet-600 to-indigo-700 px-6 pt-8 pb-7 text-white text-center relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
            <div className="absolute -bottom-5 -left-5 w-20 h-20 bg-white/5 rounded-full" />
            <div className="absolute top-5 left-6 w-9 h-9 bg-white/10 rounded-full tour-float-a" />
            <div className="absolute top-7 right-8 w-5 h-5 bg-white/10 rounded-full tour-float-b" />

            {/* floating mini badges */}
            <div className="absolute top-4 right-4 tour-float-b">
              <div className="bg-white/15 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-white/90">💰 Balance</div>
            </div>
            <div className="absolute bottom-5 right-3 tour-float-a">
              <div className="bg-white/15 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-white/90">🎯 Budgets</div>
            </div>

            <div className="relative">
              <div className="text-6xl mb-3 tour-wave">👋</div>
              <h2 className="text-2xl font-bold mb-1 tour-shimmer">Welcome to Spendly!</h2>
              <p className="text-white/75 text-sm leading-relaxed mt-2">Your smart finance companion. Take a quick guided tour and see exactly how everything works.</p>
              <p className="text-white/40 text-xs mt-2">6 pages · 2 minutes · fully interactive</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3">

            {/* Voice toggle */}
            <button onClick={toggleVoice}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all ${tour.voice ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${tour.voice ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {tour.voice
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                }
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${tour.voice ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-200'}`}>AI Voice Narration</p>
                <p className="text-xs text-gray-400 mt-0.5">{tour.voice ? 'On — guide explains each step aloud' : 'Off — read at your own pace'}</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${tour.voice ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${tour.voice ? 'left-5' : 'left-1'}`} />
              </div>
            </button>

            <button onClick={startFromWelcome}
              className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start the Tour
            </button>

            <button onClick={finish}
              className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Skip — I'll explore myself
            </button>

            <p className="text-center text-xs text-gray-400">Replay anytime from Profile → Account → Replay Tutorial</p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Floating tour banner (steps 0–5) ── */
  const current = TOUR_STEPS[tour.step]
  if (!current) return null
  const isLast = tour.step === TOUR_STEPS.length - 1

  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden pointer-events-auto">

        {/* Header */}
        <div className="bg-linear-to-r from-violet-600 to-indigo-600 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{current.emoji}</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{current.title}</p>
              <p className="text-white/60 text-[10px]">Step {tour.step + 1} of {TOUR_STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1 mr-1">
              {TOUR_STEPS.map((_, i) => (
                <span key={i} className={`rounded-full transition-all ${i === tour.step ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'}`} />
              ))}
            </div>
            <button onClick={toggleVoice}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition ${tour.voice ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
              {tour.voice
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              }
              {tour.voice ? 'On' : 'Off'}
            </button>
            <button onClick={finish} className="text-white/60 hover:text-white transition ml-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${((tour.step + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>

        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-1">{current.desc}</p>
          <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{current.action}</p>
          <div className="flex gap-2 mt-3">
            {tour.step > 0 && (
              <button onClick={goBack} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                ← Back
              </button>
            )}
            <button onClick={goNext} className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-bold transition">
              {isLast ? "Done — Let's go! 🚀" : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
