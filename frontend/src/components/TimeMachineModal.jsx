import { useState, useEffect, useRef } from 'react'
import API from '../utils/api'

const SYM = { USD:'$', EUR:'€', GBP:'£', LBP:'L£', AED:'AED', SAR:'SAR', CAD:'C$', AUD:'A$' }

const POPULAR = [
  { year:1929, label:'💀 Great Crash'    },
  { year:1945, label:'🕊️ WWII Ends'     },
  { year:1969, label:'🌙 Moon Landing'   },
  { year:1987, label:'📉 Black Monday'   },
  { year:2000, label:'💻 Y2K'            },
  { year:2008, label:'🏦 Great Recession'},
  { year:2020, label:'🦠 Covid-19'       },
  { year:2040, label:'🔮 Near Future'    },
]

function getTheme(year) {
  if (year < 1920) return { bg:'from-amber-950 via-yellow-950 to-zinc-950', planet:['#92400e','#78350f'], accent:'#fbbf24' }
  if (year < 1940) return { bg:'from-stone-900 via-gray-900 to-zinc-950',   planet:['#4b5563','#1f2937'], accent:'#9ca3af' }
  if (year < 1950) return { bg:'from-green-950 via-stone-950 to-zinc-950',  planet:['#064e3b','#022c22'], accent:'#34d399' }
  if (year < 1960) return { bg:'from-sky-950 via-blue-950 to-zinc-950',     planet:['#0369a1','#0c4a6e'], accent:'#7dd3fc' }
  if (year < 1970) return { bg:'from-indigo-950 via-blue-950 to-zinc-950',  planet:['#3730a3','#1e1b4b'], accent:'#a5b4fc' }
  if (year < 1980) return { bg:'from-orange-950 via-red-950 to-zinc-950',   planet:['#c2410c','#7c2d12'], accent:'#fb923c' }
  if (year < 1990) return { bg:'from-fuchsia-950 via-purple-950 to-zinc-950',planet:['#7c3aed','#4c1d95'],accent:'#e879f9' }
  if (year < 2000) return { bg:'from-teal-950 via-cyan-950 to-zinc-950',    planet:['#0f766e','#134e4a'], accent:'#5eead4' }
  if (year < 2010) return { bg:'from-blue-950 via-indigo-950 to-zinc-950',  planet:['#1e40af','#1e3a8a'], accent:'#93c5fd' }
  if (year < 2020) return { bg:'from-cyan-950 via-blue-950 to-zinc-950',    planet:['#0891b2','#0c4a6e'], accent:'#67e8f9' }
  if (year < 2030) return { bg:'from-violet-950 via-purple-950 to-zinc-950',planet:['#6d28d9','#2e1065'], accent:'#c084fc' }
  if (year < 2060) return { bg:'from-cyan-950 via-indigo-950 to-zinc-950',  planet:['#0284c7','#164e63'], accent:'#38bdf8' }
  return             { bg:'from-slate-950 via-gray-950 to-zinc-950',        planet:['#475569','#1e293b'], accent:'#94a3b8' }
}

// Deterministic stars so they don't flicker on re-render
function makeStars(seed) {
  let s = seed
  const r = () => { s=(s*9301+49297)%233280; return s/233280 }
  return Array.from({length:55},()=>({ x:r()*100, y:r()*100, rad:r()*1.4+0.4, op:r()*0.45+0.12, dur:r()*3+2 }))
}

