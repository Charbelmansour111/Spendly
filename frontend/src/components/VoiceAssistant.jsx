import { useState, useEffect, useRef, useCallback } from 'react'
import API from '../utils/api'
import { t } from '../i18n'

const LANG_LABELS = {
  'en-US': 'English', 'en-GB': 'English (UK)',
  'ar-SA': 'العربية', 'ar-LB': 'العربية', 'ar-JO': 'العربية', 'ar-SY': 'العربية',
  'ar-BH': 'العربية', 'ar-AE': 'العربية', 'ar-EG': 'العربية', 'ar-KW': 'العربية',
  'ar-IQ': 'العربية', 'ar-MA': 'العربية', 'es-ES': 'Español', 'es-MX': 'Español',
  'fr-FR': 'Français', 'de-DE': 'Deutsch', 'it-IT': 'Italiano', 'pt-PT': 'Português',
  'nl-NL': 'Nederlands', 'pl-PL': 'Polski', 'ru-RU': 'Русский', 'tr-TR': 'Türkçe',
  'af-ZA': 'Afrikaans',
}

const NAV_LABELS = {
  '/dashboard': 'Dashboard', '/transactions': 'Transactions', '/budgets': 'Budgets',
  '/goals': 'Goals', '/wellness': 'Wellness', '/profile': 'Profile',
  '/reports': 'Reports', '/insights': 'AI Insights',
}

const ACTION_NAV = {
  add_expense: '/transactions', add_income: '/transactions',
  set_budget: '/budgets', add_goal: '/goals', add_debt: '/goals',
}

