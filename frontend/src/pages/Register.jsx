import { useState } from 'react'
import API from '../utils/api'
import { useDarkMode } from '../hooks/useDarkMode'

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dark, toggleDark] = useDarkMode()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await API.post('/auth/register', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      window.location.href = '/account-type'
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-5/12 bg-linear-to-br from-violet-700 to-indigo-900 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Spendly</h1>
        </div>

        <div className="space-y-7">
          <p className="text-violet-100 text-sm font-medium uppercase tracking-widest">Everything you get, free</p>
          {[
            { title: 'Expense & Income Tracking', desc: 'Log everything in seconds and see your true balance.' },
            { title: 'Receipt Scanner', desc: 'Photograph any receipt — the amount logs itself.' },
            { title: 'AI Finance Assistant', desc: 'Get personalized insights based on your real data.' },
            { title: 'Works on Any Device', desc: 'Phone, tablet, or desktop — always in sync.' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-2 h-2 bg-violet-300 rounded-full mt-2 shrink-0" />
              <div>
                <p className="font-semibold text-white">{f.title}</p>
                <p className="text-violet-100/80 text-sm mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-violet-200/60 text-xs">© 2026 Spendly</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <a href="/" className="flex items-center gap-2 md:hidden">
              <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Spendly</span>
            </a>
            <div className="ml-auto">
              <button onClick={toggleDark} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                {dark ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create your account</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Start tracking your finances for free — no card required</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-500 p-3 rounded-xl mb-4 text-sm border border-red-100 dark:border-red-800">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input type="text" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <input type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 active:scale-[0.98] transition shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-violet-600 font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
