import { useState, useEffect, useRef } from 'react'
import API from '../utils/api'

const SYM = { USD:'$', EUR:'€', GBP:'£', LBP:'L£', AED:'AED', SAR:'SAR', CAD:'C$', AUD:'A$' }

const POPULAR = [
  { year:-2560, label:'🏛️ Great Pyramid'   },
  { year:-44,   label:'🗡️ Caesar Killed'    },
  { year:1,     label:'📅 Year One'         },
  { year:1066,  label:'⚔️ Battle Hastings'  },
  { year:1347,  label:'💀 Black Death'      },
  { year:1492,  label:'⛵ Columbus Sails'   },
  { year:1776,  label:'🦅 USA Born'         },
  { year:1929,  label:'💸 Great Crash'      },
  { year:1969,  label:'🌙 Moon Landing'     },
  { year:2008,  label:'🏦 Recession'        },
  { year:2050,  label:'🤖 Robot World'      },
  { year:2100,  label:'🚀 Far Future'       },
]

const fmtYear = y => y < 0 ? `${Math.abs(y)} BC` : String(y)

function getTheme(year) {
  if (year <= -1000) return { bg:'from-amber-950 via-yellow-950 to-zinc-950', planet:['#92400e','#78350f'], accent:'#fbbf24' }
  if (year <= 0)     return { bg:'from-stone-900 via-amber-950 to-zinc-950',  planet:['#78350f','#451a03'], accent:'#d97706' }
  if (year <= 500)   return { bg:'from-red-950 via-stone-950 to-zinc-950',    planet:['#7f1d1d','#450a0a'], accent:'#fca5a5' }
  if (year <= 1000)  return { bg:'from-slate-900 via-gray-950 to-zinc-950',   planet:['#374151','#111827'], accent:'#9ca3af' }
  if (year <= 1400)  return { bg:'from-stone-900 via-gray-900 to-zinc-950',   planet:['#4b5563','#1f2937'], accent:'#d1d5db' }
  if (year <= 1600)  return { bg:'from-teal-950 via-emerald-950 to-zinc-950', planet:['#134e4a','#064e3b'], accent:'#6ee7b7' }
  if (year <= 1800)  return { bg:'from-indigo-950 via-blue-950 to-zinc-950',  planet:['#1e3a8a','#0c2461'], accent:'#93c5fd' }
  if (year <= 1920)  return { bg:'from-amber-950 via-yellow-950 to-zinc-950', planet:['#92400e','#78350f'], accent:'#fbbf24' }
  if (year <= 1940)  return { bg:'from-stone-900 via-gray-900 to-zinc-950',   planet:['#4b5563','#1f2937'], accent:'#9ca3af' }
  if (year <= 1960)  return { bg:'from-sky-950 via-blue-950 to-zinc-950',     planet:['#0369a1','#0c4a6e'], accent:'#7dd3fc' }
  if (year <= 1980)  return { bg:'from-orange-950 via-red-950 to-zinc-950',   planet:['#c2410c','#7c2d12'], accent:'#fb923c' }
  if (year <= 2000)  return { bg:'from-fuchsia-950 via-purple-950 to-zinc-950',planet:['#7c3aed','#4c1d95'],accent:'#e879f9' }
  if (year <= 2025)  return { bg:'from-cyan-950 via-blue-950 to-zinc-950',    planet:['#0891b2','#0c4a6e'], accent:'#67e8f9' }
  if (year <= 2060)  return { bg:'from-violet-950 via-purple-950 to-zinc-950',planet:['#6d28d9','#2e1065'], accent:'#c084fc' }
  return               { bg:'from-slate-950 via-gray-950 to-zinc-950',        planet:['#475569','#1e293b'], accent:'#94a3b8' }
}

