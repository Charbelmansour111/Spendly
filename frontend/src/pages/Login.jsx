import { useState } from 'react'
import API from '../utils/api'
import { useDarkMode } from '../hooks/useDarkMode'

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [dark, toggleDark] = useDarkMode()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await API.post('/auth/login', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.')
    }
  }

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-5/12 bg-linear-to-br from-emerald-700 to-teal-800 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Fynlo</h1>
        </div>

        <div className="space-y-7">
          <p className="text-emerald-100 text-sm font-medium uppercase tracking-widest">Why people love Fynlo</p>
          {[
            { title: 'Visual Spending Charts', desc: 'See exactly where every dollar goes, broken down by category.' },
            { title: 'Smart Budget Alerts', desc: 'Get notified before you overspend — not after.' },
            { title: 'AI Finance Advisor', desc: 'Ask anything about your money and get personalized answers.' },
            { title: 'One-Click Reports', desc: 'Export a full PDF report of your finances in seconds.' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-2 h-2 bg-emerald-300 rounded-full mt-2 shrink-0" />
              <div>
                <p className="font-semibold text-white">{f.title}</p>
                <p className="text-emerald-100/80 text-sm mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-emerald-200/60 text-xs">© 2026 Fynlo</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <a href="/" className="flex items-center gap-2 md:hidden">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Fynlo</span>
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Sign in to your Fynlo account</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-500 p-3 rounded-xl mb-4 text-sm border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <input type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required className={inputCls} />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:scale-[0.98] transition shadow-lg shadow-emerald-200 dark:shadow-none mt-2">
              Sign In →
            </button>
            <p className="text-center text-sm text-gray-400">
              <a href="/forgot-password" className="text-emerald-600 font-semibold hover:underline">Forgot password?</a>
            </p>
          </form>

          <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
            Don't have an account?{' '}
            <a href="/register" className="text-emerald-600 font-semibold hover:underline">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
