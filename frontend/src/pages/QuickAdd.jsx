import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../utils/api'

const ANIM = `
@keyframes qaRipple { to { transform:scale(3.2); opacity:0 } }
@keyframes qaSlide  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
@keyframes qaSpin   { to { transform:rotate(360deg) } }
@keyframes qaFade   { from { opacity:0 } to { opacity:1 } }
@keyframes qaBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes qaCheck  { 0%{stroke-dashoffset:36} 100%{stroke-dashoffset:0} }
`

const CATEGORIES = [
  'Food & Dining','Transport','Entertainment','Shopping',
  'Health','Bills & Utilities','Education','Travel','Personal Care','Other',
]
const CAT_ICONS = {
  'Food & Dining':'🍔','Transport':'🚗','Entertainment':'🎬','Shopping':'🛍️',
  'Health':'💊','Bills & Utilities':'💡','Education':'📚','Travel':'✈️',
  'Personal Care':'💅','Other':'💳',
}
const SYM = { USD:'$',EUR:'€',GBP:'£',LBP:'L£',AED:'AED',SAR:'SAR',CAD:'C$',AUD:'A$' }

export default function QuickAdd() {
  const navigate = useNavigate()
  const [phase, setPhase]       = useState('idle') // idle|listening|thinking|confirm|saving|done
  const [transcript, setTx]     = useState('')
  const [msgs, setMsgs]         = useState([])
  const [expense, setExpense]   = useState(null)
  const [editAmt, setEditAmt]   = useState('')
  const [editCat, setEditCat]   = useState('Food & Dining')
  const [editDesc, setEditDesc] = useState('')
  const [textInput, setTxtIn]   = useState('')
  const [speechOk, setSpeechOk] = useState(true)

  const recRef      = useRef(null)
  const txRef       = useRef('')
  const needsAmtRef = useRef(false)
  const expRef      = useRef(null)
  const msgsEnd     = useRef(null)

  const currency = localStorage.getItem('currency') || 'USD'
  const sym = SYM[currency] || currency

  const addMsg = (from, text) =>
    setMsgs(prev => [...prev, { from, text, id: Date.now() + Math.random() }])

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setSpeechOk(false)
      addMsg('spendly', "Hi! Type what you spent below 👇")
    } else {
      addMsg('spendly', "Hi! Tell me what you spent today 🎤")
      setTimeout(startListening, 700)
    }
    return () => { try { recRef.current?.abort() } catch {} }
  }, [])

  useEffect(() => {
    msgsEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, phase])

  useEffect(() => { expRef.current = expense }, [expense])

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSpeechOk(false); return }
    try { recRef.current?.abort() } catch {}

    const r = new SR()
    r.lang = localStorage.getItem('speechLang') || localStorage.getItem('fina_lang_mic') || 'en-US'
    r.continuous = false
    r.interimResults = true

    r.onstart  = () => setPhase('listening')
    r.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      txRef.current = t
      setTx(t)
    }
    r.onend = () => {
      const t = txRef.current.trim()
      txRef.current = ''
      setTx('')
      if (t) handleInput(t)
      else setPhase('idle')
    }
    r.onerror = () => { setSpeechOk(false); setPhase('idle') }

    recRef.current = r
    try { r.start() } catch { setSpeechOk(false) }
  }

  const handleInput = async (text) => {
    setPhase('thinking')
    addMsg('user', text)
    setTxtIn('')

    // Second turn — user is giving the amount
    if (needsAmtRef.current && expRef.current) {
      try {
        const res = await API.post('/insights/quick-parse', { text: `amount: ${text}` })
        const amount = res.data.amount
        if (amount && amount > 0) {
          const full = { ...expRef.current, amount }
          setExpense(full)
          expRef.current = full
          setEditAmt(String(amount))
          setEditCat(full.category || 'Food & Dining')
          setEditDesc(full.description || '')
          needsAmtRef.current = false
          addMsg('spendly', `${sym}${amount} for "${full.description}". Looks right?`)
          setPhase('confirm')
        } else {
          addMsg('spendly', "Didn't catch that amount — just say the number?")
          setPhase('idle')
          if (speechOk) setTimeout(startListening, 800)
        }
      } catch {
        addMsg('spendly', 'Something went wrong, try again!')
        setPhase('idle')
      }
      return
    }

    // First turn — full natural language parse
    try {
      const res = await API.post('/insights/quick-parse', { text })
      const p = res.data
      setExpense(p)
      expRef.current = p

      if (p.needsAmount || !p.amount) {
        needsAmtRef.current = true
        addMsg('spendly', `${CAT_ICONS[p.category] || '💳'} Got it — "${p.description}". How much was it?`)
        setPhase('idle')
        if (speechOk) setTimeout(startListening, 800)
      } else {
        needsAmtRef.current = false
        setEditAmt(String(p.amount))
        setEditCat(p.category || 'Food & Dining')
        setEditDesc(p.description || '')
        addMsg('spendly', `${CAT_ICONS[p.category] || '💳'} ${sym}${p.amount} for "${p.description}". Confirm?`)
        setPhase('confirm')
      }
    } catch {
      addMsg('spendly', "Hmm, I didn't catch that. Try again?")
      setPhase('idle')
    }
  }

  const save = async () => {
    const amt = parseFloat(editAmt)
    if (!amt || amt <= 0 || !editDesc.trim()) return
    setPhase('saving')
    try {
      await API.post('/expenses', {
        amount: amt,
        category: editCat,
        description: editDesc.trim(),
        date: expense?.date || new Date().toISOString().split('T')[0],
      })
      addMsg('spendly', `Done! Added ${sym}${amt} for "${editDesc.trim()}" ✅`)
      setPhase('done')
    } catch {
      addMsg('spendly', "Couldn't save — check your connection and try again.")
      setPhase('confirm')
    }
  }

  const cancel = () => {
    setPhase('idle')
    setExpense(null); expRef.current = null
    needsAmtRef.current = false
    addMsg('spendly', "No problem! What would you like to add?")
    if (speechOk) setTimeout(startListening, 800)
  }

  const reset = () => {
    setExpense(null); expRef.current = null
    setEditAmt(''); setEditCat('Food & Dining'); setEditDesc('')
    needsAmtRef.current = false
    addMsg('spendly', "What else did you spend on? 🎤")
    setPhase('idle')
    if (speechOk) setTimeout(startListening, 600)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #1e1040 0%, #0f172a 50%, #1a0a3e 100%)' }}>
      <style>{ANIM}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <button onClick={() => navigate('/dashboard')}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition text-xl font-light">
          ✕
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-sm tracking-wide">Quick Add</p>
          <p className="text-violet-400 text-xs">Voice expense tracker</p>
        </div>
        <button onClick={() => navigate('/insights')}
          className="text-violet-400 text-xs font-semibold hover:text-white transition px-2 py-1">
          Chat →
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 pb-4">
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animation: 'qaSlide 0.3s ease' }}>
            {m.from === 'spendly' && (
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm shrink-0 mr-2 mt-0.5 shadow-md shadow-violet-900/40">
                ✨
              </div>
            )}
            <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
              m.from === 'user'
                ? 'bg-white/20 text-white rounded-tr-sm'
                : 'bg-white/8 text-violet-100 rounded-tl-sm border border-white/10'
            }`} style={ m.from === 'spendly' ? { background: 'rgba(255,255,255,0.07)' } : {}}>
              {m.text}
            </div>
          </div>
        ))}

        {/* Thinking dots */}
        {phase === 'thinking' && (
          <div className="flex items-center gap-2" style={{ animation: 'qaSlide 0.25s ease' }}>
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm shrink-0">✨</div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10 flex gap-1.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-violet-400 rounded-full"
                  style={{ animation: `qaBounce 0.9s ease ${i * 0.22}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={msgsEnd} />
      </div>

      {/* Live transcript */}
      {phase === 'listening' && transcript && (
        <div className="px-6 py-1 text-center" style={{ animation: 'qaFade 0.2s ease' }}>
          <p className="text-violet-300/80 text-sm italic">"{transcript}"</p>
        </div>
      )}

      {/* Confirm card */}
      {phase === 'confirm' && expense && (
        <div className="px-5 pb-4" style={{ animation: 'qaSlide 0.3s ease' }}>
          <div className="rounded-2xl p-4 border border-white/15" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{CAT_ICONS[editCat] || '💳'}</span>
              <span className="text-white font-bold text-sm">Confirm Expense</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <p className="text-violet-300 text-xs mb-1">Amount ({currency})</p>
                <input type="number" value={editAmt} onChange={e => setEditAmt(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none border border-white/20 focus:border-violet-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  placeholder="0.00" />
              </div>
              <div>
                <p className="text-violet-300 text-xs mb-1">Category</p>
                <select value={editCat} onChange={e => setEditCat(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none border border-white/20 focus:border-violet-400 appearance-none"
                  style={{ background: 'rgba(30,16,64,0.95)' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <p className="text-violet-300 text-xs mb-1">Description</p>
              <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none border border-white/20 focus:border-violet-400"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                placeholder="What did you buy?" />
            </div>
            <div className="flex gap-2">
              <button onClick={save}
                disabled={!parseFloat(editAmt) || !editDesc.trim()}
                className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-violet-500 active:scale-95 transition disabled:opacity-40">
                Add it ✓
              </button>
              <button onClick={cancel}
                className="px-5 py-3 rounded-xl text-sm font-semibold text-violet-300 hover:text-white transition border border-white/15 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving */}
      {phase === 'saving' && (
        <div className="flex justify-center pb-5">
          <div className="w-9 h-9 rounded-full border-2 border-violet-400/30 border-t-violet-400"
            style={{ animation: 'qaSpin 0.75s linear infinite' }} />
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="px-5 pb-8 flex gap-3" style={{ animation: 'qaSlide 0.3s ease' }}>
          <button onClick={reset}
            className="flex-1 bg-violet-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-violet-500 active:scale-95 transition">
            + Add another
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition hover:bg-white/10 border border-white/15">
            Done →
          </button>
        </div>
      )}

      {/* Mic / text input area */}
      {(phase === 'idle' || phase === 'listening') && (
        <div className="px-5 pb-10">
          {speechOk ? (
            <div className="flex flex-col items-center gap-4">
              {/* Mic button */}
              <div className="relative flex items-center justify-center mt-2">
                {phase === 'listening' && (
                  <>
                    <div className="absolute w-24 h-24 rounded-full bg-violet-500/25"
                      style={{ animation: 'qaRipple 1.6s ease-out infinite' }} />
                    <div className="absolute w-24 h-24 rounded-full bg-violet-500/15"
                      style={{ animation: 'qaRipple 1.6s ease-out 0.55s infinite' }} />
                  </>
                )}
                <button
                  onClick={() => phase === 'listening' ? (() => { try { recRef.current?.stop() } catch {} })() : startListening()}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    phase === 'listening'
                      ? 'bg-violet-600 shadow-violet-700/60 scale-110'
                      : 'border border-white/20 hover:bg-white/10'
                  }`}
                  style={ phase !== 'listening' ? { background: 'rgba(255,255,255,0.1)' } : {}}>
                  <svg width="30" height="30" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                      fill={phase === 'listening' ? 'white' : '#a78bfa'} />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                      fill="none" stroke={phase === 'listening' ? 'white' : '#a78bfa'} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <p className="text-violet-400 text-xs">
                {phase === 'listening' ? 'Listening… tap to stop' : 'Tap to speak'}
              </p>
              <div className="w-full flex gap-2">
                <input type="text" value={textInput}
                  onChange={e => setTxtIn(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && textInput.trim() && handleInput(textInput.trim())}
                  placeholder="Or type here…"
                  className="flex-1 rounded-2xl px-4 py-3 text-white text-sm placeholder-violet-400/50 focus:outline-none border border-white/15 focus:border-violet-500"
                  style={{ background: 'rgba(255,255,255,0.07)' }} />
                <button onClick={() => textInput.trim() && handleInput(textInput.trim())}
                  disabled={!textInput.trim()}
                  className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center hover:bg-violet-500 active:scale-90 transition disabled:opacity-30 shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="text" value={textInput}
                onChange={e => setTxtIn(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && textInput.trim() && handleInput(textInput.trim())}
                autoFocus
                placeholder='e.g. "spent $15 on burger"'
                className="flex-1 rounded-2xl px-4 py-4 text-white placeholder-violet-400/50 focus:outline-none border border-white/15 focus:border-violet-500"
                style={{ background: 'rgba(255,255,255,0.07)' }} />
              <button onClick={() => textInput.trim() && handleInput(textInput.trim())}
                disabled={!textInput.trim()}
                className="w-14 bg-violet-600 rounded-2xl flex items-center justify-center hover:bg-violet-500 active:scale-90 transition disabled:opacity-30 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
