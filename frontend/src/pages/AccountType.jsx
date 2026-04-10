import { useState } from 'react'
import API from '../utils/api'

export default function AccountType() {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState(null)
  const [bizType, setBizType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const save = async (account_type, business_type) => {
    setLoading(true)
    setError('')
    try {
      await API.put('/auth/account-type', { account_type, business_type })
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...user, account_type, business_type, account_type_selected: true }))
      window.location.href = account_type === 'personal' ? '/dashboard' : '/business'
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">Spendly</h1>
          <p className="text-gray-500 text-sm">One last step to personalise your experience</p>
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-2">How will you use Spendly?</h2>
            <p className="text-gray-400 text-center text-sm mb-8">Choose the experience that fits you best</p>
            <div className="grid grid-cols-1 gap-4 mb-6">

              <button onClick={() => setSelected('personal')}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${selected === 'personal' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">👤</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">Personal</h3>
                      <span className="text-xs bg-green-100 text-green-600 px-2.5 py-1 rounded-full font-semibold">Free</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Track your personal income, expenses, budgets and savings goals</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['Expense tracking', 'Budgets', 'Savings goals', 'AI insights'].map(f => (
                        <span key={f} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {selected === 'personal' && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </button>

              <button onClick={() => setSelected('business')}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${selected === 'business' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">🏢</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">Business</h3>
                      <span className="text-xs bg-purple-100 text-purple-600 px-2.5 py-1 rounded-full font-semibold">Pro</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Manage your business finances, staff, inventory and daily revenue</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['Revenue tracking', 'Staff & payroll', 'Inventory', 'P&L reports'].map(f => (
                        <span key={f} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {selected === 'business' && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back
            </button>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-2">What type of business?</h2>
            <p className="text-gray-400 text-center text-sm mb-8">Each type unlocks different features</p>
            <div className="grid grid-cols-1 gap-4 mb-6">

              <button onClick={() => setBizType('restaurant')}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${bizType === 'restaurant' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/40 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">🍽️</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Restaurant / Cafe</h3>
                    <p className="text-gray-500 text-sm mt-1">Menu builder, recipe costing, POS scanner, ingredient stock tracking</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['Menu builder', 'Recipe costs', 'POS scanner', 'Stock alerts', 'Payroll'].map(f => (
                        <span key={f} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 px-2 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {bizType === 'restaurant' && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </button>

              <button onClick={() => setBizType('firm')}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${bizType === 'firm' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">🏪</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Firm / Shop / Freelancer</h3>
                    <p className="text-gray-500 text-sm mt-1">Track business income, expenses, clients and employee payroll</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['Revenue tracking', 'Business expenses', 'Staff payroll', 'P&L reports'].map(f => (
                        <span key={f} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {bizType === 'firm' && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <button onClick={handleContinue}
          disabled={loading || (step === 1 && !selected) || (step === 2 && !bizType)}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? 'Setting up...' : step === 2 ? 'Get Started' : selected === 'business' ? 'Next →' : 'Get Started'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">You can change this later from your profile settings</p>
      </div>
    </div>
  )
}