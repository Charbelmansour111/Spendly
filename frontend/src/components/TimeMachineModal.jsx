import { useState, useEffect, useRef } from "react";

const fmtYear = y => y < 0 ? `${Math.abs(y)} BC` : `${y} AD`;

const POPULAR = [
  { year:-2560, label:"Great Pyramid" },
  { year:-44,   label:"Julius Caesar" },
  { year:1066,  label:"Battle of Hastings" },
  { year:1347,  label:"Black Death" },
  { year:1492,  label:"Columbus Sails" },
  { year:1776,  label:"USA Founded" },
  { year:1929,  label:"Great Crash" },
  { year:1969,  label:"Moon Landing" },
  { year:2008,  label:"Financial Crisis" },
  { year:2050,  label:"Near Future" },
];

function getEra(year) {
  if (year<=-1000) return { color:"#d97706", bg:"#78350f" };
  if (year<=0)     return { color:"#dc2626", bg:"#7f1d1d" };
  if (year<=1000)  return { color:"#64748b", bg:"#1e293b" };
  if (year<=1400)  return { color:"#7c3aed", bg:"#2e1065" };
  if (year<=1600)  return { color:"#0891b2", bg:"#0c4a6e" };
  if (year<=1800)  return { color:"#16a34a", bg:"#14532d" };
  if (year<=1900)  return { color:"#ca8a04", bg:"#713f12" };
  if (year<=1945)  return { color:"#9333ea", bg:"#4c1d95" };
  if (year<=1970)  return { color:"#2563eb", bg:"#1e3a8a" };
  if (year<=1990)  return { color:"#db2777", bg:"#831843" };
  if (year<=2010)  return { color:"#0891b2", bg:"#0c4a6e" };
  if (year<=2025)  return { color:"#6366f1", bg:"#312e81" };
  if (year<=2060)  return { color:"#8b5cf6", bg:"#2e1065" };
  return             { color:"#475569", bg:"#0f172a" };
}

