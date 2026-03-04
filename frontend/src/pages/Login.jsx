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
      setError(err.response.data.message)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white">
        <div>
          <h1 className="text-3xl font-bold">Spendly 💸</h1>
          <p className="text-indigo-200 mt-2 text-sm">Track smarter, spend better</p>
        </div>
        <div className="space-y-6">
          {[
            { icon: '📊', title: 'Visual Charts', desc: 'See your spending broken down beautifully' },
            { icon: '🎯', title: 'Budget Goals', desc: 'Set limits and stay on track every month' },
            { icon: '🤖', title: 'AI Insights', desc: 'Get personalized tips based on your habits' },
            { icon: '📷', title: 'Receipt Scanner', desc: 'Scan any receipt and auto-fill expenses' },
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
            <button onClick={toggleDark} className="text-xl hover:scale-110 transition" title="Toggle dark mode">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back 👋</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to your Spendly account</p>
          </div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-500 p-3 rounded-xl mb-4 text-sm border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
              Sign In →
            </button>
          </form>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
            Don't have an account?{' '}
            <a href="/register" className="text-indigo-600 font-semibold hover:underline">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login