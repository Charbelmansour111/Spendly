import { useState, useEffect } from 'react'
import { startTour } from './TourBanner'

/* ── same female voice as TourBanner ─────────────────────────────── */
function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate  = 1.12
  utt.pitch = 1.15
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

const GREETING = "Hello! Welcome to Spendly — your personal finance companion. I'm here to help you take control of your money. Would you like me to walk you through everything?"

export default function Onboarding({ onDone }) {
  const [voice, setVoice]   = useState(() => localStorage.getItem('spendly_tour_voice') !== 'off')
  const [visible, setVisible] = useState(false)

  /* slide-in + auto-greet on mount */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => speak(GREETING), 400)
    return () => { clearTimeout(t); window.speechSynthesis?.cancel() }
  }, [visible])

  const handleStart = () => {
    window.speechSynthesis?.cancel()
    localStorage.setItem('spendly_tour_voice', voice ? 'on' : 'off')
    startTour(voice)
    onDone()
    window.dispatchEvent(new Event('spendly_tour_update'))
    if (window.location.pathname !== '/dashboard') window.location.href = '/dashboard'
  }

  const handleSkip = () => {
    window.speechSynthesis?.cancel()
    onDone()
  }

  const toggleVoice = () => {
    setVoice(v => {
      const next = !v
      localStorage.setItem('spendly_tour_voice', next ? 'on' : 'off')
      if (next) speak(GREETING)
      else window.speechSynthesis?.cancel()
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes wave {
          0%,100% { transform: rotate(0deg);   }
          20%     { transform: rotate(-18deg);  }
          40%     { transform: rotate(18deg);   }
          60%     { transform: rotate(-12deg);  }
          80%     { transform: rotate(12deg);   }
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0px)   rotate(0deg);  }
          50%     { transform: translateY(-14px)  rotate(8deg);  }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0px)   rotate(0deg);  }
          50%     { transform: translateY(12px)   rotate(-6deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .wave-emoji   { display:inline-block; animation: wave 1.8s ease-in-out 0.5s 2; transform-origin: 70% 80%; }
        .float-a      { animation: floatA 4s ease-in-out infinite; }
        .float-b      { animation: floatB 5s ease-in-out infinite 0.8s; }
        .float-c      { animation: floatA 6s ease-in-out infinite 1.4s; }
        .slide-up     { animation: slideUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 30%, rgba(255,255,255,0.5) 50%, #fff 70%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2.5s linear 1s 2;
        }
      `}</style>

      <div className={`bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${visible ? 'slide-up' : 'opacity-0'}`}>

        {/* Hero */}
        <div className="bg-linear-to-br from-violet-600 to-indigo-700 px-6 pt-8 pb-7 text-white text-center relative overflow-hidden">

          {/* Floating decorative orbs */}
          <div className="absolute top-4 left-5 w-10 h-10 bg-white/10 rounded-full float-a" />
          <div className="absolute top-8 right-8 w-6 h-6 bg-white/10 rounded-full float-b" />
          <div className="absolute bottom-4 left-12 w-8 h-8 bg-white/10 rounded-full float-c" />
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full" />

          {/* Floating mini cards */}
          <div className="absolute top-5 right-4 float-b">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-white/90 shadow">
              💰 $0 spent
            </div>
          </div>
          <div className="absolute bottom-6 right-3 float-a">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-white/90 shadow">
              🎯 Budget set
            </div>
          </div>

          <div className="relative">
            <div className="text-6xl mb-3 wave-emoji">👋</div>
            <h2 className="text-2xl font-bold mb-1 shimmer-text">Welcome to Spendly!</h2>
            <p className="text-white/75 text-sm leading-relaxed mt-2">
              Your smart personal finance companion. Take a quick tour and see exactly how everything works.
            </p>
            <p className="text-white/40 text-xs mt-2.5">6 pages · 2 minutes · fully interactive</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">

          {/* Voice toggle */}
          <button onClick={toggleVoice}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all ${
              voice ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700'
            }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${voice ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
              {voice ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className={`text-sm font-semibold ${voice ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-200'}`}>
                AI Voice Narration
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {voice ? 'On — your guide explains each step aloud' : 'Off — read at your own pace'}
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${voice ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${voice ? 'left-5' : 'left-1'}`} />
            </div>
          </button>

          <button onClick={handleStart}
            className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start the Tour
          </button>

          <button onClick={handleSkip}
            className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Skip — I'll explore myself
          </button>

          <p className="text-center text-xs text-gray-400">
            Replay anytime from Profile → Account → Replay Tutorial
          </p>
        </div>
      </div>
    </div>
  )
}