// ── SVG Scene Illustrations ─────────────────────────────────────────────────
const SCENES = {
  ancient: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316"/>
          <stop offset="60%" stopColor="#fb923c"/>
          <stop offset="100%" stopColor="#c2410c"/>
        </linearGradient>
        <linearGradient id="sand1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d97706"/>
          <stop offset="100%" stopColor="#92400e"/>
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect width="800" height="300" fill="url(#sky1)"/>
      {/* Sun */}
      <circle cx="650" cy="70" r="45" fill="#fbbf24" opacity="0.9"/>
      <circle cx="650" cy="70" r="60" fill="#fbbf24" opacity="0.15"/>
      {/* Desert ground */}
      <ellipse cx="400" cy="310" rx="500" ry="80" fill="url(#sand1)"/>
      {/* Pyramid 1 big */}
      <polygon points="400,60 560,260 240,260" fill="#b45309"/>
      <polygon points="400,60 560,260 400,260" fill="#92400e"/>
      {/* Pyramid 2 small left */}
      <polygon points="180,140 270,260 90,260" fill="#b45309"/>
      <polygon points="180,140 270,260 180,260" fill="#92400e"/>
      {/* Pyramid 3 small right */}
      <polygon points="650,160 720,260 580,260" fill="#b45309"/>
      <polygon points="650,160 720,260 650,260" fill="#92400e"/>
      {/* Sphinx silhouette */}
      <rect x="100" y="230" width="60" height="25" rx="5" fill="#78350f"/>
      <circle cx="160" cy="225" r="18" fill="#78350f"/>
      {/* Nile shimmer */}
      <ellipse cx="720" cy="270" rx="70" ry="12" fill="#0369a1" opacity="0.6"/>
      {/* Hieroglyph lines on pyramid */}
      <line x1="380" y1="140" x2="420" y2="140" stroke="#fbbf24" strokeWidth="2" opacity="0.4"/>
      <line x1="370" y1="160" x2="430" y2="160" stroke="#fbbf24" strokeWidth="2" opacity="0.4"/>
      <line x1="360" y1="180" x2="440" y2="180" stroke="#fbbf24" strokeWidth="2" opacity="0.4"/>
      {/* Stars */}
      {[{x:50,y:30},{x:120,y:20},{x:200,y:45},{x:550,y:25},{x:700,y:40}].map((s,i)=>(
        <circle key={i} cx={s.x} cy={s.y} r="2.5" fill="white" opacity="0.7"/>
      ))}
      {/* Palm trees */}
      <line x1="60" y1="260" x2="60" y2="200" stroke="#92400e" strokeWidth="5"/>
      <ellipse cx="60" cy="198" rx="22" ry="12" fill="#16a34a"/>
      <ellipse cx="48" cy="205" rx="18" ry="8" fill="#15803d" transform="rotate(-25,48,205)"/>
      <ellipse cx="72" cy="205" rx="18" ry="8" fill="#15803d" transform="rotate(25,72,205)"/>
    </svg>
  ),
  rome: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a8a"/>
          <stop offset="100%" stopColor="#dc2626"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky2)"/>
      {/* Moon */}
      <circle cx="680" cy="55" r="35" fill="#fef9c3" opacity="0.9"/>
      {/* Colosseum */}
      <rect x="200" y="120" width="400" height="150" rx="8" fill="#b45309"/>
      <ellipse cx="400" cy="120" rx="200" ry="40" fill="#92400e"/>
      {/* Arches */}
      {[0,1,2,3,4,5,6].map(i=>(
        <path key={i} d={`M ${230+i*55} 270 L ${230+i*55} 180 Q ${257+i*55} 155 ${285+i*55} 180 L ${285+i*55} 270`} fill="#78350f"/>
      ))}
      {/* Columns */}
      {[130,160,190,220].map((x,i)=>(
        <g key={i}>
          <rect x={x} y="150" width="12" height="130" fill="#d97706"/>
          <rect x={x-4} y="145" width="20" height="10" fill="#ca8a04"/>
        </g>
      ))}
      {/* Torches */}
      <line x1="100" y1="200" x2="100" y2="260" stroke="#92400e" strokeWidth="4"/>
      <ellipse cx="100" cy="195" rx="8" ry="12" fill="#f97316" opacity="0.9"/>
      <ellipse cx="100" cy="192" rx="5" ry="8" fill="#fbbf24"/>
      {/* Ground */}
      <rect x="0" y="265" width="800" height="35" fill="#451a03"/>
      {/* Stars */}
      {[{x:30,y:20},{x:90,y:35},{x:500,y:15},{x:600,y:30},{x:750,y:20}].map((s,i)=>(
        <circle key={i} cx={s.x} cy={s.y} r="2" fill="white" opacity="0.8"/>
      ))}
    </svg>
  ),
  medieval: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1445"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky3)"/>
      {/* Moon */}
      <circle cx="100" cy="60" r="38" fill="#fef3c7" opacity="0.85"/>
      {/* Stars */}
      {[{x:200,y:25},{x:320,y:15},{x:450,y:35},{x:560,y:20},{x:680,y:40},{x:750,y:18}].map((s,i)=>(
        <circle key={i} cx={s.x} cy={s.y} r="2" fill="white" opacity="0.9"/>
      ))}
      {/* Castle main */}
      <rect x="280" y="80" width="240" height="190" fill="#374151"/>
      {/* Towers */}
      <rect x="250" y="50" width="70" height="230" rx="4" fill="#4b5563"/>
      <rect x="480" y="50" width="70" height="230" rx="4" fill="#4b5563"/>
      {/* Battlements */}
      {[0,1,2,3,4].map(i=>(<rect key={i} x={255+i*12} y={42} width="8" height="15" fill="#6b7280"/>))}
      {[0,1,2,3,4].map(i=>(<rect key={i} x={485+i*12} y={42} width="8" height="15" fill="#6b7280"/>))}
      {[0,1,2,3,4,5,6,7].map(i=>(<rect key={i} x={285+i*28} y={72} width="12" height="16" fill="#4b5563"/>))}
      {/* Gate */}
      <rect x="365" y="200" width="70" height="70" fill="#1f2937"/>
      <path d="M 365 200 Q 400 170 435 200" fill="#111827"/>
      {/* Windows with glow */}
      <rect x="295" y="120" width="25" height="30" rx="2" fill="#fbbf24" opacity="0.8"/>
      <rect x="480" y="120" width="25" height="30" rx="2" fill="#fbbf24" opacity="0.8"/>
      {/* Moat */}
      <ellipse cx="400" cy="290" rx="250" ry="20" fill="#0369a1" opacity="0.5"/>
      {/* Trees */}
      {[60,140,620,700].map((x,i)=>(
        <g key={i}>
          <rect x={x} y="200" width="10" height="80" fill="#422006"/>
          <ellipse cx={x+5} cy="195" rx="28" ry="38" fill="#14532d"/>
          <ellipse cx={x+5} cy="185" rx="20" ry="28" fill="#166534"/>
        </g>
      ))}
      {/* Ground */}
      <rect x="0" y="268" width="800" height="32" fill="#1c1917"/>
    </svg>
  ),
  renaissance: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9"/>
          <stop offset="70%" stopColor="#7dd3fc"/>
          <stop offset="100%" stopColor="#bae6fd"/>
        </linearGradient>
        <linearGradient id="sea4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0369a1"/>
          <stop offset="100%" stopColor="#0c4a6e"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky4)"/>
      {/* Ocean */}
      <rect x="0" y="200" width="800" height="100" fill="url(#sea4)"/>
      {/* Waves */}
      {[0,1,2,3].map(i=>(
        <path key={i} d={`M ${i*200} 210 Q ${i*200+50} 200 ${i*200+100} 210 Q ${i*200+150} 220 ${i*200+200} 210`}
          fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.5"/>
      ))}
      {/* Ship hull */}
      <path d="M 280 220 Q 400 260 520 220 L 500 200 Q 400 230 300 200 Z" fill="#92400e"/>
      {/* Deck */}
      <rect x="310" y="190" width="180" height="15" rx="3" fill="#a16207"/>
      {/* Mast 1 */}
      <line x1="370" y1="60" x2="370" y2="205" stroke="#78350f" strokeWidth="5"/>
      {/* Sail 1 */}
      <path d="M 370 65 Q 440 100 370 140 Z" fill="#fef9c3" opacity="0.95"/>
      <path d="M 370 65 Q 300 100 370 140 Z" fill="#fef3c7" opacity="0.85"/>
      {/* Mast 2 */}
      <line x1="440" y1="90" x2="440" y2="205" stroke="#78350f" strokeWidth="4"/>
      <path d="M 440 95 Q 490 118 440 145 Z" fill="#fef9c3" opacity="0.9"/>
      {/* Flag */}
      <line x1="370" y1="60" x2="370" y2="40" stroke="#78350f" strokeWidth="2"/>
      <polygon points="370,40 395,48 370,56" fill="#dc2626"/>
      {/* Clouds */}
      {[{x:80,y:40},{x:600,y:55}].map((c,i)=>(
        <g key={i}>
          <ellipse cx={c.x} cy={c.y} rx="60" ry="22" fill="white" opacity="0.85"/>
          <ellipse cx={c.x-25} cy={c.y+5} rx="35" ry="18" fill="white" opacity="0.85"/>
          <ellipse cx={c.x+30} cy={c.y+5} rx="35" ry="16" fill="white" opacity="0.8"/>
        </g>
      ))}
      {/* Compass rose */}
      <circle cx="700" cy="80" r="30" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1"/>
      <text x="700" y="58" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">N</text>
      <text x="700" y="116" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">S</text>
      <text x="676" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">W</text>
      <text x="724" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">E</text>
    </svg>
  ),
  victorian: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky5" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1917"/>
          <stop offset="100%" stopColor="#292524"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky5)"/>
      {/* Smog / fog */}
      <ellipse cx="400" cy="150" rx="420" ry="100" fill="#d97706" opacity="0.06"/>
      {/* Factory 1 */}
      <rect x="80" y="100" width="120" height="180" fill="#292524"/>
      <rect x="90" y="80" width="30" height="30" fill="#3c3432"/>
      {/* Factory chimneys */}
      {[100,130,160].map((x,i)=>(
        <g key={i}>
          <rect x={x} y={30+i*10} width="18" height={80-i*10} fill="#1c1917"/>
          <ellipse cx={x+9} cy={30+i*10} rx="12" ry="6" fill="#292524"/>
          {/* Smoke */}
          <ellipse cx={x+9} cy={18+i*10} rx="10" ry="8" fill="#78716c" opacity="0.5"/>
          <ellipse cx={x+15} cy={5+i*10} rx="14" ry="10" fill="#57534e" opacity="0.4"/>
        </g>
      ))}
      {/* Buildings */}
      {[300,420,560,660].map((x,i)=>(
        <g key={i}>
          <rect x={x} y={80+i%2*30} width={80+i*5} height={220-i%2*30} fill={i%2===0?"#1c1917":"#292524"}/>
          {/* Windows */}
          {[0,1,2].map(row=>
            [0,1].map(col=>(
              <rect key={`${row}-${col}`} x={x+10+col*30} y={100+i%2*30+row*35} width="18" height="22" rx="2"
                fill={Math.random()>0.4?"#fbbf24":"#1c1917"} opacity="0.9"/>
            ))
          )}
        </g>
      ))}
      {/* Street lamps */}
      {[50,240,490,740].map((x,i)=>(
        <g key={i}>
          <line x1={x} y1="160" x2={x} y2="275" stroke="#78716c" strokeWidth="4"/>
          <ellipse cx={x} cy="155" rx="12" ry="8" fill="#fbbf24" opacity="0.8"/>
          <ellipse cx={x} cy="155" rx="20" ry="15" fill="#fbbf24" opacity="0.15"/>
        </g>
      ))}
      {/* Steam train */}
      <rect x="30" y="255" width="120" height="30" rx="5" fill="#292524"/>
      <circle cx="60" cy="285" r="12" fill="#1c1917" stroke="#78716c" strokeWidth="2"/>
      <circle cx="110" cy="285" r="12" fill="#1c1917" stroke="#78716c" strokeWidth="2"/>
      <rect x="35" y="235" width="50" height="25" rx="4" fill="#1c1917"/>
      <ellipse cx="42" cy="232" rx="8" ry="6" fill="#57534e"/>
      {/* Ground */}
      <rect x="0" y="270" width="800" height="30" fill="#0c0a09"/>
      <line x1="0" y1="272" x2="800" y2="272" stroke="#78716c" strokeWidth="2" strokeDasharray="20,10"/>
    </svg>
  ),
  space: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky6" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#0c4a6e"/>
        </linearGradient>
        <radialGradient id="moon6" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef9c3"/>
          <stop offset="100%" stopColor="#d97706"/>
        </radialGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky6)"/>
      {/* Stars */}
      {Array.from({length:60},(_,i)=>({x:Math.sin(i*77)*400+400,y:Math.cos(i*53)*150+80})).map((s,i)=>(
        <circle key={i} cx={s.x} cy={s.y} r={i%5===0?2.5:1.5} fill="white"
          opacity={i%3===0?0.9:0.5}/>
      ))}
      {/* Moon */}
      <circle cx="620" cy="90" r="70" fill="url(#moon6)"/>
      {/* Moon craters */}
      <circle cx="600" cy="75" r="12" fill="#b45309" opacity="0.4"/>
      <circle cx="640" cy="105" r="8" fill="#b45309" opacity="0.3"/>
      <circle cx="615" cy="110" r="5" fill="#b45309" opacity="0.35"/>
      {/* Saturn */}
      <ellipse cx="150" cy="80" rx="40" ry="28" fill="#d97706"/>
      <ellipse cx="150" cy="80" rx="65" ry="16" fill="none" stroke="#ca8a04" strokeWidth="8" opacity="0.7"/>
      {/* Rocket */}
      <g transform="translate(360,20)">
        <polygon points="30,0 50,60 10,60" fill="#e2e8f0"/>
        <rect x="12" y="55" width="36" height="80" fill="#cbd5e1"/>
        <rect x="12" y="55" width="36" height="80" fill="#6366f1" opacity="0.3"/>
        {/* Window */}
        <circle cx="30" cy="85" r="10" fill="#0ea5e9" opacity="0.9"/>
        {/* Fins */}
        <polygon points="12,130 0,160 12,150" fill="#94a3b8"/>
        <polygon points="48,130 60,160 48,150" fill="#94a3b8"/>
        {/* Flame */}
        <ellipse cx="30" cy="168" rx="14" ry="22" fill="#f97316" opacity="0.9"/>
        <ellipse cx="30" cy="162" rx="8" ry="14" fill="#fbbf24"/>
      </g>
      {/* Astronaut */}
      <g transform="translate(200,150)">
        <circle cx="20" cy="15" r="18" fill="#e2e8f0"/>
        <circle cx="20" cy="15" r="12" fill="#bfdbfe" opacity="0.8"/>
        <rect x="8" y="30" width="24" height="30" rx="6" fill="#e2e8f0"/>
        <rect x="2" y="32" width="10" height="22" rx="5" fill="#e2e8f0"/>
        <rect x="30" y="32" width="10" height="22" rx="5" fill="#e2e8f0"/>
        <rect x="10" y="55" width="10" height="20" rx="5" fill="#e2e8f0"/>
        <rect x="22" y="55" width="10" height="20" rx="5" fill="#e2e8f0"/>
        {/* USA flag */}
        <rect x="30" y="34" width="18" height="12" fill="#dc2626"/>
        <rect x="30" y="34" width="18" height="4" fill="#dc2626"/>
        <rect x="30" y="38" width="18" height="4" fill="white"/>
        <rect x="30" y="42" width="18" height="4" fill="#dc2626"/>
        <rect x="30" y="34" width="8" height="6" fill="#1e3a8a"/>
      </g>
      {/* Earth horizon */}
      <ellipse cx="400" cy="310" rx="500" ry="80" fill="#0369a1" opacity="0.4"/>
    </svg>
  ),
  modern: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky7" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a"/>
          <stop offset="100%" stopColor="#1e1b4b"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky7)"/>
      {/* Stars */}
      {[{x:50,y:20},{x:150,y:40},{x:600,y:15},{x:720,y:35},{x:400,y:25}].map((s,i)=>(
        <circle key={i} cx={s.x} cy={s.y} r="2" fill="white" opacity="0.6"/>
      ))}
      {/* Buildings skyline */}
      {[
        {x:0,  w:80, h:240, c:"#1e293b"},
        {x:60, w:60, h:200, c:"#0f172a"},
        {x:100,w:90, h:260, c:"#1e293b"},
        {x:170,w:50, h:180, c:"#0f172a"},
        {x:200,w:100,h:280, c:"#312e81"},
        {x:280,w:70, h:220, c:"#1e293b"},
        {x:330,w:80, h:295, c:"#4338ca"},
        {x:400,w:60, h:200, c:"#1e293b"},
        {x:440,w:110,h:270, c:"#1e293b"},
        {x:530,w:70, h:230, c:"#312e81"},
        {x:580,w:90, h:285, c:"#1e1b4b"},
        {x:650,w:60, h:200, c:"#0f172a"},
        {x:690,w:80, h:250, c:"#1e293b"},
        {x:750,w:60, h:220, c:"#1e293b"},
      ].map((b,i)=>(
        <g key={i}>
          <rect x={b.x} y={300-b.h} width={b.w} height={b.h} fill={b.c}/>
          {/* Windows grid */}
          {Array.from({length:Math.floor(b.h/30)},(_,row)=>
            Array.from({length:Math.floor(b.w/20)},(_,col)=>(
              <rect key={`${row}-${col}`}
                x={b.x+4+col*18} y={300-b.h+8+row*28}
                width="10" height="14" rx="1"
                fill={(row+col+i)%3===0?"#6366f1":(row+col)%4===0?"#fbbf24":"#1e293b"}
                opacity={(row+col+i)%3===0?0.9:0.7}/>
            ))
          )}
        </g>
      ))}
      {/* Reflection in water */}
      <rect x="0" y="268" width="800" height="32" fill="#0c4a6e" opacity="0.7"/>
      {[330,440,580].map((x,i)=>(
        <line key={i} x1={x+40} y1="268" x2={x+40} y2="300" stroke="#6366f1" strokeWidth="2" opacity="0.5"/>
      ))}
      {/* Flying cars / drones (futuristic) */}
      <ellipse cx="200" cy="120" rx="25" ry="8" fill="#6366f1" opacity="0.7"/>
      <ellipse cx="200" cy="117" rx="15" ry="5" fill="#818cf8"/>
      <ellipse cx="560" cy="90" rx="20" ry="7" fill="#6366f1" opacity="0.6"/>
    </svg>
  ),
  future: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky8" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="50%" stopColor="#2e1065"/>
          <stop offset="100%" stopColor="#4c1d95"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky8)"/>
      {/* Galaxy swirl */}
      {Array.from({length:80},(_,i)=>({
        x:400+Math.cos(i*0.4)*i*2.2,
        y:150+Math.sin(i*0.4)*i*1.1,
        r:Math.max(0.5,2-i*0.02)
      })).map((s,i)=>(
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i%3===0?"#a78bfa":i%3===1?"#818cf8":"white"} opacity={0.7-i*0.006}/>
      ))}
      {/* Giant planet */}
      <circle cx="650" cy="100" r="80" fill="#7c3aed" opacity="0.6"/>
      <ellipse cx="650" cy="100" rx="110" ry="22" fill="none" stroke="#a78bfa" strokeWidth="6" opacity="0.5"/>
      <circle cx="650" cy="100" r="80" fill="none" stroke="#6d28d9" strokeWidth="2" opacity="0.4"/>
      {/* Space station */}
      <rect x="60" y="60" width="120" height="30" rx="8" fill="#475569"/>
      <rect x="110" y="40" width="20" height="70" rx="4" fill="#475569"/>
      <rect x="30" y="68" width="50" height="14" rx="3" fill="#6366f1" opacity="0.8"/>
      <rect x="170" y="68" width="50" height="14" rx="3" fill="#6366f1" opacity="0.8"/>
      {/* Solar panels */}
      <rect x="10" y="66" width="22" height="18" fill="#fbbf24" opacity="0.8"/>
      <rect x="218" y="66" width="22" height="18" fill="#fbbf24" opacity="0.8"/>
      {/* Flying saucer */}
      <ellipse cx="300" cy="180" rx="50" ry="16" fill="#374151"/>
      <ellipse cx="300" cy="173" rx="28" ry="18" fill="#4b5563"/>
      <ellipse cx="300" cy="170" rx="14" ry="10" fill="#7dd3fc" opacity="0.8"/>
      {/* Beam */}
      <path d="M 280 186 L 240 260 L 320 260 Z" fill="#7dd3fc" opacity="0.15"/>
      {/* Neon city below */}
      {[0,80,160,260,360,460,540,640,700].map((x,i)=>(
        <rect key={i} x={x} y={220+i%3*15} width={60+i%2*20} height={80-i%3*10} rx="4"
          fill={["#1e1b4b","#2e1065","#312e81"][i%3]}/>
      ))}
      {/* Neon lights */}
      {[40,180,380,560,680].map((x,i)=>(
        <line key={i} x1={x} y1="220" x2={x} y2="300" stroke={["#a78bfa","#818cf8","#c084fc"][i%3]}
          strokeWidth="2" opacity="0.6"/>
      ))}
      <rect x="0" y="290" width="800" height="10" fill="#0f0728"/>
    </svg>
  ),
  roaring20s: (
    <svg viewBox="0 0 800 300" width="100%" height="100%" style={{display:"block"}}>
      <defs>
        <linearGradient id="sky9" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181b"/>
          <stop offset="100%" stopColor="#27272a"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#sky9)"/>
      {/* Art deco buildings */}
      {[
        {x:100,w:100,h:250,c:"#3f3f46"},{x:180,w:80,h:200,c:"#27272a"},
        {x:250,w:120,h:280,c:"#52525b"},{x:360,w:80,h:220,c:"#3f3f46"},
        {x:430,w:100,h:260,c:"#27272a"},{x:520,w:90,h:230,c:"#52525b"},
        {x:600,w:80,h:200,c:"#3f3f46"},{x:670,w:100,h:245,c:"#27272a"},
      ].map((b,i)=>(
        <g key={i}>
          <rect x={b.x} y={300-b.h} width={b.w} height={b.h} fill={b.c}/>
          {/* Art deco top */}
          <polygon points={`${b.x},${300-b.h} ${b.x+b.w/2},${300-b.h-25} ${b.x+b.w},${300-b.h}`} fill="#ca8a04"/>
          {/* Gold stripe */}
          <rect x={b.x} y={300-b.h+5} width={b.w} height="4" fill="#ca8a04" opacity="0.6"/>
          {/* Windows */}
          {Array.from({length:6},(_,r)=>Array.from({length:3},(_,c)=>(
            <rect key={`${r}${c}`} x={b.x+8+c*(b.w/3-2)} y={300-b.h+20+r*38} width={b.w/3-10} height="22"
              fill={(r+c)%2===0?"#fbbf24":"#a16207"} opacity="0.7"/>
          )))}
        </g>
      ))}
      {/* Marquee lights on ground */}
      {Array.from({length:20},(_,i)=>(
        <circle key={i} cx={20+i*38} cy="285" r="5" fill="#fbbf24" opacity={i%2===0?0.9:0.3}/>
      ))}
      {/* Jazz club sign */}
      <rect x="310" y="230" width="180" height="40" rx="6" fill="#ca8a04"/>
      <text x="400" y="256" textAnchor="middle" fill="#18181b" fontSize="16" fontWeight="900">JAZZ CLUB</text>
      {/* Ground */}
      <rect x="0" y="275" width="800" height="25" fill="#09090b"/>
      {/* Cars silhouette */}
      <rect x="50" y="263" width="80" height="18" rx="6" fill="#09090b"/>
      <circle cx="68" cy="281" r="7" fill="#27272a" stroke="#52525b" strokeWidth="2"/>
      <circle cx="112" cy="281" r="7" fill="#27272a" stroke="#52525b" strokeWidth="2"/>
      <rect x="600" y="260" width="90" height="20" rx="6" fill="#09090b"/>
      <circle cx="618" cy="280" r="7" fill="#27272a" stroke="#52525b" strokeWidth="2"/>
      <circle cx="670" cy="280" r="7" fill="#27272a" stroke="#52525b" strokeWidth="2"/>
    </svg>
  ),
};

