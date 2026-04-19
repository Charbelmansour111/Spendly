import { useState } from 'react'
import API from '../utils/api'

export default function AccountType() {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const save = async (account_type) => {
    setLoading(true)
    setError('')
    try {
      await API.put('/auth/account-type', { account_type, business_type: null })
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...user, account_type, account_type_selected: true }))
      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    if (!selected) return
    if (selected === 'advisor') {
      window.location.href = '/advisor/apply'
    } else {
      await save('personal')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose your account type</h1>
          <p className="text-gray-500 dark:text-gray-400">You can apply as an advisor later from your profile too</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setSelected('personal')}
            className={`p-6 border-2 rounded-2xl text-left transition ${selected === 'personal' ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-violet-400'}`}
          >
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/40 rounded-xl flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-violet-600 dark:text-violet-400">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Personal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your personal finances, budgets, and goals</p>
          </button>

          <button
            onClick={() => setSelected('advisor')}
            className={`p-6 border-2 rounded-2xl text-left transition ${selected === 'advisor' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}
          >
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-indigo-600 dark:text-indigo-400">
                <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Financial Advisor</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Apply to join our verified advisor network and help users</p>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={loading || !selected}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-sm transition disabled:opacity-50"
        >
          {loading ? 'Please wait…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