// Per-era animated scene layouts: sky, ground color, and positioned emoji objects
const ERA_SCENES = [
  { test: y => y <= -500,
    sky:'#7c2d12', ground:'#b45309',
    objs:[{e:'🏛️',x:40,y:20,s:76,a:'none'},{e:'☀️',x:78,y:8,s:40,a:'pulse'},{e:'🦅',x:58,y:12,s:30,a:'fly'},{e:'🌵',x:12,y:50,s:44,a:'sway'},{e:'⚱️',x:70,y:58,s:28,a:'bob'},{e:'🌙',x:22,y:10,s:26,a:'pulse2'}] },
  { test: y => y <= 500,
    sky:'#450a0a', ground:'#991b1b',
    objs:[{e:'🏟️',x:38,y:16,s:80,a:'none'},{e:'⚔️',x:20,y:55,s:36,a:'bob'},{e:'🫒',x:68,y:46,s:40,a:'sway'},{e:'🌊',x:50,y:60,s:44,a:'wave'},{e:'🏺',x:78,y:55,s:30,a:'none'},{e:'🌟',x:88,y:10,s:24,a:'pulse'}] },
  { test: y => y <= 1000,
    sky:'#1c1917', ground:'#292524',
    objs:[{e:'🏰',x:40,y:12,s:84,a:'none'},{e:'🌲',x:8,y:42,s:52,a:'sway'},{e:'🌲',x:78,y:44,s:44,a:'sway2'},{e:'🐴',x:24,y:58,s:40,a:'trot'},{e:'⚔️',x:64,y:60,s:32,a:'bob'},{e:'🌕',x:16,y:8,s:32,a:'pulse'}] },
  { test: y => y <= 1400,
    sky:'#18181b', ground:'#27272a',
    objs:[{e:'🏰',x:42,y:12,s:80,a:'none'},{e:'⚔️',x:18,y:55,s:40,a:'bob'},{e:'🗡️',x:72,y:52,s:36,a:'bob2'},{e:'🌲',x:8,y:44,s:48,a:'sway'},{e:'🔥',x:60,y:60,s:32,a:'flicker'},{e:'🌑',x:80,y:8,s:28,a:'pulse2'}] },
  { test: y => y <= 1600,
    sky:'#172554', ground:'#164e63',
    objs:[{e:'⛵',x:42,y:40,s:76,a:'sail'},{e:'🗺️',x:18,y:26,s:52,a:'bob'},{e:'🏛️',x:70,y:20,s:56,a:'none'},{e:'🌍',x:82,y:54,s:36,a:'spin'},{e:'🔭',x:12,y:56,s:32,a:'bob2'},{e:'⭐',x:55,y:8,s:26,a:'pulse'}] },
  { test: y => y <= 1800,
    sky:'#1e3a5f', ground:'#14532d',
    objs:[{e:'🏰',x:38,y:16,s:72,a:'none'},{e:'🌾',x:14,y:50,s:44,a:'sway'},{e:'🐎',x:60,y:55,s:52,a:'trot'},{e:'🕯️',x:25,y:60,s:28,a:'flicker'},{e:'⚓',x:74,y:56,s:32,a:'bob'},{e:'🌙',x:84,y:8,s:28,a:'pulse2'}] },
  { test: y => y <= 1900,
    sky:'#27272a', ground:'#1c1917',
    objs:[{e:'🏭',x:38,y:16,s:80,a:'none'},{e:'🚂',x:10,y:56,s:60,a:'trot'},{e:'⚙️',x:70,y:30,s:44,a:'spin'},{e:'💨',x:46,y:4,s:36,a:'float'},{e:'⛏️',x:76,y:58,s:28,a:'bob'},{e:'🌫️',x:55,y:8,s:32,a:'pulse2'}] },
  { test: y => y <= 1945,
    sky:'#1e1b4b', ground:'#14532d',
    objs:[{e:'✈️',x:55,y:12,s:56,a:'fly'},{e:'🏠',x:26,y:40,s:56,a:'none'},{e:'🚗',x:60,y:58,s:44,a:'trot'},{e:'📻',x:16,y:56,s:32,a:'bob'},{e:'🌟',x:80,y:8,s:28,a:'pulse'},{e:'💣',x:42,y:62,s:24,a:'bob2'}] },
  { test: y => y <= 1970,
    sky:'#0c4a6e', ground:'#14532d',
    objs:[{e:'🚀',x:48,y:6,s:72,a:'launch'},{e:'🏠',x:22,y:42,s:56,a:'none'},{e:'📺',x:68,y:50,s:44,a:'bob'},{e:'🚗',x:40,y:60,s:48,a:'trot'},{e:'⭐',x:14,y:12,s:28,a:'pulse'},{e:'📡',x:74,y:28,s:36,a:'bob2'}] },
  { test: y => y <= 1990,
    sky:'#4c1d95', ground:'#1a1a2e',
    objs:[{e:'💾',x:44,y:22,s:68,a:'bob'},{e:'📼',x:18,y:46,s:52,a:'bob2'},{e:'🎸',x:68,y:40,s:56,a:'sway'},{e:'🕹️',x:52,y:58,s:40,a:'bob'},{e:'✨',x:14,y:12,s:28,a:'pulse'},{e:'📞',x:78,y:54,s:28,a:'bob2'}] },
  { test: y => y <= 2010,
    sky:'#0f172a', ground:'#1e3a5f',
    objs:[{e:'💻',x:42,y:24,s:68,a:'bob'},{e:'📱',x:20,y:48,s:44,a:'bob2'},{e:'🌐',x:72,y:42,s:48,a:'spin'},{e:'🚗',x:55,y:60,s:40,a:'trot'},{e:'📡',x:78,y:18,s:36,a:'bob'},{e:'🌟',x:14,y:10,s:26,a:'pulse'}] },
  { test: y => y <= 2030,
    sky:'#0f172a', ground:'#1e293b',
    objs:[{e:'🏙️',x:38,y:10,s:84,a:'none'},{e:'📱',x:20,y:48,s:44,a:'bob'},{e:'🚗',x:60,y:60,s:44,a:'trot'},{e:'✈️',x:72,y:10,s:36,a:'fly'},{e:'🌐',x:80,y:44,s:36,a:'spin'},{e:'🤖',x:16,y:46,s:40,a:'bob2'}] },
  { test: y => y <= 2060,
    sky:'#2e1065', ground:'#0f0f2e',
    objs:[{e:'🤖',x:40,y:20,s:80,a:'bob'},{e:'🚁',x:68,y:10,s:52,a:'fly'},{e:'🏙️',x:18,y:34,s:68,a:'none'},{e:'⚡',x:14,y:16,s:32,a:'pulse'},{e:'🌐',x:76,y:50,s:36,a:'spin'},{e:'🛸',x:52,y:6,s:40,a:'sail'}] },
  { test: () => true,
    sky:'#020617', ground:'#0f0728',
    objs:[{e:'🚀',x:48,y:4,s:68,a:'launch'},{e:'🛸',x:22,y:18,s:52,a:'fly'},{e:'🌌',x:68,y:28,s:64,a:'pulse'},{e:'🤖',x:35,y:50,s:48,a:'bob'},{e:'⭐',x:80,y:12,s:32,a:'pulse2'},{e:'🌙',x:12,y:8,s:28,a:'float'}] },
]

