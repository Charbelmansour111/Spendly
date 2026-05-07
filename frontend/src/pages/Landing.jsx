import { useEffect, useState } from 'react'

const LANDING_STYLE = `
@keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-50px) scale(1.08)}66%{transform:translate(-30px,30px) scale(0.93)}}
@keyframes orb2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-55px,30px) scale(1.1)}70%{transform:translate(35px,-22px) scale(0.91)}}
@keyframes orb3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(28px,52px) scale(1.06)}}
@keyframes slide-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
`

const SpendlyLogo = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                  ? "This only works in Safari. If you're using Chrome on iOS, copy the URL and open it in Safari first."
                  : "If you don't see \"Install app\", your browser may show \"Add to Home screen\" instead — both work the same way."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition mt-2">Got it!</button>
        </div>
      </div>
    </div>
  )
}

function Landing() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [openFeature, setOpenFeature] = useState(null)
  const [installModal, setInstallModal] = useState(null)
  const [showIOSBanner, setShowIOSBanner] = useState(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream
    const isInstalled = window.navigator.standalone === true
    const dismissed = localStorage.getItem('ios-banner-dismissed')
    return isIOS && !isInstalled && !dismissed
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) window.location.href = '/dashboard'
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismissIOSBanner = () => {
    setShowIOSBanner(false)
    localStorage.setItem('ios-banner-dismissed', '1')
  }

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
      bg: 'bg-violet-900/40', color: 'text-violet-400',
      title: 'Spending Charts', desc: 'Visualize your cash flow with interactive charts broken down by category and time period.',
      detail: 'See exactly where every dollar goes. Interactive charts reveal your spending by category and show trends over 6 months — helping you spot habits before they become costly.',
      bullets: ['Monthly & weekly views', 'Category breakdowns', '6-month trend history'], cta: 'Start tracking free',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>,
      bg: 'bg-indigo-900/40', color: 'text-indigo-400',
      title: 'AI-Powered Insights', desc: 'Chat with your personal AI finance advisor to uncover spending patterns and get tailored tips.',
      detail: 'Have a real conversation about your finances. Our intelligent advisor analyzes your actual transactions and delivers answers specific to you — not generic advice from a template.',
      bullets: ['Knows your real spending data', 'Ask anything, anytime', 'Personalized action items'], cta: 'Try AI Insights',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
      bg: 'bg-sky-900/40', color: 'text-sky-400',
      title: 'Receipt Scanner', desc: 'Snap a photo of any receipt and automatically extract the amount — no manual entry needed.',
      detail: 'Stop typing in amounts. Point your camera at any receipt and Spendly reads the total and logs it instantly. Works with paper receipts, digital screenshots, and invoices of any kind.',
      bullets: ['Works with any receipt type', 'Any currency supported', 'Instant expense logging'], cta: 'Start scanning',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
      bg: 'bg-amber-900/40', color: 'text-amber-400',
      title: 'Budget Goals', desc: 'Set monthly limits per category and receive real-time alerts before you overspend.',
      detail: "Set the limits and we handle the rest. Define monthly budgets per spending category and get a real-time alert the moment you're approaching your limit — before the damage is done.",
      bullets: ['Per-category monthly limits', 'Real-time alert notifications', 'Visual progress tracking'], cta: 'Set your first budget',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      bg: 'bg-rose-900/40', color: 'text-rose-400',
      title: 'PDF & CSV Reports', desc: 'Export a professional financial report of all your expenses and income in one click.',
      detail: 'Your complete financial picture, ready in seconds. Generate a clean breakdown of every transaction — perfect for personal review, tax season, or sharing with your accountant.',
      bullets: ['One-click PDF or CSV export', 'Filter by month or date range', 'Clean, professional layout'], cta: 'Get your report',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
      bg: 'bg-pink-900/40', color: 'text-pink-400',
      title: 'Wellness Score', desc: 'Get a financial wellness score based on your habits, with actionable tips to improve.',
      detail: 'Knowing the score is the first step to changing it. Spendly calculates a 0–100 financial wellness score based on your saving habits and spending discipline — then gives you a clear improvement plan.',
      bullets: ['0–100 financial health score', 'Personalized improvement tips', 'Track progress over time'], cta: 'Check your score',
    },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0d0518' }}>
      <style>{LANDING_STYLE}</style>

      {/* Global aurora orbs — fixed so they persist on scroll */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position:'absolute',left:'0%',top:'5%',width:700,height:600,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(124,58,237,0.38) 0%,transparent 68%)',filter:'blur(100px)',animation:'orb1 22s ease-in-out infinite' }} />
        <div style={{ position:'absolute',right:'-5%',top:'15%',width:600,height:550,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(99,102,241,0.28) 0%,transparent 68%)',filter:'blur(100px)',animation:'orb2 27s ease-in-out infinite' }} />
        <div style={{ position:'absolute',left:'30%',bottom:'-5%',width:550,height:450,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(167,139,250,0.2) 0%,transparent 68%)',filter:'blur(100px)',animation:'orb3 19s ease-in-out infinite' }} />
      </div>

      {installModal && <InstallModal platform={installModal} onClose={() => setInstallModal(null)} />}

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/[0.07]" style={{ background: 'rgba(13,5,24,0.8)', zIndex: 40, position: 'sticky', top: 0 }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-900/50">
              <SpendlyLogo size={16} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Spendly</span>
          </a>
          <div className="flex items-center gap-2">
            {showInstall && (
              <button onClick={handleInstall} className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white/8 border border-white/10 text-white/60 font-medium rounded-xl hover:bg-white/12 hover:text-white/80 transition text-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Install
              </button>
            )}
            <a href="/login" className="px-4 py-2 text-sm font-medium text-white/55 hover:text-white transition rounded-xl hover:bg-white/8">
              Sign in
            </a>
            <a href="/register" className="px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 active:scale-95 transition shadow-lg shadow-violet-900/50">
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 flex flex-col lg:flex-row items-center gap-16">

          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left" style={{ animation: 'slide-up 0.6s ease both' }}>
            <div className="inline-flex items-center gap-2 bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              Personal Finance, Simplified
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.08] mb-6 tracking-tight">
              Your money,<br />
              <span style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #818cf8 60%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                under control.
              </span>
            </h1>
            <p className="text-lg text-white/45 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Track expenses, set budgets, scan receipts, and get AI-powered insights — all in one clean, free app.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
              <a href="/register" className="px-7 py-3.5 font-bold rounded-xl active:scale-95 transition text-base text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 32px rgba(124,58,237,0.5)' }}>
                Start for free →
              </a>
              <a href="/login" className="px-7 py-3.5 font-semibold rounded-xl active:scale-95 transition border border-white/12 bg-white/6 hover:bg-white/10 text-white text-base">
                Sign in
              </a>
            </div>

            {/* App store buttons */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <button onClick={() => setInstallModal('ios')}
                className="flex items-center gap-3 px-5 py-3 bg-white/6 hover:bg-white/10 text-white rounded-2xl transition border border-white/10 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/35 leading-none mb-0.5">Download on the</p>
                  <p className="text-sm font-bold leading-none">App Store</p>
                </div>
              </button>
              <button onClick={() => deferredPrompt ? handleInstall() : setInstallModal('android')}
                className="flex items-center gap-3 px-5 py-3 bg-white/6 hover:bg-white/10 text-white rounded-2xl transition border border-white/10 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                  <path d="M3 20.5v-17c0-.83 1.01-1.3 1.7-.77l14 8.5c.6.36.6 1.18 0 1.54l-14 8.5c-.69.53-1.7.06-1.7-.77z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/35 leading-none mb-0.5">Get it on</p>
                  <p className="text-sm font-bold leading-none">Google Play</p>
                </div>
              </button>
              <p className="w-full text-xs text-white/25 text-center lg:text-left mt-1">Free PWA — installs directly from your browser, no store account needed</p>
            </div>
          </div>

          {/* Right: iPhone mockup */}
          <div className="flex-1 hidden sm:flex justify-center lg:justify-end items-center">
            <div className="relative" style={{ perspective: '1200px' }}>
              <div className="absolute -inset-10 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.3) 0%, transparent 70%)', filter: 'blur(40px)' }} />

              <div className="relative" style={{ transform: 'rotateY(-10deg) rotateX(4deg)', transformStyle: 'preserve-3d' }}>
                <div className="w-[230px] h-[480px] bg-gray-950 rounded-[44px] border-[3px] border-gray-800 overflow-hidden relative"
                  style={{ boxShadow: '0 50px 100px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' }}>
                  <div className="absolute -left-[4px] top-[88px] w-[3px] h-7 bg-gray-700 rounded-l-sm" />
                  <div className="absolute -left-[4px] top-[124px] w-[3px] h-9 bg-gray-700 rounded-l-sm" />
                  <div className="absolute -left-[4px] top-[168px] w-[3px] h-9 bg-gray-700 rounded-l-sm" />
                  <div className="absolute -right-[4px] top-[120px] w-[3px] h-14 bg-gray-700 rounded-r-sm" />

                  <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '41px' }}>
                    <div className="absolute inset-0 bg-gray-100" />

                    <div className="relative bg-violet-700 pt-0 pb-4 px-4">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[22px] bg-gray-950 rounded-b-2xl z-10" />
                      <div className="flex justify-between items-center text-white/50 text-[8px] pt-2.5 mt-1 mb-2">
                        <span className="font-bold text-white/70">9:41</span>
                        <div className="flex items-center gap-1">
                          <span>●●●</span>
                          <svg width="9" height="7" viewBox="0 0 24 24" fill="white" opacity="0.6"><rect x="1" y="7" width="4" height="10" rx="1"/><rect x="8" y="4" width="4" height="13" rx="1"/><rect x="15" y="1" width="4" height="16" rx="1"/></svg>
                        </div>
                      </div>
                      <p className="text-violet-200 text-[9px] font-medium">Good morning 👋</p>
                      <p className="text-white font-extrabold text-xl mt-0.5">$2,840<span className="text-sm font-medium text-violet-300">.00</span></p>
                      <p className="text-emerald-300 text-[8px] mt-0.5 font-semibold">↑ 12% vs last month</p>
                      <div className="flex gap-1.5 mt-2.5">
                        {[['Income', '+$5,200', 'text-emerald-300'], ['Spent', '-$2,360', 'text-rose-300'], ['Saved', '45%', 'text-white']].map(([l, v, c]) => (
                          <div key={l} className="flex-1 bg-white/12 rounded-xl px-2 py-1.5">
                            <p className="text-[7px] text-violet-300 font-medium leading-none mb-0.5">{l}</p>
                            <p className={`text-[10px] font-bold ${c} leading-none`}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mx-3 mt-2 bg-white rounded-2xl shadow-sm p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[9px] font-bold text-gray-700">Spending</p>
                        <p className="text-[8px] text-violet-500 font-semibold">This month</p>
                      </div>
                      <div className="flex items-end gap-0.5 h-11">
                        {[30, 55, 40, 70, 45, 80, 60, 78, 50, 90, 68, 100].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? '#7c3aed' : i >= 9 ? '#c4b5fd' : '#ede9fe' }} />
                        ))}
                      </div>
                    </div>

                    <div className="mx-3 mt-2 bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-3 pt-2 pb-1 flex justify-between items-center">
                        <p className="text-[9px] font-bold text-gray-700">Recent</p>
                        <p className="text-[8px] text-violet-500 font-semibold">See all →</p>
                      </div>
                      {[
                        { icon: '🍔', name: "McDonald's", cat: 'Food', amt: '-$12.50', neg: true },
                        { icon: '🚗', name: 'Uber', cat: 'Transport', amt: '-$22.00', neg: true },
                        { icon: '💼', name: 'Salary', cat: 'Income', amt: '+$3,200', neg: false },
                      ].map((tx, i, arr) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                          <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] shrink-0">{tx.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-semibold text-gray-800 truncate">{tx.name}</p>
                            <p className="text-[7px] text-gray-400">{tx.cat}</p>
                          </div>
                          <p className={`text-[9px] font-bold tabular-nums ${tx.neg ? 'text-rose-500' : 'text-emerald-500'}`}>{tx.amt}</p>
                        </div>
                      ))}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 px-5 flex justify-around items-center">
                      {[['🏠', true], ['💳', false], ['📊', false], ['⚙️', false]].map(([icon, active], i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <span className="text-base">{icon}</span>
                          {active && <div className="w-1 h-1 bg-violet-600 rounded-full" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -right-6 top-16 text-white px-3 py-2 rounded-2xl text-[11px] font-semibold flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 8px 24px rgba(124,58,237,0.6)' }}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                AI Insight ready
              </div>
              <div className="absolute -left-10 top-1/2 bg-white/8 border border-white/15 backdrop-blur-sm rounded-2xl shadow-lg px-3 py-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center text-xs">🎯</div>
                <div>
                  <p className="text-[9px] text-white/50 font-medium">Dining budget</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '72%' }} />
                    </div>
                    <span className="text-[9px] font-bold text-amber-400">72%</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 bottom-24 bg-white/8 border border-white/15 backdrop-blur-sm rounded-2xl shadow-lg px-3 py-2 flex items-center gap-2">
                <span className="text-base">💚</span>
                <div>
                  <p className="text-[9px] text-white/50">Wellness</p>
                  <p className="text-xs font-bold text-teal-400">78 / 100</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────── */}
      <section className="border-y border-white/8" style={{ background: 'rgba(255,255,255,0.02)', position: 'relative', zIndex: 1 }}>
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
          {[
            { value: '100%', label: 'Free forever' },
            { value: '8+', label: 'Currencies' },
            { value: 'AI', label: 'Powered insights' },
            { value: 'PWA', label: 'Works offline' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-extrabold text-white tracking-tight">{s.value}</p>
              <p className="text-sm text-white/35 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 relative" style={{ zIndex: 1 }}>
        <div className="text-center mb-14">
          <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Simple by design</p>
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Up and running in 3 steps</h2>
          <p className="text-white/40 max-w-md mx-auto">No setup, no spreadsheets. Just create your account and start tracking.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
          <div className="hidden sm:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px border-t-2 border-dashed border-violet-500/20" />
          {[
            { step: '01', icon: '✍️', title: 'Create your account', desc: 'Sign up free — no credit card, no commitment. Takes under 30 seconds.' },
            { step: '02', icon: '📲', title: 'Log your first transaction', desc: 'Type it in, speak it, or scan a receipt. Your financial picture builds instantly.' },
            { step: '03', icon: '🤖', title: 'Get AI-powered insights', desc: 'Ask your AI advisor anything about your spending and watch your habits improve.' },
          ].map((s, i) => (
            <div key={i} className="relative flex flex-col items-center text-center rounded-2xl p-7 border border-white/8 hover:border-violet-500/30 transition"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}>
              <div className="w-14 h-14 bg-violet-600/20 border border-violet-500/20 rounded-2xl flex items-center justify-center text-2xl mb-4">
                {s.icon}
              </div>
              <span className="absolute top-5 left-5 text-xs font-bold text-violet-500/50">{s.step}</span>
              <h3 className="font-semibold text-white text-base mb-2">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24 relative" style={{ zIndex: 1 }}>
        <div className="text-center mb-14">
          <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Everything included</p>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Everything you need to manage your money</h2>
          <p className="text-white/40 max-w-lg mx-auto leading-relaxed">
            Powerful tools with a clean, intuitive interface.{' '}
            <span className="font-medium text-violet-400">Tap any feature</span> to learn more.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const isOpen = openFeature === i
            return (
              <div key={i} onClick={() => toggleFeature(i)}
                className={`group rounded-2xl p-6 cursor-pointer transition-all duration-200 border ${
                  isOpen
                    ? 'border-violet-500/40 bg-white/8'
                    : 'border-white/8 hover:border-white/15 hover:bg-white/5'
                }`}
                style={{ backdropFilter: 'blur(8px)', background: isOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-11 h-11 ${f.bg} ${f.color} rounded-xl flex items-center justify-center shrink-0 border border-white/8 transition-transform duration-200 ${isOpen ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {f.icon}
                  </div>
                  <span className={`mt-1 transition-transform duration-200 text-white/25 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown />
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mt-4 mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>

                {isOpen && (
                  <div className="mt-5 pt-5 border-t border-white/8" onClick={e => e.stopPropagation()}>
                    <p className="text-sm text-white/55 leading-relaxed mb-4">{f.detail}</p>
                    <ul className="space-y-2 mb-5">
                      {f.bullets.map((b, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-white/45">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.color.replace('text-', 'bg-')}`} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <a href="/register" className={`inline-flex items-center gap-1.5 text-sm font-semibold ${f.color} hover:opacity-80 transition`}>
                      {f.cta} →
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── INSTALL SECTION ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24 relative" style={{ zIndex: 1 }}>
        <div className="relative overflow-hidden rounded-3xl px-8 py-12"
          style={{ background: 'linear-gradient(135deg, #1a0533 0%, #1e1065 50%, #1e3a8a 100%)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(124,58,237,0.3),transparent 70%)', filter: 'blur(50px)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.2),transparent 70%)', filter: 'blur(40px)' }} />

          <div className="relative flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/75 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                Available on all devices
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
                Take Spendly<br className="hidden sm:block" /> everywhere you go
              </h2>
              <p className="text-white/45 text-base mb-6 max-w-md mx-auto lg:mx-0 leading-relaxed">
                Install the app on your phone or tablet for instant access, offline support, and push notifications — no App Store account required.
              </p>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start text-xs">
                {['Works offline', 'Push notifications', 'Home screen icon', 'Free forever'].map(f => (
                  <span key={f} className="flex items-center gap-1.5 bg-white/8 border border-white/10 text-white/60 px-3 py-1.5 rounded-full font-medium">
                    <span className="text-violet-400">✓</span> {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[260px]">
              <button onClick={() => setInstallModal('ios')}
                className="flex items-center gap-4 px-5 py-4 bg-white/8 hover:bg-white/12 border border-white/12 hover:border-white/20 rounded-2xl transition active:scale-95 group w-full">
                <div className="w-12 h-12 bg-black/30 rounded-xl flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white/40 text-[11px] font-medium leading-none mb-1">Download on the</p>
                  <p className="text-white font-bold text-base leading-none">App Store</p>
                  <p className="text-white/30 text-[11px] mt-1">iPhone · iPad · iPod touch</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="opacity-30 group-hover:opacity-60 transition shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              <button onClick={() => deferredPrompt ? handleInstall() : setInstallModal('android')}
                className="flex items-center gap-4 px-5 py-4 bg-white/8 hover:bg-white/12 border border-white/12 hover:border-white/20 rounded-2xl transition active:scale-95 group w-full">
                <div className="w-12 h-12 bg-green-600/60 rounded-xl flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M3 20.5v-17c0-.83 1.01-1.3 1.7-.77l14 8.5c.6.36.6 1.18 0 1.54l-14 8.5c-.69.53-1.7.06-1.7-.77z"/>
                  </svg>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white/40 text-[11px] font-medium leading-none mb-1">Get it on</p>
                  <p className="text-white font-bold text-base leading-none">Google Play</p>
                  <p className="text-white/30 text-[11px] mt-1">Android 8.0+</p>
                </div>
                {deferredPrompt
                  ? <span className="text-[10px] font-bold bg-violet-500 text-white px-2 py-0.5 rounded-full shrink-0">Ready!</span>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="opacity-30 group-hover:opacity-60 transition shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                }
              </button>

              <p className="text-center text-white/25 text-xs pt-1">PWA — installs from the browser, no store account needed</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28 px-6" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(76,29,149,0.5) 0%, rgba(30,16,101,0.4) 50%, rgba(30,64,175,0.3) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.06), transparent 60%)' }} />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/70 text-xs font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            Free · No credit card · No limits
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight leading-[1.1]">
            Ready to take control<br />of your finances?
          </h2>
          <p className="text-white/45 mb-10 text-lg max-w-md mx-auto leading-relaxed">
            Join Spendly today — completely free, forever. Start tracking in under 30 seconds.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/register"
              className="px-8 py-4 font-bold rounded-xl active:scale-95 transition text-base text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 12px 40px rgba(124,58,237,0.55)' }}>
              Create your free account →
            </a>
            {showInstall && (
              <button onClick={handleInstall} className="px-8 py-4 font-semibold rounded-xl active:scale-95 transition border border-white/15 bg-white/8 hover:bg-white/12 text-white flex items-center gap-2 text-base">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Install App
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 py-8 px-6" style={{ background: 'rgba(13,5,24,0.9)', position: 'relative', zIndex: 1 }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="font-semibold text-white/50 text-sm">Spendly</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/25">
            <a href="/login" className="hover:text-white/50 transition">Sign in</a>
            <a href="/register" className="hover:text-white/50 transition">Get started</a>
            <a href="/terms" className="hover:text-white/50 transition">Terms</a>
            <a href="/privacy" className="hover:text-white/50 transition">Privacy</a>
            <span>© 2026 Spendly</span>
          </div>
        </div>
      </footer>

      {/* ── iOS install banner ─────────────────────────────────── */}
      {showIOSBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
          <div className="pointer-events-auto max-w-sm mx-auto rounded-2xl shadow-2xl overflow-hidden border border-white/10"
            style={{ background: '#1a0533' }}>
            <div className="h-0.5" style={{ background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
            <div className="px-4 pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/60">
                  <SpendlyLogo size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight">Install Spendly</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-relaxed">Add to your home screen for instant access, offline use, and push notifications.</p>
                </div>
                <button onClick={dismissIOSBanner} className="text-white/30 hover:text-white/60 transition shrink-0 p-1 -mt-1 -mr-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-0.5">
                {[
                  { icon: '📤', label: 'Tap Share' },
                  { sep: true },
                  { icon: '📲', label: 'Add to Home' },
                  { sep: true },
                  { icon: '✅', label: 'Done!' },
                ].map((s, i) =>
                  s.sep
                    ? <div key={i} className="flex-1 h-px bg-white/8 mx-1" />
                    : (
                      <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-[10px] text-white/35 font-medium whitespace-nowrap">{s.label}</span>
                      </div>
                    )
                )}
              </div>
              <div className="flex justify-center mt-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 bg-violet-500/15 rounded-full flex items-center justify-center animate-bounce">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  </div>
                  <p className="text-[10px] text-violet-400 font-semibold">Tap the Share button above</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Landing