export default function VoiceAssistant({ onClose }) {
  const [status, setStatus] = useState('idle')
  const [conversation, setConversation] = useState([])
  const [actionBanner, setActionBanner] = useState(null)
  const [inputHint, setInputHint] = useState('')

  const micLang = localStorage.getItem('spendly_lang_mic') || 'en-US'
  const responseLang = localStorage.getItem('spendly_lang_app') || localStorage.getItem('spendly_lang_response') || 'en-US'

  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const historyRef = useRef([])
  const startListeningRef = useRef(null)
  const convEndRef = useRef(null)

  const speak = useCallback((text, onEnd) => {
    if (!text || !window.speechSynthesis) { onEnd?.(); return }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = responseLang
    utterance.rate = 0.95
    if (onEnd) utterance.onend = onEnd
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [responseLang])

  const addMessage = useCallback((role, text) => {
    setConversation(c => [...c, { role, text, id: Date.now() }])
    setTimeout(() => convEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  const executeIntent = useCallback(async (result, userText) => {
    const { intent, data, navigate_to, response, question, partial_intent, partial_data } = result

    if (intent === 'need_more_info') {
      const q = response || question || ''
      addMessage('ai', q)
      historyRef.current.push(
        { role: 'user', content: userText },
        { role: 'assistant', content: q }
      )
      speak(q, () => setTimeout(() => startListeningRef.current?.(), 400))
      setStatus('listening')
      setInputHint(q)
      return
    }

    // Regular intent — show AI response
    if (response) {
      addMessage('ai', response)
      speak(response)
    }

    setStatus('processing')
    setActionBanner({ state: 'loading', text: '...' })

    try {
      if (intent === 'navigate' && navigate_to) {
        setActionBanner({ state: 'loading', text: `Navigating to ${NAV_LABELS[navigate_to] || navigate_to}...` })
        setTimeout(() => { window.location.href = navigate_to }, 1600)

      } else if (intent === 'add_expense' && data) {
        await API.post('/expenses', data)
        const label = `${data.description || 'Expense'} — ${data.amount}`
        setActionBanner({ state: 'done', text: label, nav: '/transactions' })
        historyRef.current = []
        setTimeout(() => { window.location.href = '/transactions' }, 2500)

      } else if (intent === 'add_income' && data) {
        await API.post('/income', data)
        setActionBanner({ state: 'done', text: `Income logged — ${data.amount}`, nav: '/transactions' })
        historyRef.current = []
        setTimeout(() => { window.location.href = '/transactions' }, 2500)

      } else if (intent === 'set_budget' && data) {
        await API.post('/budgets', data)
        setActionBanner({ state: 'done', text: `${data.category} budget → ${data.amount}`, nav: '/budgets' })
        historyRef.current = []
        setTimeout(() => { window.location.href = '/budgets' }, 2500)

      } else if (intent === 'add_goal' && data) {
        if (data.type === 'debt') {
          const { type: _t, ...debtData } = data
          await API.post('/debts', debtData)
        } else {
          const { type: _t, ...goalData } = data
          await API.post('/savings', goalData)
        }
        setActionBanner({ state: 'done', text: `Goal created: ${data.name}`, nav: '/goals' })
        historyRef.current = []
        setTimeout(() => { window.location.href = '/goals' }, 2500)

      } else {
        setActionBanner(null)
      }
    } catch (e) {
      console.error('Intent error:', e)
      setActionBanner({ state: 'error', text: 'Could not complete. Please try again.' })
    }

    setStatus('done')
  }, [addMessage, speak])

  const sendToAI = useCallback(async (text) => {
    if (!text.trim()) return
    setStatus('processing')
    setInputHint('')
    addMessage('user', text)
    const historySnapshot = [...historyRef.current]

    try {
      const { data } = await API.post('/ai/command', {
        text,
        language: responseLang,
        history: historySnapshot
      })
      await executeIntent(data, text)
    } catch (e) {
      console.error('AI error:', e)
      addMessage('ai', t('server_error'))
      setStatus('error')
    }
  }, [responseLang, addMessage, executeIntent])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      addMessage('ai', t('voice_not_supported'))
      setStatus('error')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = micLang
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognitionRef.current = recognition

    recognition.onstart = () => setStatus('listening')
    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('')
      transcriptRef.current = text
    }
    recognition.onend = () => {
      const captured = transcriptRef.current
      transcriptRef.current = ''
      if (captured) sendToAI(captured)
      else { setStatus('idle') }
    }
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        addMessage('ai', 'Microphone error: ' + e.error)
        setStatus('error')
      } else {
        setStatus('idle')
      }
    }

    recognition.start()
  }, [micLang, addMessage, sendToAI])

  // Keep ref up-to-date without circular deps
  startListeningRef.current = startListening

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(() => startListening(), 300)
    return () => {
      clearTimeout(timer)
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = () => recognitionRef.current?.stop()
  const reset = () => {
    historyRef.current = []
    setConversation([])
    setActionBanner(null)
    setInputHint('')
    setStatus('idle')
    setTimeout(() => startListening(), 200)
  }

  const isListening = status === 'listening'
  const isProcessing = status === 'processing'
  const isDone = status === 'done' || status === 'error'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center bg-black/75 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-linear-to-br from-violet-600 to-indigo-700 px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6"/>
                </svg>
              </div>
              <p className="text-white font-bold text-sm">Spendly AI</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-[10px] font-medium">
                {LANG_LABELS[micLang] || 'EN'} → {LANG_LABELS[responseLang] || 'EN'}
              </span>
              <button onClick={onClose} className="text-white/60 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition text-base font-bold">✕</button>
            </div>
          </div>

          {/* Mic button */}
          <div className="flex flex-col items-center py-2">
            <div className="relative">
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                  <span className="absolute -inset-3 rounded-full bg-white/10 animate-pulse" />
                </>
              )}
              <button
                onClick={isListening ? stopListening : isDone ? reset : startListening}
                disabled={isProcessing}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                  isListening ? 'bg-white scale-110' : isProcessing ? 'bg-white/40 cursor-not-allowed' : 'bg-white hover:scale-105 active:scale-95'
                }`}>
                {isProcessing ? (
                  <svg className="animate-spin w-7 h-7 text-violet-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                ) : isDone ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={`text-violet-600 ${isListening ? 'opacity-100' : ''}`}>
                    <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill={isListening ? 'currentColor' : 'none'} fillOpacity="0.15"/>
                    <path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
            <p className="text-white text-xs font-semibold mt-2 min-h-[16px]">
              {isListening ? t('listening') : isProcessing ? t('processing') : isDone ? t('tap_again') : t('tap_to_speak')}
            </p>
            {inputHint && (
              <p className="text-white/70 text-[10px] text-center mt-1 max-w-[220px] leading-relaxed">
                ↑ {inputHint}
              </p>
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[100px]">
          {conversation.length === 0 && status === 'idle' && (
            <div className="text-center pt-2 space-y-2">
              <p className="text-xs text-gray-400 font-medium">{t('try_saying')}</p>
              {[
                '"Spent $25 on lunch"',
                '"Set food budget to $300"',
                '"Add a savings goal for vacation"',
                '"Take me to budgets"',
              ].map((ex, i) => (
                <p key={i} className="text-xs text-violet-500 font-medium">{ex}</p>
              ))}
            </div>
          )}

          {conversation.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-br-md'
                  : 'bg-violet-50 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {actionBanner && (
            <div className={`rounded-2xl px-4 py-3 flex items-start gap-3 ${
              actionBanner.state === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
              actionBanner.state === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
              'bg-blue-50 dark:bg-blue-900/20'
            }`}>
              <span className={`text-lg shrink-0 ${actionBanner.state === 'done' ? 'text-emerald-500' : actionBanner.state === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                {actionBanner.state === 'done' ? '✓' : actionBanner.state === 'error' ? '✕' : '⏳'}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${actionBanner.state === 'done' ? 'text-emerald-700 dark:text-emerald-300' : actionBanner.state === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                  {actionBanner.text}
                </p>
                {actionBanner.state === 'done' && actionBanner.nav && (
                  <p className="text-xs text-emerald-500 mt-0.5">Redirecting to {NAV_LABELS[actionBanner.nav]}...</p>
                )}
              </div>
            </div>
          )}
          <div ref={convEndRef} />
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 shrink-0 text-center border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-300 dark:text-gray-600">{t('voice_hint')}</p>
        </div>
      </div>
    </div>
  )
}
