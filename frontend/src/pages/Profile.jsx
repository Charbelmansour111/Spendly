import { useEffect, useState, useRef, useCallback } from 'react'
import API from '../utils/api'
import Layout from '../components/Layout'
import { ProfileSkeleton } from '../components/Skeleton'

const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
  { code: 'GBP', symbol: '£',   name: 'British Pound' },
  { code: 'LBP', symbol: 'L£',  name: 'Lebanese Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar' },
]

const COUNTRIES = [
  'Lebanon','United States','United Kingdom','UAE','Saudi Arabia',
  'France','Germany','Canada','Australia','Jordan','Egypt',
  'Kuwait','Qatar','Bahrain','Oman','Turkey','Other'
]

const INTERESTS = [
  'Saving Money','Investing','Budgeting','Travel','Business',
  'Freelancing','Student Finance','Family Finance','Real Estate','Crypto'
]

// 20-question financial health check
const HEALTH_QUESTIONS = [
  { id: 'income_range',    q: 'What is your monthly income range?',         opts: ['Under $500','$500–$1,500','$1,500–$3,000','$3,000–$6,000','$6,000+'] },
  { id: 'savings_goal',    q: 'What percentage of income do you aim to save?',opts: ['I struggle to save','1–5%','5–15%','15–30%','30%+'] },
  { id: 'fin_goal',        q: 'What is your primary financial goal?',        opts: ['Pay off debt','Build emergency fund','Buy a home','Retire early','Grow wealth'] },
  { id: 'invest_exp',      q: 'How would you describe your investment experience?',opts: ['Complete beginner','Some knowledge','Intermediate','Experienced','Expert'] },
  { id: 'debt_status',     q: 'Do you currently have any outstanding debt?', opts: ['No debt','Credit card debt','Student loans','Car loan','Mortgage','Multiple debts'] },
  { id: 'emergency_fund',  q: 'Do you have an emergency fund?',              opts: ['No, not yet','Less than 1 month','1–3 months','3–6 months','6+ months'] },
  { id: 'housing',         q: 'What is your current housing situation?',     opts: ['Living with family','Renting alone','Renting with others','Own my home','Other'] },
  { id: 'employment',      q: 'What is your employment status?',             opts: ['Student','Full-time employed','Part-time employed','Self-employed','Unemployed','Retired'] },
  { id: 'dependents',      q: 'How many financial dependents do you have?',  opts: ['None','1','2','3','4+'] },
  { id: 'age_range',       q: 'What is your age range?',                     opts: ['Under 18','18–24','25–34','35–44','45–54','55+'] },
  { id: 'review_freq',     q: 'How often do you review your finances?',      opts: ['Never','Once a year','Monthly','Weekly','Daily'] },
  { id: 'challenge',       q: 'What is your biggest financial challenge?',   opts: ['Spending too much','Not earning enough','Managing debt','Saving consistently','Understanding investing'] },
  { id: 'spending_habit',  q: 'How do you feel about your current spending?',opts: ['I overspend often','I sometimes overspend','I break even','I usually save a little','I save consistently'] },
  { id: 'retirement',      q: 'Are you planning for retirement?',            opts: ['Not thinking about it','Thinking about it','Have a plan','Actively contributing','Already retired'] },
  { id: 'insurance',       q: 'Do you have health insurance?',               opts: ['No insurance','Basic coverage','Good coverage','Comprehensive coverage'] },
  { id: 'side_income',     q: 'Do you have any side income?',                opts: ['No','Occasionally','Regular side gig','Multiple income streams','Passive income'] },
  { id: 'fin_knowledge',   q: 'How would you rate your financial knowledge?',opts: ['Very low','Basic','Moderate','Good','Expert'] },
  { id: 'credit_use',      q: 'How do you use credit cards?',                opts: ["Don't have one",'Pay full balance monthly','Pay minimum only','Avoid using them','Use for rewards only'] },
  { id: 'save_motivation', q: 'What motivates you most to save money?',      opts: ['Financial security','Big purchase (home/car)','Travel & experiences','Early retirement','Family & children'] },
  { id: 'future_vision',   q: 'Where do you see yourself financially in 5 years?',opts: ['Debt-free','Owning property','Financially independent','Running a business','Comfortably retired'] },
]

