import { useState, useEffect, useRef, useCallback } from 'react'

export const TOUR_KEY = 'spendly_active_tour'

export const TOUR_STEPS = [
  {
    page: '/dashboard',
    emoji: '🏠',
    title: 'Your Dashboard',
    desc: 'This is your financial home screen — balance, spending vs income, spending forecast, upcoming bills, and budget alerts all in one place.',
    action: '👀 Scroll down to explore your overview.',
    voice: "Welcome to Spendly! This is your Dashboard — your financial home screen. You can see your balance, monthly spending, income, a spending forecast, upcoming bills, and budget alerts, all updating in real time.",
  },
  {
    page: '/transactions',
    emoji: '💸',
    title: 'Log an Expense',
    desc: 'Every expense and income entry lives here. Tap the + button to add your first expense — or use the mic to speak it.',
    action: '👆 Tap the purple + button to add an expense now.',
    voice: "This is Transactions. Every expense and income entry lives here. Tap the plus button to add an expense. Or tap the purple mic button and say something like: spent 15 dollars on lunch — it logs it instantly.",
  },
  {
    page: '/budgets',
    emoji: '🎯',
    title: 'Set a Spending Budget',
    desc: 'Set a monthly limit for any spending category. The AI warns you at 85% and gives you a cut-back plan when you go over.',
    action: '👆 Tap + to create your first budget.',
    voice: "Budgets lets you set monthly spending limits per category. Tap the plus button to create your first budget. The AI will warn you when you reach 85 percent, and give you a specific cut-back plan if you go over 100.",
  },
  {
    page: '/goals',
    emoji: '🏆',
    title: 'Save & Track Debt',
    desc: 'Create savings goals for anything — vacation, emergency fund, new phone. Or switch to Debt to track loans and credit cards.',
    action: '👆 Tap + to set a savings goal or add a debt.',
    voice: "Goals is two features in one. Set a savings goal for a vacation, an emergency fund, or anything else. Or tap Debt to track loans and credit cards with a visual payoff progress bar. Tap plus to get started.",
  },
  {
    page: '/subscriptions',
    emoji: '📱',
    title: 'Track Subscriptions',
    desc: 'Add your recurring payments — Netflix, gym, insurance. See renewal countdowns, yearly totals, and get an AI audit of what to cut.',
    action: '👆 Tap + Add to log your first subscription.',
    voice: "Subscriptions tracks all your recurring payments. Add Netflix, Spotify, your gym membership, or any monthly bill. You'll see renewal countdowns, monthly and yearly cost totals, and an AI audit that tells you which subscriptions are actually worth keeping.",
  },
  {
    page: '/insights',
    emoji: '🤖',
    title: 'Ask the AI',
    desc: 'Chat with your AI finance advisor — it knows your real numbers. Type or tap the mic to speak your question.',
    action: '🎤 Try asking: "Where am I overspending this month?"',
    voice: "This is your AI Finance Assistant. It has access to all your real transaction data and gives you honest, specific advice. Type a question or tap the mic to speak. A great first question is: where am I overspending this month?",
  },
]

/* ── Female voice, faster, accurate ─────────────────────────────── */
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate  = 1.12
  utt.pitch = 1.15
  utt.volume = 1

  const pickVoice = () => {
    const v = window.speechSynthesis.getVoices()
    return v.find(x => x.name === 'Samantha')                          // macOS/iOS
      || v.find(x => x.name === 'Karen')                               // macOS
      || v.find(x => x.name === 'Moira')                               // macOS
      || v.find(x => x.name.includes('Google UK English Female'))      // Chrome Android/desktop
      || v.find(x => x.name.includes('Microsoft Zira'))                // Windows
      || v.find(x => x.name.includes('Microsoft Aria'))                // Windows 11
      || v.find(x => /female|woman/i.test(x.name) && x.lang.startsWith('en'))
      || v.find(x => x.lang === 'en-GB')
      || v.find(x => x.lang === 'en-US')
      || v[0]
  }

  const trySpeak = () => {
    utt.voice = pickVoice()
    window.speechSynthesis.speak(utt)
  }
  if (window.speechSynthesis.getVoices().length) trySpeak()
  else { window.speechSynthesis.onvoiceschanged = () => { trySpeak(); window.speechSynthesis.onvoiceschanged = null } }
}

