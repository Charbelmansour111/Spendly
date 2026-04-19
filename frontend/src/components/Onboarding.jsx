import { useState } from 'react'
import { startTour } from './TourBanner'

export default function Onboarding({ onDone }) {
  const [voice, setVoice] = useState(() => localStorage.getItem('spendly_tour_voice') !== 'off')

  const handleStart = () => {
    localStorage.setItem('spendly_tour_voice', voice ? 'on' : 'off')
    startTour(voice)
    onDone()
    // dispatch so TourBanner in Layout picks it up immediately (same page)
    window.dispatchEvent(new Event('spendly_tour_update'))
    if (window.location.pathname !== '/dashboard') window.location.href = '/dashboard'
  }

  const toggleVoice = () => {
    setVoice(v => {
      localStorage.setItem('spendly_tour_voice', !v ? 'on' : 'off')
      return !v
    })
  }

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
              Would you like a quick guided tour? It visits each page and shows you exactly what to do.
            </p>
            <p className="text-white/50 text-xs mt-2">6 pages · 2 minutes · fully interactive</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">

          {/* Voice toggle */}
          <button onClick={toggleVoice}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition ${
              voice ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700'
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
                {voice ? 'On — AI guide explains each step aloud' : 'Off — read at your own pace'}
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${voice ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${voice ? 'left-5' : 'left-1'}`} />
            </div>
          </button>

          <button onClick={handleStart}
            className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-violet-700 active:scale-95 transition flex items-center justify-center gap-2 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start the Tour
          </button>

          <button onClick={onDone}
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
