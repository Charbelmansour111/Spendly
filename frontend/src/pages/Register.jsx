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

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white">
        <div>
          <h1 className="text-3xl font-bold">Spendly</h1>
          <p className="text-indigo-200 mt-2 text-sm">Track smarter, spend better</p>
        </div>
        <div className="space-y-6">
          {[
            { icon: '💰', title: 'Track Income & Expenses', desc: 'Log your earnings and see your real balance' },
            { icon: '🍽️', title: 'Restaurant Mode', desc: 'POS scanner, menu builder, stock tracking' },
            { icon: '📄', title: 'PDF Reports', desc: 'Download monthly expense reports instantly' },
            { icon: '🤖', title: 'AI Finance Assistant', desc: 'Get personalised insights about your money' },
            { icon: '📱', title: 'Works Everywhere', desc: 'Phone, tablet, or desktop — always in sync' },
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

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-4">
            <button onClick={toggleDark} className="text-xl hover:scale-110 transition">{dark ? '☀️' : '🌙'}</button>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create your account 🚀</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Start tracking your finances for free</p>
          </div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-500 p-3 rounded-xl mb-4 text-sm border border-red-100 dark:border-red-800">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input type="text" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register