function getScene(year) {
  if (year <= -1000) return SCENES.ancient;
  if (year <= 0)     return SCENES.rome;
  if (year <= 1400)  return SCENES.medieval;
  if (year <= 1700)  return SCENES.renaissance;
  if (year <= 1950)  return year <= 1930 ? SCENES.roaring20s : SCENES.victorian;
  if (year <= 1975)  return SCENES.space;
  if (year <= 2030)  return SCENES.modern;
  return SCENES.future;
}

// Multiple scenes per era for rotation
function getScenes(year) {
  if (year <= -1000) return [SCENES.ancient, SCENES.rome, SCENES.renaissance];
  if (year <= 0)     return [SCENES.rome, SCENES.ancient, SCENES.medieval];
  if (year <= 1400)  return [SCENES.medieval, SCENES.rome, SCENES.renaissance];
  if (year <= 1700)  return [SCENES.renaissance, SCENES.medieval, SCENES.victorian];
  if (year <= 1900)  return [SCENES.victorian, SCENES.roaring20s, SCENES.renaissance];
  if (year <= 1950)  return [SCENES.roaring20s, SCENES.victorian, SCENES.modern];
  if (year <= 1975)  return [SCENES.space, SCENES.modern, SCENES.roaring20s];
  if (year <= 2030)  return [SCENES.modern, SCENES.space, SCENES.future];
  return               [SCENES.future, SCENES.space, SCENES.modern];
}

