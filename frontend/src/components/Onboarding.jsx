import { useState, useEffect, useCallback, useRef } from 'react'
import API from '../utils/api'

/* ─── Tour content ─────────────────────────────────────────────────────── */
const STEPS = [
  {
    emoji: '📊',
    title: 'Dashboard',
    desc: 'Your financial home screen. See monthly balance, income vs spending, a spending forecast, upcoming bills, budget alerts, and personalized tips — all at a glance.',
    color: 'from-violet-500 to-violet-700',
    href: '/dashboard',
    hint: 'Swipe the cards at the top to switch between Overview, News, and Tips.',
    voice: "The Dashboard is your financial command center. You'll see your monthly balance, income versus spending, a live spending forecast, upcoming bills, and budget alerts — all in one place. Swipe the cards at the top to switch between Overview, News, and Tips.",
  },
  {
    emoji: '💸',
    title: 'Transactions',
    desc: 'Log every expense and income entry. Three tabs: Expenses, Income, All. Filter by category or date, edit inline, toggle recurring, and export as CSV.',
    color: 'from-blue-500 to-blue-700',
    href: '/transactions',
    hint: 'Tap the purple mic button to log an expense by voice — say "spent $12 on lunch" and it logs instantly.',
    voice: "Transactions keeps every expense and income in one place. Switch between Expenses, Income, and All tabs. Filter by category or date, edit any entry inline, and export to CSV. And here's the cool part — tap the purple mic button to log expenses by voice. Just say spent 12 dollars on lunch and it adds it automatically.",
  },
  {
    emoji: '🎤',
    title: 'Voice Assistant & Languages',
    desc: 'Double-tap the AI tab (bottom bar) to open the voice assistant. Speak any language — add expenses, check balances, set budgets, or navigate the app hands-free.',
    color: 'from-violet-600 to-indigo-700',
    href: null,
    hint: 'Go to Profile → Preferences to set your mic language and AI response language independently. Arabic, French, Spanish and 12+ others are supported.',
    voice: "The voice assistant lets you control the whole app hands-free. Double-tap the AI tab in the bottom navigation to open it. You can say things like: add 50 dollars for groceries, or what's my balance this month. It supports over 12 languages. Go to Profile, then Preferences, to set your microphone language and the language the AI responds in — they can even be different languages.",
  },
  {
    emoji: '🎯',
    title: 'Budgets & Bills',
    desc: 'Two tabs in one page. Set monthly spending limits per category — the AI warns you at 85% and roasts you at 100%. The Bills tab tracks rent, utilities, and fixed payments with due-date countdowns.',
    color: 'from-orange-500 to-orange-700',
    href: '/budgets',
    hint: 'Bills tab shows how many days until each payment is due. Paid bills show up automatically on your Dashboard.',
    voice: "Budgets has two tabs. The first lets you set monthly spending limits per category — the AI advisor warns you at 85 percent and gets brutally honest at 100 percent. The second tab is Bills, where you track fixed monthly payments like rent, utilities, or insurance, complete with due-date countdowns. Upcoming bills also appear on your Dashboard so you're never caught off guard.",
  },
  {
    emoji: '🏆',
    title: 'Goals',
    desc: 'Two in one — Savings Goals and Debt Tracker. Save toward a vacation, a car, or an emergency fund. Track loans and credit cards with a visual payoff progress bar.',
    color: 'from-green-500 to-green-700',
    href: '/goals',
    hint: 'Mid-progress goals show an "Ask AI for tips" button — tap it for a personalized strategy to hit your goal faster.',
    voice: "Goals is two features in one. Set savings goals for anything — a vacation, a car, or an emergency fund — and track your progress with a visual bar. Or switch to the Debt tab to track loans and credit cards with a payoff timeline. Mid-progress goals have an Ask AI button that gives you a personalized strategy to reach your goal faster.",
  },
  {
    emoji: '📱',
    title: 'Subscriptions',
    desc: 'Track all your recurring payments — Netflix, Spotify, gym, insurance — with renewal countdowns, billing cycle tracking, monthly & yearly cost totals, and an AI audit that tells you what to cut.',
    color: 'from-pink-500 to-rose-600',
    href: '/subscriptions',
    hint: 'Tap "Audit" to get a brutally honest AI breakdown of which subscriptions are actually worth keeping.',
    voice: "The Subscriptions page lets you track every recurring payment — Netflix, Spotify, gym memberships, insurance — anything billed on a schedule. You'll see renewal countdowns, monthly and yearly cost totals, how much of your income you're spending on subscriptions, and a category breakdown. Hit the Audit button for an honest AI opinion on which ones are actually worth keeping.",
  },
  {
    emoji: '📄',
    title: 'Reports',
    desc: 'Full monthly breakdown with pie charts, bar charts, a category table, and a complete transaction list. Browse any past month, get an AI-written summary, and export as PDF or CSV.',
    color: 'from-gray-600 to-gray-800',
    href: '/reports',
    hint: 'Use the month selector at the top to compare spending across different months.',
    voice: "Reports gives you a full monthly breakdown with pie charts, bar charts, a summary table, and a complete transaction list. At the top of the analytics tab you'll find an AI-written summary of your month — what went well and what didn't. Use the month selector to browse any past month and compare your spending over time. Export as PDF or CSV in one tap.",
  },
  {
    emoji: '🤖',
    title: 'AI Insights',
    desc: 'Chat with your personal AI finance advisor. It knows your exact numbers and gives brutally honest, actionable advice — plus a roast or two when you need it.',
    color: 'from-purple-500 to-purple-700',
    href: '/insights',
    hint: 'Try the quick-question pills at the bottom — "Where am I overspending?" is a great first question.',
    voice: "AI Insights is your personal finance chat assistant. It has access to all your transaction data and gives you honest, actionable advice. Ask it anything — where am I overspending, how do I save more, or what's my worst financial habit. Try the quick-question pills at the bottom to get started. Fair warning — it will roast you if your spending is out of control.",
  },
  {
    emoji: '💚',
    title: 'Financial Wellness',
    desc: 'Your financial health score from 0 to 100, habit tracking, achievements to unlock, a mood tracker, and mini-games that teach money skills while you play.',
    color: 'from-teal-500 to-teal-700',
    href: '/wellness',
    hint: 'Tap "Calculate My Score" to see your live financial health score based on your actual data.',
    voice: "Financial Wellness gives you a health score from 0 to 100 based on your saving habits and spending discipline. You'll earn achievements as you improve, track your mood over time, and play mini-games that teach real money skills. Tap Calculate My Score to see your score update live based on your real data.",
  },
  {
    emoji: '⚙️',
    title: 'Profile & Settings',
    desc: 'Change your name, currency, language, and mic language. Update your password, manage your plan, and contact support — all from the Profile page.',
    color: 'from-slate-500 to-slate-700',
    href: '/profile',
    hint: 'You can replay this tutorial anytime from Profile → Account → "Replay Tutorial".',
    voice: "Finally, your Profile page is where you manage everything personal. Change your currency, set your mic and AI response language, update your password, and contact our support team if you need help. And here's a reminder — you can replay this tutorial anytime from the Account tab in your Profile. That's the full tour. You're ready to take control of your finances. Good luck!",
  },
]

