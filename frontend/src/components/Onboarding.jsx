import { useState } from 'react'
import API from '../utils/api'

const STEPS = [
  {
    emoji: '👋',
    title: 'Welcome to Spendly!',
    desc: "You're all set. Let's take 30 seconds to personalize your experience.",
    cta: 'Get started',
  },
  {
    emoji: '💰',
    title: 'Add your first income',
    desc: 'How much do you earn per month? This helps us calculate your savings rate and give you accurate insights.',
    cta: 'Continue',
    field: { label: 'Monthly income', key: 'income', type: 'number', placeholder: '0.00' },
  },
  {
    emoji: '🎯',
    title: 'Set a monthly budget',
    desc: 'Pick a category to set a spending limit on. You can add more later in Budgets.',
    cta: 'Continue',
    field: { label: 'Food budget per month', key: 'foodBudget', type: 'number', placeholder: '0.00' },
  },
  {
    emoji: '🏦',
    title: 'Set a savings goal',
    desc: 'What are you saving for? Even a small goal gives your savings purpose.',
    cta: "Let's go!",
    fields: [
      { label: 'Goal name', key: 'goalName', type: 'text', placeholder: 'e.g. Emergency Fund, Vacation…' },
      { label: 'Target amount', key: 'goalAmount', type: 'number', placeholder: '0.00' },
    ],
  },
]

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ income: '', foodBudget: '', goalName: '', goalAmount: '' })
  const [saving, setSaving] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = async () => {
    if (isLast) {
      setSaving(true)
      try {
        const today = new Date()
        const promises = []
        if (parseFloat(data.income) > 0) {
          promises.push(API.post('/income', {
            amount: parseFloat(data.income), source: 'Salary', is_recurring: true,
            date: today.toISOString().split('T')[0],
          }))
        }
        if (parseFloat(data.foodBudget) > 0) {
          promises.push(API.post('/budgets', { category: 'Food', amount: parseFloat(data.foodBudget) }))
        }
        if (data.goalName && parseFloat(data.goalAmount) > 0) {
          promises.push(API.post('/savings', {
            name: data.goalName, target_amount: parseFloat(data.goalAmount), saved_amount: 0,
          }))
        }
        await Promise.allSettled(promises)
      } catch { /* non-blocking */ }
      setSaving(false)
    }
    if (isLast) { onDone(); return }
    setStep(s => s + 1)
  }

  const skip = () => onDone()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div className="h-full bg-violet-600 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs text-gray-400 font-medium">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 && (
              <button onClick={skip} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                Skip setup
              </button>
            )}
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">{current.emoji}</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{current.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{current.desc}</p>
          </div>

          {/* Fields */}
          {current.field && (
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">{current.field.label}</label>
              <input
                type={current.field.type}
                placeholder={current.field.placeholder}
                value={data[current.field.key]}
                onChange={e => setData(d => ({ ...d, [current.field.key]: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}
          {current.fields && (
            <div className="space-y-3 mb-6">
              {current.fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={data[f.key]}
                    onChange={e => setData(d => ({ ...d, [f.key]: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={saving}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 text-sm"
          >
            {saving ? 'Setting up…' : current.cta}
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-6">
          {STEPS.map((_, i) => (
            <span key={i} className={`rounded-full transition-all ${i === step ? 'w-4 h-1.5 bg-violet-600' : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-600'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
