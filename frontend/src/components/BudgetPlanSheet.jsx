import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import API from '../utils/api'
import { getActiveWallet } from '../utils/walletSession'

const PROFILE_LABELS = {
  student_family_pays:           'Student (family covers costs)',
  student_pays_tuition:          'Student (pays own tuition)',
  works_with_family:             'Works with family',
  supports_parents_rents_debt:   'Supports family (rents, has debt)',
  supports_parents_mortgage_debt:'Supports family (mortgage, has debt)',
  supports_parents_family_home:  'Supports family (family home)',
  single_independent:            'Single & independent',
  married_1_2_kids:              'Married with 1–2 children',
  married_3plus_kids:            'Married with 3+ children',
  married_no_kids:               'Married, no children',
  default:                       'General profile',
};

function StatusBar({ current, limit }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const color = current > limit * 1.2 ? '#ef4444' : current > limit * 0.8 ? '#f59e0b' : '#22c55e';
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-1.5">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function CategoryCard({ cat, selected, onToggle, currencySymbol }) {
  const isOver  = cat.status === 'over';
  const isWarn  = cat.current_spending > cat.limit_dollars * 0.8;
  const border  = isOver  ? 'border-red-400 dark:border-red-600'
    : isWarn ? 'border-amber-400 dark:border-amber-600'
    : 'border-green-400 dark:border-green-600';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-4 transition-all ${
      selected ? border : 'border-gray-200 dark:border-gray-700 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-0.5 transition ${
            selected ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
          {selected && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat.emoji}</span>
              <p className="font-bold text-gray-800 dark:text-white text-sm">{cat.label}</p>
              {cat.ai_adjusted && (
                <span className="text-[10px] bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-full font-bold">
                  AI adjusted
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-violet-600 dark:text-violet-400 tabular-nums">
                {currencySymbol}{cat.limit_dollars.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400">{cat.percentage}% of income</p>
            </div>
          </div>

          <StatusBar current={cat.current_spending} limit={cat.limit_dollars} />

          <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
            <span>
              Current: <span className={isOver ? 'text-red-500 font-semibold' : 'text-gray-600 dark:text-gray-300'}>
                {currencySymbol}{cat.current_spending.toLocaleString()}
              </span>
            </span>
            <span className={isOver ? 'text-red-400' : isWarn ? 'text-amber-500' : 'text-green-500'}>
              {isOver ? '⚠️ Over limit' : isWarn ? '🟠 Near limit' : '✅ Under limit'}
            </span>
          </div>

          {cat.reasoning && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed italic">
              "{cat.reasoning}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BudgetPlanSheet({ onClose, onApplied, initialData }) {
  const [plan, setPlan]         = useState(initialData || null)
  const [loading, setLoading]   = useState(!initialData)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState({})
  const [applying, setApplying] = useState(false)
  const [applyDone, setApplyDone] = useState(false)
  const [currencySymbol] = useState(() => {
    const SYMS = { USD:'$', EUR:'€', GBP:'£', LBP:'L£', AED:'د.إ', SAR:'﷼', CAD:'C$', AUD:'A$' }
    return SYMS[localStorage.getItem('currency') || 'USD'] || '$'
  })

  useEffect(() => {
    if (!initialData) fetchPlan();
  }, []);

  useEffect(() => {
    if (plan?.categories) {
      const sel = {};
      plan.categories.forEach(c => { sel[c.key] = true });
      setSelected(sel);
    }
  }, [plan]);

  const fetchPlan = async () => {
    setLoading(true); setError(null);
    try {
      const wallet = getActiveWallet();
      const res = await API.post('/budget-plan/generate', { walletId: wallet?.id });
      if (res.data.error === 'no_income') {
        setError('no_income'); setLoading(false); return;
      }
      setPlan(res.data);
    } catch {
      setError('Failed to generate plan. Try again.');
    }
    setLoading(false);
  };

  const selectedCats = plan?.categories?.filter(c => selected[c.key]) || [];
  const selectedCount = selectedCats.length;

  const handleApply = async () => {
    if (!selectedCount) return;
    setApplying(true);
    try {
      const wallet = getActiveWallet();
      await API.post('/budget-plan/apply', {
        walletId:   wallet?.id,
        categories: selectedCats,
      });
      setApplyDone(true);
      setTimeout(() => { onApplied?.(); onClose(); }, 1500);
    } catch {
      setApplying(false);
    }
  };

  const now     = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const sheet = (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-base">Your Personalized Budget Plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">

          {loading && (
            <div className="space-y-3 pt-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {error === 'no_income' && (
            <div className="text-center py-10 px-4">
              <div className="text-5xl mb-4">💰</div>
              <p className="font-bold text-gray-800 dark:text-white mb-2">No income found</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Please log your monthly income first, then come back to generate your budget plan.
              </p>
            </div>
          )}

          {error && error !== 'no_income' && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">{error}</p>
              <button onClick={fetchPlan} className="mt-3 text-violet-600 font-semibold text-sm hover:underline">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && plan && (
            <>
              {/* Insight card */}
              <div className="bg-linear-to-br from-violet-600 to-indigo-700 rounded-2xl px-5 py-4 text-white">
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-3">
                  {PROFILE_LABELS[plan.profile_used] || 'Your Profile'}
                </p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-white/60 text-[10px] mb-0.5">Monthly Income</p>
                    <p className="font-black text-base tabular-nums">{currencySymbol}{plan.monthly_income?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] mb-0.5">Suggested Save</p>
                    <p className="font-black text-base tabular-nums text-emerald-300">
                      {currencySymbol}{plan.total_saved?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] mb-0.5">Total Budgeted</p>
                    <p className="font-black text-base tabular-nums">{currencySymbol}{plan.total_budgeted?.toLocaleString()}</p>
                  </div>
                </div>
                {plan.ai_summary && (
                  <p className="text-white/80 text-xs leading-relaxed">{plan.ai_summary}</p>
                )}
              </div>

              {/* Debt warning */}
              {plan.has_debt_detected && (
                <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl px-4 py-3">
                  <span className="text-xl shrink-0">⚠️</span>
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    I detected active debt payments. I've added a buffer to <strong>Other & Bills</strong> and adjusted your savings target slightly.
                  </p>
                </div>
              )}

              {/* AI adjustments banner */}
              {plan.ai_adjustments && Object.keys(plan.ai_adjustments).length > 0 && (
                <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-2">
                    Based on what you told me, I adjusted {Object.keys(plan.ai_adjustments).length} categories:
                  </p>
                  {Object.entries(plan.ai_adjustments).map(([key, adj]) => (
                    <p key={key} className="text-xs text-violet-600 dark:text-violet-400">
                      → {key}: {adj.reason}
                    </p>
                  ))}
                </div>
              )}

              {/* Select all / count */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {selectedCount} of {plan.categories.length} selected
                </p>
                <button
                  onClick={() => {
                    const allSelected = plan.categories.every(c => selected[c.key]);
                    const next = {};
                    plan.categories.forEach(c => { next[c.key] = !allSelected; });
                    setSelected(next);
                  }}
                  className="text-xs text-violet-600 font-semibold hover:underline">
                  {plan.categories.every(c => selected[c.key]) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Category cards */}
              <div className="space-y-3">
                {plan.categories.map(cat => (
                  <CategoryCard
                    key={cat.key}
                    cat={cat}
                    selected={!!selected[cat.key]}
                    onToggle={() => setSelected(s => ({ ...s, [cat.key]: !s[cat.key] }))}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom buttons */}
        {!loading && !error && plan && (
          <div className="px-5 pb-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-800">
            {applyDone ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-bold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {selectedCount} budget{selectedCount !== 1 ? 's' : ''} applied!
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying || selectedCount === 0}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold rounded-2xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                {applying ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Applying…</>
                ) : (
                  `Apply Selected (${selectedCount})`
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
