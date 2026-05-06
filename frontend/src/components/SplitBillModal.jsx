import { useState } from 'react'
import API from '../utils/api'

const CATEGORIES = ['Food','Coffee','Transport','Shopping','Subscriptions','Entertainment','Health','Fitness','Education','Bills','Travel','Gifts','Other']
const CURRENCY_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', LBP:'L£', AED:'AED', SAR:'SAR', CAD:'C$', AUD:'A$' }

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

export default function SplitBillModal({ onClose, onSaved }) {
  const sym = CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$'
  const today = new Date().toISOString().split('T')[0]

  // Step 1: bill details. Step 2: participants. Step 3: review
  const [step, setStep] = useState(1)
  const [bill, setBill] = useState({ title: '', amount: '', category: 'Food', date: today, notes: '' })
  const [participants, setParticipants] = useState([{ id: 0, name: '', amount: '' }])
  const [splitMode, setSplitMode] = useState('even') // even | custom
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalBill = safeNum(bill.amount)

  // Even split helper
  const evenShare = (totalBill / participants.length).toFixed(2)
  const splitParticipants = splitMode === 'even'
    ? participants.map(p => ({ ...p, amount: evenShare }))
    : participants

  const addPerson = () => setParticipants(prev => [...prev, { id: Date.now(), name: '', amount: '' }])
  const removePerson = (id) => setParticipants(prev => prev.filter(p => p.id !== id))
  const updatePerson = (id, field, val) => setParticipants(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))

  const totalAssigned = splitParticipants.reduce((s, p) => s + safeNum(p.amount), 0)
  const remaining = totalBill - totalAssigned

  const canProceedStep1 = bill.title.trim() && safeNum(bill.amount) > 0
  const canProceedStep2 = participants.every(p => p.name.trim()) &&
    (splitMode === 'even' || Math.abs(remaining) < 0.01)

  const confirm = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await API.post('/splits', {
        title: bill.title,
        total_amount: totalBill,
        category: bill.category,
        date: bill.date,
        notes: bill.notes || undefined,
        participants: splitParticipants.map(p => ({ name: p.name, amount: safeNum(p.amount) })),
      })
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save — try again')
    }
    setSaving(false)
  }

  const inputCls = 'w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 text-gray-900 dark:text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Split Bill</h2>
            <div className="flex gap-1 mt-1.5">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? 'bg-violet-600 w-6' : 'bg-gray-200 dark:bg-gray-700 w-4'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm">✕</button>
        </div>

        {/* Step 1: Bill details */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Bill title</label>
              <input type="text" value={bill.title} onChange={e => setBill(b => ({ ...b, title: e.target.value }))}
                placeholder="e.g. Dinner at Zara, Hotel room…" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Total amount ({sym})</label>
              <input type="number" value={bill.amount} onChange={e => setBill(b => ({ ...b, amount: e.target.value }))}
                placeholder="0.00" min="0.01" step="0.01" className={inputCls + ' text-lg font-bold'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Category</label>
                <select value={bill.category} onChange={e => setBill(b => ({ ...b, category: e.target.value }))} className={inputCls}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Date</label>
                <input type="date" value={bill.date} onChange={e => setBill(b => ({ ...b, date: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Notes (optional)</label>
              <input type="text" value={bill.notes} onChange={e => setBill(b => ({ ...b, notes: e.target.value }))}
                placeholder="Restaurant, occasion…" className={inputCls} />
            </div>
          </div>
        )}

        {/* Step 2: Participants */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">{sym}{totalBill.toFixed(2)} total</p>
                <p className="text-xs text-violet-500 mt-0.5">{participants.length} person{participants.length !== 1 ? 's' : ''}</p>
              </div>
              {splitMode === 'even' ? (
                <p className="text-lg font-black text-violet-600">{sym}{evenShare} each</p>
              ) : (
                <p className={`text-sm font-bold ${Math.abs(remaining) < 0.01 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Math.abs(remaining) < 0.01 ? '✓ Balanced' : `${remaining > 0 ? '+' : ''}${sym}${remaining.toFixed(2)} remaining`}
                </p>
              )}
            </div>

            {/* Split mode toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
              {[{ id: 'even', label: '⚖️ Split evenly' }, { id: 'custom', label: '✏️ Custom amounts' }].map(m => (
                <button key={m.id} onClick={() => setSplitMode(m.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${splitMode === m.id ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-500'}`}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Participants */}
            <div className="space-y-2">
              {participants.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                  <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0">
                    {idx + 1}
                  </div>
                  <input type="text" value={p.name} onChange={e => updatePerson(p.id, 'name', e.target.value)}
                    placeholder={`Person ${idx + 1}`}
                    className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 focus:outline-none min-w-0 placeholder-gray-300" />
                  {splitMode === 'custom' ? (
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 shrink-0">
                      <span className="text-xs text-gray-400">{sym}</span>
                      <input type="number" value={p.amount} onChange={e => updatePerson(p.id, 'amount', e.target.value)}
                        placeholder="0.00" className="w-16 bg-transparent text-sm text-right font-bold text-gray-800 dark:text-gray-200 focus:outline-none" />
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-gray-500 shrink-0">{sym}{evenShare}</span>
                  )}
                  {participants.length > 1 && (
                    <button onClick={() => removePerson(p.id)} className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 transition shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addPerson}
              className="w-full py-2.5 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl text-sm font-semibold text-violet-600 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
              + Add person
            </button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 dark:text-white">{bill.title}</span>
                <span className="text-lg font-black text-gray-900 dark:text-white">{sym}{totalBill.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>{bill.category}</span>
                <span>·</span>
                <span>{bill.date}</span>
                {bill.notes && <><span>·</span><span>{bill.notes}</span></>}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Who owes what</p>
              <div className="space-y-2">
                {splitParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3">
                    <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center text-base">
                      {p.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-white">{p.name}</span>
                    <span className="font-black text-violet-600">{sym}{safeNum(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
              💡 This will also be logged as a <strong>{bill.category}</strong> expense of <strong>{sym}{totalBill.toFixed(2)}</strong> in your transactions.
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">Back</button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className="flex-[2] py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition disabled:opacity-50">
                Continue →
              </button>
            ) : (
              <button onClick={confirm} disabled={saving}
                className="flex-[2] py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : '✓ Create Split'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