const ANIM = `
@keyframes tmZoomYear {
  0%   { transform:scale(0.05) rotate(0deg);   opacity:0 }
  25%  { opacity:1 }
  65%  { transform:scale(2.5) rotate(180deg);  opacity:1 }
  100% { transform:scale(9)   rotate(360deg);  opacity:0 }
}
@keyframes tmPlanetDrop {
  0%   { transform:translateY(-130px) scale(0.1); opacity:0 }
  65%  { transform:translateY(8px)    scale(1.06);opacity:1 }
  100% { transform:translateY(0)      scale(1);   opacity:1 }
}
@keyframes tmAvatarIn {
  0%   { transform:translateX(-110vw) }
  78%  { transform:translateX(6px) }
  88%  { transform:translateX(-4px) }
  100% { transform:translateX(0) }
}
@keyframes tmBounce {
  0%,100% { transform:translateY(0) }
  50%      { transform:translateY(-5px) }
}
@keyframes tmBubblePop {
  0%   { transform:scale(0.55) translateY(10px); opacity:0 }
  78%  { transform:scale(1.03) translateY(-1px); opacity:1 }
  100% { transform:scale(1)    translateY(0);    opacity:1 }
}
@keyframes tmSlideUp {
  from { transform:translateY(26px); opacity:0 }
  to   { transform:translateY(0);    opacity:1 }
}
@keyframes tmStreak {
  0%   { transform:translateX(-100%); opacity:0 }
  15%  { opacity:0.7 }
  85%  { opacity:0.7 }
  100% { transform:translateX(200%);  opacity:0 }
}
@keyframes tmStarFlicker {
  0%,100% { opacity:var(--so) }
  50%      { opacity:calc(var(--so)*0.15) }
}
@keyframes tmPulse {
  0%,100% { opacity:0.5 }
  50%      { opacity:1 }
}
`

// ── Spendly Robot Avatar ─────────────────────────────────────────────────────
function SpendlyBot({ mood='neutral', walking=false, talking=false }) {
  return (
    <svg viewBox="0 0 80 110" width="76" height="94" style={{overflow:'visible',flexShrink:0}}>
      {/* Antenna */}
      <line x1="40" y1="3" x2="40" y2="13" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="40" cy="3" r="4" fill="#818cf8">
        <animate attributeName="r"       values="4;5.5;4"   dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.3;1"   dur="1.8s" repeatCount="indefinite"/>
      </circle>

      {/* Head */}
      <rect x="16" y="11" width="48" height="36" rx="10" fill="#4f46e5"/>
      <rect x="19" y="14" width="16" height="7"  rx="3.5" fill="#6366f1" opacity="0.4"/>

      {/* Eyes — mood-dependent */}
      {mood==='shocked' ? <>
        <ellipse cx="30" cy="27" rx="9"  ry="10" fill="#e0e7ff"/>
        <ellipse cx="50" cy="27" rx="9"  ry="10" fill="#e0e7ff"/>
        <circle  cx="30" cy="29" r="4.5"         fill="#1e1b4b"/>
        <circle  cx="50" cy="29" r="4.5"         fill="#1e1b4b"/>
        <circle  cx="28.5" cy="27" r="1.5"       fill="white"/>
        <circle  cx="48.5" cy="27" r="1.5"       fill="white"/>
      </> : mood==='laughing' ? <>
        <path d="M21 22 Q30 15 39 22" fill="none" stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M41 22 Q50 15 59 22" fill="none" stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M24 27 Q30 33 36 27" fill="#c7d2fe"/>
        <path d="M44 27 Q50 33 56 27" fill="#c7d2fe"/>
      </> : <>
        <rect x="21" y="21" width="17" height="12" rx="5" fill="#e0e7ff"/>
        <rect x="42" y="21" width="17" height="12" rx="5" fill="#e0e7ff"/>
        <rect x="26" y="24" rx="3" width={talking?'5':'6'} height={talking?'6':'7'} fill="#1e1b4b">
          {talking && <animate attributeName="height" values="6;2;6" dur="0.22s" repeatCount="indefinite"/>}
        </rect>
        <rect x="47" y="24" rx="3" width={talking?'5':'6'} height={talking?'6':'7'} fill="#1e1b4b">
          {talking && <animate attributeName="height" values="6;2;6" dur="0.22s" begin="0.11s" repeatCount="indefinite"/>}
        </rect>
      </>}

      {/* Mouth */}
      {mood==='laughing'
        ? <path d="M24 39 Q40 50 56 39" fill="#312e81" stroke="#a5b4fc" strokeWidth="1.5"/>
        : mood==='shocked'
        ? <ellipse cx="40" cy="40" rx="7" ry="5" fill="#312e81"/>
        : talking
        ? <ellipse cx="40" cy="40" rx="6" ry="4" fill="#312e81">
            <animate attributeName="ry" values="4;1.5;4" dur="0.22s" repeatCount="indefinite"/>
          </ellipse>
        : <path d="M29 40 Q40 45 51 40" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round"/>
      }

      {/* Body */}
      <rect x="20" y="49" width="40" height="27" rx="8" fill="#4338ca"/>
      <rect x="26" y="54" width="28" height="16" rx="4" fill="#1e1b4b"/>
      <text x="40" y="66" textAnchor="middle" fill="#818cf8" fontSize="11" fontWeight="bold" fontFamily="monospace">$</text>

      {/* Left arm */}
      <rect x="7" y="51" width="13" height="21" rx="6.5" fill="#4338ca">
        {walking && <animateTransform attributeName="transform" type="rotate"
          values="22,13,51; -22,13,51; 22,13,51" dur="0.38s" repeatCount="indefinite"/>}
      </rect>
      {/* Right arm */}
      <rect x="60" y="51" width="13" height="21" rx="6.5" fill="#4338ca">
        {walking && <animateTransform attributeName="transform" type="rotate"
          values="-22,66,51; 22,66,51; -22,66,51" dur="0.38s" repeatCount="indefinite"/>}
      </rect>

      {/* Left leg */}
      <rect x="25" y="76" width="13" height="24" rx="6.5" fill="#3730a3">
        {walking && <animateTransform attributeName="transform" type="rotate"
          values="26,31,76; -26,31,76; 26,31,76" dur="0.38s" repeatCount="indefinite"/>}
      </rect>
      {/* Right leg */}
      <rect x="42" y="76" width="13" height="24" rx="6.5" fill="#3730a3">
        {walking && <animateTransform attributeName="transform" type="rotate"
          values="-26,48,76; 26,48,76; -26,48,76" dur="0.38s" repeatCount="indefinite"/>}
      </rect>
    </svg>
  )
}

