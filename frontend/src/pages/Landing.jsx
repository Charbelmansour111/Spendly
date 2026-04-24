import { useEffect, useState } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const IOS_STEPS = [
  { icon: '🧭', text: 'Open this page in Safari (not Chrome or Firefox)' },
  { icon: '📤', text: 'Tap the Share icon at the bottom of the screen (box with arrow pointing up)' },
  { icon: '📲', text: 'Scroll down and tap "Add to Home Screen"' },
  { icon: '✅', text: 'Tap "Add" in the top-right corner to confirm' },
  { icon: '🎉', text: 'Spendly now appears on your home screen like a native app!' },
]

const ANDROID_STEPS = [
  { icon: '🌐', text: 'Open this page in Chrome (the default Android browser)' },
  { icon: '⋮', text: 'Tap the three-dot menu (⋮) in the top-right corner' },
  { icon: '📲', text: 'Tap "Add to Home screen" or "Install app"' },
  { icon: '✅', text: 'Tap "Install" or "Add" to confirm' },
  { icon: '🎉', text: 'Spendly is installed — find it on your home screen!' },
]

function InstallModal({ platform, onClose }) {
  const steps = platform === 'ios' ? IOS_STEPS : ANDROID_STEPS
  const title = platform === 'ios' ? 'Install on iPhone / iPad' : 'Install on Android'
  const emoji = platform === 'ios' ? '🍎' : '🤖'
  const color = platform === 'ios' ? 'from-gray-700 to-gray-900' : 'from-green-600 to-teal-700'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`bg-linear-to-br ${color} px-6 pt-8 pb-6 text-white`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-2xl">{emoji}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition text-white/80 hover:text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <h2 className="text-xl font-bold mb-1">{title}</h2>
          <p className="text-white/75 text-sm">Follow these steps to install Spendly as an app on your device.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300">{i + 1}</span>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <span className="text-base leading-none mt-0.5">{s.icon}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-xl px-4 py-3">
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                <span className="font-bold">Note: </span>
                {platform === 'ios'
                  ? 'This only works in Safari. If you\'re using Chrome on iOS, copy the URL and open it in Safari first.'
                  : 'If you don\'t see "Install app", your browser may show "Add to Home screen" instead — both work the same way.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition mt-2">
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

function Landing() {
  const [dark, toggleDark] = useDarkMode()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [openFeature, setOpenFeature] = useState(null)
  const [installModal, setInstallModal] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) window.location.href = '/dashboard'
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
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
      detail: 'Have a real conversation about your finances. Our intelligent advisor analyzes your actual transactions and delivers answers specific to you — not generic advice from a template.',
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
      detail: 'Set the limits and we handle the rest. Define monthly budgets per spending category and get a real-time alert the moment you\'re approaching your limit — before the damage is done.',
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
      detail: 'Knowing the score is the first step to changing it. Spendly calculates a 0–100 financial wellness score based on your saving habits and spending discipline — then gives you a clear improvement plan.',
      bullets: ['0–100 financial health score', 'Personalized improvement tips', 'Track progress over time'],
      cta: 'Check your score',
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden">

      {/* Install modal */}
      {installModal && <InstallModal platform={installModal} onClose={() => setInstallModal(null)} />}

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/60">
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

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 bg-linear-to-b from-violet-50/80 via-white to-white dark:from-violet-950/25 dark:via-gray-950 dark:to-gray-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-150 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-72 h-72 bg-pink-300/10 dark:bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 left-0 w-56 h-56 bg-sky-300/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-20 flex flex-col lg:flex-row items-center gap-16">
          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-400 text-xs font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
              Personal Finance, Simplified
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white leading-[1.1] mb-6 tracking-tight">
              Your money,<br />
              <span className="text-violet-600 dark:text-violet-400">under control.</span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Track expenses, set budgets, scan receipts, and get AI-powered insights — all in one clean, free app.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
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

          {/* Right: floating app preview cards */}
          <div className="flex-1 relative w-full max-w-sm mx-auto lg:mx-0 hidden sm:block" style={{ minHeight: 340 }}>
            {/* Main card */}
            <div className="absolute inset-x-4 top-0 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-violet-100 dark:shadow-violet-950/40 p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Monthly Balance</p>
                  <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">$2,840<span className="text-sm text-gray-400 font-normal">.00</span></p>
                </div>
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-200 dark:shadow-violet-900/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
              </div>
              {/* Mini bar chart */}
              <div className="flex items-end gap-1.5 h-14 mb-4">
                {[40, 65, 50, 80, 55, 90, 60, 75, 45, 85, 70, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? '#7c3aed' : i % 3 === 0 ? '#ddd6fe' : '#ede9fe', opacity: i < 10 ? 0.7 : 1 }} />
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Income</p>
                  <p className="text-sm font-bold text-green-600">+$5,200</p>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Spent</p>
                  <p className="text-sm font-bold text-red-500">-$2,360</p>
                </div>
                <div className="flex-1 bg-violet-50 dark:bg-violet-900/20 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Saved</p>
                  <p className="text-sm font-bold text-violet-600">45%</p>
                </div>
              </div>
            </div>

            {/* Floating AI badge */}
            <div className="absolute -right-2 top-36 bg-violet-600 text-white px-3 py-2 rounded-2xl shadow-xl shadow-violet-200 dark:shadow-violet-950/50 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              AI Insight ready
            </div>

            {/* Floating budget pill */}
            <div className="absolute -left-3 bottom-8 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-sm">🎯</div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Dining budget</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600">72%</span>
                </div>
              </div>
            </div>

            {/* Wellness badge */}
            <div className="absolute right-6 bottom-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg px-3.5 py-2.5 flex items-center gap-2">
              <span className="text-lg">💚</span>
              <div>
                <p className="text-[10px] text-gray-400">Wellness Score</p>
                <p className="text-sm font-bold text-teal-600">78 / 100</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
          {[
            { value: '100%', label: 'Free forever' },
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

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            Up and running in 3 steps
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            No setup, no spreadsheets. Just create your account and start tracking.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
          {/* Connector line on desktop */}
          <div className="hidden sm:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px border-t-2 border-dashed border-violet-200 dark:border-violet-800/50" />
          {[
            { step: '01', icon: '✍️', title: 'Create your account', desc: 'Sign up free — no credit card, no commitment. Takes under 30 seconds.' },
            { step: '02', icon: '📲', title: 'Log your first transaction', desc: 'Type it in, speak it, or scan a receipt. Your financial picture builds instantly.' },
            { step: '03', icon: '🤖', title: 'Get AI-powered insights', desc: 'Ask your AI advisor anything about your spending and watch your habits improve.' },
          ].map((s, i) => (
            <div key={i} className="relative flex flex-col items-center text-center bg-white dark:bg-gray-900 rounded-2xl p-7 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 bg-violet-50 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
                {s.icon}
              </div>
              <span className="absolute top-5 left-5 text-xs font-bold text-violet-300 dark:text-violet-700">{s.step}</span>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Everything you need to manage your money
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            Powerful tools with a clean, intuitive interface. <span className="font-medium text-violet-600 dark:text-violet-400">Tap any feature</span> to learn more.
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
                    <a href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition">
                      {f.cta} →
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── INSTALL ON MOBILE ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-100 dark:bg-violet-900/40 rounded-2xl mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 dark:text-violet-400">
                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Install Spendly on your phone</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Add Spendly to your home screen for a full native app experience — works completely offline too.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setInstallModal('ios')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" className="dark:stroke-gray-900" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                  <path d="M15.5 8.5c-.828-1.06-2.1-1.75-3.5-1.75-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5c1.4 0 2.672-.69 3.5-1.75"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium">Install on</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">iPhone / iPad</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 ml-auto">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <button
              onClick={() => setInstallModal('android')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" strokeWidth="0">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.0292l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0873L4.841 5.4361a.4159.4159 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4488"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium">Install on</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Android</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 ml-auto">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {showInstall && (
              <button
                onClick={handleInstall}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-violet-600 hover:bg-violet-700 rounded-2xl transition group"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <div className="text-left">
                  <p className="text-xs text-white/60 font-medium">One-click</p>
                  <p className="font-semibold text-white text-sm">Install Now</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-violet-600 dark:bg-violet-700 py-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Free · No credit card
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to take control of your finances?
          </h2>
          <p className="text-violet-100 mb-10 text-lg max-w-md mx-auto leading-relaxed">Join Spendly today — completely free, forever. No credit card required.</p>
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

      {/* ── FOOTER ────────────────────────────────────────────── */}
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
