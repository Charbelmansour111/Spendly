import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { getAvatarUrl, getWalletColor, WALLET_COLORS, AVATAR_CATEGORIES, findAvatarById } from '../data/avatars'
import api from '../utils/api'
import Layout from '../components/Layout'

function ColorPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {WALLET_COLORS.map(c => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          title={c.label}
          className={`w-10 h-10 rounded-full transition-all hover:scale-110 ${
            value === c.id ? 'ring-4 ring-violet-500 scale-110 shadow-lg' : 'ring-2 ring-transparent'
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  )
}

function AvatarPicker({ value, onChange }) {
  const [activeCategory, setActiveCategory] = useState(AVATAR_CATEGORIES[0].id)
  const cat = AVATAR_CATEGORIES.find(c => c.id === activeCategory)

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {AVATAR_CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              activeCategory === c.id
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto pr-1">
        {cat.avatars.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            title={a.label}
            className={`aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 bg-gray-100 dark:bg-gray-700 ${
              value === a.id
                ? 'ring-3 ring-violet-500 scale-105 shadow-md'
                : 'ring-2 ring-transparent hover:ring-gray-300 dark:hover:ring-gray-500'
            }`}
          >
            <img src={a.url} alt={a.label} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function WalletProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { wallets, refreshWallets } = useWallet()

  const [wallet, setWallet] = useState(null)

  // Editable fields
  const [name, setName] = useState('')
  const [color, setColor] = useState('violet')
  const [avatarValue, setAvatarValue] = useState('')
  const [walletEmail, setWalletEmail] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // PIN change state
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
      setName(w.name || '')
      setColor(w.color || 'violet')
      setAvatarValue(w.avatar_value || 'spendly1')
      setWalletEmail(w.wallet_email || '')
    }
  }, [wallets, id, token, navigate])

  // Live preview wallet object
  const previewWallet = wallet
    ? { ...wallet, name, color, avatar_type: 'dicebear', avatar_value: avatarValue }
    : null

  const colorObj = WALLET_COLORS.find(c => c.id === color)
  const colorGrad = colorObj?.gradient || 'from-violet-500 to-violet-700'
  const avatarUrl = previewWallet ? getAvatarUrl(previewWallet) : null

  async function handleSave() {
    if (!wallet || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/wallets/${id}`, {
        name: name.trim(),
        color,
        avatar_type: 'dicebear',
        avatar_value: avatarValue,
        avatar_photo: null,
        wallet_email: walletEmail.trim() || null,
      })
      await refreshWallets()
      setSaved(true)
      setShowAvatarPicker(false)
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
      setCurrentPin(''); setNewPin(''); setConfirmPin('')
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

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet Profile</h1>
          <button
            onClick={() => navigate('/family')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition active:scale-95 shadow-sm shadow-violet-200 dark:shadow-violet-900/40"
          >
            <span>👨‍👩‍👧‍👦</span> Family Overview
          </button>
        </div>

        {/* Live preview card */}
        <div className={`rounded-2xl p-5 bg-linear-to-br ${colorGrad} mb-6 flex items-center gap-4 shadow-lg`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-16 h-16 rounded-2xl bg-white/25 object-cover ring-2 ring-white/30"
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/25 flex items-center justify-center text-3xl">?</div>
          )}
          <div className="min-w-0">
            <h2 className="text-white text-xl font-bold truncate">{name || 'Wallet Name'}</h2>
            <p className="text-white/70 text-sm capitalize">{colorObj?.label || color} wallet</p>
            {wallet.is_total_wallet && (
              <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Family Overview</span>
            )}
          </div>
        </div>

        {/* ── IDENTITY SECTION ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Identity</h3>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Wallet Name</label>
            <input
              type="text"
              maxLength={50}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Wallet"
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
          </div>

          {/* Color */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Avatar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Avatar</label>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(v => !v)}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                {showAvatarPicker ? 'Close picker' : 'Change avatar'}
              </button>
            </div>
            {/* Current avatar preview */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-xl overflow-hidden bg-linear-to-br ${colorGrad} shrink-0`}>
                {avatarUrl && (
                  <img src={findAvatarById(avatarValue)} alt="avatar" className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none' }} />
                )}
              </div>
              <p className="text-xs text-gray-400">
                {avatarValue ? 'Current avatar' : 'No avatar selected'}
              </p>
            </div>
            {showAvatarPicker && (
              <AvatarPicker value={avatarValue} onChange={v => { setAvatarValue(v); }} />
            )}
          </div>
        </div>

        {/* ── ACCOUNT SECTION ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Account</h3>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Creator Account Email</label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400 shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span className="text-gray-600 dark:text-gray-300 text-sm flex-1 truncate">{user.email || '—'}</span>
              <span className="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full shrink-0">read-only</span>
            </div>
          </div>

          {!wallet.is_total_wallet && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Wallet Email <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <p className="text-[11px] text-gray-400 mb-2">A secondary email specific to this wallet</p>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400 shrink-0">
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
                  <button type="button" onClick={() => setWalletEmail('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        {error && <p className="text-red-500 text-sm mb-3 px-1">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold transition shadow-sm mb-6"
        >
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
        </button>

        {/* ── PIN CHANGE ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Wallet PIN</h3>
              <p className="text-xs text-gray-400 mt-0.5">Update the 4–6 digit PIN for this wallet</p>
            </div>
            <button
              onClick={() => { setShowPinChange(!showPinChange); setPinError('') }}
              className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline"
            >
              {showPinChange ? 'Cancel' : 'Change PIN'}
            </button>
          </div>

          {pinSaved && (
            <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium">PIN updated successfully!</p>
          )}

          {showPinChange && (
            <form onSubmit={handlePinChange} className="mt-4 space-y-3">
              {[
                { label: 'Current PIN', val: currentPin, set: setCurrentPin },
                { label: 'New PIN (4–6 digits)', val: newPin, set: setNewPin },
                { label: 'Confirm new PIN', val: confirmPin, set: setConfirmPin },
              ].map(({ label, val, set }) => (
                <input
                  key={label}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={val}
                  onChange={e => set(e.target.value.replace(/\D/g, ''))}
                  placeholder={label}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 transition"
                />
              ))}
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

        {/* ── DANGER ZONE ── */}
        {!wallet.is_total_wallet && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-5">
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">Danger Zone</h3>
            <p className="text-xs text-red-500 dark:text-red-400 mb-3">
              Deleting this wallet permanently removes all expenses, budgets, goals, and data within it.
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