// ── Typewriter text ──────────────────────────────────────────────────────────
function Typewriter({ text, speed=28, onDone }) {
  const [val,  setVal]  = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setVal(''); setDone(false)
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++; setVal(text.slice(0,i))
      if (i >= text.length) { clearInterval(id); setDone(true); onDone?.() }
    }, speed)
    return () => clearInterval(id)
  }, [text]) // eslint-disable-line
  return <>{val}{!done && <span style={{animation:'tmPulse 0.5s ease infinite'}}>▌</span>}</>
}

// ── Planet visual ────────────────────────────────────────────────────────────
function Planet({ year, colors, eraName, size=160 }) {
  const [c1,c2] = colors || ['#6366f1','#4f46e5']
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{width:size, height:size}}>
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full opacity-25 blur-2xl"
          style={{background:`radial-gradient(circle,${c1},${c2})`}}/>
        {/* Planet body */}
        <div className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background:`radial-gradient(circle at 32% 28%,${c1} 0%,${c2} 55%,#050510 100%)`,
            animation:'tmPlanetDrop 0.85s cubic-bezier(0.34,1.45,0.64,1) both',
          }}>
          {/* Surface bands */}
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full opacity-10">
            <ellipse cx={size*0.5} cy={size*0.42} rx={size*0.44} ry={size*0.10} fill="none" stroke="white" strokeWidth="1.5"/>
            <ellipse cx={size*0.5} cy={size*0.58} rx={size*0.34} ry={size*0.07} fill="none" stroke="white" strokeWidth="1"/>
          </svg>
          {/* Specular shine */}
          <div className="absolute rounded-full opacity-18"
            style={{top:'12%',left:'17%',width:'28%',height:'20%',background:'white',filter:'blur(7px)'}}/>
        </div>
        {/* Year label */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{animation:'tmPlanetDrop 0.85s cubic-bezier(0.34,1.45,0.64,1) both'}}>
          <span className="text-white font-black select-none drop-shadow-2xl"
            style={{fontSize:size*0.265, textShadow:'0 3px 22px rgba(0,0,0,0.95)'}}>
            {year}
          </span>
        </div>
      </div>
      {eraName && (
        <div className="text-center px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
          style={{
            background:`${c1}22`, color:c1, border:`1px solid ${c1}44`,
            animation:'tmSlideUp 0.4s 0.75s ease both', opacity:0,
          }}>
          {eraName}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
// ── TTS helpers ─────────────────────────────────────────────────────────────
function stripEmoji(str) {
  return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27FF}]/gu, '').trim()
}