/* ─── TTS helper ────────────────────────────────────────────────────────── */
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.96
  utt.pitch = 1.05
  utt.volume = 1
  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en'))
    if (preferred) utt.voice = preferred
    window.speechSynthesis.speak(utt)
  }
  if (window.speechSynthesis.getVoices().length) trySpeak()
  else { window.speechSynthesis.onvoiceschanged = trySpeak }
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function Onboarding({ onDone }) {
  // -1 = welcome screen, 0+ = tour steps
  const [step, setStep]         = useState(-1)
  const [voice, setVoice]       = useState(() => localStorage.getItem('spendly_tour_voice') === 'on')
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening]   = useState(false)
  const [userQ, setUserQ]           = useState('')
  const [aiAnswer, setAiAnswer]     = useState('')
  const [aiAnswering, setAiAnswering] = useState(false)
  const recognitionRef = useRef(null)
  const micLang = localStorage.getItem('spendly_lang_mic') || 'en-US'

  const current = step >= 0 ? STEPS[step] : null
  const isLast  = step === STEPS.length - 1

  /* speak on step change */
  useEffect(() => {
    setUserQ(''); setAiAnswer('')
    if (step < 0 || !voice) { window.speechSynthesis?.cancel(); setSpeaking(false); return }
    setSpeaking(true)
    const timer = setTimeout(() => speak(current.voice || `${current.title}. ${current.desc}`), 150)
    return () => { clearTimeout(timer); window.speechSynthesis?.cancel(); setSpeaking(false) }
  }, [step, voice])

  /* ── Ask AI via mic ── */
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setAiAnswer("Speech recognition isn't supported in this browser. Try Chrome."); return }
    window.speechSynthesis?.cancel()
    const rec = new SR()
    rec.lang = micLang
    rec.interimResults = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = () => setListening(false)

    rec.onresult = async (e) => {
      const question = e.results[0][0].transcript.trim()
      if (!question) return
      setUserQ(question)
      setAiAnswering(true)
      try {
        const context = current ? `The user is currently on step "${current.title}" of the Spendly onboarding tour. ` : ''
        const res = await API.post('/insights/chat', {
          message: context + question,
          mode: 'friendly',
        })
        const answer = res.data.reply || "I'm not sure about that — try asking again!"
        setAiAnswer(answer)
        if (voice) {
          const plain = answer.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^[-•]\s+/gm, '')
          speak(plain)
        }
      } catch {
        setAiAnswer("Couldn't reach the AI right now. Try again in a moment.")
      }
      setAiAnswering(false)
    }
    rec.start()
  }, [micLang, voice, current])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const finish = useCallback(() => {
    window.speechSynthesis?.cancel()
    onDone()
  }, [onDone])

  const next = () => isLast ? finish() : setStep(s => s + 1)

  const goTo = (href) => { finish(); if (href) window.location.href = href }

  const toggleVoice = () => {
    setVoice(v => {
      const next = !v
      localStorage.setItem('spendly_tour_voice', next ? 'on' : 'off')
      if (!next) { window.speechSynthesis?.cancel(); setSpeaking(false) }
      else if (current) setTimeout(() => speak(current.voice || `${current.title}. ${current.desc}`), 80)
      return next
    })
  }

  /* ── Welcome screen ── */
  if (step === -1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">

          {/* Hero */}
          <div className="bg-linear-to-br from-violet-600 to-indigo-700 px-6 pt-8 pb-7 text-white text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
            <div className="relative">
              <div className="text-6xl mb-4">👋</div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Spendly!</h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Your smart personal finance app. Would you like a quick tour of all the features?
              </p>
              <p className="text-white/50 text-xs mt-2">About 2 minutes · 10 features</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3">

            {/* AI voice toggle */}
            <button onClick={toggleVoice}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition ${
                voice
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
              }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${voice ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${voice ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  AI Voice Narration
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {voice ? 'On — AI will read each step aloud' : 'Off — read at your own pace'}
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${voice ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${voice ? 'left-5' : 'left-1'}`} />
              </div>
            </button>

            {/* Start tour */}
            <button onClick={() => setStep(0)}
              className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-violet-700 active:scale-95 transition flex items-center justify-center gap-2 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start the Tour
            </button>

            {/* Skip */}
            <button onClick={finish}
              className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Skip — I'll explore myself
            </button>

            <p className="text-center text-xs text-gray-400">
              You can replay this tour anytime from your Profile settings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Tour step ── */
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Gradient header */}
        <div className={`bg-linear-to-br ${current.color} px-6 pt-7 pb-6 text-white relative overflow-hidden`}>
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/5 rounded-full" />

          <div className="flex justify-between items-center mb-5 relative">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
              {step + 1} / {STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {/* Voice toggle */}
              <button onClick={toggleVoice} title={voice ? 'Mute AI voice' : 'Enable AI voice'}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition ${
                  voice ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
                }`}>
                {voice ? (
                  <>
                    <span className="flex gap-0.5 items-end">
                      {speaking && [4,7,5].map((h, i) => (
                        <span key={i} className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i * 0.18}s` }} />
                      ))}
                    </span>
                    AI On
                  </>
                ) : 'AI Off'}
              </button>
              <button onClick={finish} className="text-white/60 hover:text-white text-xs font-medium transition px-1">
                Skip ✕
              </button>
            </div>
          </div>

          <div className="text-5xl mb-3 relative">{current.emoji}</div>
          <h2 className="text-xl font-bold mb-2 relative">{current.title}</h2>
          <p className="text-white/85 text-sm leading-relaxed relative">{current.desc}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-violet-500 transition-all duration-400"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {current.hint && (
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                <span className="font-bold">💡 Tip: </span>{current.hint}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {current.href && (
              <button onClick={() => goTo(current.href)}
                className="flex-1 py-3 rounded-xl border-2 border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                Open →
              </button>
            )}
            <button onClick={next}
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-semibold text-sm transition">
              {isLast ? "Let's go! 🚀" : 'Next'}
            </button>
          </div>

          {/* Dot indicators — clickable */}
          <div className="flex justify-center gap-1 mt-4">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`rounded-full transition-all ${i === step ? 'w-4 h-1.5 bg-violet-600' : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}
              />
            ))}
          </div>

          {/* Ask AI section */}
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            {/* Q&A display */}
            {(userQ || aiAnswering) && (
              <div className="mb-3 space-y-2">
                {userQ && (
                  <div className="flex justify-end">
                    <div className="bg-violet-600 text-white text-xs rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%] leading-relaxed">
                      {userQ}
                    </div>
                  </div>
                )}
                {aiAnswering && (
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"/><circle cx="12" cy="12" r="1.5" fill="#7C3AED"/></svg>
                    </div>
                    <div className="flex gap-1 items-center h-6">
                      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
                {aiAnswer && !aiAnswering && (
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"/><circle cx="12" cy="12" r="1.5" fill="#7C3AED"/></svg>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 text-xs rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%] leading-relaxed">
                      {aiAnswer}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mic button */}
            <button
              onClick={listening ? stopListening : startListening}
              disabled={aiAnswering}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
                listening
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400'
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400'
              } disabled:opacity-50`}>
              {listening ? (
                <>
                  <span className="flex gap-0.5 items-end">
                    {[4,7,5,8,4].map((h, i) => (
                      <span key={i} className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i*0.1}s` }} />
                    ))}
                  </span>
                  Listening… tap to stop
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  Ask the AI anything
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
