import { useState, useRef } from 'react'
import API from '../utils/api'
import { useDarkMode } from '../hooks/useDarkMode'

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [dark, toggleDark] = useDarkMode()
  const [step, setStep] = useState('register') // 'register' | 'verify'
  const [code, setCode] = useState(['', '', '', '', '', '', '', ''])
  const [verifyError, setVerifyError] = useState('')
  const [verifySuccess, setVerifySuccess] = useState(false)
  const inputs = useRef([])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.post('/auth/register', form)
      setStep('verify')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
  }

  const handleCodeChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const newCode = [...code]
    newCode[i] = val
    setCode(newCode)
    if (val && i < 7) inputs.current[i + 1]?.focus()
  }

  const handleCodeKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const handleVerify = async () => {
    setVerifyError('')
    const fullCode = code.join('')
    if (fullCode.length < 8) { setVerifyError('Please enter all 8 digits'); return }
    try {
      await API.post('/auth/verify-code', { email: form.email, code: fullCode })
      setVerifySuccess(true)
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Invalid code')
      setCode(['', '', '', '', '', '', '', ''])
      inputs.current[0]?.focus()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white">
        <div>
          <h1 className="text-3xl font-bold">Spendly</h1>
          <p className="text-indigo-200 mt-2 text-sm">Track smarter, spend better</p>
        </div>
        <div className="space-y-6">
          {[
            { icon: '💰', title: 'Track Income', desc: 'Log your earnings and see your real balance' },
            { icon: '📄', title: 'PDF Reports', desc: 'Download monthly expense reports instantly' },
            { icon: '🔒', title: 'Secure & Private', desc: 'Your data is encrypted and never shared' },
            { icon: '📱', title: 'Works Everywhere', desc: 'Use on phone, tablet, or desktop' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="text-2xl">{f.icon}</div>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-indigo-200 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-indigo-300 text-sm">© 2026 Spendly</p>
      </div>

      {/* Right Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-4">
            <button onClick={toggleDark} className="text-xl hover:scale-110 transition">{dark ? '☀️' : '🌙'}</button>
          </div>

          {step === 'register' && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create your account 🚀</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Start tracking your finances for free</p>
              </div>
              {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-500 p-3 rounded-xl mb-4 text-sm border border-red-100 dark:border-red-800">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input type="text" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <input type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                  Create Account →
                </button>
              </form>
              <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
                Already have an account? <a href="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</a>
              </p>
            </>
          )}

          {step === 'verify' && !verifySuccess && (
            <div className="text-center">
              <p className="text-5xl mb-4">📧</p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Check your email!</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8">We sent an 8-digit code to <span className="font-semibold text-indigo-600">{form.email}</span></p>
              <div className="flex justify-center gap-2 mb-6">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    className="w-10 h-12 text-center text-xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                ))}
              </div>
              {verifyError && <p className="text-red-500 text-sm mb-4">{verifyError}</p>}
              <button onClick={handleVerify} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
                Verify Account →
              </button>
              <p className="text-gray-400 text-sm mt-4">Didn't receive the code? <a href="/register" className="text-indigo-600 hover:underline">Try again</a></p>
            </div>
          )}

          {verifySuccess && (
            <div className="text-center py-8">
              <p className="text-5xl mb-4">✅</p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Verified!</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-3">Your account is ready. You can now log in.</p>
              <a href="/login" className="mt-6 inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">Go to Login →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register