const ANIM_MAP = {
  'none':    'none',
  'pulse':   'tmEPulse 2.2s ease-in-out infinite',
  'pulse2':  'tmEPulse 3.1s 0.8s ease-in-out infinite',
  'sway':    'tmESway 2.8s ease-in-out infinite',
  'sway2':   'tmESway 3.4s 0.7s ease-in-out infinite',
  'bob':     'tmEBob 2.4s ease-in-out infinite',
  'bob2':    'tmEBob 3.0s 0.5s ease-in-out infinite',
  'fly':     'tmEFly 4.0s ease-in-out infinite',
  'trot':    'tmETrot 3.5s linear infinite',
  'spin':    'tmESpin 6s linear infinite',
  'float':   'tmEFloat 3.5s ease-in-out infinite',
  'flicker': 'tmEFlicker 0.6s ease-in-out infinite',
  'launch':  'tmELaunch 3.0s ease-in-out infinite',
  'wave':    'tmEWave 2.5s ease-in-out infinite',
  'sail':    'tmESail 4.5s ease-in-out infinite',
}

const SCENE_ANIM = `
@keyframes tmEPulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(1.12)} }
@keyframes tmESway    { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
@keyframes tmEBob     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes tmEFly     { 0%{transform:translate(-18px,6px)} 50%{transform:translate(18px,-8px)} 100%{transform:translate(-18px,6px)} }
@keyframes tmETrot    { 0%{transform:translateX(-8px)} 100%{transform:translateX(8px)} }
@keyframes tmESpin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes tmEFloat   { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-14px) scale(1.06)} }
@keyframes tmEFlicker { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.9)} }
@keyframes tmELaunch  { 0%,100%{transform:translateY(6px) rotate(-8deg)} 50%{transform:translateY(-18px) rotate(0deg)} }
@keyframes tmEWave    { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.18) scaleY(.88)} }
@keyframes tmESail    { 0%,100%{transform:translateX(0) rotate(-3deg)} 50%{transform:translateX(14px) rotate(3deg)} }
@keyframes tmCamPan   { 0%{transform:translateX(0) scale(1.04)} 50%{transform:translateX(-3%) scale(1.04)} 100%{transform:translateX(0) scale(1.04)} }
@keyframes tmZoomYear { 0%{transform:scale(0.05) rotate(0deg);opacity:0} 25%{opacity:1} 65%{transform:scale(2.5) rotate(180deg);opacity:1} 100%{transform:scale(9) rotate(360deg);opacity:0} }
@keyframes tmPlanetDrop { 0%{transform:translateY(-130px) scale(0.1);opacity:0} 65%{transform:translateY(8px) scale(1.06);opacity:1} 100%{transform:translateY(0) scale(1);opacity:1} }
@keyframes tmAvatarIn { 0%{transform:translateX(-110vw)} 78%{transform:translateX(6px)} 88%{transform:translateX(-4px)} 100%{transform:translateX(0)} }
@keyframes tmBounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes tmBubblePop{ 0%{transform:scale(0.55) translateY(10px);opacity:0} 78%{transform:scale(1.03) translateY(-1px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
@keyframes tmSlideUp  { from{transform:translateY(26px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes tmStreak   { 0%{transform:translateX(-100%);opacity:0} 15%{opacity:.7} 85%{opacity:.7} 100%{transform:translateX(200%);opacity:0} }
@keyframes tmStarFlicker { 0%,100%{opacity:var(--so)} 50%{opacity:calc(var(--so)*0.15)} }
@keyframes tmPulse    { 0%,100%{opacity:.5} 50%{opacity:1} }
@keyframes tmFilmMove { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
`

