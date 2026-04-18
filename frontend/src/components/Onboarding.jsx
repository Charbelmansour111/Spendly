import { useState } from 'react'

const TOUR = [
  {
    emoji: '👋',
    title: 'Welcome to Spendly!',
    desc: "You're all set. Here's a quick tour of everything the app can do — takes about 30 seconds.",
    color: 'from-violet-600 to-purple-700',
    href: null,
    cta: 'Start tour',
  },
  {
    emoji: '📊',
    title: 'Dashboard',
    desc: 'Your financial home screen. See your monthly balance, income vs spending, savings rate, live news, and personalized tips — all at a glance.',
    color: 'from-violet-500 to-violet-700',
    href: '/dashboard',
    cta: 'Next',
    hint: 'Swipe the cards at the top to switch between Overview, News, and Tips.',
  },
  {
    emoji: '💸',
    title: 'Transactions',
    desc: 'Every expense and income entry in one place. Three tabs: Expenses, Income, and All. Filter by category or date, edit any entry, and export as CSV.',
    color: 'from-blue-500 to-blue-700',
    href: '/transactions',
    cta: 'Next',
    hint: 'Switch between Expenses / Income / All tabs at the top of the page.',
  },
  {
    emoji: '🎯',
    title: 'Budgets',
    desc: 'Set a monthly spending limit per category. The AI warns you at 85% and roasts you at 100%. Stay under budget, stay sane.',
    color: 'from-orange-500 to-orange-700',
    href: '/budgets',
    cta: 'Next',
    hint: 'Tap "Ask AI" when you\'re close to the limit — it gives you a specific cut-back plan.',
  },
  {
    emoji: '🏆',
    title: 'Goals',
    desc: 'Two in one — Savings Goals and Debt Tracker. Save for a vacation, a car, or an emergency fund. Track loans and credit cards with a payoff progress bar.',
    color: 'from-green-500 to-green-700',
    href: '/goals',
    cta: 'Next',
    hint: 'Mid-progress goals have an "Ask AI for tips" button — use it to get a specific strategy.',
  },
  {
    emoji: '📄',
    title: 'Reports',
    desc: 'Full monthly breakdown with pie charts, bar charts, and a transaction table. Browse any past month and export as PDF or CSV.',
    color: 'from-gray-600 to-gray-800',
    href: '/reports',
    cta: 'Next',
    hint: 'Use the month selector to compare spending across months.',
  },
  {
    emoji: '🤖',
    title: 'AI Insights',
    desc: 'Chat with your sarcastic AI finance advisor. It knows your exact numbers and gives brutally honest, actionable advice — plus a roast or two.',
    color: 'from-purple-500 to-purple-700',
    href: '/insights',
    cta: 'Next',
    hint: 'Try the quick-question pills at the bottom — "Where am I overspending?" is a great start.',
  },
  {
    emoji: '💚',
    title: 'My Wellness',
    desc: 'Your financial health score (0–100), achievements, a vision board, mood tracker, and mini-games that teach money skills while you play.',
    color: 'from-teal-500 to-teal-700',
    href: '/wellness',
    cta: "Let's go!",
    hint: 'Your score improves as you track consistently and stay under budget.',
  },
]

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const current = TOUR[step]
  const isLast = step === TOUR.length - 1

  const next = () => {
    if (isLast) { onDone(); return }
    setStep(s => s + 1)
  }

  const goTo = (href) => {
    onDone()
    if (href) window.location.href = href
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Gradient header */}
        <div className={`bg-linear-to-br ${current.color} px-6 pt-8 pb-6 text-white`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
              {step + 1} / {TOUR.length}
            </span>
            <button onClick={onDone} className="text-white/60 hover:text-white text-xs font-medium transition">
              Skip tour
            </button>
          </div>
          <div className="text-5xl mb-3">{current.emoji}</div>
          <h2 className="text-xl font-bold mb-2">{current.title}</h2>
          <p className="text-white/80 text-sm leading-relaxed">{current.desc}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
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