// ── Scripts ─────────────────────────────────────────────────────────────────
function getScript(year, amount, sym) {
  const a = amount, y = year, label = fmtYear(y);
  if (y<=-2000) return { eraName:"Ancient Egypt", lines:[
    { text:`In ${label}, ${sym}${a} had the buying power of roughly ${sym}${Math.round(a*1800).toLocaleString()} today. A pyramid worker's entire year of wages.`, mood:"shocked", serious:true },
    { text:`Egyptian workers were paid in BEER. Up to 10 jugs a day! Your ${sym}${a} would've been a lifetime supply of ancient craft brew. 🍺`, mood:"happy" },
    { text:`Pharaohs buried their gold thinking they could take it to the afterlife. Spoiler: they couldn't. But grave robbers were very grateful! 😄`, mood:"happy" },
    { text:`Ancient Egyptians had ZERO coins — your ${sym}${a} bill would've been completely useless, just a weird papyrus rectangle! They traded grain and copper by weight instead. 😲`, mood:"shocked" },
  ], question:`If you could spend ${sym}${a} in ancient Egypt — a pyramid tour, a fancy linen robe, or 10 jugs of royal beer — what do you pick? 🤔` };

  if (y<=0) return { eraName:"Classical Antiquity", lines:[
    { text:`In ${label}, ${sym}${a} had the buying power of ${sym}${Math.round(a*400).toLocaleString()} today. A Roman soldier earned about that in a full month.`, mood:"shocked", serious:true },
    { text:`Romans had fast food restaurants called "thermopolia" — hot food counters built into the street. ${sym}${a} bought you lunch every day for a whole month! 🍜`, mood:"happy" },
    { text:`Julius Caesar was SO in debt before he got famous — billions in today's money. He literally invented "fake it till you make it" for the whole Roman Empire! 😂`, mood:"happy" },
    { text:`Romans used crushed mouse brains as toothpaste. The LUXURY version was powdered oyster shells. Your ${sym}${a} could've bought the fancy option! 🦷😅`, mood:"shocked" },
  ], question:`You're a Roman citizen with ${sym}${a}. Do you spend it on gladiator tickets, a fancy toga, wine for a week, or invest in a merchant ship to Britannia? 🏛️` };

  if (y<=1400) return { eraName:"The Middle Ages", lines:[
    { text:`In ${label}, ${sym}${a} could feed a peasant family for an entire year. A knight's full armor cost the equivalent of a house in today's money.`, mood:"shocked", serious:true },
    { text:`Medieval people thought bathing was DANGEROUS for your health. So nobody did. Your ${sym}${a} could've bought enough perfume to survive being near anyone! 😅`, mood:"happy" },
    { text:`A knight's horse was worth more than his armor, sword AND house combined — basically a medieval Ferrari that ate hay and occasionally threw you off! 🐴😂`, mood:"happy" },
    { text:`Medieval peasants had NO idea what year it was. The calendar was a mess, monks kept getting it wrong, and time was genuinely optional. Very chill. ☁️`, mood:"shocked" },
  ], question:`${sym}${a} in medieval times — sword, a year of food, a fancy hat (status symbol!), or bribe a monk to write you into a history book forever? 🗡️` };

  if (y<=1700) return { eraName:"Age of Discovery", lines:[
    { text:`In ${label}, ${sym}${a} was serious wealth — equal to about ${sym}${Math.round(a*120).toLocaleString()} today. Enough to fund a small merchant voyage or buy a fine horse.`, mood:"shocked", serious:true },
    { text:`During the 1637 tulip mania, ONE tulip bulb sold for the price of a luxury house. Your ${sym}${a} in flowers could've made you a millionaire... or bankrupted you overnight! 🌷😂`, mood:"happy" },
    { text:`Columbus got rejected by THREE countries before Spain said yes. He was basically the world's first startup founder getting ghosted by venture capitalists! 😂`, mood:"happy" },
    { text:`Nutmeg was literally worth its weight in gold. A pouch of pepper was like carrying a bag of cash. Your ${sym}${a} in spices would be absolutely wild today. 🌶️`, mood:"shocked" },
  ], question:`${sym}${a} in ${label} — invest in Columbus's voyage, buy a warehouse of pepper, commission a Renaissance painting, or play the tulip market? 🌍` };

  if (y<=1900) return { eraName:"Victorian Era", lines:[
    { text:`In ${label}, ${sym}${a} had the buying power of about ${sym}${Math.round(a*32).toLocaleString()} today. The average factory worker earned just a few dollars a week.`, mood:"shocked", serious:true },
    { text:`In the 1800s you could literally MAIL a live person by parcel post! Some parents shipped their children to grandma's house via postal service. ${sym}${a} covered a LOT of postage! 📮😂`, mood:"happy" },
    { text:`Victorian doctors prescribed cocaine for toothaches, heroin for coughs, and arsenic for "glowing skin." The wellness industry was... extremely different. 😅`, mood:"happy" },
    { text:`The first big stock bubble in America — two guys tried to corner the ENTIRE gold market in 1869. They almost pulled it off. ${sym}${a} in gold back then would be wild today! 💰`, mood:"shocked" },
  ], question:`Victorian spending quiz: ${sym}${a} — invest in a railway company (the crypto of the era!), buy a telegraph machine, hire a butler for a week, or get a steam-powered gadget? 🚂` };

  if (y<=1945) return { eraName: y<=1929?"The Roaring Twenties":"World War Era", lines:[
    { text:`In ${label}, ${sym}${a} had the buying power of about ${sym}${Math.round(a*18).toLocaleString()} today. ${y<1930?"The 1920s were booming — everyone felt rich until suddenly they weren't.":"Wartime rationing meant money couldn't always buy what you needed."}`, mood:"shocked", serious:true },
    { text:`During Prohibition, illegal whiskey cost more than a full meal! Your ${sym}${a} in a speakeasy would've made you VERY popular with the entire neighborhood! 🥃`, mood:"happy" },
    { text:`Monopoly was invented during the Great Depression because people couldn't afford REAL real estate. The ultimate "let's pretend we're rich" invention in history! 🎲😂`, mood:"happy" },
    { text:`The 1929 crash dropped the market 89% over 3 years. Your ${sym}${a} became ${sym}${Math.round(a*0.11)} — like a magic trick, but evil and not fun at all! 😱`, mood:"shocked" },
  ], question:`It's ${label} and you have ${sym}${a}. Do you put it in stocks (right before the crash!), hide it under your mattress, buy gold, or open a speakeasy? 🎰` };

  if (y<=1970) return { eraName:"The Space Age", lines:[
    { text:`In ${label}, ${sym}${a} had the buying power of about ${sym}${Math.round(a*11).toLocaleString()} today. A brand new Ford Mustang cost just $2,600 — the American Dream was real!`, mood:"shocked", serious:true },
    { text:`NASA's entire moon program cost $25 billion — but split across all Americans that's only $150 each. Your ${sym}${a} literally helped put a man on the moon! 🌙`, mood:"happy" },
    { text:`The Beatles were taxed at 95% income tax. NINETY FIVE PERCENT. That's why George Harrison wrote "Taxman." Your ${sym}${a} would've left them just ${sym}${(amount*0.05).toFixed(2)}! 😂`, mood:"happy" },
    { text:`In 1969 a color TV cost $500. A black-and-white TV was $150. Your ${sym}${a} could get you a ticket to the moon era in style — with change left over for a burger! 📺`, mood:"shocked" },
  ], question:`It's ${label} and you have ${sym}${a}. Do you buy Apple stock (doesn't exist yet!), invest in Beatlemania merch, open a savings account at 5%, or go to Woodstock? 🎸` };

  if (y<=1990) return { eraName:"The Eighties", lines:[
    { text:`In ${label}, ${sym}${a} had the buying power of about ${sym}${Math.round(a*3.5).toLocaleString()} today. Big hair, shoulder pads, and even bigger financial risks.`, mood:"shocked", serious:true },
    { text:`In 1983 a mobile phone cost $3,995 — that's $12,000 today — and all it could do was make calls. Your ${sym}${a} was ${Math.round((amount/3995)*100)}% of a brick phone! You were basically rich! 📱😂`, mood:"happy" },
    { text:`In the 80s, "junk bonds" were the hottest investment. Michael Milken made $550 million in ONE year selling them, then went to jail. Finance has always been a reality show! 🎬`, mood:"happy" },
    { text:`The 1987 Black Monday crash dropped stocks 22% in ONE day. Your ${sym}${a} became ${sym}${Math.round(a*0.78)} before breakfast. The most terrifying morning in Wall Street history! 📉😱`, mood:"shocked" },
  ], question:`1980s money dilemma: ${sym}${a} — early Apple stock, invest in Blockbuster Video (BOOMING!), buy a mobile brick phone to flex, or put it all on junk bonds? 💾` };

  if (y<=2010) return { eraName: y<=2000?"The Nineties":"The 2000s", lines:[
    { text:`In ${label}, ${sym}${a} had the buying power of about ${sym}${Math.round(a*2.2).toLocaleString()} today. ${y<2000?"The dotcom era was minting millionaires daily — until it wasn't.":"The 2008 crisis erased $11 trillion in household wealth almost overnight."}`, mood:"shocked", serious:true },
    { text:`In 1997, ${sym}${a} bought 1,000 Amazon shares at IPO. Today those shares are worth over ${sym}${(amount*6800).toLocaleString()}. That's not investing, that's a TIME MACHINE! ✨`, mood:"happy" },
    { text:`Pets.com spent $2 million on a Super Bowl ad and went bankrupt 9 months later. Your ${sym}${a} was basically their entire marketing strategy decision. 🐾😂`, mood:"happy" },
    { text:`Bitcoin launched in January 2009 worth essentially $0. ${sym}${a} then bought you thousands of coins. Today that's... well. Let's just say it hurts to think about. 😱`, mood:"shocked" },
  ], question:`${y<2000?"90s":"00s"} money challenge: ${sym}${a} — invest in Amazon IPO, buy Pets.com stock (great idea definitely), get early Bitcoin, or stuff it in a Y2K bunker? 💻` };

  if (y<=2025) return { eraName:"The Digital Era", lines:[
    { text:`Today, ${sym}${a} has 40% less buying power than it did in 2000. Housing costs have tripled. But your pocket computer is 1 million times more powerful than a 1969 NASA mainframe.`, mood:"shocked", serious:true },
    { text:`${sym}${a} of Tesla stock in 2010 is worth over ${sym}${Math.round(amount*250).toLocaleString()} today. Meanwhile a savings account earned you about ${sym}${Math.round(amount*0.08)}. Choices were made. 📈😅`, mood:"happy" },
    { text:`Someone paid $69 million for a JPEG in 2021. Not a painting — a JPEG. Your ${sym}${a} could've bought 0.00014% of that JPEG. Art is truly subjective! 🖼️😂`, mood:"happy" },
    { text:`The world's 8 richest people own as much as the bottom 3.8 BILLION combined. If Bezos dropped ${sym}${a}, physics says it's not worth his time to pick it up. Wild! 😬`, mood:"shocked" },
  ], question:`Modern money quiz: ${sym}${a} right now — index fund (boring but smart), crypto and hope, pay off debt, or YOLO on a meme stock? What's actually your move? 📊` };

  return { eraName: y<=2060?"Near Future":"Deep Future", lines:[
    { text:`By ${label}, ${sym}${a} may be worth dramatically less — or MORE. AI-driven deflation vs climate inflation. Economists literally cannot agree which way this goes.`, mood:"shocked", serious:true },
    { text:`By 2050, AI might do 40% of current jobs. But "Prompt Engineer" wasn't a job in 2005 either. New jobs we can't even imagine yet are coming! 🤖`, mood:"happy" },
    { text:`Some futurists think money itself will be obsolete by ${Math.min(y,2100)}. Your ${sym}${a} might become a museum exhibit: "primitive exchange token, circa 21st century." 😂`, mood:"happy" },
    { text:`${sym}${a} invested today at 7% annually until ${Math.min(y,2075)} = ${sym}${Math.round(amount*Math.pow(1.07,Math.min(y-2025,50))).toLocaleString()}. Compound interest is literally a superpower. 🚀`, mood:"shocked" },
  ], question:`Future vision: by ${label}, will ${sym}${a} buy MORE, LESS, or the SAME? And would you rather have it in cash, crypto, real estate, or brain-uploaded memories? 🤔` };
}

