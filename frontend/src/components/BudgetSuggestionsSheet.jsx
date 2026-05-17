import { useState, useEffect } from 'react'
import API from '../utils/api'
import { haptics } from '../utils/haptics'

const PRIORITY_COLORS = {
  essential:    'text-emerald-600 dark:text-emerald-400',
  recommended:  'text-blue-600 dark:text-blue-400',
  optional:     'text-amber-600 dark:text-amber-400',
}
const CATEGORY_ICONS = {
  Food: '🍔', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬',
  Subscriptions: '📱', Healthcare: '🏥', 'Personal Care': '💆', Education: '🎓',
  Family: '👨‍👩‍👧', Other: '📦',
}

function Checkbox({ checked, onChange }) {
  return (
    <button onClick={onChange}
      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition
        ${checked ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  )
}

export default function BudgetSuggestionsSheet({ existingBudgets = [], onClose, onApplied }) {
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [result, setResult]           = useState(null)
  const [selected, setSelected]       = useState({})
  const [applying, setApplying]       = useState(false)
  const [applySuccess, setApplySuccess] = useState(null)

  useEffect(() => {
    fetchSuggestions()
  }, [])

  async function fetchSuggestions() {
    setLoading(true); setError(null)
    try {
      const res = await API.post('/insights/chat', {
        message: 'generate budget suggestions',
        mode: 'budget_suggestions',
        history: [],
      })
      const { budgetSuggestions } = res.data
      if (!budgetSuggestions?.suggestions?.length) {
        setError('Could not generate suggestions — try again.'); setLoading(false); return
      }
      setResult(budgetSuggestions)
      // pre-select only categories that don't already have a budget
      const sel = {}
      budgetSuggestions.suggestions.forEach(s => {
        const alreadySet = existingBudgets.some(b => b.category === s.category)
        sel[s.category] = !alreadySet
      })
      setSelected(sel)
    } catch (e) {
      setError('Failed to fetch suggestions. Check your connection.')
    }
    setLoading(false)
  }

  const suggestions = result?.suggestions || []
  const newSuggestions = suggestions.filter(s => !existingBudgets.some(b => b.category === s.category))
  const selectedCount = Object.values(selected).filter(Boolean).length
  const allNewSelected = newSuggestions.length > 0 && newSuggestions.every(s => selected[s.category])

  function toggleAll() {
    haptics.light()
    const next = !allNewSelected
    setSelected(prev => {
      const sel = { ...prev }
      newSuggestions.forEach(s => { sel[s.category] = next })
      return sel
    })
  }

  async function applyBudgets(onlySelected) {
    haptics.medium()
    setApplying(true)
    const toApply = onlySelected
      ? suggestions.filter(s => selected[s.category])
      : suggestions

    let count = 0
    for (const s of toApply) {
      try {
        const existing = existingBudgets.find(b => b.category === s.category)
        if (existing) {
          await API.put(`/budgets/${existing.id}`, { amount: s.amount })
        } else {
          await API.post('/budgets', {
            category: s.category,
            amount: s.amount,
            period: 'monthly',
            name: `${s.category} Budget`,
          })
        }
        count++
      } catch {}
    }

    haptics.success()
    setApplySuccess(count)
    setApplying(false)
    setTimeout(() => { onApplied?.(); onClose() }, 1800)
  }

  const sym = localStorage.getItem('currency') === 'EUR' ? '€'
    : localStorage.getItem('currency') === 'GBP' ? '£' : '$'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sheet-enter max-h-[90vh] flex flex-col">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/60">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Budget Plan</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Based on your income and lifestyle</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 skeleton rounded-2xl" />
              ))}
              <p className="text-center text-xs text-gray-400 mt-4 animate-pulse">AI is analyzing your finances…</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
              <button onClick={fetchSuggestions}
                className="bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
                Try Again
              </button>
            </div>
          )}

          {applySuccess !== null && (
            <div className="text-center py-10 card-enter">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{applySuccess} budget{applySuccess !== 1 ? 's' : ''} created!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your budgets are ready.</p>
            </div>
          )}

          {result && !loading && applySuccess === null && (
            <>
              {/* Summary card */}
              <div className="bg-linear-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 mb-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-violet-200 uppercase tracking-wider">Monthly Income</span>
                  <span className="text-sm font-bold">{sym}{(result.total_budgeted + (result.projected_savings || 0)).toFixed(0)}</span>
                </div>
                <div className="flex gap-4 mb-3">
                  <div>
                    <p className="text-xs text-violet-200">Budgeted</p>
                    <p className="text-lg font-bold">{sym}{result.total_budgeted}</p>
                    <p className="text-xs text-violet-200">{result.income_used_percent}% of income</p>
                  </div>
                  <div>
                    <p className="text-xs text-violet-200">Projected Savings</p>
                    <p className="text-lg font-bold">{sym}{result.projected_savings}</p>
                    <p className="text-xs text-violet-200">{result.projected_savings_rate} rate</p>
                  </div>
                </div>
                <p className="text-xs text-violet-100 leading-relaxed">{result.summary}</p>
              </div>

              {/* Select / deselect all — only applies to categories without an existing budget */}
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">{selectedCount} selected</span>
                {newSuggestions.length > 0 && (
                  <button onClick={toggleAll} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline transition">
                    {allNewSelected ? 'Deselect New' : 'Select New'}
                  </button>
                )}
              </div>

              {/* Suggestion rows */}
              <div className="space-y-2">
                {suggestions.map((s, i) => {
                  const existing = existingBudgets.find(b => b.category === s.category)
                  return (
                    <div key={s.category}
                      className={`flex items-center gap-3 p-3 rounded-2xl card-enter ${existing ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <Checkbox checked={!!selected[s.category]} onChange={() => {
                        haptics.light()
                        setSelected(prev => ({ ...prev, [s.category]: !prev[s.category] }))
                      }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{CATEGORY_ICONS[s.category] || '📦'}</span>
                          <span className="text-sm font-semibold text-gray-800 dark:text-white">{s.category}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 ${PRIORITY_COLORS[s.priority]}`}>
                            {s.priority}
                          </span>
                          {existing && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              Already set
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{s.reasoning}</p>
                        {existing && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Current limit: {sym}{parseFloat(existing.amount).toFixed(0)} · AI suggests: {sym}{s.amount}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-violet-600 dark:text-violet-400">{sym}{s.amount}</p>
                        <p className="text-[10px] text-gray-400">{s.percentage_of_income}% of income</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        {result && !loading && applySuccess === null && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/60 flex gap-3">
            <button
              onClick={() => applyBudgets(true)}
              disabled={applying || selectedCount === 0}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95
                ${applying || selectedCount === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'}`}>
              {applying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Applying…
                </span>
              ) : `Apply Selected (${selectedCount})`}
            </button>
            <button
              onClick={() => applyBudgets(false)}
              disabled={applying}
              className="px-4 py-3 rounded-2xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95">
              All ({suggestions.length})
            </button>
          </div>
        )}

        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  )
}
