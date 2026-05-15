import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, MicOff, Globe, Send, Sparkles } from 'lucide-react'

const PLACEHOLDERS = [
  'Where am I overspending this month?',
  'Can I afford a trip next month?',
  'What\'s my biggest expense category?',
  'How much did I spend on food?',
  'Give me a savings tip',
  'Am I on track with my budget?',
  'اكتب أي سؤال عن مصاريفك…',
  'Show me my spending breakdown',
]

const placeholderContainerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.022 } },
  exit:    { transition: { staggerChildren: 0.012, staggerDirection: -1 } },
}

const letterVariants = {
  initial: { opacity: 0, filter: 'blur(12px)', y: 10 },
  animate: {
    opacity: 1, filter: 'blur(0px)', y: 0,
    transition: { opacity: { duration: 0.25 }, filter: { duration: 0.4 }, y: { type: 'spring', stiffness: 80, damping: 20 } },
  },
  exit: {
    opacity: 0, filter: 'blur(12px)', y: -10,
    transition: { opacity: { duration: 0.2 }, filter: { duration: 0.3 } },
  },
}

const containerVariants = {
  collapsed: {
    height: 68,
    boxShadow: '0 2px 12px 0 rgba(124,58,237,0.10)',
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  },
  expanded: {
    height: 124,
    boxShadow: '0 8px 32px 0 rgba(124,58,237,0.22)',
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  },
}

export function AIChatInput({
  input, setInput, loading, listening,
  onSend, onStartMic, onStopMic,
  micLangMode, onToggleMicLang,
  onKeyDown,
}) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showPlaceholder, setShowPlaceholder]   = useState(true)
  const [isActive, setIsActive]                 = useState(false)
  const [voiceMode, setVoiceMode]               = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (isActive || input) return
    const interval = setInterval(() => {
      setShowPlaceholder(false)
      setTimeout(() => {
        setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length)
        setShowPlaceholder(true)
      }, 400)
    }, 2800)
    return () => clearInterval(interval)
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
      variants={containerVariants}
      animate={expanded ? 'expanded' : 'collapsed'}
      initial="collapsed"
      onClick={() => setIsActive(true)}
      style={{ overflow: 'hidden', borderRadius: 28 }}
      className="w-full bg-white dark:bg-gray-900 border border-violet-100 dark:border-violet-900/50"
    >
      <div className="flex flex-col items-stretch w-full h-full">

        {/* ── Input Row ── */}
        <div className="flex items-center gap-2 p-3">

          {/* Violet spark */}
          <div className="shrink-0 w-9 h-9 rounded-2xl bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md shadow-violet-400/30">
            <Sparkles size={15} className="text-white" />
          </div>

          {/* Text + animated placeholder */}
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setIsActive(true)}
              dir={micLangMode === 'ar' && input && /[؀-ۿ]/.test(input) ? 'rtl' : 'ltr'}
              className="w-full border-0 outline-none bg-transparent text-sm text-gray-900 dark:text-white py-2 font-normal"
              style={{ position: 'relative', zIndex: 1 }}
            />
            <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center">
              <AnimatePresence mode="wait">
                {showPlaceholder && !isActive && !input && !listening && (
                  <motion.span
                    key={placeholderIndex}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 select-none pointer-events-none text-sm"
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', zIndex: 0 }}
                    variants={placeholderContainerVariants}
                    initial="initial" animate="animate" exit="exit"
                  >
                    {PLACEHOLDERS[placeholderIndex].split('').map((char, i) => (
                      <motion.span key={i} variants={letterVariants} style={{ display: 'inline-block' }}>
                        {char === ' ' ? ' ' : char}
                      </motion.span>
                    ))}
                  </motion.span>
                )}
                {listening && (
                  <motion.span
                    key="listening"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-red-400"
                  >
                    <span className="flex gap-0.5 items-end">
                      {[4, 7, 5, 6, 4].map((h, i) => (
                        <span key={i} className="w-0.5 bg-red-400 rounded-full animate-pulse"
                          style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </span>
                    {micLangMode === 'ar' ? 'بيسمعك…' : 'Listening…'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mic */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); listening ? onStopMic() : onStartMic() }}
            disabled={loading}
            className={`shrink-0 p-2.5 rounded-full transition ${
              listening
                ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                : 'hover:bg-violet-50 dark:hover:bg-violet-900/20 text-gray-400 dark:text-gray-500 hover:text-violet-600'
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onSend() }}
            disabled={loading || !input.trim()}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition shadow-sm shadow-violet-400/40"
          >
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Send size={15} />}
          </button>
        </div>

        {/* ── Expanded Controls ── */}
        <motion.div
          className="w-full flex justify-start px-4 items-center text-sm"
          variants={{
            hidden:   { opacity: 0, y: 16, pointerEvents: 'none',  transition: { duration: 0.2 } },
            visible:  { opacity: 1, y: 0,  pointerEvents: 'auto',  transition: { duration: 0.3, delay: 0.08 } },
          }}
          initial="hidden"
          animate={expanded ? 'visible' : 'hidden'}
          style={{ marginTop: 2 }}
        >
          <div className="flex gap-2 items-center">

            {/* Language toggle — mirrors "Think" button */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleMicLang() }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all font-medium text-xs ${
                micLangMode === 'ar'
                  ? 'bg-violet-600/10 ring-1 ring-violet-500/50 text-violet-700 dark:text-violet-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Globe size={14} />
              {micLangMode === 'ar' ? 'عربي' : 'English'}
            </button>

            {/* Voice mode — mirrors "Deep Search" animated button */}
            <motion.button
              type="button"
              onClick={e => { e.stopPropagation(); setVoiceMode(v => !v) }}
              className={`flex items-center gap-1.5 py-1.5 rounded-full transition font-medium text-xs whitespace-nowrap overflow-hidden ${
                voiceMode
                  ? 'bg-violet-600/10 ring-1 ring-violet-500/50 text-violet-700 dark:text-violet-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              initial={false}
              animate={{ width: voiceMode ? 108 : 36, paddingLeft: voiceMode ? 12 : 10 }}
            >
              <Mic size={14} className="shrink-0" />
              <motion.span
                initial={false}
                animate={{ opacity: voiceMode ? 1 : 0 }}
                className="text-xs"
              >
                Voice mode
              </motion.span>
            </motion.button>

          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