function speakNow(text, rate = 0.92, pitch = 1.08) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(stripEmoji(text))
  utt.rate  = rate
  utt.pitch = pitch
  const voices = window.speechSynthesis.getVoices()
  const pick = voices.find(v =>
    /samantha|google uk english female|karen|victoria|fiona/i.test(v.name)
  ) || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang.startsWith('en'))
  if (pick) utt.voice = pick
  window.speechSynthesis.speak(utt)
}

export default function TimeMachineModal({ onClose, defaultAmount, currency='USD' }) {
  const sym = SYM[currency] || '$'

  const [phase,       setPhase]       = useState('input')   // input|warping|arriving|sketch|done
  const [yearInput,   setYearInput]   = useState('')
  const [amtInput,    setAmtInput]    = useState(defaultAmount ? String(Math.round(defaultAmount)) : '')
  const [sketch,      setSketch]      = useState(null)
  const [lines,       setLines]       = useState([])
  const [lineIdx,     setLineIdx]     = useState(-1)
  const [walking,     setWalking]     = useState(false)
  const [talking,     setTalking]     = useState(false)
  const [mood,        setMood]        = useState('neutral')
  const [err,         setErr]         = useState('')
  const [muted,       setMuted]       = useState(() => localStorage.getItem('spendly_tm_muted') === 'true')

  // Refs so onLineDone never reads stale state
  const linesRef    = useRef([])
  const lineIdxRef  = useRef(-1)
  const starsRef    = useRef(makeStars(42))
  const mutedRef    = useRef(muted)

  useEffect(() => { linesRef.current   = lines   }, [lines])
  useEffect(() => { lineIdxRef.current = lineIdx }, [lineIdx])
  useEffect(() => { mutedRef.current   = muted   }, [muted])

  // Speak each line when it starts
  useEffect(() => {
    if (talking && lineIdx >= 0 && lines[lineIdx] && !mutedRef.current) {
      speakNow(lines[lineIdx].text)
    }
  }, [lineIdx, talking]) // eslint-disable-line

  // Cancel speech on unmount
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const theme = sketch ? getTheme(sketch.year) : getTheme(1970)

  // ── travel ──────────────────────────────────────────────────────────────
  const travel = async () => {
    const y = parseInt(yearInput)
    if (!y || y < 1900 || y > 2100) { setErr('Enter a year between 1900 and 2100'); return }
    const a = parseFloat(amtInput) || 100
    setErr('')
    setPhase('warping')
    starsRef.current = makeStars(y)

    try {
      const { data } = await API.post('/insights/time-machine', { year:y, amount:a, currency })
      const linesData = [
        { text: data.greeting, mood: data.mood || 'shocked'  },
        { text: data.context,  mood: 'neutral'               },
        { text: data.roast,    mood: 'laughing'              },
        { text: `💡 ${data.funFact}`, mood: 'neutral'        },
      ]
      // Warp lasts 2.6 s min so the animation plays fully
      setTimeout(() => {
        setSketch(data)
        setLines(linesData)
        setPhase('arriving')
        // Planet arrives → then start sketch
        setTimeout(() => {
          setPhase('sketch')
          setWalking(true)
          // Avatar walks in 1.5 s, then start talking
          setTimeout(() => {
            setWalking(false)
            setLineIdx(0)
            setMood(linesData[0].mood)
            setTalking(true)
          }, 1550)
        }, 2000)
      }, 2650)
    } catch {
      setTimeout(() => { setPhase('input'); setErr('Time travel failed! Try again.') }, 2650)
    }
  }

  // ── called when one typewriter finishes ──────────────────────────────────
  const onLineDone = () => {
    setTalking(false)
    setTimeout(() => {
      const cur  = lineIdxRef.current
      const lns  = linesRef.current
      const next = cur + 1
      if (next >= lns.length) {
        setPhase('done')
      } else {
        setLineIdx(next)
        setMood(lns[next].mood)
        setTalking(true)
      }
    }, 950)
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem('spendly_tm_muted', String(next))
    if (next) window.speechSynthesis?.cancel()
  }

  const reset = () => {
    window.speechSynthesis?.cancel()
    setPhase('input'); setSketch(null); setLines([])
    setLineIdx(-1); setWalking(false); setTalking(false); setMood('neutral')
    lineIdxRef.current = -1
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-br ${theme.bg}`}>
      <style>{ANIM}</style>

      {/* Stars (visible in all non-input phases) */}
      {phase !== 'input' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {starsRef.current.map((s,i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{
                left:`${s.x}%`, top:`${s.y}%`,
                width:s.rad*2, height:s.rad*2,
                '--so':s.op,
                animation:`tmStarFlicker ${s.dur}s ${i*0.06}s ease-in-out infinite`,
              }}/>
          ))}
        </div>
      )}

      {/* Controls: mute + close */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button onClick={toggleMute} title={muted ? 'Unmute narrator' : 'Mute narrator'}
          className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition">
          {muted ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>
        <button onClick={() => { window.speechSynthesis?.cancel(); onClose() }}
          className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold transition">
          ✕
        </button>
      </div>

      {/* ══ INPUT ══════════════════════════════════════════════════════════ */}
      {phase === 'input' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <div className="text-center">
            <div className="text-6xl mb-3">🕰️</div>
            <h2 className="text-white font-black text-2xl mb-1">Time Machine</h2>
            <p className="text-white/50 text-sm">Enter any year. Spendly will roast your life choices.</p>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <div>
              <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5 block">Your amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-semibold text-sm">{sym}</span>
                <input value={amtInput} onChange={e=>setAmtInput(e.target.value)}
                  type="number" placeholder="100"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/25 text-lg font-bold focus:outline-none focus:border-white/50 transition"/>
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5 block">Destination year</label>
              <input value={yearInput} onChange={e=>{ setYearInput(e.target.value); setErr('') }}
                type="number" placeholder="e.g. 1979"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/25 text-lg font-bold focus:outline-none focus:border-white/50 transition"
                onKeyDown={e=>e.key==='Enter'&&travel()}/>
              {err && <p className="text-red-400 text-xs mt-1.5">{err}</p>}
            </div>
            <button onClick={travel}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/50">
              🚀 Launch Time Machine
            </button>
          </div>

          {/* Popular destinations */}
          <div className="w-full max-w-sm">
            <p className="text-white/25 text-xs uppercase tracking-wider text-center mb-2">Popular destinations</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {POPULAR.map(p=>(
                <button key={p.year} onClick={()=>setYearInput(String(p.year))}
                  className="bg-white/8 hover:bg-white/15 border border-white/12 text-white/55 hover:text-white text-xs px-3 py-1.5 rounded-full transition">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ WARPING ════════════════════════════════════════════════════════ */}
      {phase === 'warping' && (
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {/* Speed streaks */}
          {[...Array(12)].map((_,i)=>(
            <div key={i} className="absolute h-px bg-white/35"
              style={{
                width:'75%', left:'12.5%',
                top:`${12+i*6.5}%`,
                animation:`tmStreak ${0.65+i*0.07}s ${i*0.05}s linear infinite`,
              }}/>
          ))}
          <div className="relative z-10" style={{animation:'tmZoomYear 2.5s ease-in-out forwards'}}>
            <span className="text-white font-black text-8xl drop-shadow-2xl tracking-tighter">{yearInput}</span>
          </div>
          <p className="text-white/40 text-sm mt-5 z-10 tracking-widest uppercase"
            style={{animation:'tmPulse 0.7s ease infinite'}}>
            Entering the vortex…
          </p>
        </div>
      )}

      {/* ══ ARRIVING ═══════════════════════════════════════════════════════ */}
      {phase === 'arriving' && sketch && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Planet
            year={sketch.year}
            colors={sketch.planetColors || theme.planet}
            eraName={sketch.eraName}
            size={172}
          />
        </div>
      )}

      {/* ══ SKETCH + DONE ══════════════════════════════════════════════════ */}
      {(phase==='sketch' || phase==='done') && sketch && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Planet — small at top */}
          <div className="flex justify-center pt-5 pb-1 shrink-0">
            <Planet
              year={sketch.year}
              colors={sketch.planetColors || theme.planet}
              eraName={sketch.eraName}
              size={88}
            />
          </div>

          {/* Speech bubbles */}
          <div className="flex-1 px-4 pt-2 pb-1 flex flex-col justify-end gap-2 overflow-hidden">
            {lines.slice(0, lineIdx+1).map((line,i)=>(
              <div key={i}
                className="bg-white rounded-2xl px-4 py-3 shadow-xl max-w-[88%] self-start"
                style={{borderBottomLeftRadius:4, animation:'tmBubblePop 0.3s ease both'}}>
                <p className="text-gray-800 text-sm font-medium leading-snug">
                  {i===lineIdx
                    ? <Typewriter text={line.text} onDone={onLineDone}/>
                    : line.text
                  }
                </p>
              </div>
            ))}
          </div>

          {/* Avatar row + stats chip */}
          <div className="shrink-0 flex items-end gap-3 px-4 pb-3">
            <div style={{
              animation: walking
                ? 'tmAvatarIn 1.5s cubic-bezier(0.16,1,0.3,1) forwards'
                : 'tmBounce 2.2s ease-in-out infinite',
            }}>
              <SpendlyBot mood={mood} walking={walking} talking={talking}/>
            </div>

            {phase==='done' && sketch.adjustedAmount && (
              <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3"
                style={{animation:'tmSlideUp 0.45s ease both'}}>
                <p className="text-white/45 text-[11px] font-semibold mb-0.5">
                  {sym}{parseFloat(amtInput||100).toFixed(0)} in {sketch.year}
                </p>
                <p className="text-white font-black text-2xl tabular-nums">
                  ≈ {sym}{parseFloat(sketch.adjustedAmount).toFixed(2)}
                </p>
                <p className="text-white/35 text-[10px] mt-0.5">
                  {sketch.year < sketch.currentYear ? 'CPI-adjusted buying power' : 'Projected buying power'}
                </p>
              </div>
            )}
          </div>

          {/* Recommendations + nav (done phase only) */}
          {phase==='done' && (
            <div className="shrink-0 px-4 pb-6 space-y-3"
              style={{animation:'tmSlideUp 0.45s 0.2s ease both', opacity:0}}>
              {sketch.recommendations?.length > 0 && (
                <div>
                  <p className="text-white/25 text-[11px] uppercase tracking-wider text-center mb-2">Also explore</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {sketch.recommendations.map((r,i)=>(
                      <button key={i}
                        onClick={()=>{ setYearInput(String(r.year)); reset() }}
                        className="bg-white/10 hover:bg-white/20 border border-white/18 text-white/65 hover:text-white text-xs px-3 py-1.5 rounded-full transition">
                        {r.year}: {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={reset}
                  className="flex-1 bg-white/14 hover:bg-white/24 text-white text-sm font-semibold py-3 rounded-xl transition">
                  🕰️ New Year
                </button>
                <button onClick={onClose}
                  className="flex-1 bg-white text-indigo-900 font-bold text-sm py-3 rounded-xl hover:bg-indigo-50 transition">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
