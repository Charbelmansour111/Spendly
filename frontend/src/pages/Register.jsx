import { useState } from 'react'
import API from '../utils/api'

const STYLE = `
@keyframes ring-fill{from{stroke-dashoffset:var(--target)}to{stroke-dashoffset:0}}
@keyframes slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
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

const GoalRing = ({ pct, color, stroke, label, value, delay = '0s' }) => {
  const r = 20, C = 2 * Math.PI * r
  const dash = (pct / 100) * C
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
          <circle cx="25" cy="25" r={r} fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="6"/>
          <circle cx="25" cy="25" r={r} fill="none" stroke={stroke} strokeWidth="6"
            strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round"
            style={{ animation: `ring-fill 1.2s ease ${delay} both`, '--target': `-${dash}` }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-black text-xs leading-none">{pct}%</span>
        </div>
      </div>
      <p className="text-white/35 text-[9px] text-center leading-tight font-medium">{label}</p>
      <p className={`text-[11px] font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const pwdStrength = (p) => {
    if (!p) return null
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return [null,
      { label: 'Weak', color: 'bg-red-500', text: 'text-red-500', score: 1 },
      { label: 'Fair', color: 'bg-amber-400', text: 'text-amber-500', score: 2 },
      { label: 'Good', color: 'bg-blue-500', text: 'text-blue-500', score: 3 },
      { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600', score: 4 },
    ][s]
  }
  const strength = pwdStrength(form.password)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await API.post('/auth/register', form)
      // Registration now sends a verification email — redirect to check-email page
      if (res.data.needsVerification) {
        sessionStorage.setItem('pendingVerificationEmail', res.data.email || form.email)
        window.location.href = '/check-email'
      } else {
        // Fallback: should not happen, but handle gracefully
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        window.location.href = '/account-type'
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      <style>{STYLE}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-120 shrink-0 relative overflow-hidden select-none"
        style={{ background: 'linear-gradient(150deg, #0a1628 0%, #0f0c29 25%, #1a0a3e 55%, #1e1065 100%)' }}>

        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)', backgroundSize: '28px 28px' }}/>
        <div className="absolute bottom-1/3 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }}/>

        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          <a href="/" className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/60">
              <Mark size={18} />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Fina</span>
          </a>

          <div className="flex-1 flex flex-col justify-center" style={{ animation: 'slide-up 0.6s ease both' }}>
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">Start your journey</p>
            <h2 className="text-3xl font-extrabold text-white leading-[1.2] mb-2">
              Your finances,<br/>transformed.
            </h2>
            <p className="text-white/40 text-sm mb-10 leading-relaxed">
              Join thousands who've taken control of their money with Fina — 100% free, forever.
            </p>

            {/* Goal rings */}
            <div className="rounded-2xl p-5 mb-6 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">Your goals, tracked</p>
              <div className="grid grid-cols-3 gap-4">
                <GoalRing pct={78} stroke="#7c3aed" color="text-violet-300" label="Emergency Fund" value="$7,800" delay="0s"/>
                <GoalRing pct={54} stroke="#34d399" color="text-emerald-400" label="Vacation" value="$2,700" delay="0.15s"/>
                <GoalRing pct={91} stroke="#f59e0b" color="text-amber-400" label="New Laptop" value="$1,365" delay="0.3s"/>
              </div>
            </div>

            {/* Feature checklist */}
            <div className="space-y-3.5 mb-8">
              {[
                { icon: '🧾', text: 'Log expenses in seconds — or scan a receipt' },
                { icon: '📊', text: 'Beautiful charts, zero complexity' },
                { icon: '🤖', text: 'AI advisor that knows your real spending' },
                { icon: '🔒', text: 'Bank-grade encryption, always private' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>{f.icon}</div>
                  <span className="text-white/45 text-sm leading-snug">{f.text}</span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/8"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex -space-x-2 shrink-0">
                {['#7c3aed','#059669','#d97706','#dc2626'].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white/10 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: c, zIndex: 4 - i }}>
                    {['J','M','S','A'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Loved by 10,000+ users</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-[10px]">★</span>)}
                  <span className="text-white/30 text-[10px] ml-1">4.9 / 5</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-white/8">
            <p className="text-white/20 text-xs">© 2026 Fina</p>
            <div className="flex items-center gap-1.5 text-white/20 text-xs">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Free forever
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-100" style={{ animation: 'slide-up 0.5s ease both' }}>

          <a href="/" className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <Mark size={14} />
            </div>
            <span className="font-bold text-gray-900 text-lg">Fina</span>
          </a>

          <div className="mb-8">
            <h1 className="text-[1.75rem] font-extrabold text-gray-900 tracking-tight mb-1.5">Create your account</h1>
            <p className="text-gray-400 text-sm">Free forever — no credit card required</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <input
                type="text" name="name" placeholder="John Doe"
                value={form.name} onChange={handleChange} required autoComplete="name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} name="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange} required minLength={6} autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 transition"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPwd ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
              {/* Strength meter */}
              {form.password && strength && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-gray-100'}`}/>
                    ))}
                  </div>
                  <span className={`text-[11px] font-bold ${strength.text}`}>{strength.label}</span>
                </div>
              )}
              {!form.password && <p className="text-gray-400 text-xs mt-1.5">Minimum 6 characters</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition active:scale-[0.98] disabled:opacity-60 mt-1"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3"/><path d="M21 12a9 9 0 00-9-9"/></svg>Creating account…</span>
                : 'Create Account →'}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-violet-600 font-bold hover:text-violet-700 transition">Sign in</a>
            </p>
          </div>

          <p className="text-center text-gray-300 text-xs mt-6">
            By signing up you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-500 transition">Terms</a>{' '}&amp;{' '}
            <a href="/privacy" className="underline hover:text-gray-500 transition">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
