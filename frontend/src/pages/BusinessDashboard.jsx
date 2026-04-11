import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ── TOAST ────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 font-bold opacity-70">x</button>
    </div>
  )
}

// ── NUMBER MODAL ─────────────────────────────────────────
function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 text-center w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-bold text-orange-500 tabular-nums break-all">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-orange-500 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

// ── POS SCANNER ───────────────────────────────────────────
function POSScanner({ onClose, menuItems, onComplete, showToast, currencySymbol, ingredients }) {
  const [step, setStep]                   = useState('upload')
  const [imageData, setImageData]         = useState(null)
  const [imagePreview, setImagePreview]   = useState(null)
  const [scanResult, setScanResult]       = useState(null)
  const [date, setDate]                   = useState(new Date().toISOString().split('T')[0])
  const [editableItems, setEditableItems] = useState([])
  const [newItemSuggestions, setNewItemSuggestions] = useState([])
  const [error, setError]                 = useState('')
  const [summary, setSummary]             = useState(null)
  const [exchangeRate, setExchangeRate]   = useState('')

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      setImagePreview(base64)
      setImageData(base64.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!imageData) return
    setStep('scanning')
    setError('')
    try {
      const res = await API.post('/business/pos-scan', {
        image: imageData,
        menu_items: menuItems.map(m => ({ id: m.id, name: m.name, price: m.price })),
        exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null
      })
      setScanResult(res.data)
      setEditableItems(res.data.items.map(item => ({ ...item, confirmed: item.matched })))
      // New items AI suggests adding to menu
      setNewItemSuggestions(
        (res.data.new_item_suggestions || []).map(s => ({ ...s, selected: false, adding: false }))
      )
      setStep('review')
    } catch {
      setError('Scan failed. Try a clearer photo.')
      setStep('upload')
    }
  }

  const handleAddNewItem = async (idx) => {
    const item = newItemSuggestions[idx]
    // Check duplicate
    const exists = menuItems.some(m => m.name.toLowerCase() === item.name.toLowerCase())
    if (exists) {
      showToast(`"${item.name}" already exists in your menu!`, 'error')
      return
    }
    setNewItemSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, adding: true } : s))
    try {
      await API.post('/business/menu', { name: item.name, category: item.category, price: item.suggested_price || 0 })
      setNewItemSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, selected: true, adding: false, added: true } : s))
      showToast(`✅ "${item.name}" added to menu!`)
    } catch {
      setNewItemSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, adding: false } : s))
      showToast('Error adding item', 'error')
    }
  }

  const handleConfirm = async () => {
    setStep('saving')
    const confirmedItems  = editableItems.filter(i => i.confirmed && i.matched_id)
    const rate            = exchangeRate ? parseFloat(exchangeRate) : null
    const totalRevenueUSD = editableItems
      .filter(i => i.confirmed)
      .reduce((s, i) => s + (parseFloat(i.unit_price || 0) * parseInt(i.quantity || 0)), 0)

    try {
      await API.post('/business/revenue', {
        date,
        total_revenue: totalRevenueUSD,
        notes: `POS Scan: ${editableItems.filter(i=>i.confirmed).length} items · ${rate ? `Rate: 1$=${rate}LL` : ''}`,
        scan_raw: JSON.stringify(editableItems)
      })

      let deductions = []
      if (confirmedItems.length > 0) {
        const deductRes = await API.post('/business/deduct-stock', {
          items_sold: confirmedItems.map(i => ({ menu_item_id: i.matched_id, quantity_sold: i.quantity }))
        })
        deductions = deductRes.data?.deductions || []
      }

      // Build summary
      const topSeller = [...editableItems].filter(i => i.confirmed).sort((a, b) => b.quantity - a.quantity)[0]
      const totalItems = editableItems.filter(i => i.confirmed).reduce((s, i) => s + parseInt(i.quantity || 0), 0)
      setSummary({
        date,
        revenueUSD: totalRevenueUSD,
        revenueLL: rate ? (totalRevenueUSD * rate) : null,
        itemCount: editableItems.filter(i => i.confirmed).length,
        totalQty: totalItems,
        topSeller: topSeller ? `${topSeller.matched_name || topSeller.name} × ${topSeller.quantity}` : null,
        deductions,
        matched: confirmedItems.length,
        unmatched: editableItems.filter(i => !i.matched).length,
      })
      setStep('summary')
    } catch {
      showToast('Error saving', 'error')
      setStep('review')
    }
  }

  const totalRevenueUSD = editableItems.filter(i => i.confirmed).reduce((s, i) => s + (parseFloat(i.unit_price || 0) * parseInt(i.quantity || 0)), 0)
  const rate = exchangeRate ? parseFloat(exchangeRate) : null
  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-xl">📷</div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">POS End-of-Day Scan</h3>
                <p className="text-xs text-purple-500">AI-powered receipt scanner</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-1 mt-4">
            {['Upload','Scan','Review','Done'].map((s, i) => {
              const stepIdx = { upload:0, scanning:1, review:2, saving:2, summary:3 }[step]
              const done    = i < stepIdx
              const active  = i === stepIdx
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : active ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                    {done ? '✓' : i+1}
                  </div>
                  <p className={`text-xs font-medium ml-1 ${active ? 'text-purple-600' : 'text-gray-400'}`}>{s}</p>
                  {i < 3 && <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 mx-2" />}
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Sale Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Exchange Rate</label>
                  <div className="relative">
                    <input type="number" placeholder="e.g. 90000"
                      value={exchangeRate} onChange={e => setExchangeRate(e.target.value)}
                      className={inputCls} />
                  </div>
                  {exchangeRate && <p className="text-xs text-purple-500 mt-1">1{currencySymbol} = {parseInt(exchangeRate).toLocaleString()} LL</p>}
                  {!exchangeRate && <p className="text-xs text-gray-400 mt-1">Optional — for LL receipts</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Receipt Photo</label>
                <label className={`block w-full border-2 border-dashed rounded-2xl cursor-pointer transition ${imagePreview ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 bg-gray-50 dark:bg-gray-700/50'}`}>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" capture="environment" />
                  {imagePreview ? (
                    <div className="p-3">
                      <img src={imagePreview} alt="Receipt" className="w-full max-h-52 object-contain rounded-xl" />
                      <p className="text-center text-xs text-purple-500 font-semibold mt-2">Tap to change photo</p>
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <p className="text-4xl mb-3">📷</p>
                      <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm">Take photo or upload receipt</p>
                      <p className="text-xs text-gray-400 mt-1">AI reads all items, quantities and prices</p>
                    </div>
                  )}
                </label>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>}

              <button onClick={handleScan} disabled={!imageData}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2">
                <span>🤖</span> Scan with AI
              </button>
            </>
          )}

          {/* ── SCANNING ── */}
          {step === 'scanning' && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">📷</div>
              <div className="flex justify-center gap-2 mb-4">
                {[0,150,300].map(d => <div key={d} className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: d+'ms' }} />)}
              </div>
              <p className="font-bold text-gray-800 dark:text-white text-lg mb-1">AI is reading your receipt...</p>
              <p className="text-gray-400 text-sm">Identifying items, quantities and prices</p>
              {imagePreview && <img src={imagePreview} alt="Receipt" className="w-24 h-24 object-cover rounded-xl mx-auto mt-6 opacity-40" />}
            </div>
          )}

          {/* ── REVIEW ── */}
          {step === 'review' && scanResult && (
            <>
              {/* Revenue summary banner */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 text-white">
                <p className="text-xs text-purple-200 mb-1">
                  {scanResult.total_found} items found · {scanResult.total_matched} matched to your menu
                </p>
                <p className="text-3xl font-bold tabular-nums">{currencySymbol}{totalRevenueUSD.toFixed(2)}</p>
                {rate && (
                  <p className="text-sm text-purple-200 mt-1 tabular-nums">
                    = {Math.round(totalRevenueUSD * rate).toLocaleString()} LL
                  </p>
                )}
                <p className="text-xs text-purple-300 mt-1">{date}</p>
              </div>

              {scanResult.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">🤖 {scanResult.notes}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Items Found</p>
                  <p className="text-xs text-gray-400">Tap to include / exclude</p>
                </div>
                <div className="space-y-2">
                  {editableItems.map((item, idx) => {
                    const lineUSD = parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0)
                    return (
                      <div key={idx}
                        className={`rounded-2xl border-2 p-3 transition ${item.confirmed ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 opacity-60'}`}>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => setEditableItems(prev => prev.map((it, i) => i === idx ? { ...it, confirmed: !it.confirmed } : it))}
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition ${item.confirmed ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            {item.confirmed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.name}</p>
                              {item.matched
                                ? <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">✓ Matched</span>
                                : <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full font-semibold">⚠ Not in menu</span>
                              }
                            </div>
                            {item.matched_name && item.matched_name !== item.name && (
                              <p className="text-xs text-purple-500 mt-0.5">→ {item.matched_name}</p>
                            )}
                            {!item.matched && <p className="text-xs text-gray-400">Stock won't be deducted</p>}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="flex items-center gap-1 justify-end mb-1">
                              <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, (it.quantity||1)-1) } : it))}
                                className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-lg text-xs font-bold flex items-center justify-center">−</button>
                              <span className="text-sm font-bold w-8 text-center tabular-nums">{item.quantity}</span>
                              <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: (it.quantity||1)+1 } : it))}
                                className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-lg text-xs font-bold flex items-center justify-center">+</button>
                            </div>
                            <p className="text-xs text-gray-400">× {currencySymbol}{parseFloat(item.unit_price||0).toFixed(2)}</p>
                            <p className="text-xs font-bold text-purple-600 tabular-nums">{currencySymbol}{lineUSD.toFixed(2)}</p>
                            {rate && <p className="text-xs text-gray-400 tabular-nums">{Math.round(lineUSD * rate).toLocaleString()} LL</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* New item suggestions from AI */}
              {newItemSuggestions.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                  <p className="text-sm font-bold text-blue-600 mb-1">🤖 AI found new items not in your menu</p>
                  <p className="text-xs text-blue-400 mb-3">Add them now so they'll be matched next time</p>
                  <div className="space-y-2">
                    {newItemSuggestions.map((s, idx) => (
                      <div key={idx} className={`flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 ${s.added ? 'opacity-60' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.category} · {currencySymbol}{parseFloat(s.suggested_price||0).toFixed(2)}</p>
                        </div>
                        {s.added ? (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-lg font-semibold">✓ Added</span>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleAddNewItem(idx)} disabled={s.adding}
                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                              {s.adding ? '...' : '+ Add'}
                            </button>
                            <button onClick={() => setNewItemSuggestions(prev => prev.filter((_, i) => i !== idx))}
                              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1.5 rounded-lg">
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock deduction preview */}
              {editableItems.some(i => i.confirmed && i.matched) && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-orange-600 mb-2">📦 Stock will be deducted for:</p>
                  {editableItems.filter(i => i.confirmed && i.matched).map((item, i) => (
                    <p key={i} className="text-xs text-orange-700 dark:text-orange-300">
                      • {item.quantity}× {item.matched_name || item.name}
                    </p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setStep('upload'); setError('') }}
                  className="py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold text-sm">
                  ← Rescan
                </button>
                <button onClick={handleConfirm} disabled={editableItems.filter(i => i.confirmed).length === 0}
                  className="py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-40">
                  Confirm & Save
                </button>
              </div>
            </>
          )}

          {/* ── SAVING ── */}
          {step === 'saving' && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg animate-pulse">💾</div>
              <p className="font-bold text-gray-800 dark:text-white text-lg mb-1">Saving everything...</p>
              <p className="text-gray-400 text-sm">Revenue recorded · Stock deducted · Alerts checked</p>
            </div>
          )}

          {/* ── SUMMARY ── */}
          {step === 'summary' && summary && (
            <>
              {/* Success header */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white text-center">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-bold text-xl">Day Closed Successfully!</p>
                <p className="text-green-100 text-sm mt-1">{summary.date}</p>
              </div>

              {/* Revenue */}
              <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                <p className="text-xs text-gray-400 font-semibold mb-3 uppercase tracking-wide">💰 Revenue</p>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">Total Revenue (USD)</span>
                  <span className="font-bold text-green-600 text-lg tabular-nums">{currencySymbol}{summary.revenueUSD.toFixed(2)}</span>
                </div>
                {summary.revenueLL && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-400 text-xs">Total Revenue (LBP)</span>
                    <span className="font-semibold text-gray-500 dark:text-gray-300 text-sm tabular-nums">{summary.revenueLL.toLocaleString()} LL</span>
                  </div>
                )}
              </div>

              {/* Sales breakdown */}
              <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                <p className="text-xs text-gray-400 font-semibold mb-3 uppercase tracking-wide">📊 Sales</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items sold</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{summary.itemCount} items</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total quantity</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{summary.totalQty} units</span>
                  </div>
                  {summary.topSeller && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Top seller</span>
                      <span className="font-semibold text-orange-600">🏆 {summary.topSeller}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Matched to menu</span>
                    <span className="font-semibold text-green-600">{summary.matched} items</span>
                  </div>
                  {summary.unmatched > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Not in menu</span>
                      <span className="font-semibold text-yellow-600">{summary.unmatched} items (not deducted)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stock deductions */}
              {summary.deductions && summary.deductions.length > 0 && (
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                  <p className="text-xs text-gray-400 font-semibold mb-3 uppercase tracking-wide">📦 Stock Deducted</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {summary.deductions.map((d, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{d.ingredient}</span>
                        <span className="text-red-500 font-semibold tabular-nums">-{parseFloat(d.used).toFixed(3)} → {parseFloat(d.remaining).toFixed(2)} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { onComplete(); }}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:opacity-90 transition">
                Done ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

       

// ── AI EXPENSE SHEET ──────────────────────────────────────
function AIExpenseSheet({ onClose, onSave, currencySymbol, ingredients }) {
  const [step, setStep]         = useState('input')
  const [form, setForm]         = useState({ amount: '', category: 'Ingredients', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false })
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError]   = useState('')
  const BIZ_CATS = ['Ingredients','Staff','Rent','Utilities','Marketing','Equipment','Packaging','Other']
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  const runAI = async () => {
    if (!form.description || !form.amount) { setAiError('Fill description and amount first'); return }
    setAiLoading(true); setAiError('')
    try {
      const res = await API.post('/business/ai-verify-expense', {
        description: form.description, amount: form.amount, category: form.category,
        ingredients: ingredients.map(i => ({ id: i.id, name: i.name, unit: i.unit, stock: i.stock_quantity }))
      })
      setAiResult(res.data); setStep('ai_review')
    } catch { setAiError('AI check failed. You can still save manually.') }
    setAiLoading(false)
  }

  const handleConfirm = () => onSave({ ...form, ai_verified: true, stock_updates: aiResult?.stock_updates || [] })
  const handleSkipAI  = () => onSave({ ...form, ai_verified: false, stock_updates: [] })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Business Expense</h3>
            <p className="text-xs text-orange-500 font-medium mt-0.5">🤖 AI-powered verification</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 pb-6 space-y-4">
          {step === 'input' && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({currencySymbol})</label>
                <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} min="0.01" step="0.01" className={cls + ' text-2xl font-bold'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={cls}>
                    {BIZ_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={cls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  What did you buy?
                  {form.category === 'Ingredients' && <span className="text-orange-500 ml-1">(AI will parse it)</span>}
                </label>
                <input type="text"
                  placeholder={form.category === 'Ingredients' ? 'e.g. 2 bags of burger buns, 5kg beef patties' : 'e.g. monthly rent payment'}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={cls} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="accent-orange-500 w-4 h-4" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly</span>
              </label>
              {aiError && <p className="text-red-500 text-xs">{aiError}</p>}
              {form.category === 'Ingredients' ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={runAI} disabled={!form.amount || !form.description || aiLoading}
                    className="bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {aiLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</> : <><span>🤖</span>AI Check</>}
                  </button>
                  <button onClick={handleSkipAI} disabled={!form.amount || !form.date}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white py-4 rounded-2xl font-bold transition disabled:opacity-50">
                    Save Manually
                  </button>
                </div>
              ) : (
                <button onClick={handleSkipAI} disabled={!form.amount || !form.date}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition disabled:opacity-50">
                  Add Expense
                </button>
              )}
            </>
          )}
          {step === 'ai_review' && aiResult && (
            <>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3"><span className="text-xl">🤖</span><p className="font-bold text-orange-600 text-sm">AI Verification Complete</p></div>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">{aiResult.summary}</p>
                {aiResult.stock_updates && aiResult.stock_updates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Stock will be updated:</p>
                    {aiResult.stock_updates.map((u, i) => (
                      <div key={i} className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl ${u.matched ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{u.ingredient_name}</p>
                          {!u.matched && <p className="text-yellow-600">New ingredient will be created</p>}
                        </div>
                        <p className={`font-bold ${u.matched ? 'text-green-600' : 'text-yellow-600'}`}>+{u.quantity} {u.unit}</p>
                      </div>
                    ))}
                  </div>
                )}
                {aiResult.warnings && aiResult.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {aiResult.warnings.map((w, i) => <p key={i} className="text-xs text-orange-600">⚠️ {w}</p>)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleConfirm} className="bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition">✓ Confirm & Save</button>
                <button onClick={() => setStep('input')} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white py-4 rounded-2xl font-bold transition">Edit</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ADD REVENUE SHEET ─────────────────────────────────────
function AddRevenueSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], total_revenue: '', notes: '' })
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Daily Revenue</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={cls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Total Revenue ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.total_revenue} onChange={e => setForm({ ...form, total_revenue: e.target.value })} min="0" step="0.01" className={cls + ' text-2xl font-bold'} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
            <input type="text" placeholder="e.g. busy Friday night" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={cls} />
          </div>
          <button onClick={() => onSave(form)} disabled={!form.total_revenue || !form.date}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50">
            Save Revenue
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ADD EMPLOYEE SHEET ────────────────────────────────────
function AddEmployeeSheet({ onClose, onSave, currencySymbol }) {
  const [form, setForm] = useState({ name: '', role: 'Staff', salary: '', phone: '', salary_type: 'monthly' })
  const ROLES = ['Manager','Chef','Sous Chef','Waiter','Cashier','Delivery','Cleaner','Security','Staff']
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Employee</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name</label>
            <input type="text" placeholder="e.g. Ahmad Khalil" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={cls}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Salary Type</label>
              <select value={form.salary_type} onChange={e => setForm({ ...form, salary_type: e.target.value })} className={cls}>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Salary ({currencySymbol}/{form.salary_type === 'monthly' ? 'month' : 'day'})</label>
            <input type="number" placeholder="0.00" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} min="0" step="0.01" className={cls + ' text-lg font-bold'} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone (optional)</label>
            <input type="tel" placeholder="+961 XX XXX XXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={cls} />
          </div>
          <button onClick={() => onSave(form)} disabled={!form.name || !form.salary}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
            Add Employee
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────
export default function BusinessDashboard() {
  const [user, setUser]               = useState(null)
  const [revenue, setRevenue]         = useState([])
  const [expenses, setExpenses]       = useState([])
  const [employees, setEmployees]     = useState([])
  const [ingredients, setIngredients] = useState([])
  const [menuItems, setMenuItems]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [currencySymbol, setSymbol]   = useState('$')
  const [toast, setToast]             = useState(null)
  const [modalData, setModalData]     = useState(null)
  const [showAddRev, setShowAddRev]   = useState(false)
  const [showAddExp, setShowAddExp]   = useState(false)
  const [showAddEmp, setShowAddEmp]   = useState(false)
  const [showPOS, setShowPOS]         = useState(false)
  const [activeTab, setActiveTab]     = useState('overview')

  const today    = new Date()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) { window.location.href = '/login'; return }
    const u = JSON.parse(storedUser)
    setUser(u)
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    if (u.account_type !== 'business') { window.location.href = '/dashboard'; return }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [rev, exp, emp, ing, menu] = await Promise.all([
        API.get('/business/revenue'),
        API.get('/business/expenses'),
        API.get('/business/employees'),
        API.get('/business/stock'),
        API.get('/business/menu'),
      ])
      setRevenue(rev.data || [])
      setExpenses(exp.data || [])
      setEmployees(emp.data || [])
      setIngredients(ing.data || [])
      setMenuItems(menu.data || [])
    } catch { console.log('Error fetching') }
    setLoading(false)
  }

  const handleAddRevenue = async (form) => {
    try {
      await API.post('/business/revenue', form)
      setShowAddRev(false)
      const rev = await API.get('/business/revenue')
      setRevenue(rev.data || [])
      showToast('Revenue added!')
    } catch { showToast('Error adding revenue', 'error') }
  }

  const handleAddExpense = async (form) => {
    try {
      const { stock_updates, ai_verified, ...expenseData } = form
      await API.post('/expenses', expenseData)
      if (stock_updates && stock_updates.length > 0) {
        await API.post('/business/apply-stock-updates', { stock_updates })
      }
      setShowAddExp(false)
      const [exp, ing] = await Promise.all([API.get('/business/expenses'), API.get('/business/stock')])
      setExpenses(exp.data || [])
      setIngredients(ing.data || [])
      showToast(ai_verified ? 'Expense saved + stock updated by AI!' : 'Expense added!')
    } catch { showToast('Error adding expense', 'error') }
  }

  const handleAddEmployee = async (form) => {
    try {
      await API.post('/business/employees', form)
      setShowAddEmp(false)
      const emp = await API.get('/business/employees')
      setEmployees(emp.data || [])
      showToast('Employee added!')
    } catch { showToast('Error adding employee', 'error') }
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Remove this employee?')) return
    try {
      await API.delete('/business/employees/' + id)
      setEmployees(prev => prev.filter(e => e.id !== id))
      showToast('Employee removed', 'error')
    } catch {}
  }

  // ── Derived values ───────────────────────────────────────
  const monthRevenue  = revenue.filter(r => { const d = new Date(r.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() }).reduce((s, r) => s + safeNum(r.total_revenue), 0)
  const monthExpenses = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() }).reduce((s, e) => s + safeNum(e.amount), 0)
  const monthPayroll  = employees.filter(e => e.is_active && e.salary_type === 'monthly').reduce((s, e) => s + safeNum(e.salary), 0)
  const netProfit     = monthRevenue - monthExpenses - monthPayroll
  const profitMargin  = monthRevenue > 0 ? ((netProfit / monthRevenue) * 100).toFixed(1) : 0
  const todayStr      = today.toISOString().split('T')[0]
  const todayRevenue  = revenue.filter(r => r.date?.split('T')[0] === todayStr).reduce((s, r) => s + safeNum(r.total_revenue), 0)
  const lowStockCount = ingredients.filter(i => safeNum(i.stock_quantity) <= safeNum(i.low_stock_alert) && safeNum(i.low_stock_alert) > 0).length

  const expCategoryData = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() })
    .reduce((acc, e) => { const f = acc.find(i => i.name === e.category); if (f) f.value += safeNum(e.amount); else acc.push({ name: e.category, value: safeNum(e.amount) }); return acc }, [])
    .sort((a, b) => b.value - a.value)

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayRev  = revenue.filter(r => r.date?.split('T')[0] === dateStr).reduce((s, r) => s + safeNum(r.total_revenue), 0)
    return { label: d.toLocaleDateString('default', { weekday: 'short' }), value: dayRev, isToday: i === 6 }
  })
  const maxDay = Math.max(...last7Days.map(d => d.value), 1)

  const isRestaurant = user?.business_type === 'restaurant'
  const businessName = user?.business_name || (isRestaurant ? 'My Restaurant' : 'My Business')

  if (loading) return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      {toast     && <Toast {...toast} onClose={() => setToast(null)} />}
      {modalData && <NumberModal {...modalData} onClose={() => setModalData(null)} />}
      {showAddRev && <AddRevenueSheet onClose={() => setShowAddRev(false)} onSave={handleAddRevenue} currencySymbol={currencySymbol} />}
      {showAddExp && <AIExpenseSheet  onClose={() => setShowAddExp(false)} onSave={handleAddExpense} currencySymbol={currencySymbol} ingredients={ingredients} />}
      {showAddEmp && <AddEmployeeSheet onClose={() => setShowAddEmp(false)} onSave={handleAddEmployee} currencySymbol={currencySymbol} />}
      {showPOS    && <POSScanner onClose={() => setShowPOS(false)} menuItems={menuItems} onComplete={() => { setShowPOS(false); fetchAll() }} showToast={showToast} currencySymbol={currencySymbol} ingredients={ingredients} />}

      <div className="max-w-2xl mx-auto px-4 py-5 pb-8">

        {/* Business header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <p className="text-xs text-gray-400">Business Dashboard</p>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{businessName}</h1>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isRestaurant ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            {isRestaurant ? '🍽️ Restaurant' : '🏪 Firm'}
          </span>
        </div>

        {/* Low stock warning */}
        {lowStockCount > 0 && (
          <a href="/business/stock" className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 mb-4">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-red-600 font-semibold text-sm">{lowStockCount} ingredient{lowStockCount > 1 ? 's' : ''} running low!</p>
              <p className="text-red-400 text-xs">Tap to view stock</p>
            </div>
            <span className="text-red-400 text-xs font-semibold">View →</span>
          </a>
        )}

        {/* Hero P&L Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-orange-400" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-400" />
          </div>
          <div className="relative">
            <p className="text-gray-400 text-xs mb-1">{monthName} — Net Profit</p>
            <button onClick={() => setModalData({ label: 'Net Profit', value: fmt(Math.abs(netProfit), currencySymbol), sub: profitMargin + '% margin' })}>
              <p className={`text-4xl font-bold tabular-nums mb-1 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : '-'}{fmt(Math.abs(netProfit), currencySymbol)}
              </p>
            </button>
            <p className="text-gray-400 text-xs">{profitMargin}% margin</p>
          </div>
          <div className="relative grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Revenue',  value: fmt(monthRevenue, currencySymbol),  color: 'text-green-400',  click: () => setModalData({ label: 'Revenue', value: fmt(monthRevenue, currencySymbol) }) },
              { label: 'Expenses', value: fmt(monthExpenses, currencySymbol), color: 'text-red-400',    click: () => setModalData({ label: 'Expenses', value: fmt(monthExpenses, currencySymbol) }) },
              { label: 'Payroll',  value: fmt(monthPayroll, currencySymbol),  color: 'text-yellow-400', click: () => setModalData({ label: 'Payroll', value: fmt(monthPayroll, currencySymbol), sub: employees.filter(e => e.is_active).length + ' employees' }) },
            ].map((s, i) => (
              <button key={i} onClick={s.click} className="bg-white/10 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                <p className="text-gray-400 text-xs mb-0.5">{s.label}</p>
                <p className={`font-bold text-sm tabular-nums truncate ${s.color}`}>{s.value}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Today chip */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3 flex items-center gap-3 flex-1">
            <span className="text-2xl">☀️</span>
            <div>
              <p className="text-xs text-orange-400 font-medium">Today's Revenue</p>
              <p className="text-xl font-bold text-orange-600 tabular-nums">{fmt(todayRevenue, currencySymbol)}</p>
            </div>
          </div>
          <button onClick={() => setShowAddRev(true)} className="bg-orange-500 text-white rounded-2xl px-4 py-3 font-bold text-sm hover:bg-orange-600 transition active:scale-95 flex-shrink-0">
            + Revenue
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Revenue', icon: '💵', color: 'bg-green-600',  action: () => setShowAddRev(true) },
            { label: 'Expense', icon: '🧾', color: 'bg-red-500',    action: () => setShowAddExp(true) },
            { label: 'Staff',   icon: '👥', color: 'bg-blue-600',   action: () => setShowAddEmp(true) },
            { label: 'Menu',    icon: '🍽️', color: 'bg-orange-500', action: () => window.location.href = '/business/menu' },
          ].map((a, i) => (
            <button key={i} onClick={a.action} className={`${a.color} text-white rounded-2xl py-3 flex flex-col items-center gap-1 active:scale-95 transition-transform shadow-sm`}>
              <span className="text-xl">{a.icon}</span>
              <span className="text-xs font-semibold">{a.label}</span>
            </button>
          ))}
        </div>

        {/* POS Scanner button */}
        <button onClick={() => setShowPOS(true)}
          className="w-full mb-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl py-4 flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg">
          <span className="text-2xl">📷</span>
          <div className="text-left">
            <p className="font-bold text-sm">POS End-of-Day Scan</p>
            <p className="text-xs text-purple-200">Scan receipt → auto revenue + stock deduction</p>
          </div>
          <span className="ml-auto text-purple-200 text-xs font-semibold bg-white/20 px-2 py-1 rounded-lg">AI</span>
        </button>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5">
          {[{ key: 'overview', label: 'Overview' }, { key: 'staff', label: 'Staff' }, { key: 'expenses', label: 'Expenses' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.key ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Last 7 Days Revenue</h3>
              <div className="flex items-end gap-2" style={{ height: 96 }}>
                {last7Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-400 tabular-nums">{day.value > 0 ? currencySymbol + (day.value >= 1000 ? (day.value/1000).toFixed(1)+'k' : day.value.toFixed(0)) : ''}</p>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col justify-end" style={{ height: 60 }}>
                      <div className={`w-full rounded-lg transition-all duration-500 ${day.isToday ? 'bg-orange-500' : 'bg-orange-200 dark:bg-orange-800'}`}
                        style={{ height: (day.value / maxDay) * 60 }} />
                    </div>
                    <p className={`text-xs font-semibold ${day.isToday ? 'text-orange-500' : 'text-gray-400'}`}>{day.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Revenue</h3>
                <button onClick={() => setShowAddRev(true)} className="text-xs text-orange-500 font-semibold hover:underline">+ Add</button>
              </div>
              {revenue.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="text-gray-400 text-sm">No revenue yet — scan a receipt or add manually</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {revenue.slice(0, 7).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{r.date?.split('T')[0]}</p>
                        {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                      </div>
                      <p className="font-bold text-green-600 tabular-nums text-sm">+{fmt(r.total_revenue, currencySymbol)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {expCategoryData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Expenses This Month</h3>
                <div className="space-y-3">
                  {expCategoryData.map((cat, i) => {
                    const pct = monthExpenses > 0 ? (cat.value / monthExpenses) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-200">{cat.name}</span>
                          <span className="text-sm font-bold tabular-nums">{fmt(cat.value, currencySymbol)} <span className="text-xs text-gray-400">({Math.round(pct)}%)</span></span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-red-400" style={{ width: pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAFF TAB */}
        {activeTab === 'staff' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Staff — {employees.filter(e => e.is_active).length} active</h3>
              <button onClick={() => setShowAddEmp(true)} className="text-xs text-blue-600 font-semibold hover:underline">+ Add</button>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4">
              <p className="text-xs text-blue-400 mb-1">Monthly Payroll</p>
              <p className="text-2xl font-bold text-blue-600 tabular-nums">{fmt(monthPayroll, currencySymbol)}</p>
              <p className="text-xs text-blue-400 mt-1">{monthRevenue > 0 ? ((monthPayroll / monthRevenue) * 100).toFixed(1) + '% of revenue' : 'No revenue recorded'}</p>
            </div>
            {employees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-gray-400 text-sm">No employees yet</p>
                <button onClick={() => setShowAddEmp(true)} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Add First Employee</button>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.filter(e => e.is_active).map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{emp.name}</p>
                      <p className="text-xs text-gray-400">{emp.role}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold tabular-nums">{fmt(emp.salary, currencySymbol)}</p>
                      <p className="text-xs text-gray-400">/{emp.salary_type === 'monthly' ? 'mo' : 'day'}</p>
                    </div>
                    <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-400 hover:text-red-600 p-1 ml-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Business Expenses</h3>
              <button onClick={() => setShowAddExp(true)} className="text-xs text-red-500 font-semibold hover:underline">+ Add</button>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🧾</p>
                <p className="text-gray-400 text-sm">No expenses yet</p>
                <button onClick={() => setShowAddExp(true)} className="mt-3 bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-semibold">Add First Expense</button>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 15).map(exp => (
                  <div key={exp.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="w-9 h-9 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-sm flex-shrink-0">
                      {exp.category === 'Ingredients' ? '🥩' : exp.category === 'Staff' ? '👥' : exp.category === 'Rent' ? '🏠' : exp.category === 'Utilities' ? '💡' : '🧾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{exp.description || exp.category}</p>
                        {exp.ai_verified && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full flex-shrink-0">🤖</span>}
                      </div>
                      <p className="text-xs text-gray-400">{exp.date?.split('T')[0]} · {exp.category}</p>
                    </div>
                    <p className="font-bold text-red-500 tabular-nums text-sm flex-shrink-0">-{fmt(exp.amount, currencySymbol)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}