// Number modal
function NumberModal({ label, value, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-gray-400 mb-3">{label}</p>
        <p className="text-4xl font-bold text-indigo-600 tabular-nums break-all">{value}</p>
        <button onClick={onClose} className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 ml-2 hover:opacity-70">x</button>
    </div>
  )
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState({ phone: '', country: '', interests: '', currency: 'USD' })
  const [selectedInterests, setSelectedInterests] = useState([])
  const [savedCurrency, setSavedCurrency] = useState('USD')
  const [modalData, setModalData] = useState(null)
  const [photoSrc, setPhotoSrc] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [healthAnswers, setHealthAnswers] = useState({})
  const [healthStep, setHealthStep] = useState(0)
  const [healthDone, setHealthDone] = useState(false)
  const fileInputRef = useRef(null)

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    // Load saved photo
    const savedPhoto = localStorage.getItem('spendly_profile_photo')
    if (savedPhoto) setPhotoSrc(savedPhoto)
    // Load health answers
    try {
      const saved = JSON.parse(localStorage.getItem('spendly_health_answers') || '{}')
      setHealthAnswers(saved)
      if (Object.keys(saved).length >= HEALTH_QUESTIONS.length) setHealthDone(true)
    } catch { setHealthAnswers({}) }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await API.get('/profile')
      setProfile(res.data)
      setNewName(res.data.user.name)
      setSavedCurrency(res.data.user.currency || 'USD')
      if (!res.data.user.onboarding_done) setShowOnboarding(true)
      if (res.data.user.interests) setSelectedInterests(res.data.user.interests.split(',').filter(Boolean))
    } catch { console.log('Error fetching profile') }
    setLoading(false)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      // Resize using canvas before storing
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 200
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        setPhotoSrc(dataUrl)
        try { localStorage.setItem('spendly_profile_photo', dataUrl) } catch { console.log('Photo too large for storage') }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleUpdateName = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const res = await API.put('/profile/name', { name: newName.trim() })
      const updatedUser = { ...JSON.parse(localStorage.getItem('user') || '{}'), name: res.data.name }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setProfile(prev => ({ ...prev, user: { ...prev.user, name: res.data.name } }))
      setEditingName(false)
      showToast('Name updated!')
    } catch { showToast('Error updating name', 'error') }
  }

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault()
    if (!onboardingForm.phone || !onboardingForm.country || selectedInterests.length === 0) {
      showToast('Please fill all required fields', 'error'); return
    }
    try {
      await API.put('/profile/onboarding', { ...onboardingForm, interests: selectedInterests.join(',') })
      localStorage.setItem('currency', onboardingForm.currency)
      setShowOnboarding(false)
      showToast('Profile completed!')
      fetchProfile()
    } catch { showToast('Error saving profile', 'error') }
  }

  const handleCurrencyChange = async (currency) => {
    setSavedCurrency(currency)
    try {
      await API.put('/profile/currency', { currency })
      localStorage.setItem('currency', currency)
      showToast('Currency saved!')
    } catch { showToast('Error updating currency', 'error') }
  }

  const handleHealthAnswer = (questionId, answer) => {
    const updated = { ...healthAnswers, [questionId]: answer }
    setHealthAnswers(updated)
    localStorage.setItem('spendly_health_answers', JSON.stringify(updated))
    if (healthStep < HEALTH_QUESTIONS.length - 1) {
      setHealthStep(s => s + 1)
    } else {
      setHealthDone(true)
      showToast('Financial profile complete!')
    }
  }

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest])
  }

  if (loading) return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <ProfileSkeleton />
      </div>
    </Layout>
  )

  const balance = (profile.totalIncome || 0) - (profile.totalExpenses || 0)
  const memberSince = new Date(profile.user.created_at).toLocaleDateString('default', { month: 'long', year: 'numeric' })
  const currencySymbol = CURRENCIES.find(c => c.code === savedCurrency)?.symbol || '$'
  const bestMonthName = profile.bestMonth
    ? new Date(profile.bestMonth.year, profile.bestMonth.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    : null

  // Compute profile completion %
  const completionFields = [
    profile.user.name,
    profile.user.email,
    profile.user.phone,
    profile.user.country,
    profile.user.currency,
    photoSrc,
    selectedInterests.length > 0 ? 'yes' : '',
  ].filter(Boolean).length
  const completionPct = Math.round((completionFields / 7) * 100)

  // Achievement badges
  const achievements = [
    { icon: '🏦', label: 'First Expense', earned: profile.totalTransactions > 0 },
    { icon: '🎯', label: 'Budget Set',    earned: true },
    { icon: '💰', label: 'First Saving',  earned: true },
    { icon: '📊', label: '10 Transactions', earned: profile.totalTransactions >= 10 },
    { icon: '🤖', label: 'AI Chat',       earned: true },
    { icon: '🔥', label: 'Month Streak',  earned: profile.totalTransactions >= 5 },
    { icon: '📱', label: 'PWA Installed', earned: false },
    { icon: '🧾', label: 'Receipt Scanned', earned: false },
  ]

  const healthAnsweredCount = Object.keys(healthAnswers).length
  const healthPct = Math.round((healthAnsweredCount / HEALTH_QUESTIONS.length) * 100)

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {modalData && <NumberModal label={modalData.label} value={modalData.value} onClose={() => setModalData(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Onboarding prompt banner */}
        {!profile.user.onboarding_done && !showOnboarding && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 mb-5 text-white flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-sm">Complete your profile</p>
              <p className="text-indigo-200 text-xs mt-0.5">Add your country, phone and interests to personalise Spendly</p>
            </div>
            <button onClick={() => setShowOnboarding(true)}
              className="flex-shrink-0 bg-white text-indigo-600 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-indigo-50 transition">
              Complete
            </button>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 text-white mb-5 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white" />
          </div>

          <div className="relative flex items-start gap-4">
            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center border-2 border-white/40">
                {photoSrc
                  ? <img src={photoSrc} alt="Profile" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-white">{profile.user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                }
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <form onSubmit={handleUpdateName} className="flex gap-2 mb-1">
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-gray-800 bg-white text-sm focus:outline-none" required />
                  <button type="submit" className="bg-white text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0">Save</button>
                  <button type="button" onClick={() => setEditingName(false)}
                    className="bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs flex-shrink-0">Cancel</button>
                </form>
              ) : (
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-xl font-bold truncate">{profile.user.name}</h2>
                  <button onClick={() => setEditingName(true)} className="flex-shrink-0 opacity-70 hover:opacity-100">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-indigo-200 text-xs truncate">{profile.user.email}</p>
              <p className="text-indigo-300 text-xs mt-0.5">Member since {memberSince}</p>
              {profile.user.country && (
                <span className="inline-block mt-2 bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full">
                  {profile.user.country}
                </span>
              )}
            </div>
          </div>

          {/* Profile completion bar */}
          <div className="relative mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-indigo-200">Profile completion</span>
              <span className="text-white font-semibold">{completionPct}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full transition-all duration-500" style={{ width: completionPct + '%' }} />
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'achievements', label: 'Achievements' },
            { key: 'settings', label: 'Settings' },
            { key: 'health', label: 'Financial Health' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === t.key ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats grid — tappable */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Spent Ever',  value: currencySymbol + (profile.totalExpenses || 0).toFixed(2), color: 'text-indigo-600' },
                { label: 'Total Income Ever', value: currencySymbol + (profile.totalIncome || 0).toFixed(2),   color: 'text-green-600' },
                { label: 'Overall Balance',   value: (balance >= 0 ? '+' : '') + currencySymbol + Math.abs(balance).toFixed(2), color: balance >= 0 ? 'text-green-600' : 'text-red-500' },
                { label: 'Total Transactions',value: String(profile.totalTransactions || 0), color: 'text-purple-600' },
              ].map((stat, i) => (
                <button key={i} onClick={() => setModalData({ label: stat.label, value: stat.value })}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 text-center active:scale-95 transition-transform">
                  <p className={`text-2xl font-bold tabular-nums truncate ${stat.color}`} title={stat.value}>{stat.value}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{stat.label}</p>
                  <p className="text-gray-300 text-xs mt-0.5">Tap to expand</p>
                </button>
              ))}
            </div>

            {/* Best Month */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Best Month</h3>
              {bestMonthName ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                    🏆
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-indigo-600 truncate">{bestMonthName}</p>
                    <p className="text-green-600 font-semibold text-sm">+{currencySymbol}{(profile.bestMonth.balance || 0).toFixed(2)} balance</p>
                    <p className="text-gray-400 text-xs">Your highest savings month</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Add income and expenses to track your best month.</p>
              )}
            </div>

            {/* Account Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Account Details</h3>
              <div className="space-y-3">
                {[
                  { label: 'Name',         value: profile.user.name },
                  { label: 'Email',        value: profile.user.email },
                  profile.user.phone   && { label: 'Phone',   value: profile.user.phone },
                  profile.user.country && { label: 'Country', value: profile.user.country },
                  { label: 'Member Since', value: memberSince },
                  { label: 'Currency',     value: savedCurrency },
                ].filter(Boolean).map((item, i, arr) => (
                  <div key={i} className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                    <span className="text-gray-400 text-sm">{item.label}</span>
                    <span className="font-medium text-gray-800 dark:text-white text-sm truncate ml-4 max-w-[60%] text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interests */}
            {selectedInterests.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Your Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInterests.map(i => (
                    <span key={i} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs font-medium">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Badges Earned</h3>
              <div className="grid grid-cols-4 gap-4">
                {achievements.map((a, i) => (
                  <div key={i} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition ${a.earned ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-gray-700/30 opacity-40'}`}>
                    <span className="text-2xl">{a.icon}</span>
                    <p className="text-xs text-center text-gray-600 dark:text-gray-300 leading-tight font-medium">{a.label}</p>
                    {a.earned && <span className="text-xs text-indigo-500 font-bold">Earned</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Financial Health Score</h3>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4F46E5" strokeWidth="3"
                      strokeDasharray={`${healthPct} ${100 - healthPct}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">{healthPct}%</span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{healthAnsweredCount}/{HEALTH_QUESTIONS.length} questions answered</p>
                  <p className="text-gray-400 text-xs mt-1">Complete your financial profile to get a full health score</p>
                  <button onClick={() => setActiveTab('health')}
                    className="mt-2 text-xs text-indigo-600 font-semibold hover:underline">
                    {healthDone ? 'View answers' : 'Complete now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Profile setup / onboarding form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Profile Information</h3>
              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone Number</label>
                    <input type="tel" placeholder="+961 XX XXX XXX"
                      value={onboardingForm.phone || profile.user.phone || ''}
                      onChange={e => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                    <select value={onboardingForm.country || profile.user.country || ''}
                      onChange={e => setOnboardingForm({ ...onboardingForm, country: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-700">
                      <option value="">Select country...</option>
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Your Interests</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          selectedInterests.includes(interest)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit"
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition text-sm">
                  Save Profile
                </button>
              </form>
            </div>

            {/* Currency */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Preferred Currency</h3>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map(c => (
                  <button key={c.code} onClick={() => handleCurrencyChange(c.code)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition text-sm font-medium ${
                      savedCurrency === c.code
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
                    }`}>
                    <span className="text-base">{c.symbol}</span>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-xs">{c.code}</p>
                      <p className="text-xs text-gray-400 truncate">{c.name}</p>
                    </div>
                    {savedCurrency === c.code && <span className="ml-auto text-indigo-500 flex-shrink-0">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Account</h3>
              <button onClick={() => {
                if (window.confirm('Are you sure you want to logout?')) {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  window.location.href = '/login'
                }
              }} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-red-200 dark:border-red-900 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                Logout
              </button>
            </div>
          </div>
        )}

        {/* FINANCIAL HEALTH TAB — 20 questions */}
        {activeTab === 'health' && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Financial Health Check</h3>
                <span className="text-xs text-indigo-600 font-bold">{healthAnsweredCount}/{HEALTH_QUESTIONS.length}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: healthPct + '%' }} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Helps us give you better personalised insights</p>
            </div>

            {/* Active question */}
            {!healthDone && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-indigo-500 font-semibold">Question {healthStep + 1} of {HEALTH_QUESTIONS.length}</span>
                  {healthStep > 0 && (
                    <button onClick={() => setHealthStep(s => s - 1)}
                      className="text-xs text-gray-400 hover:text-gray-600">Back</button>
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 leading-snug">
                  {HEALTH_QUESTIONS[healthStep].q}
                </h3>
                <div className="space-y-2">
                  {HEALTH_QUESTIONS[healthStep].opts.map(opt => (
                    <button key={opt} onClick={() => handleHealthAnswer(HEALTH_QUESTIONS[healthStep].id, opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                        healthAnswers[HEALTH_QUESTIONS[healthStep].id] === opt
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-300'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Completed state */}
            {healthDone && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 text-center border border-green-200 dark:border-green-800">
                <p className="text-4xl mb-3">🏆</p>
                <p className="font-bold text-gray-800 dark:text-white">Financial profile complete!</p>
                <p className="text-gray-500 text-sm mt-1 mb-4">Your AI insights are now fully personalised</p>
                <button onClick={() => { setHealthDone(false); setHealthStep(0) }}
                  className="text-xs text-indigo-600 font-semibold hover:underline">
                  Retake assessment
                </button>
              </div>
            )}

            {/* Summary of answered questions */}
            {healthAnsweredCount > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Your Answers</h3>
                <div className="space-y-2">
                  {HEALTH_QUESTIONS.filter(q => healthAnswers[q.id]).map(q => (
                    <div key={q.id} className="flex justify-between items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <p className="text-xs text-gray-500 flex-1">{q.q}</p>
                      <span className="flex-shrink-0 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full max-w-[45%] text-right">
                        {healthAnswers[q.id]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inline onboarding modal */}
        {showOnboarding && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-0 md:px-6">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowOnboarding(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl shadow-2xl p-6 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Complete Your Profile</h3>
                  <p className="text-gray-400 text-sm mt-0.5">Just a few details to get started</p>
                </div>
                <button onClick={() => setShowOnboarding(false)} className="text-gray-400 hover:text-gray-600 p-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Phone Number *</label>
                  <input type="tel" placeholder="+961 XX XXX XXX"
                    value={onboardingForm.phone}
                    onChange={e => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Country *</label>
                  <select value={onboardingForm.country}
                    onChange={e => setOnboardingForm({ ...onboardingForm, country: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
                    <option value="">Select your country...</option>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Preferred Currency *</label>
                  <select value={onboardingForm.currency}
                    onChange={e => setOnboardingForm({ ...onboardingForm, currency: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Financial Interests * (pick at least one)</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                          selectedInterests.includes(interest)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit"
                  disabled={!onboardingForm.phone || !onboardingForm.country || selectedInterests.length === 0}
                  className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  Save Profile
                </button>
                <p className="text-center text-xs text-gray-400">You can update these anytime in Settings</p>
              </form>
            </div>
          </div>
        )}

        <footer className="text-center py-6 text-gray-400 text-xs mt-4">
          <p>2026 Spendly — Track smarter, spend better</p>
        </footer>
      </div>
    </Layout>
  )
}
