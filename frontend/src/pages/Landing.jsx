import { useEffect, useState } from 'react'

const STYLE = `
@keyframes float-y{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes float-x{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
@keyframes slide-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes draw-line{from{stroke-dashoffset:600}to{stroke-dashoffset:0}}
`

const Mark = ({ size = 16, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

const ChevronDown = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const IOS_STEPS = [
  { icon: '🧭', text: 'Open this page in Safari (not Chrome or Firefox)' },
  { icon: '📤', text: 'Tap the Share icon at the bottom of the screen' },
  { icon: '📲', text: 'Scroll down and tap "Add to Home Screen"' },
  { icon: '✅', text: 'Tap "Add" in the top-right corner to confirm' },
  { icon: '🎉', text: 'Fina now appears on your home screen!' },
]
const ANDROID_STEPS = [
  { icon: '🌐', text: 'Open this page in Chrome' },
  { icon: '⋮', text: 'Tap the three-dot menu in the top-right corner' },
  { icon: '📲', text: 'Tap "Add to Home screen" or "Install app"' },
  { icon: '✅', text: 'Tap "Install" or "Add" to confirm' },
  { icon: '🎉', text: 'Fina is installed on your home screen!' },
]

function InstallModal({ platform, onClose }) {
  const steps = platform === 'ios' ? IOS_STEPS : ANDROID_STEPS
  const title = platform === 'ios' ? 'Install on iPhone / iPad' : 'Install on Android'
  const color = platform === 'ios' ? 'from-gray-700 to-gray-900' : 'from-green-600 to-teal-700'
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`bg-linear-to-br ${color} px-6 pt-8 pb-6 text-white`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-2xl">{platform === 'ios' ? '🍎' : '🤖'}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <h2 className="text-xl font-bold mb-1">{title}</h2>
          <p className="text-white/70 text-sm">Follow these steps to install Fina as an app.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-violet-700">{i + 1}</span>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <span>{s.icon}</span>
                <p className="text-sm text-gray-700 leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition mt-2">Got it!</button>
        </div>
      </div>
    </div>
  )
}

/* ── Phone mockup showing real dashboard ─────────── */
function PhoneMockup() {
  return (
    <div className="relative" style={{ perspective: '1400px' }}>
      {/* Glow */}
      <div className="absolute -inset-12 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.14) 0%, transparent 70%)', filter: 'blur(40px)' }}/>

      {/* Phone */}
      <div style={{ transform: 'rotateY(-12deg) rotateX(4deg)', transformStyle: 'preserve-3d', animation: 'float-y 6s ease-in-out infinite' }}>

        {/* Titanium-style frame */}
        <div className="relative" style={{
          width: 252, height: 546,
          borderRadius: 54,
          background: 'linear-gradient(145deg, #48484a 0%, #1c1c1e 40%, #2c2c2e 70%, #3a3a3c 100%)',
          boxShadow: '0 70px 130px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.14), 6px 0 20px rgba(0,0,0,0.35)',
          padding: 4,
        }}>

          {/* Side buttons — mute */}
          <div className="absolute rounded-l-sm" style={{ left:-4, top:96, width:3, height:26, background:'linear-gradient(180deg,#4a4a4c,#2e2e30)' }}/>
          {/* Volume up */}
          <div className="absolute rounded-l-sm" style={{ left:-4, top:138, width:3, height:46, background:'linear-gradient(180deg,#4a4a4c,#2e2e30)' }}/>
          {/* Volume down */}
          <div className="absolute rounded-l-sm" style={{ left:-4, top:196, width:3, height:46, background:'linear-gradient(180deg,#4a4a4c,#2e2e30)' }}/>
          {/* Power */}
          <div className="absolute rounded-r-sm" style={{ right:-4, top:152, width:3, height:62, background:'linear-gradient(180deg,#4a4a4c,#2e2e30)' }}/>

          {/* Screen */}
          <div className="absolute overflow-hidden flex flex-col" style={{
            inset: 4, borderRadius: 50, background: '#f4f5f7',
          }}>

            {/* Dynamic Island */}
            <div style={{
              position:'absolute', top:11, left:'50%', transform:'translateX(-50%)',
              width:74, height:20, background:'#000', borderRadius:12, zIndex:20,
              display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:7,
            }}>
              {/* Camera + FaceID sensor */}
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#111', border:'1.5px solid #2a2a2a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:3, height:3, borderRadius:'50%', background:'rgba(100,180,255,0.2)' }}/>
              </div>
            </div>

            {/* Status bar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:20, paddingRight:18, paddingTop:10, paddingBottom:4, flexShrink:0, marginTop:32 }}>
              <span style={{ fontSize:7.5, fontWeight:700, color:'#1c1c1e' }}>9:41</span>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <svg width="11" height="8" viewBox="0 0 24 16" fill="#1c1c1e">
                  <rect x="0" y="8" width="5" height="8" rx="1.5"/><rect x="7" y="5" width="5" height="11" rx="1.5"/>
                  <rect x="14" y="2" width="5" height="14" rx="1.5"/><rect x="21" y="0" width="3" height="16" rx="1"/>
                </svg>
                <svg width="14" height="8" viewBox="0 0 28 14" fill="none">
                  <rect x="0.5" y="0.5" width="23" height="13" rx="4" stroke="#1c1c1e" strokeWidth="1.2"/>
                  <rect x="24" y="4" width="3" height="6" rx="1.5" fill="#1c1c1e"/>
                  <rect x="2" y="2" width="17" height="10" rx="2.5" fill="#1c1c1e"/>
                </svg>
              </div>
            </div>

            {/* App header gradient */}
            <div className="shrink-0 px-4 pb-3" style={{ background:'linear-gradient(135deg,#5b21b6,#4f46e5)', paddingTop:6 }}>
              <p style={{ color:'rgba(221,214,254,0.8)', fontSize:8, marginBottom:2, fontWeight:500 }}>Good morning 👋</p>
              <p style={{ color:'#fff', fontWeight:900, fontSize:22, lineHeight:1, marginBottom:4 }}>
                $12,840<span style={{ fontSize:13, fontWeight:600, color:'#c4b5fd' }}>.50</span>
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:10 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                <span style={{ color:'#86efac', fontSize:7, fontWeight:700 }}>+8.2% vs last month</span>
              </div>
              <div style={{ display:'flex', gap:5 }}>
                {[['Income','+$5,200','#86efac'],['Spent','-$2,360','#fca5a5'],['Saved','45%','#fff']].map(([l,v,c]) => (
                  <div key={l} style={{ flex:1, borderRadius:12, padding:'5px 7px', background:'rgba(255,255,255,0.13)' }}>
                    <p style={{ fontSize:6, color:'rgba(196,181,253,0.9)', marginBottom:2 }}>{l}</p>
                    <p style={{ fontSize:8.5, fontWeight:700, color:c }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex:1, overflow:'hidden', padding:'10px 10px 58px', display:'flex', flexDirection:'column', gap:8 }}>

              {/* Monthly bar chart */}
              <div style={{ background:'#fff', borderRadius:16, padding:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <p style={{ fontSize:7.5, fontWeight:700, color:'#111827' }}>Monthly Spending</p>
                  <p style={{ fontSize:6.5, color:'#7c3aed', fontWeight:600 }}>May 2026</p>
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:38 }}>
                  {[38,55,42,68,50,85,72].map((h, i) => (
                    <div key={i} style={{ flex:1, borderRadius:'3px 3px 0 0', height:`${h}%`,
                      background: i === 5 ? '#7c3aed' : i >= 4 ? '#a78bfa' : '#ddd6fe' }}/>
                  ))}
                </div>
                <div style={{ display:'flex', marginTop:4 }}>
                  {['N','D','J','F','M','A','M'].map((m,i) => (
                    <span key={i} style={{ flex:1, textAlign:'center', fontSize:5.5, color:'#9ca3af' }}>{m}</span>
                  ))}
                </div>
              </div>

              {/* Spending Distribution — recharts-style donut with PIE_COLORS */}
              <div style={{ background:'#fff', borderRadius:16, padding:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize:7.5, fontWeight:700, color:'#111827', marginBottom:8 }}>Spending Distribution</p>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {/* SVG donut matching recharts style (r=19, C≈119.4) */}
                  <svg viewBox="0 0 60 60" width="60" height="60" style={{ flexShrink:0 }}>
                    <g transform="rotate(-90 30 30)">
                      <circle cx="30" cy="30" r="19" fill="none" stroke="#f3f4f6" strokeWidth="9.5"/>
                      {/* Food 40% → fill=46.2, gap=73.2 */}
                      <circle cx="30" cy="30" r="19" fill="none" stroke="#7C3AED" strokeWidth="9"
                        strokeDasharray="46.2 73.2" strokeDashoffset="0" strokeLinecap="butt"/>
                      {/* Transport 25% → offset=-47.2 */}
                      <circle cx="30" cy="30" r="19" fill="none" stroke="#2563EB" strokeWidth="9"
                        strokeDasharray="28.8 90.6" strokeDashoffset="-47.2" strokeLinecap="butt"/>
                      {/* Shopping 20% → offset=-77.0 */}
                      <circle cx="30" cy="30" r="19" fill="none" stroke="#059669" strokeWidth="9"
                        strokeDasharray="23.1 96.3" strokeDashoffset="-77.0" strokeLinecap="butt"/>
                      {/* Other 15% → offset=-101.1 */}
                      <circle cx="30" cy="30" r="19" fill="none" stroke="#D97706" strokeWidth="9"
                        strokeDasharray="17.3 102.1" strokeDashoffset="-101.1" strokeLinecap="butt"/>
                    </g>
                    <text x="30" y="28" textAnchor="middle" fontSize="7" fontWeight="800" fill="#111827">$2.3k</text>
                    <text x="30" y="36" textAnchor="middle" fontSize="4.5" fill="#9ca3af">spent</text>
                  </svg>
                  {/* Legend matching reports page */}
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                    {[['Food','40%','#7C3AED'],['Transport','25%','#2563EB'],['Shopping','20%','#059669'],['Other','15%','#D97706']].map(([cat,pct,col]) => (
                      <div key={cat} style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:col, flexShrink:0 }}/>
                        <span style={{ fontSize:7, color:'#6b7280', flex:1 }}>{cat}</span>
                        <span style={{ fontSize:7, fontWeight:700, color:'#374151' }}>{pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent transactions */}
              <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px 4px' }}>
                  <p style={{ fontSize:7.5, fontWeight:700, color:'#111827' }}>Recent</p>
                  <p style={{ fontSize:6.5, color:'#7c3aed', fontWeight:600 }}>See all →</p>
                </div>
                {[
                  { icon:'🍔', name:"McDonald's", cat:'Food', amt:'-$12.50', neg:true },
                  { icon:'🚗', name:'Uber', cat:'Transport', amt:'-$22.00', neg:true },
                  { icon:'💼', name:'Salary', cat:'Income', amt:'+$3,200', neg:false },
                ].map((tx,i,a) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderTop: i>0 ? '1px solid #f9fafb' : 'none' }}>
                    <div style={{ width:24, height:24, borderRadius:8, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>{tx.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:7.5, fontWeight:600, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{tx.name}</p>
                      <p style={{ fontSize:6, color:'#9ca3af' }}>{tx.cat}</p>
                    </div>
                    <p style={{ fontSize:7.5, fontWeight:700, color: tx.neg ? '#f43f5e' : '#059669', whiteSpace:'nowrap' }}>{tx.amt}</p>
                  </div>
                ))}
              </div>

            </div>

            {/* Bottom tab bar — matches the actual app (Txns/Budgets/Home/Wellness/Profile) */}
            <div style={{
              position:'absolute', bottom:0, left:0, right:0,
              background:'rgba(255,255,255,0.98)',
              borderTop:'1px solid #f3f4f6',
              display:'flex',
              paddingBottom:9,
            }}>
              {[
                {
                  label:'Txns', active:false,
                  icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                },
                {
                  label:'Budgets', active:false,
                  icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                },
                {
                  label:'Home', active:true,
                  icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="#7c3aed" stroke="none"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
                },
                {
                  label:'Wellness', active:false,
                  icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                },
                {
                  label:'Profile', active:false,
                  icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                },
              ].map(({label, active, icon}) => (
                <div key={label} style={{
                  flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  paddingTop:7, paddingBottom:4,
                }}>
                  <div style={{ width:26, height:26, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                    background: active ? 'rgba(124,58,237,0.1)' : 'transparent' }}>
                    {icon}
                  </div>
                  <span style={{ fontSize:5.5, fontWeight:600, marginTop:2, color: active ? '#7c3aed' : '#9ca3af' }}>{label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Floating badge — savings */}
      <div className="absolute -right-8 top-12 flex items-center gap-2 px-3 py-2 rounded-2xl shadow-xl border border-gray-100 bg-white"
        style={{ animation: 'float-x 5s ease-in-out infinite' }}>
        <div className="w-7 h-7 bg-emerald-100 rounded-xl flex items-center justify-center text-sm">💰</div>
        <div>
          <p className="text-[9px] text-gray-400 leading-none">Saved this month</p>
          <p className="text-[11px] font-black text-emerald-600 leading-none mt-0.5">+$1,240</p>
        </div>
      </div>

      {/* Floating badge — budget */}
      <div className="absolute -left-12 top-1/2 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl shadow-xl border border-gray-100 bg-white"
        style={{ animation: 'float-y 7s ease-in-out 1s infinite' }}>
        <div className="w-7 h-7 bg-amber-100 rounded-xl flex items-center justify-center text-sm shrink-0">🎯</div>
        <div>
          <p className="text-[9px] text-gray-400">Dining budget</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '72%' }}/>
            </div>
            <span className="text-[9px] font-bold text-amber-600">72%</span>
          </div>
        </div>
      </div>

      {/* Floating badge — wellness */}
      <div className="absolute -right-6 bottom-28 flex items-center gap-2 px-3 py-2 rounded-2xl shadow-xl border border-gray-100 bg-white"
        style={{ animation: 'float-y 5.5s ease-in-out 0.5s infinite' }}>
        <div className="w-7 h-7 bg-teal-100 rounded-xl flex items-center justify-center text-sm">💚</div>
        <div>
          <p className="text-[9px] text-gray-400">Wellness score</p>
          <p className="text-[11px] font-black text-teal-600">78 / 100</p>
        </div>
      </div>
    </div>
  )
}

function Landing() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [openFeature, setOpenFeature] = useState(null)
  const [installModal, setInstallModal] = useState(null)
  const [showIOSBanner, setShowIOSBanner] = useState(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream
    return isIOS && window.navigator.standalone !== true && !localStorage.getItem('ios-banner-dismissed')
  })

  useEffect(() => {
    if (localStorage.getItem('token')) window.location.href = '/dashboard'
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
    setDeferredPrompt(null)
  }

  const features = [
    { icon:'📊', color:'text-violet-600', bg:'bg-violet-50', border:'border-violet-100',
      title:'Spending Charts', desc:'Interactive charts reveal exactly where every dollar goes, by category and time period.',
      detail:'Monthly breakdowns, 6-month trends, and category comparisons — all in one visual dashboard.', bullets:['Monthly & weekly views','Category breakdowns','6-month trend history'] },
    { icon:'🤖', color:'text-indigo-600', bg:'bg-indigo-50', border:'border-indigo-100',
      title:'AI Advisor', desc:'Chat with your personal AI finance advisor trained on your real transaction data.',
      detail:'Ask anything — "Where am I overspending?" or "How can I save more?" — and get specific, data-driven answers.', bullets:['Uses your real data','Natural language chat','Actionable recommendations'] },
    { icon:'📸', color:'text-sky-600', bg:'bg-sky-50', border:'border-sky-100',
      title:'Receipt Scanner', desc:'Photograph any receipt and auto-extract the amount. No manual entry.',
      detail:'Works with paper receipts, digital screenshots, and invoices. Any currency, any format.', bullets:['Instant amount extraction','Any receipt format','Multiple currencies'] },
    { icon:'🎯', color:'text-amber-600', bg:'bg-amber-50', border:'border-amber-100',
      title:'Smart Budgets', desc:'Set monthly limits per category and get real-time alerts before you overspend.',
      detail:'Define budgets by category, get notified at 80% and 100%, and see visual progress every day.', bullets:['Per-category limits','Real-time notifications','Visual progress bars'] },
    { icon:'📄', color:'text-rose-600', bg:'bg-rose-50', border:'border-rose-100',
      title:'PDF & CSV Export', desc:'One-click professional reports — perfect for tax season or your accountant.',
      detail:'Export a full transaction history as a clean PDF or CSV. Filter by date range or category.', bullets:['One-click export','PDF and CSV formats','Date range filters'] },
    { icon:'💚', color:'text-teal-600', bg:'bg-teal-50', border:'border-teal-100',
      title:'Wellness Score', desc:'A 0–100 financial health score with a personalized improvement plan.',
      detail:'Track your saving discipline, spending habits, and goal progress in a single motivating score.', bullets:['0–100 health score','Weekly tips','Goal tracking'] },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <style>{STYLE}</style>
      {installModal && <InstallModal platform={installModal} onClose={() => setInstallModal(null)}/>}

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-sm shadow-violet-200">
              <Mark size={15}/>
            </div>
            <span className="text-[17px] font-extrabold text-gray-900 tracking-tight">Fina</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <a href="#how" className="hover:text-gray-900 transition">How it works</a>
          </div>
          <div className="flex items-center gap-2">
            {showInstall && (
              <button onClick={handleInstall} className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Install
              </button>
            )}
            <a href="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition rounded-xl hover:bg-gray-50">Sign in</a>
            <a href="/register" className="px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 active:scale-95 transition shadow-sm shadow-violet-200">
              Get started →
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle hero bg */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.06) 0%, transparent 70%)' }}/>
        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }}/>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 flex flex-col lg:flex-row items-center gap-14">

          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left" style={{ animation: 'slide-up 0.6s ease both' }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"/>
              100% Free · No credit card
            </div>

            <h1 className="text-5xl sm:text-[3.75rem] font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-5">
              The smarter way<br/>to manage{' '}
              <span className="relative inline-block">
                <span className="relative z-10" style={{ color: '#7c3aed' }}>your money.</span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 rounded-full opacity-20 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9)' }}/>
              </span>
            </h1>

            <p className="text-lg text-gray-500 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Track expenses, set budgets, scan receipts, and chat with your AI finance advisor — all in one beautifully simple app.
            </p>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-10">
              <a href="/register"
                className="px-7 py-3.5 font-bold rounded-xl active:scale-95 transition text-white text-base"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 8px 30px rgba(124,58,237,0.35)' }}>
                Start for free →
              </a>
              <a href="/login"
                className="px-7 py-3.5 font-semibold rounded-xl active:scale-95 transition text-gray-700 text-base border border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm">
                Sign in
              </a>
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {['#7c3aed','#059669','#d97706','#dc2626','#0891b2'].map((c,i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ background: c, zIndex: 5-i }}>
                    {['J','M','S','A','R'][i]}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-xs text-gray-500 font-medium"><span className="text-gray-900 font-bold">10,000+</span> people trust Fina</p>
              </div>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="flex-1 hidden sm:flex justify-center lg:justify-end items-center">
            <PhoneMockup/>
          </div>
        </div>
      </section>

      {/* ── UP AND RUNNING IN 3 STEPS ─────────────────────────── */}
      <section id="how" className="bg-gray-950 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Simple by design</p>
            <h2 className="text-4xl font-extrabold text-white tracking-tight mb-3">Up and running in 3 steps</h2>
            <p className="text-gray-400 max-w-sm mx-auto">No bank connections. No setup. Just create an account and start tracking.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px"
              style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.6), rgba(109,40,217,0.6))' }}/>
            {[
              { step:'01', icon:'✍️', title:'Create your account', desc:'Sign up free in under 30 seconds — no credit card, no bank connection required.', color:'from-violet-600 to-violet-700' },
              { step:'02', icon:'📲', title:'Log your first expense', desc:'Type it, say it, or scan a receipt. Your financial picture starts building immediately.', color:'from-indigo-600 to-indigo-700' },
              { step:'03', icon:'🤖', title:'Get AI-powered insights', desc:'Ask your AI advisor anything about your money and watch your financial habits transform.', color:'from-purple-600 to-purple-700' },
            ].map((s,i) => (
              <div key={i} className="relative flex flex-col items-center text-center rounded-2xl p-7 border border-white/8 bg-white/4 hover:bg-white/8 transition group">
                <div className={`w-16 h-16 bg-linear-to-br ${s.color} rounded-2xl flex items-center justify-center text-2xl mb-5 shadow-lg shadow-violet-900/40 group-hover:scale-105 transition-transform`}>
                  {s.icon}
                </div>
                <span className="absolute top-5 left-5 text-xs font-black text-violet-500">{s.step}</span>
                <h3 className="font-bold text-white text-base mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 font-bold rounded-xl text-white text-base active:scale-95 transition"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}>
              Get started — it's free →
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50/70">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value:'100%', sub:'Free forever', color:'text-violet-600' },
            { value:'8+', sub:'Currencies', color:'text-indigo-600' },
            { value:'AI', sub:'Powered insights', color:'text-sky-600' },
            { value:'PWA', sub:'Works offline', color:'text-emerald-600' },
          ].map((s,i) => (
            <div key={i}>
              <p className={`text-3xl font-extrabold ${s.color} tracking-tight`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">Everything included</p>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Everything you need, nothing you don't</h2>
          <p className="text-gray-500 max-w-md mx-auto">Tap any feature to learn more.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f,i) => {
            const isOpen = openFeature === i
            return (
              <div key={i} onClick={() => setOpenFeature(isOpen ? null : i)}
                className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all duration-200 group ${
                  isOpen ? `border-violet-300 shadow-lg shadow-violet-50` : `border-gray-100 hover:border-violet-200 hover:shadow-md hover:shadow-violet-50/50`
                }`}>
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 ${f.bg} ${f.color} border ${f.border} rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform ${isOpen?'scale-110':'group-hover:scale-105'}`}>
                    {f.icon}
                  </div>
                  <span className={`text-gray-400 mt-1 transition-transform duration-200 ${isOpen?'rotate-180':''}`}><ChevronDown/></span>
                </div>
                <h3 className="font-bold text-gray-900 mt-4 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{f.detail}</p>
                    <ul className="space-y-1.5 mb-4">
                      {f.bullets.map((b,j) => (
                        <li key={j} className={`flex items-center gap-2 text-sm ${f.color}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span className="text-gray-600">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <a href="/register" className={`inline-flex items-center gap-1 text-sm font-bold ${f.color} hover:opacity-75 transition`}>
                      Try it free →
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── INSTALL SECTION ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl px-8 py-14 text-white"
          style={{ background: 'linear-gradient(135deg, #1e1065 0%, #312e81 50%, #1d4ed8 100%)' }}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.1),transparent 70%)', filter: 'blur(40px)' }}/>
          <div className="relative flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              <p className="text-violet-300 text-xs font-bold uppercase tracking-widest mb-3">Install the app</p>
              <h2 className="text-2xl font-extrabold mb-3">Take Fina everywhere you go</h2>
              <p className="text-white/55 text-base mb-6 max-w-md mx-auto lg:mx-0 leading-relaxed">
                Install it on your phone for instant access, offline support, and push notifications — no App Store account needed.
              </p>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start text-xs">
                {['Works offline','Push notifications','Home screen icon','Free forever'].map(f => (
                  <span key={f} className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/70 px-3 py-1.5 rounded-full font-medium">
                    <span className="text-violet-300">✓</span> {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto lg:min-w-60">
              {[
                { label:'App Store', sub:'iPhone · iPad', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>, bg:'bg-black/30', onClick:() => setInstallModal('ios') },
                { label:'Google Play', sub:'Android 8.0+', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M3 20.5v-17c0-.83 1.01-1.3 1.7-.77l14 8.5c.6.36.6 1.18 0 1.54l-14 8.5c-.69.53-1.7.06-1.7-.77z"/></svg>, bg:'bg-green-600/60', onClick:() => deferredPrompt ? handleInstall() : setInstallModal('android') },
              ].map(b => (
                <button key={b.label} onClick={b.onClick}
                  className="flex items-center gap-3 px-5 py-3.5 bg-white/8 hover:bg-white/15 border border-white/15 rounded-2xl transition active:scale-95 group">
                  <div className={`w-10 h-10 ${b.bg} rounded-xl flex items-center justify-center shrink-0`}>{b.icon}</div>
                  <div className="text-left">
                    <p className="text-white/40 text-[10px] leading-none mb-1">Download on</p>
                    <p className="text-white font-bold text-sm leading-none">{b.label}</p>
                    <p className="text-white/30 text-[10px] mt-1">{b.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-950 py-28 px-6">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 70%)' }}/>
        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-4">Start today</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight leading-[1.1]">
            Ready to master<br/>your finances?
          </h2>
          <p className="text-gray-400 mb-10 text-lg max-w-md mx-auto leading-relaxed">
            Free. No credit card. No bank connection. Just better money habits starting today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/register"
              className="px-8 py-4 font-black rounded-xl active:scale-95 transition text-white text-base"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 12px 40px rgba(124,58,237,0.5)' }}>
              Create your free account →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-gray-950 border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <Mark size={11}/>
            </div>
            <span className="font-bold text-white/50 text-sm">Fina</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/25">
            <a href="/login" className="hover:text-white/50 transition">Sign in</a>
            <a href="/register" className="hover:text-white/50 transition">Get started</a>
            <a href="/terms" className="hover:text-white/50 transition">Terms</a>
            <a href="/privacy" className="hover:text-white/50 transition">Privacy</a>
            <span>© 2026 Fina</span>
          </div>
        </div>
      </footer>

      {/* ── iOS banner ─────────────────────────────────────────── */}
      {showIOSBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
          <div className="pointer-events-auto max-w-sm mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,#7c3aed,#6d28d9)' }}/>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
                  <Mark size={18}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">Install Fina</p>
                  <p className="text-gray-400 text-xs mt-0.5">Add to your home screen for the full app experience.</p>
                </div>
                <button onClick={() => { setShowIOSBanner(false); localStorage.setItem('ios-banner-dismissed','1') }}
                  className="text-gray-400 hover:text-gray-600 transition p-1 -mt-1 -mr-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                {[['📤','Tap Share'],['📲','Add to Home'],['✅','Done!']].map(([icon,label],i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-xl">{icon}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Landing