// ── Typewriter ──────────────────────────────────────────────────────────────
function Typewriter({ text, speed=13 }) {
  const [val, setVal] = useState("");
  const [done, setDone] = useState(false);
  useEffect(()=>{
    setVal(""); setDone(false);
    if (!text) return;
    let i=0;
    const id=setInterval(()=>{ i++; setVal(text.slice(0,i)); if(i>=text.length){clearInterval(id);setDone(true);} },speed);
    return ()=>clearInterval(id);
  },[text]);
  return <>{val}{!done&&<span style={{animation:"cur 0.55s ease infinite",color:"#818cf8"}}>|</span>}</>;
}

// ── Voice ───────────────────────────────────────────────────────────────────
let _wd=null, _curSerious=false;
function speak(text, onDone, muted) {
  const clean=text.replace(/[^\x00-\x7F]/g,"").replace(/\s+/g," ").trim();
  if (muted||!window.speechSynthesis||!clean){ setTimeout(()=>onDone?.(),Math.min(clean.length*28+400,8000)); return; }
  window.speechSynthesis.cancel();
  if(_wd){clearInterval(_wd);_wd=null;}
  setTimeout(()=>{
    const utt=new SpeechSynthesisUtterance(clean);
    utt.pitch=1.6; utt.volume=1; utt.rate=_curSerious?0.92:1.18;
    const go=()=>{
      const vs=window.speechSynthesis.getVoices();
      const pick=vs.find(v=>/samantha/i.test(v.name))||vs.find(v=>/karen/i.test(v.name))
        ||vs.find(v=>/victoria/i.test(v.name))||vs.find(v=>/zira/i.test(v.name))
        ||vs.find(v=>v.lang==="en-US"&&v.localService)||vs.find(v=>v.lang.startsWith("en"));
      if(pick) utt.voice=pick;
      _wd=setInterval(()=>{ if(window.speechSynthesis.paused) window.speechSynthesis.resume(); },3500);
      utt.onend=()=>{ clearInterval(_wd);_wd=null; setTimeout(()=>onDone?.(),200); };
      utt.onerror=e=>{ clearInterval(_wd);_wd=null; if(e.error!=="interrupted") setTimeout(()=>onDone?.(),200); };
      window.speechSynthesis.speak(utt);
    };
    window.speechSynthesis.getVoices().length>0?go():window.speechSynthesis.addEventListener("voiceschanged",go,{once:true});
  },90);
}

