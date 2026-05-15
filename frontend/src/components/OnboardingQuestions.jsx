import { useState, useEffect } from 'react'
import API from '../utils/api'

const STEP_COUNT = 4

function OptionCard({ emoji, label, desc, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all duration-150 active:scale-95
        ${selected
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/25'
          : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-violet-200 dark:hover:border-violet-700'}`}>
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
        <div key={i} className={`rounded-full transition-all duration-300 ${i < current ? 'w-6 h-2 bg-violet-600' : i === current ? 'w-6 h-2 bg-violet-400' : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'}`} />
      ))}
    </div>
  )
}

export default function OnboardingQuestions({ onDone }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({
    life_situation: null,
    housing: null,
    financial_priority: null,
    employment_status: null,
    pays_tuition: null,
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const set = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }))

  const canNext = () => {
    if (step === 0) return !!answers.life_situation
    if (step === 1) return !!answers.housing
    if (step === 2) return !!answers.financial_priority
    if (step === 3) return !!answers.employment_status
    return true
  }

  const handleNext = () => {
    if (step < STEP_COUNT - 1) { setStep(s => s + 1); return }
    handleFinish()
  }

  const handleFinish = async () => {
    setSaving(true)
    const uid = JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'
    try {
      await API.post('/onboarding', {
        life_situation: answers.life_situation,
        housing: answers.housing,
        financial_priority: answers.financial_priority,
        employment_status: answers.employment_status,
        pays_tuition: answers.pays_tuition === true,
        dependents: answers.life_situation === 'parent' ? answers.housing : null,
      })
    } catch {}
    localStorage.setItem(`fina_questions_${uid}`, '1')
    setSaving(false)
    setDone(true)
    setTimeout(() => onDone?.(), 3000)
  }

  if (done) {
    const msgs = {
      student: answers.pays_tuition
        ? "I've set up a tuition savings recommendation for you and adjusted your budget suggestions to account for it."
        : "I'll give you practical advice that fits a student budget and lifestyle.",
      parent: "I'll factor in your family expenses when giving budget advice and help you plan for your children's needs.",
      professional: "I'll help you optimize your budget with your fixed costs as anchors and build toward your savings goals.",
      independent: "I'll help you make the most of your independence — smart budgets, clear goals, real growth.",
    }
    return (
      <div className="fixed inset-0 z-[80] bg-gray-950/95 backdrop-blur-md flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full text-center modal-enter">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Perfect! I know you now.</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
            {msgs[answers.life_situation] || "I'll give you personalized financial advice based on your profile."}
          </p>
          <button onClick={() => onDone?.()}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-2xl transition active:scale-95">
            Let's Start →
          </button>
        </div>
      </div>
    )
  }

  const housingOptions = {
    student: [
      { emoji: '🏠', label: 'I pay rent myself', desc: 'I handle all my expenses', val: 'rent_self' },
      { emoji: '👨‍👩‍👧', label: 'Parents cover housing', desc: 'I handle personal costs', val: 'family_partial' },
      { emoji: '🎓', label: 'Parents cover nearly everything', desc: 'I manage only pocket money', val: 'family_full' },
      { emoji: '🏛️', label: 'Campus / student housing', desc: 'University accommodation', val: 'campus' },
    ],
    parent: [
      { emoji: '👶', label: '1 child', desc: null, val: '1_child' },
      { emoji: '👶👶', label: '2 children', desc: null, val: '2_children' },
      { emoji: '👨‍👩‍👧‍👦', label: '3+ children', desc: null, val: '3plus_children' },
      { emoji: '🏡', label: 'Children + parents I support', desc: null, val: 'extended_family' },
    ],
    default: [
      { emoji: '🔑', label: 'I rent my own place', desc: null, val: 'rent' },
      { emoji: '🏡', label: 'I own my home', desc: null, val: 'own' },
      { emoji: '👨‍👩‍👧', label: 'Living with family', desc: 'Lower housing costs', val: 'with_family' },
      { emoji: '🤝', label: 'Sharing rent', desc: 'With roommates', val: 'shared_rent' },
    ],
  }

  const currentHousingOptions = housingOptions[answers.life_situation] || housingOptions.default
  const showTuition = answers.life_situation === 'student'
    && (answers.housing === 'rent_self' || answers.housing === 'family_partial')

  return (
    <div className="fixed inset-0 z-[80] bg-gray-950/95 backdrop-blur-md flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full modal-enter max-h-[90vh] overflow-y-auto">

        <ProgressDots current={step} total={STEP_COUNT} />

        {/* Step 0 — Life Situation */}
        {step === 0 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Let's personalize your experience</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">4 quick questions so I can give you better advice</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Which best describes you right now?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '🎓', label: 'Student', desc: 'At university or high school', val: 'student' },
                { emoji: '💼', label: 'Professional', desc: 'Full-time or part-time employed', val: 'professional' },
                { emoji: '👨‍👩‍👧', label: 'Parent', desc: 'Managing family expenses', val: 'parent' },
                { emoji: '🏠', label: 'Independent', desc: 'Living on my own or with roommates', val: 'independent' },
              ].map(o => (
                <OptionCard key={o.val} {...o} selected={answers.life_situation === o.val} onClick={() => set('life_situation', o.val)} />
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Housing */}
        {step === 1 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {answers.life_situation === 'parent' ? 'How many depend on you?' : 'Your housing situation?'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This helps calibrate your budget recommendations</p>
            <div className="grid grid-cols-2 gap-3">
              {currentHousingOptions.map(o => (
                <OptionCard key={o.val} {...o} selected={answers.housing === o.val} onClick={() => set('housing', o.val)} />
              ))}
            </div>

            {showTuition && answers.housing && (
              <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-100 dark:border-violet-800/40 card-enter">
                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Do you pay your own university tuition fees?</p>
                <div className="flex gap-3">
                  {[
                    { label: '🎓 Yes, I pay it', val: true },
                    { label: '👨‍👩‍👧 Family pays', val: false },
                  ].map(o => (
                    <button key={String(o.val)} onClick={() => set('pays_tuition', o.val)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95
                        ${answers.pays_tuition === o.val
                          ? 'bg-violet-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Financial Priority */}
        {step === 2 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Your #1 money goal?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">I'll focus my advice around this</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '🛟', label: 'Build emergency savings', val: 'emergency_fund' },
                { emoji: '🎓', label: 'Save for education', val: 'education' },
                { emoji: '🏠', label: 'Save for a home', val: 'home' },
                { emoji: '💳', label: 'Get out of debt', val: 'debt_free' },
                { emoji: '✈️', label: 'Save for a big goal', val: 'big_goal' },
                { emoji: '📈', label: 'Grow my wealth', val: 'wealth' },
              ].map(o => (
                <OptionCard key={o.val} {...o} selected={answers.financial_priority === o.val} onClick={() => set('financial_priority', o.val)} />
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Employment */}
        {step === 3 && (
          <div className="card-enter">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">How would you describe your income?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Helps me give relevant saving and budgeting advice</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '💰', label: 'Fixed monthly salary', val: 'salaried' },
                { emoji: '📊', label: 'Freelance — varies', val: 'freelance' },
                { emoji: '⏰', label: 'Part-time income', val: 'part_time' },
                { emoji: '💵', label: 'Student allowance', val: 'allowance' },
                { emoji: '🏢', label: 'I run a business', val: 'business_owner' },
              ].map(o => (
                <OptionCard key={o.val} {...o} selected={answers.employment_status === o.val} onClick={() => set('employment_status', o.val)} />
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              ← Back
            </button>
          )}
          <button onClick={handleNext} disabled={!canNext() || saving}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95
              ${canNext() && !saving
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}>
            {saving ? 'Saving…' : step === STEP_COUNT - 1 ? 'Finish →' : 'Next →'}
          </button>
        </div>

        <button onClick={() => { const uid = JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'; localStorage.setItem(`fina_questions_${uid}`, '1'); onDone?.() }}
          className="w-full text-center text-xs text-gray-400 mt-3 hover:text-gray-500 transition py-1">
          Skip for now
        </button>
      </div>
    </div>
  )
}