// ── Stars ──────────────────────────────────────────────────────────────────
function makeStars(seed) {
  let s = seed
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  return Array.from({ length: 55 }, () => ({ x: r() * 100, y: r() * 100, rad: r() * 1.4 + 0.4, op: r() * 0.45 + 0.12, dur: r() * 3 + 2 }))
}

// ── Era Scene ──────────────────────────────────────────────────────────────
function EraScene({ year, aiEmoji }) {
  const def = ERA_SCENES.find(s => s.test(year)) || ERA_SCENES[ERA_SCENES.length - 1]
  const objs = def.objs.map((o, i) => ({ ...o, e: aiEmoji?.[i] || o.e }))

  return (
    <div style={{ position: 'relative', height: 190, overflow: 'hidden', borderRadius: 0 }}>
      {/* Film perforations top */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 14, background: '#111', zIndex: 5, position: 'relative' }}>
        {[...Array(10)].map((_, i) => <div key={i} style={{ width: 10, height: 7, background: '#333', borderRadius: 2 }} />)}
      </div>

      {/* Scene */}
      <div style={{
        position: 'relative', height: 162, overflow: 'hidden',
        background: `linear-gradient(180deg, ${def.sky} 0%, ${def.sky} 65%, ${def.ground} 100%)`,
        animation: 'tmCamPan 18s ease-in-out infinite',
      }}>
        {/* Stars for dark/night scenes */}
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%', background: 'white',
            width: 2, height: 2,
            left: `${(i * 13 + 7) % 95}%`,
            top: `${(i * 7 + 3) % 45}%`,
            opacity: def.sky.startsWith('#0') || def.sky.startsWith('#1') || def.sky.startsWith('#2') ? 0.6 : 0.1,
          }} />
        ))}

        {/* Animated emoji objects */}
        {objs.map((obj, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${obj.x}%`,
            top: `${obj.y}%`,
            fontSize: obj.s,
            lineHeight: 1,
            animation: ANIM_MAP[obj.a] || 'none',
            filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.7))',
            zIndex: i + 1,
            userSelect: 'none',
          }}>
            {obj.e}
          </div>
        ))}

        {/* Scan lines film effect */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
        }} />
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 21,
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)',
        }} />
      </div>

      {/* Film perforations bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 14, background: '#111', zIndex: 5, position: 'relative' }}>
        {[...Array(10)].map((_, i) => <div key={i} style={{ width: 10, height: 7, background: '#333', borderRadius: 2 }} />)}
      </div>
    </div>
  )
}

// ── Planet ─────────────────────────────────────────────────────────────────
function Planet({ year, colors, eraName, size = 160 }) {
  const [c1, c2] = colors || ['#6366f1', '#4f46e5']
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-full opacity-25 blur-2xl" style={{ background: `radial-gradient(circle,${c1},${c2})` }} />
        <div className="absolute inset-0 rounded-full overflow-hidden" style={{
          background: `radial-gradient(circle at 32% 28%,${c1} 0%,${c2} 55%,#050510 100%)`,
          animation: 'tmPlanetDrop 0.85s cubic-bezier(0.34,1.45,0.64,1) both',
        }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full opacity-10">
            <ellipse cx={size * 0.5} cy={size * 0.42} rx={size * 0.44} ry={size * 0.1} fill="none" stroke="white" strokeWidth="1.5" />
            <ellipse cx={size * 0.5} cy={size * 0.58} rx={size * 0.34} ry={size * 0.07} fill="none" stroke="white" strokeWidth="1" />
          </svg>
          <div className="absolute rounded-full" style={{ top: '12%', left: '17%', width: '28%', height: '20%', background: 'white', filter: 'blur(7px)', opacity: 0.18 }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'tmPlanetDrop 0.85s cubic-bezier(0.34,1.45,0.64,1) both' }}>
          <span className="text-white font-black select-none drop-shadow-2xl" style={{ fontSize: size * 0.22, textShadow: '0 3px 22px rgba(0,0,0,0.95)' }}>
            {fmtYear(year)}
          </span>
        </div>
      </div>
      {eraName && (
        <div className="text-center px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
          style={{ background: `${c1}22`, color: c1, border: `1px solid ${c1}44`, animation: 'tmSlideUp 0.4s 0.75s ease both', opacity: 0 }}>
          {eraName}
        </div>
      )}
    </div>
  )
}

