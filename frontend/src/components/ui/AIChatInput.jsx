import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, MicOff, Send, Globe } from 'lucide-react'

const PLACEHOLDERS = [
  'Where am I overspending this month?',
  'Can I afford a trip next month?',
  'What's my biggest expense?',
  'How much did I spend on food?',
  'Give me a savings tip',
  'Am I on track with my budget?',
  'اكتب أي سؤال عن مصاريفك…',
  'Show me my spending breakdown',
]

const letterVariants = {
  initial: { opacity: 0, filter: 'blur(10px)', y: 8 },
  animate: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { opacity: { duration: 0.22 }, filter: { duration: 0.35 }, y: { type: 'spring', stiffness: 80, damping: 20 } } },
  exit:    { opacity: 0, filter: 'blur(10px)', y: -8, transition: { opacity: { duration: 0.18 }, filter: { duration: 0.28 } } },
}

export function AIChatInput({
  input, setInput, loading, listening,
  onSend, onStartMic, onStopMic,
  micLangMode, onToggleMicLang,
  onKeyDown,
}) {
  const [placeholderIdx, setPlaceholderIdx]   = useState(0)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [isActive, setIsActive]               = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (isActive || input) return
    const id = setInterval(() => {
      setShowPlaceholder(false)
      setTimeout(() => {
        setPlaceholderIdx(p => (p + 1) % PLACEHOLDERS.length)
        setShowPlaceholder(true)
      }, 380)
    }, 3000)
    return () => clearInterval(id)
  }, [isActive, input])

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) && !input)
        setIsActive(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [input])

  const expanded = isActive || !!input || listening

  return (
    <motion.div
      ref={wrapperRef}
      onClick={() => setIsActive(true)}
      variants={{
        collapsed: { height: 60, boxShadow: '0 2px 12px 0 rgba(124,58,237,0.08)', transition: { type: 'spring', stiffness: 130, damping: 20 } },
        expanded:  { height: 116, boxShadow: '0 8px 32px 0 rgba(124,58,237,0.18)', transition: { type: 'spring', stiffness: 130, damping: 20 } },
      }}
      animate={expanded ? 'expanded' : 'collapsed'}
      initial="collapsed"
      style={{ borderRadius: 24, overflow: 'hidden' }}
      className="w-full bg-white dark:bg-gray-800 border border-violet-100 dark:border-violet-900/40"
    >
      {/* Input row */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        {/* Violet spark icon */}
        <div className="shrink-0 w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-300/40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>

        {/* Text input + animated placeholder */}
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setIsActive(true)}
            dir={micLangMode === 'ar' && input && /[؀-ۿ]/.test(input) ? 'rtl' : 'ltr'}
            className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white py-1.5 placeholder-transparent"
          />
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center">
            <AnimatePresence mode="wait">
              {showPlaceholder && !isActive && !input && !listening && (
                <motion.span
                  key={placeholderIdx}
                  className="absolute text-sm text-gray-400 dark:text-gray-500 select-none whitespace-nowrap overflow-hidden"
                  variants={{ initial: {}, animate: { transition: { staggerChildren: 0.022 } }, exit: { transition: { staggerChildren: 0.012, staggerDirection: -1 } } }}
                  initial="initial" animate="animate" exit="exit"
                >
                  {PLACEHOLDERS[placeholderIdx].split('').map((c, i) => (
                    <motion.span key={i} variants={letterVariants} style={{ display: 'inline-block' }}>
                      {c === ' ' ? ' ' : c}
                    </motion.span>
                  ))}
                </motion.span>
              )}
              {listening && (
                <motion.span key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute text-sm text-red-400 flex items-center gap-1.5">
                  <span className="flex gap-0.5 items-end">
                    {[4,7,5,6,4].map((h, i) => (
                      <span key={i} className="w-0.5 bg-red-400 rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </span>
                  {micLangMode === 'ar' ? 'بيسمعك…' : 'Listening…'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={e => { e.stopPropagation(); onSend() }}
          disabled={loading || !input.trim()}
          className="shrink-0 w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition shadow-sm shadow-violet-300/50"
        >
          {loading
            ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Send size={14} />}
        </button>
      </div>

      {/* Expanded controls */}
      <motion.div
        className="flex items-center gap-2 px-3 pb-2.5 pt-1"
        variants={{
          hidden:   { opacity: 0, y: 12, pointerEvents: 'none',  transition: { duration: 0.2 } },
          visible:  { opacity: 1, y: 0,  pointerEvents: 'auto',  transition: { duration: 0.28, delay: 0.08 } },
        }}
        initial="hidden"
        animate={expanded ? 'visible' : 'hidden'}
      >
        {/* Lang toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggleMicLang() }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            micLangMode === 'ar'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-300/60'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-600'
          }`}
        >
          <Globe size={13} />
          {micLangMode === 'ar' ? 'عربي' : 'English'}
        </button>

        {/* Mic button */}
        <button
          onClick={e => { e.stopPropagation(); listening ? onStopMic() : onStartMic() }}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            listening
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 ring-1 ring-red-300/60'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-600'
          }`}
        >
          {listening ? <MicOff size={13} /> : <Mic size={13} />}
          {listening ? 'Stop' : 'Voice'}
        </button>
      </motion.div>
    </motion.div>
  )
}
