import { useEffect, useState } from 'react'
import API from '../utils/api'

const STYLE = `
@keyframes slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes pulse-ring{0%{transform:scale(1);opacity:0.4}50%{transform:scale(1.08);opacity:0.2}100%{transform:scale(1);opacity:0.4}}
`

const Mark = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

const EnvelopeIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

export default function CheckEmail() {
  const [email, setEmail]         = useState(() => sessionStorage.getItem('pendingVerificationEmail') || '')
  const [status, setStatus]       = useState('idle') // idle | sending | sent | error
  const [cooldown, setCooldown]   = useState(0)      // seconds until next resend

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0 || status === 'sending') return
    setStatus('sending')
    try {
      await API.post('/auth/resend-verification', { email })
      setStatus('sent')
      setCooldown(60)
      setTimeout(() => setStatus('idle'), 5000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(Math.max(0, b.length)))
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(150deg,#0a1628 0%,#0f0c29 30%,#1a0a3e 60%,#1e1065 100%)' }}>
      <style>{STYLE}</style>

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle,#7c3aed,transparent)', filter: 'blur(80px)', animation: 'pulse-ring 6s ease-in-out infinite' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md" style={{ animation: 'slide-up 0.5s ease both' }}>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/60"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <Mark size={18} />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Fina</span>
          </a>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 border border-white/10 text-center"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>

          {/* Envelope illustration */}
          <div className="flex justify-center mb-6">
            <div className="relative" style={{ animation: 'float 3.5s ease-in-out infinite' }}>
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-900/50"
                style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)' }}>
                <EnvelopeIcon />
              </div>
              {/* Decorative dot badge */}
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-[#1a0a3e] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Check your inbox</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-1">
            We sent a verification link to
          </p>
          {maskedEmail && (
            <p className="text-violet-300 font-semibold text-sm mb-4 break-all">{maskedEmail}</p>
          )}
          <p className="text-white/40 text-xs leading-relaxed mb-8">
            Click the link in the email to activate your account.<br/>
            The link expires in <span className="text-white/60 font-semibold">24 hours</span>.
          </p>

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || status === 'sending'}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            style={{ background: cooldown > 0 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white' }}>
            {status === 'sending' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                Sending…
              </span>
            ) : status === 'sent' ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-emerald-400">Sent! Check your inbox</span>
              </span>
            ) : status === 'error' ? (
              '⚠ Failed — try again'
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              'Resend verification email'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <a href="/login"
            className="block w-full py-3 rounded-2xl text-sm font-semibold text-white/60 hover:text-white transition border border-white/10 hover:border-white/25 hover:bg-white/5">
            Back to Login
          </a>
        </div>

        {/* Tips */}
        <div className="mt-5 p-4 rounded-2xl border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest mb-2">Not seeing it?</p>
          <ul className="space-y-1.5">
            {[
              'Check your spam or junk folder',
              'Make sure you typed the right email',
              'Wait up to 2 minutes for delivery',
            ].map((tip, i) => (
              <li key={i} className="flex items-center gap-2 text-white/35 text-xs">
                <div className="w-1 h-1 rounded-full bg-violet-500/60 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-white/20 text-xs mt-5">
          Wrong email?{' '}
          <a href="/register" className="text-violet-400 hover:text-violet-300 transition font-medium">
            Register again
          </a>
        </p>
      </div>
    </div>
  )
}
