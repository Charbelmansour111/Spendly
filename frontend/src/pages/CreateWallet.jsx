import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { createWallet } from '../utils/walletSession'
import { AVATAR_CATEGORIES, WALLET_COLORS, findAvatarById } from '../data/avatars'

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {['Name & Color', 'Avatar', 'PIN'].map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < step ? 'bg-violet-600 text-white' :
            i === step ? 'bg-violet-600 text-white ring-2 ring-violet-300 dark:ring-violet-700' :
            'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${
            i === step ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
          }`}>{label}</span>
          {i < 2 && <div className={`h-px w-5 ${i < step ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
        </div>
      ))}
    </div>
  )
}

function Step1({ name, setName, color, setColor, onNext }) {
  const err = name.trim().length === 0
  const colorObj = WALLET_COLORS.find(c => c.id === color)

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Wallet Name</label>
        <input
          type="text"
          maxLength={50}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. My Wallet, Kids, Savings…"
          autoFocus
          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Wallet Color</label>
        <div className="grid grid-cols-5 gap-3">
          {WALLET_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              title={c.label}
              className={`w-11 h-11 rounded-full transition-all hover:scale-110 ${
                color === c.id ? 'ring-4 ring-violet-500 scale-110 shadow-lg' : 'ring-2 ring-transparent'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        {colorObj && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Selected: {colorObj.label}</p>
        )}
      </div>

      {/* Preview card */}
      <div className={`rounded-2xl p-4 bg-linear-to-br ${colorObj?.gradient || 'from-violet-500 to-violet-700'} flex items-center gap-3 shadow-md`}>
        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-xl">👤</div>
        <div>
          <p className="text-white font-semibold">{name || 'My Wallet'}</p>
          <p className="text-white/70 text-xs capitalize">{colorObj?.label || 'Violet'} wallet</p>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={err}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-all shadow-sm"
      >
        Next — Choose Avatar
      </button>
    </div>
  )
}

function Step2({ avatar, setAvatar, color, onNext, onBack }) {
  const [activeCategory, setActiveCategory] = useState(AVATAR_CATEGORIES[0].id)
  const cat = AVATAR_CATEGORIES.find(c => c.id === activeCategory)
  const colorGrad = WALLET_COLORS.find(c => c.id === color)?.gradient || 'from-violet-500 to-violet-700'
  const selectedUrl = avatar ? findAvatarById(avatar) : null

  return (
    <div className="space-y-4">
      {/* Selected avatar preview */}
      <div className={`rounded-2xl p-4 bg-linear-to-br ${colorGrad} flex items-center gap-3 shadow-md`}>
        {selectedUrl ? (
          <img src={selectedUrl} alt="avatar" className="w-12 h-12 rounded-full bg-white/25 object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center text-2xl">?</div>
        )}
        <div>
          <p className="text-white font-medium text-sm">{avatar ? 'Avatar selected' : 'No avatar selected yet'}</p>
          <p className="text-white/60 text-xs">{avatar ? 'Looking great!' : 'Choose from below'}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {AVATAR_CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              activeCategory === c.id
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
        {cat.avatars.map(a => (
          <button
            key={a.id}
            onClick={() => setAvatar(a.id)}
            title={a.label}
            className={`aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 bg-gray-100 dark:bg-gray-700 ${
              avatar === a.id
                ? 'ring-3 ring-violet-500 scale-105 shadow-md'
                : 'ring-2 ring-transparent hover:ring-gray-300 dark:hover:ring-gray-500'
            }`}
          >
            <img
              src={a.url}
              alt={a.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all shadow-sm"
        >
          Next — Set PIN
        </button>
      </div>
    </div>
  )
}

function Step3({ pin, setPin, confirm, setConfirm, onBack, onSubmit, loading, error }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  const [stage, setStage] = useState('enter')
  const [localError, setLocalError] = useState('')
  const current = stage === 'enter' ? pin : confirm
  const setCurrent = stage === 'enter' ? setPin : setConfirm

  function handleDigit(d) {
    if (current.length >= 6) return
    const next = current + d
    setCurrent(next)
    setLocalError('')
    if (next.length === 4 && stage === 'enter') {
      setTimeout(() => { setStage('confirm'); setConfirm('') }, 200)
    }
    if (next.length >= 4 && stage === 'confirm') {
      if (next === pin) {
        setTimeout(() => onSubmit(), 200)
      } else if (next.length === pin.length) {
        setLocalError("PINs don't match. Try again.")
        setTimeout(() => { setStage('enter'); setPin(''); setConfirm(''); setLocalError('') }, 1200)
      }
    }
  }

  function handleBack() {
    if (current.length > 0) {
      setCurrent(c => c.slice(0, -1))
    } else if (stage === 'confirm') {
      setStage('enter')
      setPin('')
    }
    setLocalError('')
  }

  const displayError = localError || error

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-gray-900 dark:text-white font-semibold text-lg">
          {stage === 'enter' ? 'Create a PIN' : 'Confirm your PIN'}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {stage === 'enter' ? '4–6 digit PIN to secure this wallet' : 'Enter the same PIN again'}
        </p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-3">
        {Array.from({ length: Math.max(4, current.length) }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < current.length
                ? 'bg-violet-600 scale-110'
                : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {displayError && (
        <p className="text-center text-red-500 text-sm">{displayError}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k, i) => (
          <button
            key={i}
            onClick={() => {
              if (k === '⌫') handleBack()
              else if (k !== '') handleDigit(k)
            }}
            disabled={loading || k === ''}
            className={`h-14 rounded-xl text-xl font-semibold transition-all select-none
              ${k === '' ? 'invisible' : ''}
              ${loading ? 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600' :
                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 shadow-sm'}
            `}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-all"
        >
          Back
        </button>
        <button
          disabled
          className="flex-1 py-3 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-400 dark:text-violet-600 font-semibold cursor-default text-sm"
        >
          {loading ? 'Creating…' : 'Auto-submits on match'}
        </button>
      </div>
    </div>
  )
}

export default function CreateWallet() {
  const navigate = useNavigate()
  const { refreshWallets } = useWallet()
  const token = localStorage.getItem('token')

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [color, setColor] = useState('violet')
  const [avatar, setAvatar] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await createWallet({
        name: name.trim(),
        color,
        avatar_type: 'dicebear',
        avatar_value: avatar || 'spendly1',
        pin,
      }, token)
      await refreshWallets()
      navigate('/wallets', { replace: true })
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  if (!token) { navigate('/login'); return null }

  function handleBack() {
    if (step === 0) navigate('/wallets')
    else setStep(s => s - 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={handleBack}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <span className="font-bold text-gray-900 dark:text-white">Spendly</span>
        </div>
        <h2 className="ml-auto font-semibold text-gray-700 dark:text-gray-300 text-sm">Create Wallet</h2>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <StepBar step={step} />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          {step === 0 && (
            <Step1
              name={name} setName={setName}
              color={color} setColor={setColor}
              onNext={() => { if (name.trim()) setStep(1) }}
            />
          )}

          {step === 1 && (
            <Step2
              avatar={avatar} setAvatar={setAvatar}
              color={color}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <Step3
              pin={pin} setPin={setPin}
              confirm={confirm} setConfirm={setConfirm}
              onBack={() => { setStep(1); setPin(''); setConfirm('') }}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  )
}
