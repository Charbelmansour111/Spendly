import { useState, useRef, useCallback } from 'react'
import API from '../utils/api'

const CATEGORIES = ['Food','Coffee','Transport','Shopping','Subscriptions','Entertainment','Health','Fitness','Education','Bills','Travel','Gifts','Other']
const METHODS = ['Card','Bank','Cash','Virtual']

const METHOD_ICONS = { Card: '💳', Bank: '🏦', Cash: '💵', Virtual: '📱' }
const METHOD_COLORS = {
  Card:    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Bank:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Cash:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Virtual: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

export { METHOD_ICONS, METHOD_COLORS }

export default function QuickScanModal({ onClose, onAdded }) {
  const [tab, setTab] = useState('sms')
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef(null)
  const parseTimer = useRef(null)

  const parse = useCallback(async (input, isImage = false) => {
    setError(''); setParsed(null); setParsing(true)
    try {
      const endpoint = isImage ? '/expenses/parse-image' : '/expenses/parse-text'
      const body = isImage ? { image: input } : { text: input }
      const { data } = await API.post(endpoint, body)
      setParsed({
        amount: String(data.amount || ''),
        category: data.category || 'Other',
        description: data.description || '',
        date: data.date || new Date().toISOString().split('T')[0],
        payment_method: data.payment_method || 'Card',
        type: data.type || 'expense',
      })
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not parse — try editing manually')
    }
    setParsing(false)
  }, [])

  const onPaste = (e) => {
    const val = e.clipboardData.getData('text')
    if (!val.trim()) return
    clearTimeout(parseTimer.current)
    parseTimer.current = setTimeout(() => parse(val), 100)
  }

  const onTextChange = (e) => {
    setText(e.target.value)
    clearTimeout(parseTimer.current)
    if (e.target.value.trim().length > 10) {
      parseTimer.current = setTimeout(() => parse(e.target.value), 800)
    }
  }

  const onImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => parse(ev.target.result, true)
    reader.readAsDataURL(file)
  }

  const confirm = async () => {
    if (!parsed) return
    setSaving(true)
    try {
      const endpoint = parsed.type === 'income' ? '/income' : '/expenses'
      if (parsed.type === 'income') {
        const d = new Date(parsed.date)
        await API.post(endpoint, {
          amount: parseFloat(parsed.amount),
          source: parsed.description || 'Other',
          month: d.getMonth() + 1,
          year: d.getFullYear(),
        })
      } else {
        await API.post(endpoint, {
          amount: parseFloat(parsed.amount),
          category: parsed.category,
          description: parsed.description,
          date: parsed.date,
          payment_method: parsed.payment_method,
        })
      }
      setDone(true)
      setTimeout(() => { onAdded?.(); onClose() }, 900)
    } catch {
      setError('Failed to save. Try again.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Scan</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paste SMS or upload screenshot</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {[{ id: 'sms', label: '📩 Paste SMS' }, { id: 'image', label: '📸 Screenshot' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setParsed(null); setError(''); setText('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 pb-6 space-y-4">
          {/* Input area */}
          {tab === 'sms' ? (
            <textarea
              value={text}
              onChange={onTextChange}
              onPaste={onPaste}
              placeholder={'Paste your bank SMS here…\n\nExample: "Your account was debited $45.00 at Carrefour on 06/05/2026"'}
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-violet-400 resize-none transition"
            />
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-28 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition">
              <span className="text-3xl">📸</span>
              <span className="text-sm font-medium">Tap to upload screenshot</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />
            </button>
          )}

          {/* Parsing indicator */}
          {parsing && (
            <div className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 rounded-2xl px-4 py-3">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-violet-600 dark:text-violet-400 font-medium">Parsing transaction…</span>
            </div>
          )}

          {/* Error */}
          {error && !parsing && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2">{error}</p>
          )}

          {/* Parsed result — editable */}
          {parsed && !parsing && !done && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detected transaction</p>

              {/* Type toggle */}
              <div className="flex gap-2">
                {['expense','income'].map(t => (
                  <button key={t} onClick={() => setParsed(p => ({ ...p, type: t }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition ${parsed.type === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                    {t === 'income' ? '📈 Income' : '📉 Expense'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-gray-400 font-semibold">Amount</label>
                <input type="number" value={parsed.amount} onChange={e => setParsed(p => ({ ...p, amount: e.target.value }))}
                  className="w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-gray-400 font-semibold">Description</label>
                <input type="text" value={parsed.description} onChange={e => setParsed(p => ({ ...p, description: e.target.value }))}
                  className="w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
              </div>

              {/* Category + Payment method row */}
              {parsed.type === 'expense' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 font-semibold">Category</label>
                    <select value={parsed.category} onChange={e => setParsed(p => ({ ...p, category: e.target.value }))}
                      className="w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-400">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 font-semibold">Paid with</label>
                    <select value={parsed.payment_method} onChange={e => setParsed(p => ({ ...p, payment_method: e.target.value }))}
                      className="w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-400">
                      {METHODS.map(m => <option key={m}>{METHOD_ICONS[m]} {m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="text-xs text-gray-400 font-semibold">Date</label>
                <input type="date" value={parsed.date} onChange={e => setParsed(p => ({ ...p, date: e.target.value }))}
                  className="w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
              </div>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="flex flex-col items-center py-4 gap-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-2xl">✅</div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Added successfully!</p>
            </div>
          )}

          {/* Action buttons */}
          {parsed && !parsing && !done && (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">Cancel</button>
              <button onClick={confirm} disabled={saving || !parsed.amount}
                className="flex-2 flex-grow-[2] py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : '✓ Confirm & Add'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
