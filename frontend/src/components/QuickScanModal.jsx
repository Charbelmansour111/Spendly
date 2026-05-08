import { useState, useRef, useCallback, useEffect } from 'react'
import API from '../utils/api'
import { METHOD_ICONS, METHOD_COLORS } from '../utils/paymentMethods'

const CATEGORIES = ['Food','Coffee','Transport','Shopping','Subscriptions','Entertainment','Health','Fitness','Education','Bills','Travel','Gifts','Other']
const METHODS = ['Card','Bank','Cash','Virtual']

const inputCls = 'w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 text-gray-900 dark:text-white'

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
  )
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm shrink-0">✕</button>
  )
}

function ModalShell({ children, onBackdropClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onBackdropClose?.()}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default function QuickScanModal({ onClose, onAdded }) {
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])
  const [view, setView] = useState('input') // input | processing | receipt | transactions | done
  const [inputTab, setInputTab] = useState('camera')
  const [smsText, setSmsText] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  // Currency conversion
  const userCurrency = (localStorage.getItem('currency') || 'USD').toUpperCase()
  const [detectedCurrency, setDetectedCurrency] = useState(null)
  const [converting, setConverting] = useState(false)

  // Recurring suggestions shown in done screen
  const [recurSuggestions, setRecurSuggestions] = useState([])
  const [markedRecurring, setMarkedRecurring] = useState({})

  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const smsTimer = useRef(null)

  // ── Currency conversion ───────────────────────────────────────────────────

  const applyConversion = useCallback(async (from) => {
    if (from === userCurrency) return
    setConverting(true)
    try {
      const { data } = await API.get(`/currency/rate?from=${from}&to=${userCurrency}`)
      const rate = data.rate
      if (!rate || rate === 1) return
      setReceipt(prev => prev ? {
        ...prev,
        items: prev.items.map(it => ({
          ...it,
          price: it.price ? String((parseFloat(it.price) * rate).toFixed(2)) : ''
        }))
      } : null)
      setTransactions(prev => prev.map(t => ({
        ...t,
        amount: t.amount ? String((parseFloat(t.amount) * rate).toFixed(2)) : ''
      })))
    } catch {
      // silent — user can edit manually
    }
    setConverting(false)
  }, [userCurrency])

  // ── Processing ────────────────────────────────────────────────────────────

  const processImage = useCallback(async (dataUrl) => {
    setPreviewUrl(dataUrl)
    setView('processing')
    setError('')
    try {
      const { data } = await API.post('/expenses/parse-image', { image: dataUrl })
      if (data.type === 'receipt' && data.items?.length > 0) {
        const detected = (data.currency || 'USD').toUpperCase()
        setDetectedCurrency(detected)
        setReceipt({
          merchant: data.merchant || '',
          category: data.category || 'Food',
          date: data.date || new Date().toISOString().split('T')[0],
          payment_method: data.payment_method || 'Card',
          items: data.items.map((it, i) => ({ id: i, name: it.name || '', price: String(it.price ?? '') })),
        })
        setView('receipt')
        if (detected !== userCurrency) {
          // auto-convert after a short delay so user sees the banner
          setTimeout(() => applyConversion(detected), 600)
        }
      } else if (data.type === 'transactions' && data.transactions?.length > 0) {
        const detected = (data.transactions[0]?.currency || data.currency || 'USD').toUpperCase()
        setDetectedCurrency(detected)
        setTransactions(data.transactions.map((t, i) => ({ ...t, id: i, amount: String(t.amount ?? '') })))
        setView('transactions')
        if (detected !== userCurrency) {
          setTimeout(() => applyConversion(detected), 600)
        }
      } else {
        setError(data.message || 'No financial data found — try a clearer image')
        setView('input')
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not read image — try again')
      setView('input')
    }
  }, [userCurrency, applyConversion])

  const processText = useCallback(async (text) => {
    if (!text.trim() || text.trim().length < 10) return
    setView('processing')
    setError('')
    try {
      const { data } = await API.post('/expenses/parse-text', { text })
      if (data.type === 'transactions' && data.transactions?.length > 0) {
        const detected = (data.transactions[0]?.currency || 'USD').toUpperCase()
        setDetectedCurrency(detected)
        setTransactions(data.transactions.map((t, i) => ({ ...t, id: i, amount: String(t.amount ?? '') })))
        setView('transactions')
        if (detected !== userCurrency) {
          setTimeout(() => applyConversion(detected), 600)
        }
      } else {
        setError(data.message || 'No transactions found — try a different message')
        setView('input')
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not parse — try again')
      setView('input')
    }
  }, [userCurrency, applyConversion])

  const onImageFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => processImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const onSmsChange = (e) => {
    setSmsText(e.target.value)
    clearTimeout(smsTimer.current)
    if (e.target.value.trim().length > 15)
      smsTimer.current = setTimeout(() => processText(e.target.value), 900)
  }

  const onSmsPaste = (e) => {
    const val = e.clipboardData.getData('text')
    if (val.trim().length > 10) {
      clearTimeout(smsTimer.current)
      smsTimer.current = setTimeout(() => processText(val), 200)
    }
  }

  // ── Receipt actions ───────────────────────────────────────────────────────

  const updateItem = (id, field, val) =>
    setReceipt(prev => ({ ...prev, items: prev.items.map(it => it.id === id ? { ...it, [field]: val } : it) }))
  const deleteItem = (id) =>
    setReceipt(prev => ({ ...prev, items: prev.items.filter(it => it.id !== id) }))
  const addItem = () =>
    setReceipt(prev => ({ ...prev, items: [...prev.items, { id: Date.now(), name: '', price: '' }] }))

  const receiptTotal = receipt?.items?.reduce((s, it) => s + (parseFloat(it.price) || 0), 0) || 0

  const confirmReceipt = async () => {
    if (!receipt || saving) return
    setSaving(true)
    try {
      const desc = receipt.items
        .filter(it => it.name)
        .map(it => `${it.name}${it.price ? ` ($${parseFloat(it.price).toFixed(2)})` : ''}`)
        .join(', ')
      const { data } = await API.post('/expenses', {
        amount: receiptTotal,
        category: receipt.category,
        description: desc || receipt.merchant || 'Receipt',
        date: receipt.date,
        payment_method: receipt.payment_method,
      })
      setSavedCount(1)
      const suggestions = []
      if (data.suggestion?.type === 'recurring') {
        suggestions.push(data.suggestion)
      }
      setRecurSuggestions(suggestions)
      setView('done')
      if (suggestions.length === 0) {
        setTimeout(() => { onAdded?.(); onClose() }, 1400)
      }
    } catch {
      setError('Failed to save — try again')
    }
    setSaving(false)
  }

  // ── Transaction actions ───────────────────────────────────────────────────

  const updateTx = (id, field, val) =>
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t))
  const deleteTx = (id) =>
    setTransactions(prev => prev.filter(t => t.id !== id))

  const confirmTransactions = async () => {
    if (!transactions.length || saving) return
    setSaving(true)
    let saved = 0
    const suggestions = []
    try {
      for (const tx of transactions) {
        if (tx.type === 'income') {
          const d = new Date(tx.date)
          await API.post('/income', {
            amount: parseFloat(tx.amount),
            source: tx.description || 'Other',
            month: d.getMonth() + 1,
            year: d.getFullYear(),
          })
        } else {
          const { data } = await API.post('/expenses', {
            amount: parseFloat(tx.amount),
            category: tx.category,
            description: tx.description,
            date: tx.date,
            payment_method: tx.payment_method,
          })
          if (data.suggestion?.type === 'recurring') {
            suggestions.push(data.suggestion)
          }
        }
        saved++
      }
      setSavedCount(saved)
      setRecurSuggestions(suggestions)
      setView('done')
      if (suggestions.length === 0) {
        setTimeout(() => { onAdded?.(); onClose() }, 1400)
      }
    } catch {
      setError('Failed to save — try again')
    }
    setSaving(false)
  }

  // ── Recurring ─────────────────────────────────────────────────────────────

  const markRecurring = async (expenseId) => {
    try {
      await API.put(`/expenses/${expenseId}`, { is_recurring: true })
      setMarkedRecurring(prev => ({ ...prev, [expenseId]: true }))
    } catch {
      // silent
    }
  }

  const dismissSuggestions = () => {
    onAdded?.()
    onClose()
  }

  // ── Back / reset ──────────────────────────────────────────────────────────

  const goBack = () => {
    setView('input')
    setError('')
    setReceipt(null)
    setTransactions([])
    setPreviewUrl(null)
    setDetectedCurrency(null)
  }

  // ── Currency banner ───────────────────────────────────────────────────────

  const CurrencyBanner = detectedCurrency && detectedCurrency !== userCurrency ? (
    <div className="mx-5 mb-3 flex items-center gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-3 py-2.5 shrink-0">
      <span className="text-base shrink-0">💱</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
          {detectedCurrency} → {userCurrency}
        </p>
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
          {converting ? 'Converting amounts…' : 'Amounts auto-converted to your currency'}
        </p>
      </div>
      {converting && <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />}
    </div>
  ) : null

  // ── Views ─────────────────────────────────────────────────────────────────

  if (view === 'processing') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center w-80 mx-4">
        {previewUrl && <img src={previewUrl} alt="" className="w-full h-32 object-cover rounded-2xl mb-5 opacity-80" />}
        <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold text-gray-900 dark:text-white text-base">AI is reading carefully…</p>
        <p className="text-sm text-gray-400 mt-1.5">Detecting all items & transactions</p>
      </div>
    </div>
  )

  if (view === 'done') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 w-80 mx-4">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">✅</div>
          <p className="font-bold text-xl text-gray-900 dark:text-white">{savedCount} Added!</p>
          <p className="text-sm text-gray-400 mt-1">Transaction{savedCount !== 1 ? 's' : ''} saved successfully</p>
        </div>

        {recurSuggestions.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Recurring?</p>
            {recurSuggestions.map(s => (
              <div key={s.expense_id} className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">🔁</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{s.merchant}</p>
                  <p className="text-[11px] text-gray-500">You've saved this 3+ times</p>
                </div>
                {markedRecurring[s.expense_id] ? (
                  <span className="text-xs font-bold text-emerald-600">✓ Done</span>
                ) : (
                  <button
                    onClick={() => markRecurring(s.expense_id)}
                    className="text-xs font-bold text-violet-600 bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-700 rounded-lg px-2.5 py-1 shrink-0 hover:bg-violet-50 transition">
                    Mark
                  </button>
                )}
              </div>
            ))}
            <button onClick={dismissSuggestions} className="w-full mt-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (view === 'receipt' && receipt) return (
    <ModalShell>
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
        <BackBtn onClick={goBack} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
            {receipt.merchant || 'Receipt'} · <span className="text-violet-600">{receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Edit, add, or remove items before saving</p>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      {CurrencyBanner}

      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Category</label>
            <select value={receipt.category} onChange={e => setReceipt(p => ({ ...p, category: e.target.value }))} className={inputCls + ' text-xs'}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Paid with</label>
            <select value={receipt.payment_method} onChange={e => setReceipt(p => ({ ...p, payment_method: e.target.value }))} className={inputCls + ' text-xs'}>
              {METHODS.map(m => <option key={m}>{METHOD_ICONS[m]} {m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Date</label>
            <input type="date" value={receipt.date} onChange={e => setReceipt(p => ({ ...p, date: e.target.value }))} className={inputCls + ' text-xs'} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Items</p>
          <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-3 py-1.5 rounded-xl hover:bg-violet-100 transition">
            + Add item
          </button>
        </div>
        <div className="space-y-2">
          {receipt.items.map(it => (
            <div key={it.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <span className="text-base shrink-0">🛍️</span>
              <input
                type="text" value={it.name} onChange={e => updateItem(it.id, 'name', e.target.value)}
                placeholder="Item name"
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 focus:outline-none min-w-0 placeholder-gray-300"
              />
              <div className="flex items-center gap-0.5 shrink-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-400">{userCurrency === 'USD' ? '$' : userCurrency}</span>
                <input
                  type="number" value={it.price} onChange={e => updateItem(it.id, 'price', e.target.value)}
                  placeholder="0.00"
                  className="w-14 bg-transparent text-sm text-right font-bold text-gray-800 dark:text-gray-200 focus:outline-none"
                />
              </div>
              <button onClick={() => deleteItem(it.id)} className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-3 pb-6 shrink-0 border-t border-gray-100 dark:border-gray-800">
        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3">{error}</p>}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500 font-medium">Total</span>
          <span className="text-xl font-black text-gray-900 dark:text-white">${receiptTotal.toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={goBack} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">Back</button>
          <button onClick={confirmReceipt} disabled={saving || receipt.items.length === 0 || receiptTotal <= 0}
            className="flex-2 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : `✓ Add as ${receipt.category}`}
          </button>
        </div>
      </div>
    </ModalShell>
  )

  if (view === 'transactions') {
    const expCount = transactions.filter(t => t.type !== 'income').length
    const incCount = transactions.filter(t => t.type === 'income').length
    return (
      <ModalShell>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
          <BackBtn onClick={goBack} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              <span className="text-violet-600">{transactions.length}</span> Transaction{transactions.length !== 1 ? 's' : ''} Found
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {expCount > 0 && `${expCount} expense${expCount !== 1 ? 's' : ''}`}
              {expCount > 0 && incCount > 0 && ' · '}
              {incCount > 0 && `${incCount} income`}
              {' · Review & edit before saving'}
            </p>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        {CurrencyBanner}

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {transactions.map(tx => (
            <div key={tx.id} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {['expense', 'income'].map(t => (
                    <button key={t} onClick={() => updateTx(tx.id, 'type', t)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition ${tx.type === t
                        ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                      {t === 'income' ? '📈 Income' : '📉 Expense'}
                    </button>
                  ))}
                </div>
                <button onClick={() => deleteTx(tx.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Amount</label>
                  <input type="number" value={tx.amount} onChange={e => updateTx(tx.id, 'amount', e.target.value)} className={inputCls + ' font-bold'} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Date</label>
                  <input type="date" value={tx.date} onChange={e => updateTx(tx.id, 'date', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Description</label>
                <input type="text" value={tx.description} onChange={e => updateTx(tx.id, 'description', e.target.value)} className={inputCls} />
              </div>
              {tx.type !== 'income' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Category</label>
                    <select value={tx.category} onChange={e => updateTx(tx.id, 'category', e.target.value)} className={inputCls + ' text-xs'}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block mb-1">Method</label>
                    <select value={tx.payment_method} onChange={e => updateTx(tx.id, 'payment_method', e.target.value)} className={inputCls + ' text-xs'}>
                      {METHODS.map(m => <option key={m}>{METHOD_ICONS[m]} {m}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 pt-3 pb-6 shrink-0 border-t border-gray-100 dark:border-gray-800">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={goBack} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">Back</button>
            <button onClick={confirmTransactions} disabled={saving || transactions.length === 0}
              className="flex-2 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : `✓ Save ${transactions.length} Transaction${transactions.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  // Input view
  return (
    <ModalShell onBackdropClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Scan</h2>
          <p className="text-xs text-gray-400 mt-0.5">Camera · Gallery · Paste SMS</p>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="flex mx-5 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1 shrink-0">
        {[{ id: 'camera', label: '📷 Camera' }, { id: 'gallery', label: '🖼️ Gallery' }, { id: 'sms', label: '📩 SMS' }].map(t => (
          <button key={t.id} onClick={() => { setInputTab(t.id); setError('') }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${inputTab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-6 overflow-y-auto">
        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 mb-4">{error}</p>}

        {inputTab === 'camera' && (
          <button onClick={() => cameraRef.current?.click()}
            className="w-full h-44 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition active:scale-95">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center text-3xl">📷</div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Take a Photo</p>
              <p className="text-xs text-gray-400 mt-1">Point at your receipt or bank screen</p>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onImageFile} />
          </button>
        )}

        {inputTab === 'gallery' && (
          <button onClick={() => galleryRef.current?.click()}
            className="w-full h-44 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition active:scale-95">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center text-3xl">🖼️</div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Upload Screenshot</p>
              <p className="text-xs text-gray-400 mt-1">Bank app · receipt · transaction history</p>
            </div>
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onImageFile} />
          </button>
        )}

        {inputTab === 'sms' && (
          <textarea
            value={smsText}
            onChange={onSmsChange}
            onPaste={onSmsPaste}
            placeholder={'Paste your bank SMS or transaction message…\n\nExample:\n"Debited $45.00 at Carrefour on 06/05/2026"\n"Credited $2,500.00 — salary deposit"'}
            rows={6}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-violet-400 resize-none transition"
          />
        )}

        <div className="mt-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            AI reads receipts item-by-item and detects multiple bank transactions at once. You can edit everything before saving.
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
