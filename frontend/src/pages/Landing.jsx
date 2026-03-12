import { useEffect } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

function Landing() {
  const [dark, toggleDark] = useDarkMode()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) window.location.href = '/dashboard'
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-5 bg-white dark:bg-gray-900 shadow-sm">
        <h1 className="text-2xl font-bold text-indigo-600">Spendly 💸</h1>
        <div className="flex gap-3 items-center">
          <button onClick={toggleDark} className="text-xl hover:scale-110 transition" title="Toggle dark mode">
            {dark ? '☀️' : '🌙'}
          </button>
          <a href="/login" className="px-4 py-2 text-indigo-600 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl transition">Login</a>
          <a href="/register" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition">Register</a>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-sm font-semibold px-4 py-2 rounded-full mb-6">
          🚀 Your personal finance assistant
        </div>
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Track smarter,<br />
          <span className="text-indigo-600">spend better</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
          Spendly helps you track your expenses, set budget goals, scan receipts, and get AI-powered insights — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/register" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition text-lg shadow-lg shadow-indigo-200">Start for Free →</a>
          <a href="/login" className="px-8 py-4 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-gray-700 transition text-lg border border-indigo-200 dark:border-gray-600">Login</a>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">Everything you need to manage your money</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📊', title: 'Spending Charts', desc: 'Visualize your spending with beautiful pie and bar charts broken down by category.' },
            { icon: '🤖', title: 'AI Insights', desc: 'Get personalized tips and analysis on your spending habits powered by AI.' },
            { icon: '📷', title: 'Receipt Scanner', desc: 'Take a photo of any receipt and automatically extract the amount instantly.' },
            { icon: '🎯', title: 'Budget Goals', desc: 'Set monthly limits per category and get real-time alerts when you are close.' },
            { icon: '📄', title: 'PDF Reports', desc: 'Download a professional PDF report of all your expenses with one click.' },
            { icon: '🔒', title: 'Secure & Private', desc: 'Your data is encrypted and protected. Passwords are never stored in plain text.' },
          ].map((feature, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20 px-6 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">Ready to take control of your money?</h2>
        <p className="text-indigo-200 mb-8 text-lg">Join Spendly today — it's completely free.</p>
        <a href="/register" className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition text-lg">Create Your Free Account →</a>
      </div>

      <footer className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-900">
        <p>© 2026 <span className="text-indigo-600 font-semibold">Spendly</span> — Track smarter, spend better 💸</p>
      </footer>
    </div>
  )
}

export default Landing