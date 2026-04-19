import { useState, useEffect, useCallback } from 'react'

const TOUR = [
  {
    emoji: '👋',
    title: 'Welcome to Spendly!',
    desc: "You're all set. Here's a quick tour of everything the app can do — takes about 30 seconds.",
    color: 'from-violet-600 to-purple-700',
    href: null,
    cta: 'Start tour',
    voice: "Welcome to Spendly! I'm your financial guide. Let me walk you through everything this app can do. It takes about 30 seconds.",
  },
  {
    emoji: '📊',
    title: 'Dashboard',
    desc: 'Your financial home screen. See your monthly balance, income vs spending, savings rate, live news, and personalized tips — all at a glance.',
    color: 'from-violet-500 to-violet-700',
    href: '/dashboard',
    cta: 'Next',
    hint: 'Swipe the cards at the top to switch between Overview, News, and Tips.',
    voice: "The Dashboard is your financial home screen. You can see your monthly balance, income versus spending, your savings rate, live finance news, and personalized tips — all in one place. Swipe the top cards to switch between views.",
  },
  {
    emoji: '💸',
    title: 'Transactions',
    desc: 'Every expense and income entry in one place. Three tabs: Expenses, Income, and All. Filter by category or date, edit any entry, and export as CSV.',
    color: 'from-blue-500 to-blue-700',
    href: '/transactions',
    cta: 'Next',
    hint: 'Switch between Expenses / Income / All tabs at the top of the page.',
    voice: "Transactions keeps every expense and income entry in one place. Switch between Expenses, Income, and All tabs. You can filter by category or date, edit any entry inline, and export everything as a CSV file.",
  },
  {
    emoji: '🎯',
    title: 'Budgets',
    desc: 'Set a monthly spending limit per category. The AI warns you at 85% and roasts you at 100%. Stay under budget, stay sane.',
    color: 'from-orange-500 to-orange-700',
    href: '/budgets',
    cta: 'Next',
    hint: 'Tap "Ask AI" when you\'re close to the limit — it gives you a specific cut-back plan.',
    voice: "Budgets lets you set monthly spending limits per category. The AI advisor warns you when you reach 85 percent of your limit, and gives you a roast if you go over 100 percent. Tap Ask AI near the limit to get a specific cut-back plan.",
  },
  {
    emoji: '🏆',
    title: 'Goals',
    desc: 'Two in one — Savings Goals and Debt Tracker. Save for a vacation, a car, or an emergency fund. Track loans and credit cards with a payoff progress bar.',
    color: 'from-green-500 to-green-700',
    href: '/goals',
    cta: 'Next',
    hint: 'Mid-progress goals have an "Ask AI for tips" button — use it to get a specific strategy.',
    voice: "Goals is two features in one. Set savings goals for vacations, a car, or an emergency fund. Or track your debts and loans with a visual payoff progress bar. Mid-progress goals have an Ask AI button for a personalized payoff strategy.",
  },
  {
    emoji: '📄',
    title: 'Reports',
    desc: 'Full monthly breakdown with charts, category tables, and a complete transaction list. Browse any past month and export as PDF or CSV.',
    color: 'from-gray-600 to-gray-800',
    href: '/reports',
    cta: 'Next',
    hint: 'Use the month selector to compare spending across months.',
    voice: "Reports gives you a full monthly breakdown with pie charts, bar charts, a summary table, and a complete transaction list for every expense and income. Use the month selector at the top to browse any past month and compare spending over time. Export as PDF or CSV in one tap.",
  },
  {
    emoji: '🤖',
    title: 'AI Insights',
    desc: 'Chat with your sarcastic AI finance advisor. It knows your exact numbers and gives brutally honest, actionable advice — plus a roast or two.',
    color: 'from-purple-500 to-purple-700',
    href: '/insights',
    cta: 'Next',
    hint: 'Try the quick-question pills at the bottom — "Where am I overspending?" is a great start.',
    voice: "AI Insights lets you chat directly with your personal finance advisor. It knows your exact transaction data and gives honest, actionable advice — sometimes with a roast included. Try the quick-question pills at the bottom. Where am I overspending is a great place to start.",
  },
  {
    emoji: '🎤',
    title: 'Voice Assistant',
    desc: 'Double-tap the AI tab in the bottom nav to open the voice assistant. Speak in any language — add expenses, set budgets, create goals, or navigate anywhere, hands-free.',
    color: 'from-violet-600 to-indigo-700',
    href: null,
    cta: 'Next',
    hint: 'Works in 12+ languages. Tap "Preferences" in Profile to set your mic language and AI response language separately.',
    voice: "The Voice Assistant lets you control the entire app hands-free. Double-tap the AI tab in the bottom navigation to open it. Say things like: add 20 dollars for groceries, or create a savings goal for my vacation. It works in over 12 languages, which you can configure in Profile preferences.",
  },
  {
    emoji: '💚',
    title: 'My Wellness',
    desc: 'Your financial health score from 0 to 100, a breakdown of good habits, achievements, mood tracker, and mini-games that teach money skills while you play.',
    color: 'from-teal-500 to-teal-700',
    href: '/wellness',
    cta: "Let's go!",
    hint: 'Press "Calculate My Score" to see your score update in real time.',
    voice: "My Wellness calculates your financial health score from 0 to 100 based on your saving habits and spending discipline. You'll also find achievements to unlock, a mood tracker, and mini-games that teach real money skills. Tap Calculate My Score to see your score update live. That's the full tour — you're ready to take control of your finances. Good luck!",
  },
]

