import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { createWallet } from '../utils/walletSession'
import { AVATAR_CATEGORIES, WALLET_COLORS, findAvatarById } from '../data/avatars'

const DB = 'https://api.dicebear.com/7.x'

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {['Name & Color', 'Avatar', 'PIN'].map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < step ? 'bg-violet-500 text-white' :
            i === step ? 'bg-violet-600 text-white ring-2 ring-violet-400' :
            'bg-white/10 text-white/40'
          }`}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === step ? 'text-white' : 'text-white/40'}`}>{label}</span>
          {i < 2 && <div className={`h-px w-6 ${i < step ? 'bg-violet-500' : 'bg-white/10'}`} />}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Name + Color ─────────────────────────────────────────────────────
function Step1({ name, setName, color, setColor, onNext }) {
  const err = name.trim().length === 0

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/70 text-sm mb-2">Wallet Name</label>
        <input
          type="text"
          maxLength={50}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. My Wallet, Kids, Savings…"
          className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 transition-all"
        />
      </div>

      <div>
        <label className="block text-white/70 text-sm mb-3">Wallet Color</label>
        <div className="grid grid-cols-5 gap-3">
          {WALLET_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              title={c.label}
              className={`w-12 h-12 rounded-full transition-all hover:scale-110 ${
                color === c.id ? 'ring-4 ring-white scale-110' : 'ring-2 ring-transparent'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className={`rounded-xl p-4 bg-linear-to-br ${WALLET_COLORS.find(c=>c.id===color)?.gradient || 'from-violet-500 to-violet-700'} flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">👤</div>
        <span className="text-white font-semibold">{name || 'My Wallet'}</span>
      </div>

      <button
        onClick={onNext}
        disabled={err}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold transition-all"
      >
        Next — Choose Avatar
      </button>
    </div>
  )
}

// ── Step 2: Avatar picker ────────────────────────────────────────────────────
function Step2({ avatar, setAvatar, color, onNext, onBack }) {
  const [activeCategory, setActiveCategory] = useState(AVATAR_CATEGORIES[0].id)
  const cat = AVATAR_CATEGORIES.find(c => c.id === activeCategory)
  const colorGrad = WALLET_COLORS.find(c=>c.id===color)?.gradient || 'from-violet-500 to-violet-700'

  return (
    <div className="space-y-4">
      {/* Selected avatar preview */}
      <div className={`rounded-xl p-3 bg-linear-to-br ${colorGrad} flex items-center gap-3`}>
        {avatar ? (
          <img src={findAvatarById(avatar)} alt="avatar" className="w-12 h-12 rounded-full bg-white/20 object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">?</div>
        )}
        <span className="text-white text-sm font-medium">{avatar ? 'Avatar selected' : 'No avatar selected yet'}</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {AVATAR_CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              activeCategory === c.id
                ? 'bg-violet-600 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
        {cat.avatars.map(a => (
          <button
            key={a.id}
            onClick={() => setAvatar(a.id)}
            title={a.label}
            className={`aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 ${
              avatar === a.id ? 'ring-3 ring-violet-400 scale-105' : 'ring-2 ring-transparent'
            }`}
          >
            <img
              src={a.url}
              alt={a.label}
              className="w-full h-full object-cover bg-white/5"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 font-semibold transition-all">
          Back
        </button>
        <button onClick={onNext} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all">
          Next — Set PIN
        </button>
      </div>
    </div>
  )
}

// ── Step 3: PIN setup ────────────────────────────────────────────────────────
function Step3({ pin, setPin, confirm, setConfirm, onBack, onSubmit, loading, error }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  const [stage, setStage] = useState('enter') // 'enter' | 'confirm'
  const [localError, setLocalError] = useState('')
  const current = stage === 'enter' ? pin : confirm
  const setCurrent = stage === 'enter' ? setPin : setConfirm

  function handleDigit(d) {
    if (current.length >= 6) return
    const next = current + d
    setCurrent(next)
    setLocalError('')
    if (next.length === 4 && stage === 'enter') {
      setTimeout(() => {
        setStage('confirm')
        setConfirm('')
      }, 200)
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
      setCurrent(c => c.slice(0,-1))
    } else if (stage === 'confirm') {
      setStage('enter')
      setPin('')
    }
    setLocalError('')
  }

  const displayError = localError || error
  const maxLen = pin.length >= 4 ? pin.length : 6

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-white font-semibold text-lg">
          {stage === 'enter' ? 'Create a PIN' : 'Confirm your PIN'}
        </p>
        <p className="text-white/50 text-sm mt-1">
          {stage === 'enter' ? '4–6 digit PIN to secure this wallet' : 'Enter the same PIN again'}
        </p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-3">
        {Array.from({ length: Math.max(4, current.length) }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${i < current.length ? 'bg-violet-400' : 'bg-white/20'}`}
          />
        ))}
      </div>

      {displayError && (
        <p className="text-center text-red-400 text-sm">{displayError}</p>
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
            className={`h-14 rounded-xl text-xl font-semibold transition-all
              ${k === '' ? 'invisible' : ''}
              ${loading ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'}
            `}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 font-semibold transition-all">
          Back
        </button>
        <button
          disabled
          className="flex-1 py-3 rounded-xl bg-violet-600/30 text-white/30 font-semibold cursor-default"
        >
          {loading ? 'Creating…' : 'Auto-submit on match'}
        </button>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-start px-6 pt-10 pb-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => step === 0 ? navigate('/wallets') : setStep(s => s-1)} className="text-white/50 hover:text-white transition-colors">
            ←
          </button>
          <h1 className="text-xl font-bold">Create Wallet</h1>
        </div>

        <StepBar step={step} />

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
  )
}
