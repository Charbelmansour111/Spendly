import { useState, useEffect } from 'react'
import API from '../utils/api'

export default function AccountType() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const save = async (account_type, business_type) => {
    setLoading(true)
    setError('')
    try {
      await API.put('/auth/account-type', { account_type, business_type })
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...user, account_type, business_type, account_type_selected: true }))
      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // Business mode disabled — auto-save personal on mount
  useEffect(() => { save('personal', null) }, []) // eslint-disable-line

  // Business account selection — disabled until business mode is re-enabled
  /*
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState(null)
  const [bizType, setBizType] = useState(null)

  const handleContinue = async () => {
    if (step === 1) {
      if (!selected) return
      if (selected === 'personal') await save('personal', null)
      else setStep(2)
    } else {
      if (!bizType) return
      await save('business', bizType)
    }
  }

  // Step 1 — choose Personal vs Business
  // Step 2 — choose business type (Restaurant / Firm)
  */

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Setting up your account</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Just a moment…</p>

        {loading && (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
            <button onClick={() => save('personal', null)} className="ml-3 font-semibold underline">Retry</button>
          </div>
        )}
      </div>
    </div>
  )
}