// ── FinBot ──────────────────────────────────────────────────────────────────
function FinBot({ mood="neutral", talking=false, pointing=false, swapping=false }) {
  return (
    <svg viewBox="0 0 110 145" width={84} height={108}
      style={{overflow:"visible",flexShrink:0,filter:"drop-shadow(0 6px 22px rgba(99,102,241,0.55))"}}>
      <line x1="55" y1="4" x2="55" y2="16" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="55" cy="4" r="4.5" fill="#818cf8">
        <animate attributeName="r" values="4.5;6.5;4.5" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <rect x="18" y="15" width="74" height="46" rx="13" fill="#4f46e5"/>
      <rect x="21" y="18" width="26" height="9" rx="4.5" fill="white" opacity="0.1"/>
      {mood==="shocked"?<>
        <ellipse cx="40" cy="32" rx="11" ry="12" fill="#e0e7ff"/>
        <ellipse cx="70" cy="32" rx="11" ry="12" fill="#e0e7ff"/>
        <circle cx="40" cy="34" r="5.5" fill="#1e1b4b"/>
        <circle cx="70" cy="34" r="5.5" fill="#1e1b4b"/>
        <circle cx="38" cy="32" r="2" fill="white"/>
        <circle cx="68" cy="32" r="2" fill="white"/>
      </>:mood==="happy"?<>
        <path d="M28 27 Q40 19 52 27" fill="none" stroke="#c7d2fe" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M58 27 Q70 19 82 27" fill="none" stroke="#c7d2fe" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M30 34 Q40 43 50 34" fill="#c7d2fe"/>
        <path d="M60 34 Q70 43 80 34" fill="#c7d2fe"/>
      </>:<>
        <rect x="28" y="24" width="23" height="15" rx="7" fill="#e0e7ff"/>
        <rect x="59" y="24" width="23" height="15" rx="7" fill="#e0e7ff"/>
        <rect x={talking?"32":"33"} y="27" rx="4.5" width={talking?"12":"13"} height={talking?"9":"10"} fill="#1e1b4b">
          {talking&&<animate attributeName="height" values="9;2;9" dur="0.22s" repeatCount="indefinite"/>}
        </rect>
        <rect x={talking?"63":"64"} y="27" rx="4.5" width={talking?"12":"13"} height={talking?"9":"10"} fill="#1e1b4b">
          {talking&&<animate attributeName="height" values="9;2;9" dur="0.22s" begin="0.11s" repeatCount="indefinite"/>}
        </rect>
      </>}
      {mood==="happy"
        ?<path d="M35 54 Q55 66 75 54" fill="#312e81" stroke="#a5b4fc" strokeWidth="1.5"/>
        :mood==="shocked"
          ?<ellipse cx="55" cy="55" rx="9" ry="7" fill="#312e81"/>
          :talking
            ?<ellipse cx="55" cy="55" rx="8" ry="5" fill="#312e81"><animate attributeName="ry" values="5;1.5;5" dur="0.22s" repeatCount="indefinite"/></ellipse>
            :<path d="M40 55 Q55 61 70 55" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round"/>}
      <rect x="20" y="63" width="70" height="37" rx="12" fill="#4338ca"/>
      <rect x="29" y="69" width="52" height="22" rx="6" fill="#1e1b4b"/>
      <text x="55" y="84" textAnchor="middle" fill="#818cf8" fontSize="13" fontWeight="900" fontFamily="monospace">FIN</text>
      <rect x="5" y="65" width="15" height="24" rx="7.5" fill="#4338ca"/>
      {(pointing||swapping)?(
        <g>
          <rect x="90" y="46" width="15" height="24" rx="7.5" fill="#4338ca">
            <animateTransform attributeName="transform" type="rotate"
              values={swapping?"-55,97,65;-5,97,65;-55,97,65":"-38,97,65;-20,97,65;-38,97,65"}
              dur={swapping?"0.45s":"2.2s"} repeatCount="indefinite"/>
          </rect>
          <line x1="96" y1="18" x2="91" y2="48" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate"
              values={swapping?"-55,97,65;-5,97,65;-55,97,65":"-38,97,65;-20,97,65;-38,97,65"}
              dur={swapping?"0.45s":"2.2s"} repeatCount="indefinite"/>
          </line>
          <circle cx="96" cy="16" r="5.5" fill="#f59e0b">
            <animateTransform attributeName="transform" type="rotate"
              values={swapping?"-55,97,65;-5,97,65;-55,97,65":"-38,97,65;-20,97,65;-38,97,65"}
              dur={swapping?"0.45s":"2.2s"} repeatCount="indefinite"/>
            <animate attributeName="r" values="5.5;8;5.5" dur={swapping?"0.45s":"1s"} repeatCount="indefinite"/>
          </circle>
          <circle cx="96" cy="16" r="11" fill="#fbbf24" opacity="0.18">
            <animateTransform attributeName="transform" type="rotate"
              values={swapping?"-55,97,65;-5,97,65;-55,97,65":"-38,97,65;-20,97,65;-38,97,65"}
              dur={swapping?"0.45s":"2.2s"} repeatCount="indefinite"/>
            <animate attributeName="r" values="11;16;11" dur={swapping?"0.45s":"1s"} repeatCount="indefinite"/>
          </circle>
        </g>
      ):(
        <rect x="90" y="65" width="15" height="24" rx="7.5" fill="#4338ca"/>
      )}
      <rect x="28" y="100" width="16" height="30" rx="8" fill="#3730a3"/>
      <rect x="66" y="100" width="16" height="30" rx="8" fill="#3730a3"/>
    </svg>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function App() {
  const sym="$";
  const [phase,     setPhase]     = useState("input");
  const [yearInput, setYearInput] = useState("");
  const [amtInput,  setAmtInput]  = useState("100");
  const [err,       setErr]       = useState("");
  const [muted,     setMuted]     = useState(false);
  const [year,      setYear]      = useState(0);
  const [script,    setScript]    = useState(null);
  const [scenes,    setScenes]    = useState([]);
  const [lineIdx,   setLineIdx]   = useState(-1);
  const [sceneIdx,  setSceneIdx]  = useState(0);
  const [talking,   setTalking]   = useState(false);
  const [mood,      setMood]      = useState("neutral");
  const [swapping,  setSwapping]  = useState(false);
  const [showQ,     setShowQ]     = useState(false);

  const mutedRef  = useRef(false);
  const scriptRef = useRef(null);
  const lineIdxRef= useRef(-1);
  const sceneTick = useRef(null);
  const swapRef   = useRef(null);

  useEffect(()=>{ mutedRef.current=muted; },[muted]);
  useEffect(()=>{ scriptRef.current=script; },[script]);
  useEffect(()=>{ lineIdxRef.current=lineIdx; },[lineIdx]);
  useEffect(()=>()=>{
    window.speechSynthesis?.cancel();
    if(_wd){clearInterval(_wd);_wd=null;}
    if(sceneTick.current) clearInterval(sceneTick.current);
    if(swapRef.current) clearTimeout(swapRef.current);
  },[]);

  // Scene swap every 5s
  useEffect(()=>{
    if(phase!=="story"&&phase!=="question") return;
    if(sceneTick.current) clearInterval(sceneTick.current);
    sceneTick.current=setInterval(()=>{
      setSwapping(true);
      if(swapRef.current) clearTimeout(swapRef.current);
      swapRef.current=setTimeout(()=>setSwapping(false),550);
      setSceneIdx(i=>(i+1)%3);
    },5000);
    return ()=>clearInterval(sceneTick.current);
  },[phase]);

  // Narration
  useEffect(()=>{
    if(phase!=="story"||lineIdx<0||!scriptRef.current) return;
    const lines=scriptRef.current.lines;
    if(lineIdx>=lines.length){ setPhase("question"); setTimeout(()=>setShowQ(true),400); return; }
    const line=lines[lineIdx];
    _curSerious=!!line.serious;
    setMood(line.mood||"neutral");
    setTalking(true);
    speak(line.text,()=>{
      setTalking(false);
      setTimeout(()=>setLineIdx(lineIdxRef.current+1),600);
    },mutedRef.current);
  },[lineIdx,phase]);

  const parseYear=raw=>{ const bc=raw.match(/^(\d+)\s*bc$/i); return bc?-parseInt(bc[1]):parseInt(raw); };

  const travel=()=>{
    const y=parseYear(yearInput.trim());
    if(isNaN(y)||y<-4000||y>4025){ setErr("Enter a year between 4000 BC and 4025"); return; }
    const a=parseFloat(amtInput)||100;
    setErr(""); setYear(y); setPhase("loading");
    setTimeout(()=>{
      const s=getScript(y,a,sym);
      setScript(s); setScenes(getScenes(y));
      setSceneIdx(0); setLineIdx(-1); setShowQ(false);
      setPhase("story");
      setTimeout(()=>setLineIdx(0),500);
    },1200);
  };

  const reset=()=>{
    window.speechSynthesis?.cancel();
    if(_wd){clearInterval(_wd);_wd=null;}
    if(sceneTick.current){clearInterval(sceneTick.current);sceneTick.current=null;}
    setPhase("input"); setScript(null); setLineIdx(-1);
    setTalking(false); setMood("neutral"); setSwapping(false); setShowQ(false);
    lineIdxRef.current=-1;
  };

  const era=getEra(year);
  const totalLines=script?.lines?.length||4;
  const pct=phase==="question"?100:lineIdx>=0?Math.round((lineIdx/totalLines)*100):0;
  const isSerious=script?.lines?.[lineIdx]?.serious;

  return(
    <div style={{minHeight:"100vh",
      background:"linear-gradient(160deg,#0f0c29 0%,#1e1b4b 50%,#0f172a 100%)",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes cur{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes up{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes botIn{from{transform:translateX(-36px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes qPop{0%{transform:scale(0.88);opacity:0}80%{transform:scale(1.02)}100%{transform:scale(1);opacity:1}}
        @keyframes sceneFlash{0%{opacity:1}40%{opacity:0.3}100%{opacity:1}}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input::placeholder{color:rgba(165,180,252,0.3)}
      `}</style>

      {/* top bar */}
      <div style={{width:"100%",maxWidth:500,margin:"0 auto",
        display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 16px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:11,background:"rgba(99,102,241,0.2)",
            border:"1px solid rgba(99,102,241,0.35)",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:20}}>🕰️</div>
          <div>
            <div style={{color:"white",fontWeight:800,fontSize:15,letterSpacing:"-0.3px"}}>Time Machine</div>
            <div style={{color:"rgba(165,180,252,0.5)",fontSize:11}}>powered by FinBot</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setMuted(m=>!m)} style={{width:36,height:36,borderRadius:10,
            border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.06)",
            color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
            {muted?"🔇":"🔊"}</button>
          {(phase==="story"||phase==="question")&&(
            <button onClick={reset} style={{width:36,height:36,borderRadius:10,
              border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.06)",
              color:"rgba(255,255,255,0.7)",cursor:"pointer",display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:17}}>✕</button>
          )}
        </div>
      </div>

      <div style={{width:"100%",maxWidth:500,margin:"0 auto",padding:"0 16px 32px"}}>

        {/* INPUT */}
        {phase==="input"&&(
          <div style={{animation:"fadeIn 0.5s ease"}}>
            <div style={{textAlign:"center",padding:"24px 0 20px"}}>
              <div style={{fontSize:54,marginBottom:10,display:"inline-block",animation:"pulse 2.5s ease infinite"}}>🕰️</div>
              <h1 style={{color:"white",fontSize:24,fontWeight:900,margin:"0 0 8px",letterSpacing:"-0.5px"}}>Travel Through Time</h1>
              <p style={{color:"rgba(165,180,252,0.5)",fontSize:13.5,margin:0,lineHeight:1.6}}>
                Discover what your money was worth<br/>across 6,000 years of history ✨
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{color:"rgba(165,180,252,0.6)",fontSize:11,fontWeight:700,
                  textTransform:"uppercase",letterSpacing:"1.2px",display:"block",marginBottom:7}}>Your Amount</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
                    color:"rgba(165,180,252,0.45)",fontWeight:700,fontSize:17,pointerEvents:"none"}}>{sym}</span>
                  <input value={amtInput} onChange={e=>setAmtInput(e.target.value)} type="number" placeholder="100"
                    style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(99,102,241,0.3)",
                      borderRadius:13,paddingLeft:32,paddingRight:16,paddingTop:14,paddingBottom:14,
                      color:"white",fontSize:20,fontWeight:800,outline:"none"}}/>
                </div>
              </div>
              <div>
                <label style={{color:"rgba(165,180,252,0.6)",fontSize:11,fontWeight:700,
                  textTransform:"uppercase",letterSpacing:"1.2px",display:"block",marginBottom:7}}>Destination Year</label>
                <input value={yearInput} onChange={e=>{setYearInput(e.target.value);setErr("");}}
                  placeholder="e.g.  -44  ·  1929  ·  2075  ·  44 BC"
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(99,102,241,0.3)",
                    borderRadius:13,padding:"14px 16px",color:"white",fontSize:16,fontWeight:600,outline:"none"}}
                  onKeyDown={e=>e.key==="Enter"&&travel()}/>
                {err&&<p style={{color:"#f87171",fontSize:12.5,marginTop:6}}>⚠ {err}</p>}
              </div>
              <button onClick={travel} style={{background:"linear-gradient(135deg,#6366f1,#4338ca)",border:"none",
                borderRadius:13,padding:"15px",color:"white",fontSize:15,fontWeight:800,cursor:"pointer",
                boxShadow:"0 8px 28px rgba(99,102,241,0.45)",marginTop:2}}>
                🚀 Launch Time Machine
              </button>
            </div>
            <div style={{marginTop:22}}>
              <p style={{color:"rgba(165,180,252,0.28)",fontSize:11,textTransform:"uppercase",
                letterSpacing:"1.2px",textAlign:"center",marginBottom:10}}>Popular Destinations</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                {POPULAR.map(p=>(
                  <button key={p.year} onClick={()=>setYearInput(String(p.year))} style={{
                    background:"rgba(99,102,241,0.09)",border:"1px solid rgba(99,102,241,0.22)",
                    borderRadius:20,padding:"6px 12px",color:"rgba(165,180,252,0.6)",
                    fontSize:12,cursor:"pointer",fontWeight:500}}>
                    {fmtYear(p.year)} · {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOADING */}
        {phase==="loading"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",minHeight:"65vh",gap:20,animation:"fadeIn 0.4s ease"}}>
            <div style={{position:"relative"}}>
              <div style={{width:64,height:64,borderRadius:"50%",
                border:"3px solid rgba(99,102,241,0.15)",borderTop:"3px solid #6366f1",
                animation:"spin 0.85s linear infinite"}}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🕰️</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:"white",fontWeight:800,fontSize:18,marginBottom:5}}>
                Travelling to {fmtYear(parseYear(yearInput)||0)}
              </div>
              <div style={{color:"rgba(165,180,252,0.45)",fontSize:13}}>FinBot is preparing your briefing…</div>
            </div>
          </div>
        )}

        {/* STORY + QUESTION */}
        {(phase==="story"||phase==="question")&&script&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {/* era badge */}
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 8px"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,
                background:"rgba(99,102,241,0.12)",border:`1px solid ${era.color}44`,borderRadius:30,padding:"6px 16px"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:era.color,boxShadow:`0 0 8px ${era.color}`}}/>
                <span style={{color:"white",fontWeight:700,fontSize:13}}>{script.eraName}</span>
                <span style={{color:"rgba(255,255,255,0.28)",fontSize:11}}>·</span>
                <span style={{color:"rgba(255,255,255,0.42)",fontSize:12}}>{fmtYear(year)}</span>
              </div>
            </div>

            {/* progress */}
            <div style={{height:3,background:"rgba(255,255,255,0.08)",borderRadius:3,marginBottom:12,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,
                background:`linear-gradient(90deg,${era.color},#a78bfa)`,
                width:`${pct}%`,transition:"width 0.9s ease"}}/>
            </div>

            {/* SVG Scene Panel */}
            <div style={{position:"relative",borderRadius:18,overflow:"hidden",
              height:240,marginBottom:12,border:"1px solid rgba(255,255,255,0.1)",
              boxShadow:"0 20px 50px rgba(0,0,0,0.6)",
              animation:swapping?"sceneFlash 0.45s ease":"none"}}>
              {scenes[sceneIdx]}
              {/* gradient overlay */}
              <div style={{position:"absolute",inset:0,
                background:"linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 55%)",
                pointerEvents:"none"}}/>
              {/* scene dots */}
              <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
                {[0,1,2].map(i=>(
                  <div key={i} onClick={()=>setSceneIdx(i)} style={{height:5,borderRadius:3,cursor:"pointer",
                    width:i===sceneIdx?20:5,
                    background:i===sceneIdx?"white":"rgba(255,255,255,0.3)",transition:"all 0.3s"}}/>
                ))}
              </div>
              <div style={{position:"absolute",top:12,right:14,color:"white",fontWeight:900,fontSize:16,
                textShadow:"0 2px 12px rgba(0,0,0,0.9)"}}>{fmtYear(year)}</div>
              <div style={{position:"absolute",top:12,left:14,background:"rgba(0,0,0,0.55)",
                borderRadius:8,padding:"3px 10px",color:"white",fontSize:12,fontWeight:700,
                border:"1px solid rgba(255,255,255,0.14)"}}>
                {sym}{parseFloat(amtInput||100).toFixed(0)}
              </div>
            </div>

            {/* bot + bubble */}
            <div style={{display:"flex",alignItems:"flex-end",gap:10,marginBottom:8}}>
              <div style={{flexShrink:0,
                animation:phase==="story"&&lineIdx===0?"botIn 0.6s cubic-bezier(0.16,1,0.3,1) both":undefined}}>
                <FinBot mood={mood} talking={talking} pointing={phase==="story"} swapping={swapping}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                {phase==="story"&&lineIdx>=0&&script.lines[lineIdx]&&(
                  <div key={lineIdx} style={{
                    background:isSerious?"white":"linear-gradient(135deg,#fef9c3,#fef3c7)",
                    borderRadius:"16px 16px 16px 4px",padding:"12px 14px",
                    boxShadow:"0 6px 24px rgba(0,0,0,0.3)",animation:"up 0.32s ease both"}}>
                    <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",
                      letterSpacing:"1px",color:isSerious?era.color:"#b45309",marginBottom:4,
                      display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:5,height:5,borderRadius:"50%",
                        background:isSerious?era.color:"#f59e0b",display:"inline-block"}}/>
                      FinBot {!isSerious&&"✨"}
                    </div>
                    <p style={{margin:0,fontSize:13.5,color:isSerious?"#1e1b4b":"#78350f",
                      lineHeight:1.6,fontWeight:500}}>
                      <Typewriter text={script.lines[lineIdx].text} speed={15}/>
                    </p>
                  </div>
                )}
                {phase==="question"&&showQ&&(
                  <div style={{background:"linear-gradient(135deg,rgba(124,58,237,0.2),rgba(99,102,241,0.2))",
                    border:"2px solid #818cf8",borderRadius:"16px 16px 16px 4px",padding:"13px 14px",
                    animation:"qPop 0.5s cubic-bezier(0.16,1,0.3,1) both"}}>
                    <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",
                      letterSpacing:"1px",color:"#a78bfa",marginBottom:5}}>
                      🤔 FinBot's Challenge for You
                    </div>
                    <p style={{margin:0,fontSize:13.5,color:"#e0e7ff",lineHeight:1.65,fontWeight:600}}>
                      {script.question}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* pills */}
            <div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:12}}>
              {script.lines.map((_,i)=>(
                <div key={i} style={{height:5,borderRadius:3,transition:"all 0.4s",
                  width:i===lineIdx?22:6,
                  background:i<lineIdx?era.color:i===lineIdx?"#a78bfa":"rgba(255,255,255,0.12)"}}/>
              ))}
              <div style={{height:5,width:phase==="question"?22:6,borderRadius:3,transition:"all 0.4s",
                background:phase==="question"?"#fbbf24":"rgba(255,255,255,0.12)"}}/>
            </div>

            {phase==="question"&&showQ&&(
              <div style={{display:"flex",gap:10,animation:"up 0.4s 0.3s ease both",opacity:0}}>
                <button onClick={reset} style={{flex:1,background:"rgba(255,255,255,0.07)",
                  border:"1px solid rgba(255,255,255,0.12)",borderRadius:13,padding:"13px",
                  color:"rgba(255,255,255,0.85)",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  🕰️ New Year
                </button>
                <button onClick={reset} style={{flex:1,background:"linear-gradient(135deg,#6366f1,#4338ca)",
                  border:"none",borderRadius:13,padding:"13px",color:"white",fontSize:14,fontWeight:800,
                  cursor:"pointer",boxShadow:"0 4px 18px rgba(99,102,241,0.4)"}}>
                  Done ✓
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}