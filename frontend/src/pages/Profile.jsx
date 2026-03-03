import { useEffect, useState } from 'react'
import API from '../utils/api'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
]

const COUNTRIES = ['Lebanon', 'United States', 'United Kingdom', 'UAE', 'Saudi Arabia', 'France', 'Germany', 'Canada', 'Australia', 'Other']
const INTERESTS = ['Saving Money', 'Investing', 'Budgeting', 'Travel', 'Business', 'Freelancing', 'Student Finance', 'Family Finance']

function Profile() {
  const [profile, setProfile] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState({
    phone: '', country: '', interests: '', currency: 'USD', customInterest: ''
  })
  const [selectedInterests, setSelectedInterests] = useState([])
  const [savedCurrency, setSavedCurrency] = useState('USD')
  const [currencySaved, setCurrencySaved] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/profile', { headers: { Authorization: `Bearer ${token}` } })
      setProfile(res.data)
      setNewName(res.data.user.name)
      setSavedCurrency(res.data.user.currency || 'USD')
      if (!res.data.user.onboarding_done) setShowOnboarding(true)
      if (res.data.user.interests) setSelectedInterests(res.data.user.interests.split(','))
    } catch { console.log('Error fetching profile') }
    setLoading(false)
  }

  const handleUpdateName = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const res = await API.put('/profile/name', { name: newName }, { headers: { Authorization: `Bearer ${token}` } })
      const updatedUser = { ...JSON.parse(localStorage.getItem('user')), name: res.data.name }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setProfile({ ...profile, user: { ...profile.user, name: res.data.name } })
      setEditingName(false)
    } catch { console.log('Error updating name') }
  }

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault()
    if (!onboardingForm.phone || !onboardingForm.country || selectedInterests.length === 0) return
    try {
      const token = localStorage.getItem('token')
      await API.put('/profile/onboarding', {
        ...onboardingForm,
        interests: selectedInterests.join(',')
      }, { headers: { Authorization: `Bearer ${token}` } })
      setShowOnboarding(false)
      fetchProfile()
    } catch { console.log('Error saving onboarding') }
  }

  const handleCurrencyChange = async (currency) => {
    setSavedCurrency(currency)
    try {
      const token = localStorage.getItem('token')
      await API.put('/profile/currency', { currency }, { headers: { Authorization: `Bearer ${token}` } })
      localStorage.setItem('currency', currency)
      setCurrencySaved(true)
      setTimeout(() => setCurrencySaved(false), 2000)
    } catch { console.log('Error updating currency') }
  }

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  const balance = profile.totalIncome - profile.totalExpenses
  const memberSince = new Date(profile.user.created_at).toLocaleDateString('default', { month: 'long', year: 'numeric' })
  const currencySymbol = CURRENCIES.find(c => c.code === savedCurrency)?.symbol || '$'
  const bestMonthName = profile.bestMonth
    ? new Date(profile.bestMonth.year, profile.bestMonth.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <a href="/dashboard" className="text-2xl font-bold text-indigo-600">Spendly</a>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-gray-500 text-xl hover:text-indigo-600 transition" title="Dashboard">🏠</a>
          <a href="/profile" className="text-gray-500 text-xl hover:text-indigo-600 transition" title="Profile">👤</a>
          <button onClick={handleLogout} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition">Logout</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Onboarding Banner */}
        {!profile.user.onboarding_done && !showOnboarding && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 mb-6 text-white flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">🎁 Get 1 free month of Spendly Pro!</p>
              <p className="text-green-100 text-sm mt-1">Complete your profile to unlock your free month.</p>
            </div>
            <button onClick={() => setShowOnboarding(true)} className="bg-white text-green-600 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-green-50 transition">
              Complete Now
            </button>
          </div>
        )}

        {/* Onboarding Form */}
        {showOnboarding && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-2 border-indigo-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Complete Your Profile 🎁</h3>
                <p className="text-green-600 text-sm mt-1 font-medium">Fill everything out to get 1 free month of Spendly Pro!</p>
              </div>
              <button onClick={() => setShowOnboarding(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number *</label>
                  <input
                    type="tel" placeholder="+961 XX XXX XXX"
                    value={onboardingForm.phone}
                    onChange={e => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Country *</label>
                  <select
                    value={onboardingForm.country}
                    onChange={e => setOnboardingForm({ ...onboardingForm, country: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800"
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Preferred Currency *</label>
                <select
                  value={onboardingForm.currency}
                  onChange={e => setOnboardingForm({ ...onboardingForm, currency: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Your Interests * <span className="text-gray-400">(select or type your own)</span></label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {INTERESTS.map(interest => (
                    <button
                      key={interest} type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        selectedInterests.includes(interest)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a custom interest..."
                    value={onboardingForm.customInterest || ''}
                    onChange={e => setOnboardingForm({ ...onboardingForm, customInterest: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = onboardingForm.customInterest?.trim()
                      if (val && !selectedInterests.includes(val)) {
                        setSelectedInterests(prev => [...prev, val])
                        setOnboardingForm({ ...onboardingForm, customInterest: '' })
                      }
                    }}
                    className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-200 transition"
                  >
                    Add
                  </button>
                </div>
                {selectedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedInterests.map(i => (
                      <span key={i} className="flex items-center gap-1 bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-medium">
                        {i}
                        <button type="button" onClick={() => setSelectedInterests(prev => prev.filter(x => x !== i))} className="hover:text-red-500 ml-1">✕</button>
                      </span>
                    ))}
                  </div>
                )}
                {selectedInterests.length === 0 && (
                  <p className="text-red-400 text-xs mt-1">Please select or add at least one interest</p>
                )}
              </div>
              <button
                type="submit"
                disabled={!onboardingForm.phone || !onboardingForm.country || selectedInterests.length === 0}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Claim Free Month 🎁
              </button>
            </form>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-6 text-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
            👤
          </div>
          {editingName ? (
            <form onSubmit={handleUpdateName} className="flex gap-2 justify-center mt-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="px-4 py-2 rounded-xl text-gray-800 bg-white text-sm focus:outline-none border-0"
                required
              />
              <button type="submit" className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-semibold">Save</button>
              <button type="button" onClick={() => setEditingName(false)} className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-xl text-sm">Cancel</button>
            </form>
          ) : (
            <div>
              <h2 className="text-2xl font-bold">{profile.user.name}</h2>
              <button onClick={() => setEditingName(true)} className="text-indigo-200 text-xs mt-1 hover:text-white transition">✏️ Edit name</button>
            </div>
          )}
          <p className="text-indigo-200 mt-2">{profile.user.email}</p>
          <p className="text-indigo-300 text-sm mt-1">Member since {memberSince}</p>
          {profile.user.onboarding_done && (
            <div className="mt-3 flex justify-center gap-3 flex-wrap">
              {profile.user.country && <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs">{profile.user.country}</span>}
              {profile.user.phone && <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs">{profile.user.phone}</span>}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-indigo-600">{currencySymbol}{profile.totalExpenses.toFixed(2)}</p>
            <p className="text-gray-500 text-sm mt-1">Total Spent Ever</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-green-600">{currencySymbol}{profile.totalIncome.toFixed(2)}</p>
            <p className="text-gray-500 text-sm mt-1">Total Income Ever</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {balance >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(balance).toFixed(2)}
            </p>
            <p className="text-gray-500 text-sm mt-1">Overall Balance</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{profile.totalTransactions}</p>
            <p className="text-gray-500 text-sm mt-1">Total Transactions</p>
          </div>
        </div>

        {/* Best Month */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">🏆 Best Month</h3>
          {bestMonthName ? (
            <div>
              <p className="text-2xl font-bold text-indigo-600">{bestMonthName}</p>
              <p className="text-green-600 font-semibold mt-1">+{currencySymbol}{profile.bestMonth.balance.toFixed(2)} balance</p>
              <p className="text-gray-400 text-sm mt-1">Your highest savings month ever</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet. Add income and expenses to track your best month.</p>
          )}
        </div>

        {/* Interests */}
        {profile.user.onboarding_done && selectedInterests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 Your Interests</h3>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map(i => (
                <span key={i} className="bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-medium">{i}</span>
              ))}
            </div>
          </div>
        )}

        {/* Currency Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">💱 Currency</h3>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => handleCurrencyChange(c.code)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition text-sm font-medium ${
                  savedCurrency === c.code
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                    : 'border-gray-200 hover:border-indigo-300 text-gray-600'
                }`}
              >
                <span className="text-lg">{c.symbol}</span>
                <div className="text-left">
                  <p className="font-semibold">{c.code}</p>
                  <p className="text-xs text-gray-400">{c.name}</p>
                </div>
                {savedCurrency === c.code && <span className="ml-auto text-indigo-500">✓</span>}
              </button>
            ))}
          </div>
          {currencySaved && <p className="text-green-600 text-sm mt-3 text-center">✅ Currency saved!</p>}
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Name</span>
              <span className="font-medium text-gray-800">{profile.user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="font-medium text-gray-800">{profile.user.email}</span>
            </div>
            {profile.user.phone && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Phone</span>
                <span className="font-medium text-gray-800">{profile.user.phone}</span>
              </div>
            )}
            {profile.user.country && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Country</span>
                <span className="font-medium text-gray-800">{profile.user.country}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">Member Since</span>
              <span className="font-medium text-gray-800">{memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-gray-400 text-sm mt-8">
        <p>© 2026 <span className="text-indigo-600 font-semibold">Spendly</span> — Track smarter, spend better 💸</p>
      </footer>
    </div>
  )
}

export default Profile