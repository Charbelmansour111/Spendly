import { useEffect, useState } from 'react'
import API from '../utils/api'

export default function VerifyEmail() {
  const [status, setStatus] = useState(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    return token ? 'loading' : 'invalid'
  })

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) return
    API.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('invalid'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <a href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">Fynlo</span>
        </a>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Email Verified</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Your account is ready. Welcome to Fynlo.</p>
            <a href="/login" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition inline-block">
              Go to Login →
            </a>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Invalid Link</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">This verification link is invalid or has expired.</p>
            <a href="/register" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition inline-block">
              Register Again →
            </a>
          </>
        )}
      </div>
    </div>
  )
}
