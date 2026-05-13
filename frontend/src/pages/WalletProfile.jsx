import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor } from '../data/avatars'
import api from '../utils/api'
import Layout from '../components/Layout'

export default function WalletProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { wallets, refreshWallets } = useWallet()

  const [wallet, setWallet] = useState(null)
  const [walletEmail, setWalletEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [showPinChange, setShowPinChange] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaved, setPinSaved] = useState(false)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    const w = wallets.find(w => String(w.id) === String(id))
    if (w) {
      setWallet(w)
      setWalletEmail(w.wallet_email || '')
    }
  }, [wallets, id, token, navigate])

  async function handleSave() {
    if (!wallet) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/wallets/${id}`, {
        name: wallet.name,
        color: wallet.color,
        avatar_type: wallet.avatar_type,
        avatar_value: wallet.avatar_value,
        avatar_photo: wallet.avatar_photo || null,
        wallet_email: walletEmail.trim() || null,
      })
      await refreshWallets()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handlePinChange(e) {
    e.preventDefault()
    setPinError('')
    if (newPin.length < 4) { setPinError('New PIN must be at least 4 digits'); return }
    if (newPin !== confirmPin) { setPinError("PINs don't match"); return }
    setPinSaving(true)
    try {
      await api.post(`/wallets/${id}/change-pin`, { current_pin: currentPin, new_pin: newPin })
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setShowPinChange(false)
      setPinSaved(true)
      setTimeout(() => setPinSaved(false), 3000)
    } catch (e) {
      setPinError(e.response?.data?.message || 'PIN change failed')
    } finally {
      setPinSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this wallet? All its data will be permanently lost.')) return
    try {
      await api.delete(`/wallets/${id}`)
      await refreshWallets()
      navigate('/wallets', { replace: true })
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete wallet')
    }
  }

  if (!wallet) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      </Layout>
    )
  }

  const color = getWalletColor(wallet.color)
  const avatarUrl = getAvatarUrl(wallet)

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/wallets')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition mb-5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to wallets
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Wallet Profile</h1>

        {/* Wallet preview card */}
        <div className={`rounded-2xl p-6 bg-linear-to-br ${color.gradient} mb-6 flex items-center gap-4 shadow-lg`}>
          <img
            src={avatarUrl}
            alt={wallet.name}
            className="w-16 h-16 rounded-full bg-white/25 object-cover ring-2 ring-white/30"
            onError={e => { e.target.style.display = 'none' }}
          />
          <div>
            <h2 className="text-white text-xl font-bold">{wallet.name}</h2>
            <p className="text-white/70 text-sm capitalize">{wallet.color} wallet</p>
            {wallet.is_total_wallet && (
              <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                Family Overview
              </span>
            )}
          </div>
        </div>

        {/* Account section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Account</h3>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Creator Account Email
            </label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-200 text-sm flex-1 truncate">{user.email || '—'}</span>
              <span className="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full shrink-0">
                read-only
              </span>
            </div>
          </div>

          {!wallet.is_total_wallet && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Wallet Email <span className="text-gray-400 font-normal">(optional — secondary email for this wallet)</span>
              </label>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  value={walletEmail}
                  onChange={e => setWalletEmail(e.target.value)}
                  placeholder="wallet@example.com"
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none"
                />
                {walletEmail && (
                  <button
                    onClick={() => setWalletEmail('')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        {error && (
          <p className="text-red-500 text-sm mb-3 px-1">{error}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold transition shadow-sm mb-6"
        >
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Change PIN */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Wallet PIN</h3>
              <p className="text-xs text-gray-400 mt-0.5">Update the PIN for this wallet</p>
            </div>
            <button
              onClick={() => { setShowPinChange(!showPinChange); setPinError('') }}
              className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline"
            >
              {showPinChange ? 'Cancel' : 'Change PIN'}
            </button>
          </div>

          {pinSaved && (
            <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium">
              PIN updated successfully!
            </p>
          )}

          {showPinChange && (
            <form onSubmit={handlePinChange} className="mt-4 space-y-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Current PIN"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New PIN (4–6 digits)"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm new PIN"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
              {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
              <button
                type="submit"
                disabled={pinSaving}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold transition"
              >
                {pinSaving ? 'Updating…' : 'Update PIN'}
              </button>
            </form>
          )}
        </div>

        {/* Danger zone */}
        {!wallet.is_total_wallet && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-5">
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">Danger Zone</h3>
            <p className="text-xs text-red-500 dark:text-red-400 mb-3">
              Deleting this wallet will permanently remove all expenses, budgets, goals, and data within it.
            </p>
            <button
              onClick={handleDelete}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition"
            >
              Delete Wallet
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
