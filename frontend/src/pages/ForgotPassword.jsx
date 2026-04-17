import { useState } from 'react'
import API from '../utils/api'

export default function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"

  const sendCode = async () => {
    setLoading(true); setError('')
    try {
      await API.post('/auth/forgot-password', { email })
      setStep(2)
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong')
    }
    setLoading(false)
  }

  const resetPassword = async () => {
    if (newPassword.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true); setError('')
    try {
      await API.post('/auth/reset-password', { email, code, newPassword })
      setStep(3)
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid or expired code')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <a href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Spendly</span>
          </a>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {step === 1 && 'Reset your password'}
            {step === 2 && 'Enter the code we sent you'}
            {step === 3 && 'Password reset successful'}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={sendCode} disabled={!email || loading}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50">
              {loading ? 'Sending…' : 'Send Reset Code'}
            </button>
            <p className="text-center text-sm text-gray-400">
              Remember your password?{' '}
              <a href="/login" className="text-violet-600 font-semibold hover:underline">Sign in</a>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              We sent an 8-digit code to <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reset Code</label>
              <input type="text" placeholder="12345678" maxLength={8} value={code} onChange={e => setCode(e.target.value)}
                className={inputCls + ' tracking-widest text-center text-xl font-bold'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
              <input type="password" placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={resetPassword} disabled={!code || !newPassword || loading}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">Your password has been reset.</p>
            <a href="/login" className="block w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition text-center">
              Go to Login →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