function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.97
  utt.pitch = 1.05
  utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang === 'en-US')
    || voices.find(v => v.lang.startsWith('en'))
  if (preferred) utt.voice = preferred
  window.speechSynthesis.speak(utt)
}

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [muted, setMuted] = useState(false)
  const current = TOUR[step]
  const isLast = step === TOUR.length - 1

  useEffect(() => {
    if (muted) { window.speechSynthesis?.cancel(); return }
    const timer = setTimeout(() => speak(current.voice || `${current.title}. ${current.desc}`), 120)
    return () => { clearTimeout(timer); window.speechSynthesis?.cancel() }
  }, [step, muted])

  const handleDone = useCallback(() => {
    window.speechSynthesis?.cancel()
    onDone()
  }, [onDone])

  const next = () => {
    if (isLast) { handleDone(); return }
    setStep(s => s + 1)
  }

  const goTo = (href) => {
    handleDone()
    if (href) window.location.href = href
  }

  const toggleMute = () => {
    setMuted(m => {
      if (!m) window.speechSynthesis?.cancel()
      else setTimeout(() => speak(current.voice || `${current.title}. ${current.desc}`), 80)
      return !m
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Gradient header */}
        <div className={`bg-linear-to-br ${current.color} px-6 pt-8 pb-6 text-white relative`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
              {step + 1} / {TOUR.length}
            </span>
            <div className="flex items-center gap-2">
              {/* Mute / unmute TTS */}
              <button
                onClick={toggleMute}
                title={muted ? 'Unmute AI voice' : 'Mute AI voice'}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition text-white/80 hover:text-white"
              >
                {muted ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
              <button onClick={handleDone} className="text-white/60 hover:text-white text-xs font-medium transition">
                Skip tour
              </button>
            </div>
          </div>
          <div className="text-5xl mb-3">{current.emoji}</div>
          <h2 className="text-xl font-bold mb-2">{current.title}</h2>
          <p className="text-white/85 text-sm leading-relaxed">{current.desc}</p>

          {/* AI voice indicator */}
          {!muted && (
            <div className="absolute bottom-3 right-4 flex items-center gap-1 text-white/40 text-[10px] font-medium">
              <span className="flex gap-0.5">
                {[1,2,3].map(i => (
                  <span key={i} className="w-0.5 bg-white/50 rounded-full animate-pulse" style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
              AI speaking
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-violet-500 transition-all duration-400"
            style={{ width: `${((step + 1) / TOUR.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {current.hint && (
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                <span className="font-bold">Tip: </span>{current.hint}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {current.href && (
              <button
                onClick={() => goTo(current.href)}
                className="flex-1 py-3 rounded-xl border-2 border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
              >
                Open page →
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition"
            >
              {current.cta}
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1 mt-4">
            {TOUR.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`rounded-full transition-all ${i === step ? 'w-4 h-1.5 bg-violet-600' : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
