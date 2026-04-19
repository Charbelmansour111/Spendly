import { useState, useEffect } from 'react'
import API from '../utils/api'

const SPECIALTIES = [
  'Personal Finance & Budgeting',
  'Retirement Planning',
  'Investment Management',
  'Debt Management',
  'Tax Planning',
  'Real Estate Finance',
  'Business Finance',
  'Insurance & Risk',
  'General Financial Advice',
]

const COUNTRIES = [
  'Lebanon', 'Saudi Arabia', 'UAE', 'Jordan', 'Egypt',
  'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Other',
]

function StarRating({ rating, size = 13 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} className="shrink-0">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2 mb-1" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-2/3 mb-4" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  )
}

function AdvisorCard({ advisor }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg shrink-0">
          {advisor.full_name?.charAt(0) || '?'}
        </div>
        <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium shrink-0">
          {advisor.license_type}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{advisor.full_name}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{advisor.institution}</p>
      <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2 truncate">{advisor.specialty}</p>

      {advisor.languages && (
        <p className="text-xs text-gray-400 mb-2 truncate">{advisor.languages}</p>
      )}

      {advisor.years_experience > 0 && (
        <p className="text-xs text-gray-400 mb-2">{advisor.years_experience} yrs experience</p>
      )}

      <div className="flex items-center justify-between mb-4">
        {parseFloat(advisor.rating) > 0 ? (
          <div className="flex items-center gap-1.5">
            <StarRating rating={parseFloat(advisor.rating)} />
            <span className="text-xs text-gray-500">({advisor.total_reviews})</span>
          </div>
        ) : (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">New</span>
        )}
        {advisor.offers_free_consultation ? (
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium shrink-0">
            Free consult
          </span>
        ) : advisor.consultation_fee > 0 ? (
          <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0">
            {parseFloat(advisor.consultation_fee).toLocaleString()} {advisor.fee_currency}
          </span>
        ) : null}
      </div>

      <a
        href={`mailto:?subject=Inquiry via Spendly Advisor Directory&body=Hi, I found your profile on Spendly and would like to connect.`}
        className="block w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium text-center transition"
      >
        Contact
      </a>
    </div>
  )
}

export default function AdvisorDirectory() {
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [specialty, setSpecialty] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (specialty) params.append('specialty', specialty)
    if (country) params.append('country', country)
    API.get(`/advisor/directory?${params.toString()}`)
      .then(r => setAdvisors(r.data))
      .catch(() => setAdvisors([]))
      .finally(() => setLoading(false))
  }, [specialty, country])

  const loggedIn = !!localStorage.getItem('token')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700/60 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Spendly</span>
          </a>
          {loggedIn ? (
            <a href="/dashboard" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Dashboard →
            </a>
          ) : (
            <a href="/login" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Login →
            </a>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Find a Financial Advisor</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Connect with verified financial advisors in your region. All advisors are reviewed and approved by the Spendly team.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Specialties</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : advisors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No advisors found</h3>
            <p className="text-sm text-gray-400">
              {specialty || country ? 'Try adjusting your filters.' : 'No advisors are currently listed in the directory.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{advisors.length} advisor{advisors.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {advisors.map(a => <AdvisorCard key={a.id} advisor={a} />)}
            </div>
          </>
        )}

        {/* CTA for advisors */}
        <div className="mt-12 bg-indigo-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">Are you a financial advisor?</h2>
          <p className="text-indigo-200 text-sm mb-6">Join our verified advisor network and connect with clients who need your expertise.</p>
          <a
            href={loggedIn ? '/advisor/apply' : '/register'}
            className="inline-block px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition"
          >
            Apply Now →
          </a>
        </div>
      </main>
    </div>
  )
}
