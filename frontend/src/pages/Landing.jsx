import { useEffect, useState } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

function Landing() {
  const [dark, toggleDark] = useDarkMode()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [openFeature, setOpenFeature] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) window.location.href = '/dashboard'
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    })
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
    setDeferredPrompt(null)
  }

  const toggleFeature = (i) => setOpenFeature(prev => prev === i ? null : i)

  const features = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
      bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400',
      title: 'Spending Charts',
      desc: 'Visualize your cash flow with interactive charts broken down by category and time period.',
      detail: 'See exactly where every dollar goes. Interactive charts reveal your spending by category and show trends over 6 months — helping you spot habits before they become costly.',
      bullets: ['Monthly & weekly views', 'Category breakdowns', '6-month trend history'],
      cta: 'Start tracking free',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>,
      bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400',
      title: 'AI-Powered Insights',
      desc: 'Chat with your personal AI finance advisor to uncover spending patterns and get tailored tips.',
      detail: 'Have a real conversation about your finances. Our intelligent advisor analyzes your actual transactions and delivers answers that are specific to you — not generic advice from a template.',
      bullets: ['Knows your real spending data', 'Ask anything, anytime', 'Personalized action items'],
      cta: 'Try AI Insights',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
      bg: 'bg-sky-100 dark:bg-sky-900/30', color: 'text-sky-600 dark:text-sky-400',
      title: 'Receipt Scanner',
      desc: 'Snap a photo of any receipt and automatically extract the amount — no manual entry needed.',
      detail: 'Stop typing in amounts. Point your camera at any receipt and Spendly reads the total and logs it instantly. Works with paper receipts, digital screenshots, and invoices of any kind.',
      bullets: ['Works with any receipt type', 'Any currency supported', 'Instant expense logging'],
      cta: 'Start scanning',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
      bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400',
      title: 'Budget Goals',
      desc: 'Set monthly limits per category and receive real-time alerts before you overspend.',
      detail: 'Set the limits and we handle the rest. Define monthly budgets per spending category and receive a real-time alert the moment you\'re approaching your limit — before the damage is done.',
      bullets: ['Per-category monthly limits', 'Real-time alert notifications', 'Visual progress tracking'],
      cta: 'Set your first budget',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      bg: 'bg-rose-100 dark:bg-rose-900/30', color: 'text-rose-600 dark:text-rose-400',
      title: 'PDF & CSV Reports',
      desc: 'Export a professional financial report of all your expenses and income in one click.',
      detail: 'Your complete financial picture, ready in seconds. Generate a clean breakdown of every transaction — perfect for personal review, tax season, or sharing with your accountant.',
      bullets: ['One-click PDF or CSV export', 'Filter by month or date range', 'Clean, professional layout'],
      cta: 'Get your report',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
      bg: 'bg-pink-100 dark:bg-pink-900/30', color: 'text-pink-600 dark:text-pink-400',
      title: 'Wellness Score',
      desc: 'Get a financial wellness score based on your habits, with actionable tips to improve.',
      detail: 'Knowing the score is the first step to changing it. Spendly calculates a 0–100 financial wellness score based on your saving habits and spending discipline — then hands you a clear plan to improve.',
      bullets: ['0–100 financial health score', 'Personalized improvement tips', 'Track progress over time'],
      cta: 'Check your score',
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Spendly</span>
          </a>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition" title="Toggle theme">
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            {showInstall && (
              <button onClick={handleInstall} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Install
              </button>
            )}
            <a href="/login" className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
              Sign in
            </a>
            <a href="/register" className="px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 active:scale-95 transition shadow-sm">
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-violet-50/70 via-white to-white dark:from-violet-950/20 dark:via-gray-950 dark:to-gray-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-150 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-400 text-xs font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            Personal Finance, Simplified
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white leading-[1.1] mb-6 tracking-tight">
            Your money,<br />
            <span className="text-violet-600 dark:text-violet-400">under control.</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Track expenses, set budgets, scan receipts, and get AI-powered insights — all in one clean, intuitive app.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/register" className="px-7 py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 active:scale-95 transition shadow-lg shadow-violet-200 dark:shadow-violet-900/30 text-base">
              Start for free →
            </a>
            <a href="/login" className="px-7 py-3.5 bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition border border-gray-200 dark:border-gray-700 text-base">
              Sign in
            </a>
            {showInstall && (
              <button onClick={handleInstall} className="px-7 py-3.5 bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition border border-gray-200 dark:border-gray-700 text-base flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Install App
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 'Free', label: 'Forever plan' },
            { value: '8', label: 'Currencies' },
            { value: 'AI', label: 'Powered insights' },
            { value: 'PWA', label: 'Works offline' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — click any card to learn more */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Everything you need to manage your money
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            Powerful tools with a clean, intuitive interface. Click any feature to learn more.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const isOpen = openFeature === i
            return (
              <div
                key={i}
                onClick={() => toggleFeature(i)}
                className={`group bg-white dark:bg-gray-900 border rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
                  isOpen
                    ? 'border-violet-300 dark:border-violet-700 shadow-xl shadow-violet-50 dark:shadow-violet-950/30'
                    : 'border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800/60 hover:shadow-lg hover:shadow-violet-50 dark:hover:shadow-violet-950/20'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-11 h-11 ${f.bg} ${f.color} rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {f.icon}
                  </div>
                  <span className={`mt-1 transition-transform duration-200 text-gray-400 dark:text-gray-500 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown />
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/60" onClick={e => e.stopPropagation()}>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{f.detail}</p>
                    <ul className="space-y-2 mb-5">
                      {f.bullets.map((b, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.color.replace('text-', 'bg-').split(' ')[0]}`} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <a
                      href="/register"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition"
                    >
                      {f.cta} →
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* iOS Install */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Install on iPhone / iPad</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Add Spendly to your home screen for a full native app experience.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Open this page in Safari', 'Tap the Share button (box with arrow)', 'Select "Add to Home Screen"', 'Tap "Add" to confirm'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-violet-600 dark:bg-violet-700 py-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to take control of your finances?
          </h2>
          <p className="text-violet-100 mb-10 text-lg">Join Spendly today — completely free, no credit card required.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/register" className="px-8 py-3.5 bg-white text-violet-700 font-semibold rounded-xl hover:bg-violet-50 active:scale-95 transition shadow-lg text-base">
              Create your free account →
            </a>
            {showInstall && (
              <button onClick={handleInstall} className="px-8 py-3.5 bg-violet-500 text-white font-semibold rounded-xl hover:bg-violet-400 active:scale-95 transition border border-violet-400/60 flex items-center gap-2 text-base">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Install App
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Spendly</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400 dark:text-gray-500">
            <a href="/login" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Sign in</a>
            <a href="/register" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Get started</a>
            <a href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Terms</a>
            <a href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Privacy</a>
            <span>© 2026 Spendly</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default Landing