/* ── Helper to read/write tour state ────────────────────────────── */
export function getTour()          { try { return JSON.parse(localStorage.getItem(TOUR_KEY)) } catch { return null } }
export function setTour(val)       { if (val) localStorage.setItem(TOUR_KEY, JSON.stringify(val)); else localStorage.removeItem(TOUR_KEY) }
export function startTour(voice)   { setTour({ step: 0, voice: !!voice }) }
export function clearTour()        { localStorage.removeItem(TOUR_KEY) }

/* ── Component ──────────────────────────────────────────────────── */
export default function TourBanner() {
  const [tour, setTourState] = useState(() => getTour())
  const spokenStep = useRef(-1)

  const current = tour ? TOUR_STEPS[tour.step] : null
  const isLast  = tour ? tour.step === TOUR_STEPS.length - 1 : false

  /* speak on step mount */
  useEffect(() => {
    if (!tour || !tour.voice || !current) return
    if (spokenStep.current === tour.step) return
    spokenStep.current = tour.step
    const t = setTimeout(() => speak(current.voice), 300)
    return () => { clearTimeout(t); window.speechSynthesis?.cancel() }
  }, [tour?.step, tour?.voice])

  /* listen for tour start from welcome screen (same-page case) */
  useEffect(() => {
    const onStorage = () => setTourState(getTour())
    window.addEventListener('spendly_tour_update', onStorage)
    return () => window.removeEventListener('spendly_tour_update', onStorage)
  }, [])

  const save = useCallback((updated) => {
    setTour(updated)
    setTourState(updated)
  }, [])

  const finish = useCallback(() => {
    window.speechSynthesis?.cancel()
    clearTour()
    setTourState(null)
  }, [])

  const toggleVoice = () => {
    const updated = { ...tour, voice: !tour.voice }
    if (!updated.voice) window.speechSynthesis?.cancel()
    else speak(current.voice)
    save(updated)
  }

  const goNext = () => {
    if (isLast) { finish(); return }
    const nextStep = tour.step + 1
    const nextPage = TOUR_STEPS[nextStep].page
    save({ ...tour, step: nextStep })
    if (window.location.pathname !== nextPage) window.location.href = nextPage
  }

  const goBack = () => {
    if (tour.step === 0) return
    const prevStep = tour.step - 1
    const prevPage = TOUR_STEPS[prevStep].page
    save({ ...tour, step: prevStep })
    if (window.location.pathname !== prevPage) window.location.href = prevPage
  }

  /* don't show on auth pages */
  const path = window.location.pathname
  const authPages = ['/', '/login', '/register', '/verify-email', '/forgot-password', '/account-type', '/terms', '/privacy']
  if (!tour || authPages.includes(path)) return null

  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden pointer-events-auto">

        {/* Header strip */}
        <div className="bg-linear-to-r from-violet-600 to-indigo-600 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{current.emoji}</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{current.title}</p>
              <p className="text-white/60 text-[10px]">Step {tour.step + 1} of {TOUR_STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Progress dots */}
            <div className="flex gap-1 mr-1">
              {TOUR_STEPS.map((_, i) => (
                <span key={i} className={`rounded-full transition-all ${i === tour.step ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'}`} />
              ))}
            </div>
            {/* Voice toggle */}
            <button onClick={toggleVoice}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition ${tour.voice ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
              {tour.voice ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              )}
              {tour.voice ? 'On' : 'Off'}
            </button>
            <button onClick={finish} className="text-white/60 hover:text-white transition ml-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-violet-500 transition-all duration-500"
            style={{ width: `${((tour.step + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-1">{current.desc}</p>
          <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{current.action}</p>

          <div className="flex gap-2 mt-3">
            {tour.step > 0 && (
              <button onClick={goBack}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                ← Back
              </button>
            )}
            <button onClick={goNext}
              className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-bold transition">
              {isLast ? 'Done — Let\'s go! 🚀' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