// ── SpendlyBot ─────────────────────────────────────────────────────────────
function SpendlyBot({ mood = 'neutral', walking = false, talking = false }) {
  return (
    <svg viewBox="0 0 80 110" width="72" height="88" style={{ overflow: 'visible', flexShrink: 0 }}>
      <line x1="40" y1="3" x2="40" y2="13" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="3" r="4" fill="#818cf8">
        <animate attributeName="r" values="4;5.5;4" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <rect x="16" y="11" width="48" height="36" rx="10" fill="#4f46e5" />
      <rect x="19" y="14" width="16" height="7" rx="3.5" fill="#6366f1" opacity="0.4" />
      {mood === 'shocked' ? <>
        <ellipse cx="30" cy="27" rx="9" ry="10" fill="#e0e7ff" /><ellipse cx="50" cy="27" rx="9" ry="10" fill="#e0e7ff" />
        <circle cx="30" cy="29" r="4.5" fill="#1e1b4b" /><circle cx="50" cy="29" r="4.5" fill="#1e1b4b" />
        <circle cx="28.5" cy="27" r="1.5" fill="white" /><circle cx="48.5" cy="27" r="1.5" fill="white" />
      </> : mood === 'laughing' ? <>
        <path d="M21 22 Q30 15 39 22" fill="none" stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M41 22 Q50 15 59 22" fill="none" stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 27 Q30 33 36 27" fill="#c7d2fe" /><path d="M44 27 Q50 33 56 27" fill="#c7d2fe" />
      </> : <>
        <rect x="21" y="21" width="17" height="12" rx="5" fill="#e0e7ff" />
        <rect x="42" y="21" width="17" height="12" rx="5" fill="#e0e7ff" />
        <rect x="26" y="24" rx="3" width={talking ? '5' : '6'} height={talking ? '6' : '7'} fill="#1e1b4b">
          {talking && <animate attributeName="height" values="6;2;6" dur="0.22s" repeatCount="indefinite" />}
        </rect>
        <rect x="47" y="24" rx="3" width={talking ? '5' : '6'} height={talking ? '6' : '7'} fill="#1e1b4b">
          {talking && <animate attributeName="height" values="6;2;6" dur="0.22s" begin="0.11s" repeatCount="indefinite" />}
        </rect>
      </>}
      {mood === 'laughing'
        ? <path d="M24 39 Q40 50 56 39" fill="#312e81" stroke="#a5b4fc" strokeWidth="1.5" />
        : mood === 'shocked'
          ? <ellipse cx="40" cy="40" rx="7" ry="5" fill="#312e81" />
          : talking
            ? <ellipse cx="40" cy="40" rx="6" ry="4" fill="#312e81"><animate attributeName="ry" values="4;1.5;4" dur="0.22s" repeatCount="indefinite" /></ellipse>
            : <path d="M29 40 Q40 45 51 40" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />}
      <rect x="20" y="49" width="40" height="27" rx="8" fill="#4338ca" />
      <rect x="26" y="54" width="28" height="16" rx="4" fill="#1e1b4b" />
      <text x="40" y="66" textAnchor="middle" fill="#818cf8" fontSize="11" fontWeight="bold" fontFamily="monospace">$</text>
      <rect x="7" y="51" width="13" height="21" rx="6.5" fill="#4338ca">
        {walking && <animateTransform attributeName="transform" type="rotate" values="22,13,51; -22,13,51; 22,13,51" dur="0.38s" repeatCount="indefinite" />}
      </rect>
      <rect x="60" y="51" width="13" height="21" rx="6.5" fill="#4338ca">
        {walking && <animateTransform attributeName="transform" type="rotate" values="-22,66,51; 22,66,51; -22,66,51" dur="0.38s" repeatCount="indefinite" />}
      </rect>
      <rect x="25" y="76" width="13" height="24" rx="6.5" fill="#3730a3">
        {walking && <animateTransform attributeName="transform" type="rotate" values="26,31,76; -26,31,76; 26,31,76" dur="0.38s" repeatCount="indefinite" />}
      </rect>
      <rect x="42" y="76" width="13" height="24" rx="6.5" fill="#3730a3">
        {walking && <animateTransform attributeName="transform" type="rotate" values="-26,48,76; 26,48,76; -26,48,76" dur="0.38s" repeatCount="indefinite" />}
      </rect>
    </svg>
  )
}

