import { useState, useEffect, useRef, useCallback } from 'react'
import API from '../utils/api'

const LANG_LABELS = {
  'en-US': 'English', 'en-GB': 'English (UK)',
  'ar-SA': 'العربية (السعودية)', 'ar-LB': 'العربية (لبنان)', 'ar-JO': 'العربية (الأردن)',
  'ar-SY': 'العربية (سوريا)', 'ar-BH': 'العربية (البحرين)', 'ar-AE': 'العربية (الإمارات)',
  'ar-EG': 'العربية (مصر)', 'ar-KW': 'العربية (الكويت)', 'ar-IQ': 'العربية (العراق)',
  'ar-MA': 'العربية (المغرب)', 'es-ES': 'Español', 'es-MX': 'Español (México)',
  'fr-FR': 'Français', 'de-DE': 'Deutsch', 'it-IT': 'Italiano', 'pt-PT': 'Português',
  'nl-NL': 'Nederlands', 'pl-PL': 'Polski', 'ru-RU': 'Русский', 'tr-TR': 'Türkçe',
  'af-ZA': 'Afrikaans',
}

export default function VoiceAssistant({ onClose }) {
  const [status, setStatus] = useState('idle') // idle | listening | processing | done | error
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const micLang = localStorage.getItem('spendly_lang_mic') || 'en-US'
  const responseLang = localStorage.getItem('spendly_lang_response') || 'en-US'

  const executeIntent = useCallback(async (result) => {
    const { intent, data, navigate_to, response } = result
    setAiResponse(response || '')

    // Speak response using Web Speech Synthesis
    if (response && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(response)
      utterance.lang = responseLang
      utterance.rate = 0.95
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    }

    try {
      if (intent === 'navigate' && navigate_to) {
        setActionLabel('Navigating...')
        setTimeout(() => { window.location.href = navigate_to }, 1200)

      } else if (intent === 'add_expense' && data) {
        await API.post('/expenses', data)
        setActionLabel(`Added ${data.description || 'expense'} — ${data.amount}`)

      } else if (intent === 'add_income' && data) {
        await API.post('/income', data)
        setActionLabel(`Logged income — ${data.amount}`)

      } else if (intent === 'set_budget' && data) {
        await API.post('/budgets', data)
        setActionLabel(`Budget set for ${data.category}`)

      } else if (intent === 'add_goal' && data) {
        if (data.type === 'debt') {
          const { type: _t, ...debtData } = data
          await API.post('/debts', debtData)
        } else {
          const { type: _t, ...goalData } = data
          await API.post('/savings', goalData)
        }
        setActionLabel(`Goal created: ${data.name}`)

      } else if (intent === 'chat') {
        setActionLabel('')
      }
    } catch (e) {
      console.error('Intent execution error:', e)
      setActionLabel('Could not complete action. Please try again.')
    }

    setStatus('done')
  }, [responseLang])

  const sendToAI = useCallback(async (text) => {
    setStatus('processing')
    try {
      const { data } = await API.post('/ai/command', { text, language: responseLang })
      await executeIntent(data)
    } catch (e) {
      console.error('AI error:', e)
      setAiResponse('Something went wrong. Please try again.')
      setStatus('error')
    }
  }, [responseLang, executeIntent])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setAiResponse('Voice input is not supported in this browser. Try Chrome or Safari.')
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
      setTranscript(text)
      transcriptRef.current = text
    }
    recognition.onend = () => {
      const captured = transcriptRef.current
      transcriptRef.current = ''
      if (captured) sendToAI(captured)
      else { setStatus('idle'); setTranscript('') }
    }
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        setAiResponse('Microphone error: ' + e.error)
        setStatus('error')
      } else {
        setStatus('idle')
      }
    }

    setTranscript('')
    recognition.start()
  }, [micLang, sendToAI])

  // Auto-start on mount
  useEffect(() => {
    startListening()
    return () => {
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  const reset = () => {
    setStatus('idle')
    setTranscript('')
    setAiResponse('')
    setActionLabel('')
    startListening()
  }

  const isListening = status === 'listening'
  const isProcessing = status === 'processing'
  const isDone = status === 'done' || status === 'error'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm px-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-linear-to-br from-violet-600 to-violet-800 px-6 pt-7 pb-8 text-center relative">
          <button onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
            ✕
          </button>
          <p className="text-white/70 text-xs font-semibold mb-4 uppercase tracking-widest">
            {LANG_LABELS[micLang] || 'AI Assistant'} → {LANG_LABELS[responseLang] || responseLang}
          </p>

          {/* Mic Button */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                  <span className="absolute -inset-3 rounded-full bg-white/10 animate-pulse" />
                </>
              )}
              <button
                onClick={isListening ? stopListening : isDone ? reset : startListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isListening
                    ? 'bg-white scale-110'
                    : isProcessing
                    ? 'bg-white/50 cursor-wait'
                    : isDone
                    ? 'bg-white/80 hover:bg-white hover:scale-105'
                    : 'bg-white hover:scale-105'
                }`}>
                {isProcessing ? (
                  <svg className="animate-spin w-8 h-8 text-violet-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                ) : isDone ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-violet-600">
                    <polyline points="23 4 12 15 9 12"/>
                    <path d="M1 15l5 5L23 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-violet-600">
                    <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill={isListening ? 'currentColor' : 'none'} fillOpacity="0.15"/>
                    <path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <p className="text-white font-semibold text-sm">
            {isListening ? 'Listening...' : isProcessing ? 'Processing...' : isDone ? 'Tap to speak again' : 'Tap mic to speak'}
          </p>
        </div>

        {/* Transcript & Response */}
        <div className="px-6 py-5 space-y-4 min-h-[140px]">
          {transcript ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">You said</p>
              <p className="text-sm text-gray-800 dark:text-white leading-relaxed">{transcript}</p>
            </div>
          ) : status === 'idle' ? (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                Try: <span className="text-violet-500 font-medium">"Spent $25 on lunch"</span><br/>
                or <span className="text-violet-500 font-medium">"Take me to budgets"</span><br/>
                or <span className="text-violet-500 font-medium">"Set food budget to $300"</span>
              </p>
            </div>
          ) : null}

          {aiResponse ? (
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold text-violet-400 uppercase mb-1">Spendly AI</p>
              <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">{aiResponse}</p>
            </div>
          ) : null}

          {actionLabel ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-4 py-3">
              <span className="text-emerald-500 font-bold text-base">✓</span>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{actionLabel}</p>
            </div>
          ) : null}
        </div>

        {/* Footer hint */}
        <div className="px-6 pb-5 text-center">
          <p className="text-[10px] text-gray-300 dark:text-gray-600">
            Double-tap the AI tab anytime to open · Change language in Profile
          </p>
        </div>
      </div>
    </div>
  )
}
