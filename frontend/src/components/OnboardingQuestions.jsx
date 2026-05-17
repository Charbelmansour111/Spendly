import { useState } from 'react'
import API from '../utils/api'
import { getWalletKey, saveProfile } from '../utils/profile'

const STEP_COUNT = 4
const CURRENT_YEAR = new Date().getFullYear()
const GRAD_YEARS = Array.from({ length: 9 }, (_, i) => CURRENT_YEAR + i)

function MultiCard({ emoji, label, desc, selected, onClick }) {
  return (
    <button onClick={onClick} className="cursor-pointer relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all duration-150 active:scale-95"
      style={selected
        ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.07)' }
        : { borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
      <span className="text-3xl">{emoji}</span>
      <span className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{label}</span>
      {desc && <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{desc}</span>}
    </button>
  )
}

function ProgressDots({ current, total }) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{
            width: i <= current ? '24px' : '8px',
            height: '8px',
            background: i < current ? '#7C3AED' : i === current ? '#A78BFA' : '#E5E7EB',
          }} />
      ))}
    </div>
  )
}

export default function OnboardingQuestions({ onDone }) {
  const [step, setStep] = useState(0)

  // Step 0 — roles (multi-select Set)
  const [roles, setRoles] = useState(new Set())

  // Step 1 — living situation
  const [housing, setHousing] = useState(null)
  const [paysTuition, setPaysTuition] = useState(null)
  const [graduationYear, setGraduationYear] = useState('')
  const [familySupportMonthly, setFamilySupportMonthly] = useState('')

  // Step 2 — financial priorities (multi-select, max 3)
  const [priorities, setPriorities] = useState(new Set())

  // Step 3 — income sources (multi-select)
  const [incomeSources, setIncomeSources] = useState(new Set())

  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const isStudent = roles.has('student')
  const hasFamily = roles.has('parent') || roles.has('family')

  const toggleRole = (v) => setRoles(prev => {
    const next = new Set(prev); next.has(v) ? next.delete(v) : next.add(v); return next
  })
  const togglePriority = (v) => setPriorities(prev => {
    const next = new Set(prev)
    if (next.has(v)) next.delete(v)
    else if (next.size < 3) next.add(v)
    return next
  })
  const toggleIncome = (v) => setIncomeSources(prev => {
    const next = new Set(prev); next.has(v) ? next.delete(v) : next.add(v); return next
  })

  const canNext = () => {
    if (step === 0) return roles.size > 0
    if (step === 1) return !!housing
    if (step === 2) return priorities.size > 0
    if (step === 3) return incomeSources.size > 0
    return true
  }

  const handleNext = () => {
    if (step < STEP_COUNT - 1) { setStep(s => s + 1); return }
    handleFinish()
  }

  const handleFinish = async () => {
    setSaving(true)
    const profile = {
      roles: [...roles],
      housing,
      pays_tuition: isStudent ? paysTuition : null,
      graduation_year: isStudent && graduationYear ? parseInt(graduationYear) : null,
      family_support_monthly: hasFamily && familySupportMonthly ? parseFloat(familySupportMonthly) : 0,
      financial_priorities: [...priorities],
      income_types: [...incomeSources],
      created_at: new Date().toISOString(),
    }
    saveProfile(profile)
    try {
      await API.post('/onboarding', {
        life_situation: [...roles].join(','),
        housing,
        financial_priority: [...priorities].join(','),
        employment_status: [...incomeSources].join(','),
        pays_tuition: paysTuition === true,
        graduation_year: profile.graduation_year,
        family_support_monthly: profile.family_support_monthly,
      })
    } catch {}
    localStorage.setItem(`fina_questions_${getWalletKey()}`, '1')
    setSaving(false)
    setDone(true)
  }

  if (done) {
    const roleLabels = { student: 'student', working: 'working professional', parent: 'caregiver', self_employed: 'self-employed', family: 'family supporter' }
    const roleStr = [...roles].map(r => roleLabels[r] || r).join(' & ')

    const topPriority = [...priorities][0]
    const priorityMsg = {
      emergency_fund: "My first focus will be your safety net — 3 to 6 months of expenses. It changes everything.",
      education: "I'll help you separate education costs from daily spending so you always know where you stand.",
      home: "I'll track your home savings progress and flag every opportunity to contribute more.",
      debt_free: "Every budget suggestion I give you will lean toward debt reduction first.",
      big_goal: "I'll break your big goal into monthly milestones so it stops feeling impossible.",
      wealth: "I'll flag saving opportunities, surplus patterns, and when it might be time to consider investing.",
    }

    const complexNote = isStudent && hasFamily && parseFloat(familySupportMonthly) > 0
      ? `You carry real financial weight — studying while contributing $${familySupportMonthly}/month to your family. I'll make sure every piece of advice accounts for both realities, not just one.`
      : isStudent && profile?.pays_tuition
        ? "Paying your own tuition is a significant commitment. I'll factor it into all budget advice."
        : `I now have a complete picture of your life as a ${roleStr}.`

    return (
      <div className="fixed inset-0 z-80 flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a0a2e 40%, #0d1b3e 70%, #060c1a 100%)' }}>
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full text-center"
          style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-center mx-auto mb-5"
            style={{ width: '72px', height: '72px', background: '#F0FDF4', borderRadius: '50%', animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Perfect — I know you now.</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{complexNote}</p>
          {topPriority && priorityMsg[topPriority] && (
            <p className="text-sm font-medium leading-relaxed mb-6" style={{ color: '#7C3AED' }}>
              {priorityMsg[topPriority]}
            </p>
          )}
          <button onClick={() => onDone?.()}
            className="cursor-pointer w-full text-white font-bold py-3.5 rounded-2xl transition active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
            Continue to Tour →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a0a2e 40%, #0d1b3e 70%, #060c1a 100%)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full modal-enter max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}>

        <ProgressDots current={step} total={STEP_COUNT} />

        {/* Step 0 — Roles (multi-select) */}
        {step === 0 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Let's personalize your experience</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">4 quick questions — the more context, the better advice</p>
            <p className="text-xs font-semibold mb-5" style={{ color: '#7C3AED' }}>Select all that apply — you can pick multiple</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '🎓', label: 'Student', desc: 'University or school', val: 'student' },
                { emoji: '💼', label: 'Working', desc: 'Employed full or part-time', val: 'working' },
                { emoji: '👨‍👩‍👧', label: 'Supporting family', desc: 'Parents, children or both', val: 'parent' },
                { emoji: '🏢', label: 'Self-employed', desc: 'Freelance or business owner', val: 'self_employed' },
              ].map(o => (
                <MultiCard key={o.val} {...o} selected={roles.has(o.val)} onClick={() => toggleRole(o.val)} />
              ))}
            </div>
            {roles.size > 1 && (
              <p className="text-xs text-center mt-3" style={{ color: '#10B981' }}>
                {roles.size} selected — I'll tailor advice for your full situation
              </p>
            )}
          </div>
        )}

        {/* Step 1 — Living situation */}
        {step === 1 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Your living situation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Helps calibrate your real cost of living</p>

            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Where do you currently live?</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { emoji: '🔑', label: 'Pay rent / mortgage', val: 'rent' },
                { emoji: '👨‍👩‍👧', label: 'With family', val: 'family' },
                { emoji: '🏛️', label: 'Campus / dorm', val: 'campus' },
                { emoji: '🤝', label: 'Share rent', val: 'shared' },
              ].map(o => (
                <button key={o.val} onClick={() => setHousing(o.val)}
                  className="cursor-pointer flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all active:scale-95"
                  style={housing === o.val
                    ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.07)' }
                    : { borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                  <span className="text-3xl">{o.emoji}</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{o.label}</span>
                </button>
              ))}
            </div>

            {/* Student sub-questions */}
            {isStudent && housing && (
              <div className="space-y-3 p-4 rounded-2xl mb-3 card-enter"
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">🎓 Student details</p>

                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Do you pay your own tuition?</p>
                  <div className="flex gap-2">
                    {[{ label: '✅ Yes, I pay it', val: true }, { label: '👨‍👩‍👧 Family pays', val: false }].map(o => (
                      <button key={String(o.val)} onClick={() => setPaysTuition(o.val)}
                        className="cursor-pointer flex-1 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
                        style={paysTuition === o.val
                          ? { background: '#7C3AED', color: 'white' }
                          : { background: 'var(--color-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Expected graduation year (optional)</p>
                  <select value={graduationYear} onChange={e => setGraduationYear(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer">
                    <option value="">Not sure / skip</option>
                    {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Family support sub-question */}
            {hasFamily && housing && (
              <div className="p-4 rounded-2xl card-enter"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">👨‍👩‍👧 Monthly family contribution</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">How much do you give to / spend on family per month? (optional — helps the AI be more accurate)</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                  <input type="number" min="0" step="50" value={familySupportMonthly}
                    onChange={e => setFamilySupportMonthly(e.target.value)}
                    placeholder="e.g. 300"
                    className="w-full pl-7 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Financial priorities (multi-select, max 3) */}
        {step === 2 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Your money goals</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">I'll centre all advice around these</p>
            <p className="text-xs font-semibold mb-5" style={{ color: '#7C3AED' }}>
              Pick up to 3 — order matters (first = top priority)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '🛟', label: 'Emergency fund', val: 'emergency_fund' },
                { emoji: '🎓', label: 'Education savings', val: 'education' },
                { emoji: '🏠', label: 'Save for a home', val: 'home' },
                { emoji: '💳', label: 'Get out of debt', val: 'debt_free' },
                { emoji: '✈️', label: 'Big goal / dream', val: 'big_goal' },
                { emoji: '📈', label: 'Grow my wealth', val: 'wealth' },
              ].map(o => (
                <MultiCard key={o.val} {...o} selected={priorities.has(o.val)} onClick={() => togglePriority(o.val)} />
              ))}
            </div>
            {priorities.size === 3 && (
              <p className="text-xs text-amber-500 text-center mt-3">Maximum 3 priorities selected</p>
            )}
            {priorities.size > 0 && priorities.size < 3 && (
              <p className="text-xs text-center mt-3" style={{ color: '#10B981' }}>
                {3 - priorities.size} more slot{priorities.size < 2 ? 's' : ''} available
              </p>
            )}
          </div>
        )}

        {/* Step 3 — Income sources (multi-select) */}
        {step === 3 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Your income sources</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Helps calibrate saving and budgeting advice</p>
            <p className="text-xs font-semibold mb-5" style={{ color: '#7C3AED' }}>Select all that apply</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '💰', label: 'Fixed salary', desc: 'Regular monthly pay', val: 'salaried' },
                { emoji: '📊', label: 'Freelance', desc: 'Variable / project income', val: 'freelance' },
                { emoji: '⏰', label: 'Part-time', desc: 'Hourly or shift work', val: 'part_time' },
                { emoji: '💵', label: 'Allowance', desc: 'Stipend or family support', val: 'allowance' },
                { emoji: '🏢', label: 'Business owner', desc: 'Run my own company', val: 'business_owner' },
                { emoji: '🏠', label: 'Passive / rental', desc: 'Investments or property', val: 'passive' },
              ].map(o => (
                <MultiCard key={o.val} {...o} selected={incomeSources.has(o.val)} onClick={() => toggleIncome(o.val)} />
              ))}
            </div>
            {incomeSources.size > 1 && (
              <p className="text-xs text-center mt-3" style={{ color: '#10B981' }}>
                Multiple income streams — I'll give advice suited to variable or combined income
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="cursor-pointer px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              ← Back
            </button>
          )}
          <button onClick={handleNext} disabled={!canNext() || saving}
            className="cursor-pointer flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
            style={canNext() && !saving
              ? { background: '#7C3AED', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }
              : { background: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'not-allowed' }}>
            {saving ? 'Saving…' : step === STEP_COUNT - 1 ? 'Finish →' : 'Next →'}
          </button>
        </div>

        <button onClick={() => { localStorage.setItem(`fina_questions_${getWalletKey()}`, '1'); onDone?.() }}
          className="cursor-pointer w-full text-center text-xs text-gray-400 mt-3 hover:text-gray-500 transition py-1">
          Skip for now
        </button>
      </div>
    </div>
  )
}
