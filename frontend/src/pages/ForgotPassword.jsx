import { useState } from 'react'
import API from '../utils/api'

export default function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-600 mb-1">Spendly</h1>
          <p className="text-gray-400 text-sm">
            {step === 1 && 'Reset your password'}
            {step === 2 && 'Enter the code we sent you'}
            {step === 3 && 'Password reset successful!'}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={sendCode} disabled={!email || loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
            <p className="text-center text-sm text-gray-400">Remember your password? <a href="/login" className="text-indigo-600 font-semibold hover:underline">Log in</a></p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">We sent an 8-digit code to <span className="font-semibold text-gray-700">{email}</span></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reset Code</label>
              <input type="text" placeholder="12345678" maxLength={8} value={code} onChange={e => setCode(e.target.value)} className={inputCls + ' tracking-widest text-center text-xl font-bold'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={resetPassword} disabled={!code || !newPassword || loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <p className="text-5xl">🎉</p>
            <p className="text-gray-600">Your password has been reset successfully!</p>
            <a href="/login" className="block w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition text-center">Go to Login</a>
          </div>
        )}
      </div>
    </div>
  )
}