import { useState } from 'react'
import API from '../utils/api'

const STYLE = `
@keyframes draw-line{from{stroke-dashoffset:600}to{stroke-dashoffset:0}}
@keyframes fade-fill{from{opacity:0}to{opacity:1}}
@keyframes slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
`

const Mark = ({ size = 16, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(() => {
    const msg = localStorage.getItem('fina_session_msg')
    if (msg) { localStorage.removeItem('fina_session_msg'); return msg }
    return ''
  })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await API.post('/auth/login', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <style>{STYLE}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 relative overflow-hidden select-none"
        style={{ background: 'linear-gradient(150deg, #0f0c29 0%, #1a0a3e 30%, #1e1065 60%, #0f172a 100%)' }}>

        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{ backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)', filter: 'blur(50px)' }} />

        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-900/60">
              <Mark size={18} />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Fina</span>
          </a>

          <div className="flex-1 flex flex-col justify-center" style={{ animation: 'slide-up 0.6s ease both' }}>
            <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Financial Intelligence</p>
            <h2 className="text-3xl font-extrabold text-white leading-[1.2] mb-2">
              Track every dollar.<br />Grow every month.
            </h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
              Your personal finance co-pilot with AI-powered insights and real-time analytics.
            </p>

            {/* Chart card */}
            <div className="rounded-2xl p-4 mb-4 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide">Net Worth · 2026</p>
                  <p className="text-white font-bold text-lg">$24,850</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                  style={{ background: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.25)' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  <span className="text-emerald-400 text-[10px] font-bold">+24.5%</span>
                </div>
              </div>
              {/* Area chart */}
              <svg viewBox="0 0 280 85" className="w-full overflow-visible">
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[20,40,60].map(y => <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="white" strokeOpacity="0.06" strokeWidth="1"/>)}
                {/* Area fill */}
                <path d="M0,78 L25,68 L51,78 L76,52 L102,62 L127,42 L153,50 L178,26 L204,34 L229,15 L255,20 L280,2 L280,85 L0,85Z"
                  fill="url(#lg1)" style={{ animation: 'fade-fill 1s ease 0.3s both' }}/>
                {/* Line */}
                <path d="M0,78 L25,68 L51,78 L76,52 L102,62 L127,42 L153,50 L178,26 L204,34 L229,15 L255,20 L280,2"
                  fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="600" style={{ animation: 'draw-line 1.4s ease 0.1s both' }}/>
                {/* End dot */}
                <circle cx="280" cy="2" r="4" fill="#7c3aed"/>
                <circle cx="280" cy="2" r="9" fill="#7c3aed" opacity="0.2"/>
                {/* Month labels */}
                {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => (
                  <text key={i} x={i * 25.4} y="82" textAnchor="middle" fill="white" fillOpacity="0.25" fontSize="7">{m}</text>
                ))}
              </svg>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-8">
              {[
                { label: 'Saved', value: '$24,850', accent: 'text-violet-300' },
                { label: 'This month', value: '+$1,240', accent: 'text-emerald-400' },
                { label: 'Goals hit', value: '7 / 9', accent: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className={`font-bold text-sm ${s.accent}`}>{s.value}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div className="space-y-3">
              {[
                { icon: '📊', text: 'Interactive spending charts' },
                { icon: '🤖', text: 'AI finance advisor' },
                { icon: '🔔', text: 'Smart budget alerts' },
                { icon: '📱', text: 'Works offline on any device' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>{f.icon}</div>
                  <span className="text-white/45 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-white/8">
            <p className="text-white/20 text-xs">© 2026 Fina</p>
            <div className="flex items-center gap-1.5 text-white/20 text-xs">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              256-bit SSL
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px]" style={{ animation: 'slide-up 0.5s ease both' }}>

          {/* Mobile logo */}
          <a href="/" className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <Mark size={14} />
            </div>
            <span className="font-bold text-gray-900 text-lg">Fina</span>
          </a>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[1.75rem] font-extrabold text-gray-900 tracking-tight mb-1.5">Welcome back</h1>
            <p className="text-gray-400 text-sm">Sign in to continue to your dashboard</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 transition"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <a href="/forgot-password" className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} name="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange} required autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 transition"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPwd ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3"/><path d="M21 12a9 9 0 00-9-9"/></svg>Signing in…</span>
                : 'Sign In →'}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              Don't have an account?{' '}
              <a href="/register" className="text-violet-600 font-bold hover:text-violet-700 transition">Create one free</a>
            </p>
          </div>

          <p className="text-center text-gray-300 text-xs mt-6">
            By signing in you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-500 transition">Terms</a>{' '}&amp;{' '}
            <a href="/privacy" className="underline hover:text-gray-500 transition">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
