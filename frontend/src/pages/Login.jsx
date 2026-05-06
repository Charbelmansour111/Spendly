import { useState } from 'react'
import API from '../utils/api'
import { useDarkMode } from '../hooks/useDarkMode'
import { AuthCanvas } from '../components/AnimatedBackground'

const SpendlyIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

const AUTH_STYLE = `
@keyframes auth-orb-1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-50px) scale(1.08)}66%{transform:translate(-30px,30px) scale(0.93)}}
@keyframes auth-orb-2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-55px,30px) scale(1.1)}70%{transform:translate(35px,-22px) scale(0.91)}}
@keyframes auth-orb-3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(28px,52px) scale(1.06)}}
@keyframes slide-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
`

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(() => {
    const msg = localStorage.getItem('spendly_session_msg')
    if (msg) { localStorage.removeItem('spendly_session_msg'); return msg }
    return ''
  })
  const [loading, setLoading] = useState(false)
  const [dark, toggleDark] = useDarkMode()

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
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0d0518' }}>
      <style>{AUTH_STYLE}</style>

      {/* Full-screen aurora orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position:'absolute',left:'0%',top:'5%',width:700,height:600,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(124,58,237,0.45) 0%,transparent 68%)',filter:'blur(90px)',animation:'auth-orb-1 22s ease-in-out infinite',willChange:'transform' }} />
        <div style={{ position:'absolute',right:'-5%',top:'-10%',width:600,height:550,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(99,102,241,0.3) 0%,transparent 68%)',filter:'blur(90px)',animation:'auth-orb-2 27s ease-in-out infinite',willChange:'transform' }} />
        <div style={{ position:'absolute',left:'25%',bottom:'-5%',width:550,height:450,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(167,139,250,0.2) 0%,transparent 68%)',filter:'blur(90px)',animation:'auth-orb-3 19s ease-in-out infinite',willChange:'transform' }} />
      </div>

      {/* Left branding panel — desktop only */}
      <div className="relative hidden md:flex flex-col justify-between w-5/12 p-12 text-white overflow-hidden">
        <AuthCanvas />
        {/* Gradient overlay so text is readable over canvas */}
        <div className="absolute inset-0 bg-linear-to-b from-violet-950/40 via-transparent to-violet-950/60 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3" style={{ animation: 'fade-in 0.6s ease both' }}>
          <div className="w-10 h-10 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <SpendlyIcon size={18} />
          </div>
          <span className="text-2xl font-bold tracking-tight">Spendly</span>
        </div>

        <div className="relative z-10 space-y-8" style={{ animation: 'slide-up 0.7s ease 0.1s both' }}>
          <div>
            <p className="text-violet-300 text-xs font-semibold uppercase tracking-widest mb-3">Trusted by thousands</p>
            <h2 className="text-4xl font-bold leading-tight">Your finances,<br/>finally under<br/>control.</h2>
          </div>
          <div className="space-y-5">
            {[
              { icon: '📊', title: 'Visual Spending Charts', desc: 'See exactly where every dollar goes, by category.' },
              { icon: '🔔', title: 'Smart Budget Alerts', desc: 'Get notified before you overspend — not after.' },
              { icon: '🤖', title: 'AI Finance Advisor', desc: 'Personalized answers based on your real data.' },
              { icon: '📄', title: 'One-Click Reports', desc: 'Export a full PDF statement in seconds.' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-white/55 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/25 text-xs">© 2026 Spendly</p>
      </div>

      {/* Right form panel */}
      <div className="relative flex-1 flex items-center justify-center p-5 md:p-12">
        <div className="w-full max-w-100" style={{ animation: 'slide-up 0.5s ease both' }}>

          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <a href="/" className="flex items-center gap-2.5 md:hidden">
              <div className="w-9 h-9 bg-violet-600/80 border border-violet-400/30 rounded-xl flex items-center justify-center">
                <SpendlyIcon size={14} />
              </div>
              <span className="font-bold text-white text-lg">Spendly</span>
            </a>
            <div className="ml-auto">
              <button onClick={toggleDark} className="p-2.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/8 transition border border-white/10">
                {dark ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                )}
              </button>
            </div>
          </div>

          {/* Glass card */}
          <div className="bg-white/6 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-white/45 mt-1.5 text-sm">Sign in to continue to Spendly</p>
            </div>

            {error && (
              <div className="bg-red-500/15 border border-red-400/25 text-red-300 px-4 py-3 rounded-2xl mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email" name="email" placeholder="you@example.com"
                  value={form.email} onChange={handleChange} required autoComplete="email"
                  className="w-full px-4 py-3.5 rounded-2xl border border-white/12 bg-white/8 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/40 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Password</label>
                <input
                  type="password" name="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange} required autoComplete="current-password"
                  className="w-full px-4 py-3.5 rounded-2xl border border-white/12 bg-white/8 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/40 transition"
                />
              </div>
              <div className="flex justify-end pt-0.5">
                <a href="/forgot-password" className="text-xs text-violet-300/80 hover:text-violet-200 font-medium transition">Forgot password?</a>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition active:scale-[0.98] disabled:opacity-60 mt-1"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 32px rgba(124,58,237,0.45)' }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/8 text-center">
              <p className="text-white/35 text-sm">
                Don't have an account?{' '}
                <a href="/register" className="text-violet-300 font-semibold hover:text-violet-200 transition">Create one free</a>
              </p>
            </div>
          </div>

          <p className="text-center text-white/20 text-xs mt-6">By signing in you agree to our <a href="/terms" className="underline hover:text-white/40">Terms</a> & <a href="/privacy" className="underline hover:text-white/40">Privacy</a></p>
        </div>
      </div>
    </div>
  )
}

export default Login