// ── Typewriter (display only — voice drives pacing) ────────────────────────
function Typewriter({ text, speed = 22 }) {
  const [val, setVal] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setVal(''); setDone(false)
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++; setVal(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text]) // eslint-disable-line
  return <>{val}{!done && <span style={{ animation: 'tmPulse 0.5s ease infinite' }}>▌</span>}</>
}

// ── Voice helpers ──────────────────────────────────────────────────────────
function stripEmoji(str) {
  return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27FF}\u{FE00}-\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim()
}

let _watchdog = null
function speak(text, onDone, muted) {
  if (muted || !window.speechSynthesis) { setTimeout(() => onDone?.(), text.length * 42 + 400); return }
  window.speechSynthesis.cancel()
  if (_watchdog) { clearInterval(_watchdog); _watchdog = null }

  // Small delay so cancel() flushes before speaking
  setTimeout(() => {
    const clean = stripEmoji(text)
    if (!clean) { onDone?.(); return }
    const utt = new SpeechSynthesisUtterance(clean)
    utt.rate = 0.84
    utt.pitch = 1.1

    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const pick = voices.find(v => /samantha|google uk english female|karen|victoria|fiona|moira/i.test(v.name))
        || voices.find(v => v.lang === 'en-US' && v.localService)
        || voices.find(v => v.lang.startsWith('en-') && v.localService)
        || voices.find(v => v.lang.startsWith('en'))
      if (pick) utt.voice = pick

      // Chrome bug: speechSynthesis pauses silently after ~15s — keep it alive
      _watchdog = setInterval(() => { if (window.speechSynthesis.paused) window.speechSynthesis.resume() }, 4500)

      utt.onend = () => { clearInterval(_watchdog); _watchdog = null; setTimeout(() => onDone?.(), 180) }
      utt.onerror = e => { clearInterval(_watchdog); _watchdog = null; if (e.error !== 'interrupted') setTimeout(() => onDone?.(), 180) }

      window.speechSynthesis.speak(utt)
    }

    // Voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true })
    }
  }, 100)
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TimeMachineModal({ onClose, defaultAmount, currency = 'USD' }) {
  const sym = SYM[currency] || '$'

  const [phase, setPhase]       = useState('input')   // input | warping | arriving | story | done
  const [yearInput, setYearInput] = useState('')
  const [amtInput, setAmtInput]   = useState(defaultAmount ? String(Math.round(defaultAmount)) : '')
  const [sketch, setSketch]       = useState(null)
  const [lines, setLines]         = useState([])
  const [lineIdx, setLineIdx]     = useState(-1)
  const [walking, setWalking]     = useState(false)
  const [talking, setTalking]     = useState(false)
  const [mood, setMood]           = useState('neutral')
  const [err, setErr]             = useState('')
  const [muted, setMuted]         = useState(() => localStorage.getItem('spendly_tm_muted') === 'true')

  const starsRef   = useRef(makeStars(42))
  const mutedRef   = useRef(muted)
  const linesRef   = useRef([])
  const lineIdxRef = useRef(-1)

  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { linesRef.current = lines }, [lines])
  useEffect(() => { lineIdxRef.current = lineIdx }, [lineIdx])

  // Cancel speech on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel(); if (_watchdog) { clearInterval(_watchdog); _watchdog = null } }, [])

  // ── Voice drives line advancement ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'story' || lineIdx < 0 || !linesRef.current[lineIdx]) return
    const line = linesRef.current[lineIdx]
    setTalking(true)
    setMood(line.mood)

    speak(line.text, () => {
      setTalking(false)
      setTimeout(() => {
        const next = lineIdxRef.current + 1
        if (next >= linesRef.current.length) {
          setPhase('done')
        } else {
          setLineIdx(next)
        }
      }, 650)
    }, mutedRef.current)
  }, [lineIdx, phase]) // eslint-disable-line

  const theme = sketch ? getTheme(sketch.year) : getTheme(1970)

  // ── Travel ────────────────────────────────────────────────────────────
  const travel = async () => {
    const raw = yearInput.trim()
    // Support "44 BC", "44bc", "-44"
    let y
    const bcMatch = raw.match(/^(\d+)\s*bc$/i)
    if (bcMatch) y = -parseInt(bcMatch[1])
    else y = parseInt(raw)

    if (isNaN(y) || y < -2000 || y > 2100) {
      setErr('Enter a year between 2000 BC and 2100 (e.g. -44 or "44 BC")')
      return
    }
    const a = parseFloat(amtInput) || 100
    setErr('')
    setPhase('warping')
    starsRef.current = makeStars(Math.abs(y))

    try {
      const { data } = await API.post('/insights/time-machine', { year: y, amount: a, currency })
      const MOODS = ['shocked', 'neutral', 'neutral', 'laughing', 'shocked', 'laughing']
      const linesData = [
        { text: data.line1, mood: MOODS[0] },
        { text: data.line2, mood: MOODS[1] },
        { text: data.line3, mood: MOODS[2] },
        { text: data.line4, mood: MOODS[3] },
        { text: data.line5, mood: MOODS[4] },
        { text: data.line6, mood: MOODS[5] },
      ].filter(l => l.text)

      // Warp animation plays for 2.6s minimum
      setTimeout(() => {
        setSketch(data)
        setLines(linesData)
        setPhase('arriving')
        // Planet lands → start story
        setTimeout(() => {
          setPhase('story')
          setWalking(true)
          setTimeout(() => { setWalking(false); setLineIdx(0) }, 1500)
        }, 2000)
      }, 2650)
    } catch {
      setTimeout(() => { setPhase('input'); setErr('Time travel failed! Try again.') }, 2650)
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem('spendly_tm_muted', String(next))
    if (next) { window.speechSynthesis?.cancel(); if (_watchdog) { clearInterval(_watchdog); _watchdog = null } }
  }

  const reset = () => {
    window.speechSynthesis?.cancel()
    if (_watchdog) { clearInterval(_watchdog); _watchdog = null }
    setPhase('input'); setSketch(null); setLines([]); setLineIdx(-1)
    setWalking(false); setTalking(false); setMood('neutral')
    lineIdxRef.current = -1
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-linear-to-br ${theme.bg}`}>
      <style>{SCENE_ANIM}</style>

      {/* Starfield */}
      {phase !== 'input' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {starsRef.current.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.rad * 2, height: s.rad * 2, '--so': s.op, animation: `tmStarFlicker ${s.dur}s ${i * 0.06}s ease-in-out infinite` }} />
          ))}
        </div>
      )}

      {/* Top controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
          className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition">
          {muted
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
        </button>
        <button onClick={() => { window.speechSynthesis?.cancel(); onClose() }}
          className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold transition">✕</button>
      </div>

      {/* ══ INPUT ══ */}
      {phase === 'input' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 overflow-y-auto py-8">
          <div className="text-center">
            <div className="text-6xl mb-3">🕰️</div>
            <h2 className="text-white font-black text-2xl mb-1">Time Machine</h2>
            <p className="text-white/50 text-sm">From 2000 BC to year 2100 — enter any year.</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <div>
              <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5 block">Your amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-semibold text-sm">{sym}</span>
                <input value={amtInput} onChange={e => setAmtInput(e.target.value)} type="number" placeholder="100"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/25 text-lg font-bold focus:outline-none focus:border-white/50 transition" />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5 block">Destination year (e.g. -44 or 1969)</label>
              <input value={yearInput} onChange={e => { setYearInput(e.target.value); setErr('') }}
                placeholder="e.g. -44 or 1969 or 2075"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/25 text-lg font-bold focus:outline-none focus:border-white/50 transition"
                onKeyDown={e => e.key === 'Enter' && travel()} />
              {err && <p className="text-red-400 text-xs mt-1.5">{err}</p>}
            </div>
            <button onClick={travel}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/50">
              🚀 Launch Time Machine
            </button>
          </div>
          <div className="w-full max-w-sm">
            <p className="text-white/25 text-xs uppercase tracking-wider text-center mb-2">Popular destinations</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {POPULAR.map(p => (
                <button key={p.year} onClick={() => setYearInput(String(p.year))}
                  className="bg-white/8 hover:bg-white/15 border border-white/12 text-white/55 hover:text-white text-xs px-3 py-1.5 rounded-full transition">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ WARPING ══ */}
      {phase === 'warping' && (
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="absolute h-px bg-white/35"
              style={{ width: '75%', left: '12.5%', top: `${10 + i * 6}%`, animation: `tmStreak ${0.6 + i * 0.07}s ${i * 0.05}s linear infinite` }} />
          ))}
          <div className="relative z-10" style={{ animation: 'tmZoomYear 2.5s ease-in-out forwards' }}>
            <span className="text-white font-black text-8xl drop-shadow-2xl tracking-tighter">{fmtYear(parseInt(yearInput) || 0)}</span>
          </div>
          <p className="text-white/40 text-sm mt-5 z-10 tracking-widest uppercase" style={{ animation: 'tmPulse 0.7s ease infinite' }}>
            Entering the vortex…
          </p>
        </div>
      )}

      {/* ══ ARRIVING ══ */}
      {phase === 'arriving' && sketch && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Planet year={sketch.year} colors={sketch.planetColors || theme.planet} eraName={sketch.eraName} size={172} />
        </div>
      )}

      {/* ══ STORY + DONE ══ */}
      {(phase === 'story' || phase === 'done') && sketch && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Planet chip */}
          <div className="flex justify-center pt-4 pb-1 shrink-0">
            <Planet year={sketch.year} colors={sketch.planetColors || theme.planet} eraName={sketch.eraName} size={76} />
          </div>

          {/* Era scene — always visible, animating throughout */}
          <div className="shrink-0 mx-3 rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <EraScene year={sketch.year} aiEmoji={sketch.sceneEmoji} />
          </div>

          {/* Speech bubbles — show last 2 */}
          <div className="flex-1 px-4 pt-2 pb-1 flex flex-col justify-end gap-2 overflow-hidden">
            {lines.slice(Math.max(0, lineIdx - 1), lineIdx + 1).map((line, i, arr) => (
              <div key={lineIdx - (arr.length - 1 - i)}
                className="bg-white rounded-2xl px-4 py-3 shadow-xl max-w-[90%] self-start"
                style={{ borderBottomLeftRadius: 4, animation: 'tmBubblePop 0.3s ease both' }}>
                <p className="text-gray-800 text-sm font-medium leading-snug">
                  {i === arr.length - 1
                    ? <Typewriter text={line.text} />
                    : line.text}
                </p>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pb-1 shrink-0">
            {lines.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-300"
                style={{ width: i === lineIdx ? 16 : 6, height: 6, background: i <= lineIdx ? 'white' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>

          {/* Bot + value chip */}
          <div className="shrink-0 flex items-end gap-3 px-4 pb-2">
            <div style={{ animation: walking ? 'tmAvatarIn 1.5s cubic-bezier(0.16,1,0.3,1) forwards' : 'tmBounce 2.2s ease-in-out infinite' }}>
              <SpendlyBot mood={mood} walking={walking} talking={talking} />
            </div>
            {phase === 'done' && sketch.adjustedAmount && (
              <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3" style={{ animation: 'tmSlideUp 0.45s ease both' }}>
                <p className="text-white/45 text-[11px] font-semibold mb-0.5">{sym}{parseFloat(amtInput || 100).toFixed(0)} in {fmtYear(sketch.year)}</p>
                <p className="text-white font-black text-2xl tabular-nums">≈ {sym}{parseFloat(sketch.adjustedAmount).toFixed(2)}</p>
                <p className="text-white/35 text-[10px] mt-0.5">{sketch.year < sketch.currentYear ? 'CPI-adjusted buying power' : 'Projected buying power'}</p>
              </div>
            )}
          </div>

          {/* Done actions */}
          {phase === 'done' && (
            <div className="shrink-0 px-4 pb-5 space-y-3" style={{ animation: 'tmSlideUp 0.45s 0.2s ease both', opacity: 0 }}>
              {sketch.recommendations?.length > 0 && (
                <div>
                  <p className="text-white/25 text-[11px] uppercase tracking-wider text-center mb-2">Also explore</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {sketch.recommendations.map((r, i) => (
                      <button key={i} onClick={() => { setYearInput(String(r.year)); reset() }}
                        className="bg-white/10 hover:bg-white/20 border border-white/18 text-white/65 hover:text-white text-xs px-3 py-1.5 rounded-full transition">
                        {fmtYear(r.year)}: {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={reset} className="flex-1 bg-white/14 hover:bg-white/24 text-white text-sm font-semibold py-3 rounded-xl transition">🕰️ New Year</button>
                <button onClick={onClose} className="flex-1 bg-white text-indigo-900 font-bold text-sm py-3 rounded-xl hover:bg-indigo-50 transition">Done</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
