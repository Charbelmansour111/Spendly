import { useEffect, useState } from 'react'
import API from '../utils/api'

export default function VerifyEmail() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setStatus('invalid'); return }
    API.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('invalid'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">Spendly 💸</h1>
        {status === 'loading' && <p className="text-gray-500 mt-4">Verifying your email...</p>}
        {status === 'success' && (
          <>
            <p className="text-4xl my-4">✅</p>
            <h2 className="text-xl font-semibold text-gray-800">Email Verified!</h2>
            <p className="text-gray-500 mt-2 mb-6">Your account is ready. You can now log in.</p>
            <a href="/login" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition inline-block">Go to Login →</a>
          </>
        )}
        {status === 'invalid' && (
          <>
            <p className="text-4xl my-4">❌</p>
            <h2 className="text-xl font-semibold text-gray-800">Invalid Link</h2>
            <p className="text-gray-500 mt-2 mb-6">This verification link is invalid or has expired.</p>
            <a href="/register" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition inline-block">Register Again →</a>
          </>
        )}
      </div>
    </div>
  )
}