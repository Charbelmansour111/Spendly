import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 font-bold opacity-70">x</button>
    </div>
  )
}

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

// ── MULTI SCAN STEP ───────────────────────────────────────
function MultiScanStep({ date, setDate, exchangeRate, setExchangeRate, onComplete, error, setError, currencySymbol, inputCls, menuItems }) {
  const [mode, setMode]               = useState('setup')
  const [stream, setStream]           = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [scanning, setScanning]       = useState(false)
  const [scannedSections, setScannedSections] = useState([])
  const [allItems, setAllItems]       = useState([])
  const [managementData, setManagementData] = useState(null)
  const [categorySummary, setCategorySummary] = useState([])
  const [flashActive, setFlashActive] = useState(false)
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)

  const startCamera = async () => {
    setCameraError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      setStream(s)
      setMode('scanning')
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play() }
      }, 150)
    } catch { setCameraError('Camera access denied. Use file upload instead.') }
  }

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null) }
  }

  useEffect(() => { return () => { if (stream) stream.getTracks().forEach(t => t.stop()) } }, [stream])

  const handleRateChange = (val) => {
    setExchangeRate(val)
    if (val) localStorage.setItem('pos_exchange_rate', val)
  }

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return
    setScanning(true)
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 300)
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.95).split(',')[1]
    try {
      const res = await API.post('/business/pos-scan-section', {
        image: imageData,
        already_found: allItems.map(i => i.name),
        menu_items: menuItems.map(m => ({ id: m.id, name: m.name, price: m.price })),
        exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null
      })
      const newItems = res.data.items || []
      const sectionLabel = `Section ${scannedSections.length + 1}`
      if (res.data.management) setManagementData(res.data.management)
      if (res.data.sales_by_category?.length) setCategorySummary(res.data.sales_by_category)
      if (newItems.length === 0) {
        setScannedSections(prev => [...prev, { label: sectionLabel, count: 0, status: 'empty' }])
      } else {
        setAllItems(prev => {
          const merged = [...prev]
          newItems.forEach(newItem => {
            const existing = merged.find(i => i.name.toLowerCase() === newItem.name.toLowerCase())
            if (existing) existing.quantity = Math.max(existing.quantity, newItem.quantity)
            else merged.push(newItem)
          })
          return merged
        })
        setScannedSections(prev => [...prev, { label: sectionLabel, count: newItems.length, status: 'success', items: newItems.map(i => i.name) }])
      }
    } catch {
      setScannedSections(prev => [...prev, { label: `Section ${scannedSections.length + 1}`, count: 0, status: 'error' }])
    }
    setScanning(false)
  }

  const handleDoneScanning = () => {
    stopCamera()
    if (allItems.length === 0) { setError('No items found. Try scanning again.'); return }
    onComplete(allItems, managementData, categorySummary)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScanning(true)
    setMode('scanning_file')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const imageData = ev.target.result.split(',')[1]
      try {
        const res = await API.post('/business/pos-scan-section', {
          image: imageData,
          already_found: [],
          menu_items: menuItems.map(m => ({ id: m.id, name: m.name, price: m.price })),
          exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null
        })
        const items = res.data.items || []
        setAllItems(items)
        setScannedSections([{ label: 'Full Receipt', count: items.length, status: items.length > 0 ? 'success' : 'empty', items: items.map(i => i.name) }])
        if (items.length > 0) {
          onComplete(items, res.data.management, res.data.sales_by_category)
        } else {
          setError('No items found. Try a clearer photo.')
          setMode('setup')
        }
      } catch { setError('Scan failed. Try again.'); setMode('setup') }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-2 block">Sale Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-2 block">Exchange Rate</label>
          <input type="number" placeholder="e.g. 90000" value={exchangeRate}
            onChange={e => handleRateChange(e.target.value)} className={inputCls} />
          {exchangeRate
            ? <p className="text-xs text-purple-500 mt-1">1{currencySymbol} = {parseInt(exchangeRate).toLocaleString()} LL</p>
            : <p className="text-xs text-gray-400 mt-1">Optional — for LL receipts</p>}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {mode === 'setup' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500">How do you want to scan?</p>
          <button onClick={startCamera}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-4 flex items-center gap-4 hover:opacity-90 transition active:scale-95">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📹</div>
            <div className="text-left">
              <p className="font-bold">Live Camera Scanner</p>
              <p className="text-xs text-purple-200">Point at each section and tap Scan. Best for large receipts.</p>
            </div>
          </button>
          <label className="w-full bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95">
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📁</div>
            <div className="text-left">
              <p className="font-bold text-gray-800 dark:text-white">Upload Photo</p>
              <p className="text-xs text-gray-400">Upload from your gallery.</p>
            </div>
          </label>
          {cameraError && <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{cameraError}</p>}
          {error && <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>}
        </div>
      )}

      {mode === 'scanning_file' && (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">📷</div>
          <div className="flex justify-center gap-2 mb-3">
            {[0,150,300].map(d => <div key={d} className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: d+'ms' }} />)}
          </div>
          <p className="font-bold text-gray-800 dark:text-white mb-1">Reading receipt...</p>
          <p className="text-gray-400 text-xs">AI is finding all items, quantities and management data</p>
        </div>
      )}

      {mode === 'scanning' && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            {flashActive && <div className="absolute inset-0 bg-white/60 pointer-events-none" />}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-4/5 h-4/5">
                {['top-0 left-0 border-t-4 border-l-4 rounded-tl-xl','top-0 right-0 border-t-4 border-r-4 rounded-tr-xl','bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl','bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'].map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 border-purple-400 ${cls}`} />
                ))}
              </div>
            </div>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <p className="text-white text-xs font-semibold bg-black/60 px-4 py-2 rounded-full">
                {scannedSections.length === 0 ? 'Point at receipt top → tap Scan Section' : 'Move down → tap Scan Section again'}
              </p>
            </div>
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="bg-white/90 rounded-2xl px-6 py-4 text-center">
                  <div className="flex justify-center gap-1.5 mb-2">
                    {[0,150,300].map(d => <div key={d} className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: d+'ms' }} />)}
                  </div>
                  <p className="text-gray-800 font-bold text-sm">Reading section...</p>
                </div>
              </div>
            )}
          </div>

          {scannedSections.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-3 space-y-2 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 mb-1">Scanned so far:</p>
              {scannedSections.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${s.status === 'success' ? 'bg-green-500 text-white' : s.status === 'empty' ? 'bg-yellow-400 text-white' : 'bg-red-500 text-white'}`}>
                    {s.status === 'success' ? '✓' : s.status === 'empty' ? '?' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{s.label} — {s.count} item{s.count !== 1 ? 's' : ''}</p>
                    {s.items && <p className="text-xs text-gray-400 truncate">{s.items.slice(0,3).join(', ')}{s.items.length > 3 ? '...' : ''}</p>}
                  </div>
                </div>
              ))}
              <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs font-bold text-purple-600">Total unique items: {allItems.length}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => { stopCamera(); setMode('setup'); setScannedSections([]); setAllItems([]) }}
              className="py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold text-xs">
              ✕ Cancel
            </button>
            <button onClick={captureAndScan} disabled={scanning}
              className="py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50 active:scale-95 transition">
              {scanning
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Scanning...</>
                : <><span>📸</span>Scan Section</>}
            </button>
            <button onClick={handleDoneScanning} disabled={allItems.length === 0}
              className="py-3 rounded-2xl bg-green-500 text-white font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40 active:scale-95 transition">
              ✓ Done
            </button>
          </div>

          {allItems.length > 0 && (
            <p className="text-center text-xs text-green-600 font-semibold">
              {allItems.length} items ready · tap Done when finished
            </p>
          )}
        </div>
      )}
    </>
  )
}

// ── POS SCANNER ───────────────────────────────────────────
function POSScanner({ onClose, menuItems, onComplete, showToast, currencySymbol, ingredients, expenses }) {
  const [step, setStep]                   = useState('upload')
  const [scanResult, setScanResult]       = useState(null)
  const [date, setDate]                   = useState(new Date().toISOString().split('T')[0])
  const [editableItems, setEditableItems] = useState([])
  const [newItemSuggestions, setNewItemSuggestions] = useState([])
  const [unmatchedDetails, setUnmatchedDetails] = useState({})
  const [externalExpenses, setExternalExpenses] = useState([])
  const [newExpense, setNewExpense]        = useState({ description: '', amount: '' })
  const [error, setError]                 = useState('')
  const [summary, setSummary]             = useState(null)
  const [exchangeRate, setExchangeRate]   = useState(() => localStorage.getItem('pos_exchange_rate') || '')

  const inputCls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  const rate = exchangeRate ? parseFloat(exchangeRate) : null

  const DRINK_KEYWORDS = ['pepsi','7up','sprite','cola','fanta','miranda','juice','lemonade','ice tea','iced tea','schweppes','redbull','red bull','soda','diet','zero','light','ab3a']
  const WATER_KEYWORDS = ['water small','water large','water','nestle','evian','aquafina','perrier']

  const handleScanComplete = async (rawItems, managementData, categorySummary) => {
    setStep('matching')
    try {
      const matched = rawItems.map(item => {
        const nameLower = item.name.toLowerCase().trim()
        let detectedType = item.type || 'food'
        if (WATER_KEYWORDS.some(w => nameLower.includes(w))) detectedType = 'water'
        else if (DRINK_KEYWORDS.some(d => nameLower.includes(d))) detectedType = 'drink'
        else if (nameLower.includes('delivery')) detectedType = 'delivery'

        let match = menuItems.find(m => m.name.toLowerCase().trim() === nameLower)
        if (!match) match = menuItems.find(m =>
          m.name.toLowerCase().includes(nameLower) ||
          nameLower.includes(m.name.toLowerCase()) ||
          m.name.toLowerCase().replace(/\s/g,'') === nameLower.replace(/\s/g,'')
        )
        const finalPrice = item.unit_price > 0 ? item.unit_price : (match ? parseFloat(match.price) : 0)
        return { ...item, type: detectedType, unit_price: finalPrice, matched: !!match, matched_id: match?.id || null, matched_name: match?.name || null }
      })

      const unmatched = matched.filter(i => !i.matched)
      let suggestions = []
      if (unmatched.length > 0) {
        try {
          const res = await API.post('/business/pos-suggest-items', { items: unmatched.map(i => ({ name: i.name, unit_price: i.unit_price, type: i.type })) })
          suggestions = res.data || []
        } catch {}
      }

      const initDetails = {}
      unmatched.forEach(i => { initDetails[i.name] = { selling_price: i.unit_price || '', cost: '' } })
      setUnmatchedDetails(initDetails)

      setScanResult({ items: matched, total_found: matched.length, total_matched: matched.filter(i => i.matched).length, management: managementData || null, sales_by_category: categorySummary || [] })
      setEditableItems(matched.map(item => ({ ...item, confirmed: true })))
      setNewItemSuggestions(suggestions.map(s => ({ ...s, adding: false, added: false })))
      setStep('review')
    } catch {
      setError('Error matching items.')
      setStep('upload')
    }
  }

  const handleAddNewItem = async (idx) => {
    const item = newItemSuggestions[idx]
    const exists = menuItems.some(m => m.name.toLowerCase() === item.name.toLowerCase())
    if (exists) { showToast(`"${item.name}" already exists!`, 'error'); return }
    setNewItemSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, adding: true } : s))
    try {
      await API.post('/business/menu', { name: item.name, category: item.category, price: item.suggested_price || 0 })
      setNewItemSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, adding: false, added: true } : s))
      showToast(`✅ "${item.name}" added to menu!`)
    } catch (e) {
      showToast(e.response?.data?.message || 'Error adding item', 'error')
      setNewItemSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, adding: false } : s))
    }
  }

  const handleConfirm = async (extExpenses = []) => {
    setStep('saving')
    const confirmedItems = editableItems.filter(i => i.confirmed && i.matched_id)
    const confirmedAll   = editableItems.filter(i => i.confirmed)

    const matchedRevenue = confirmedItems.reduce((s, i) => s + (parseFloat(i.unit_price || 0) * parseInt(i.quantity || 0)), 0)
    const unmatchedRevenue = editableItems.filter(i => i.confirmed && !i.matched).reduce((s, i) => {
      const detail = unmatchedDetails[i.name]
      const price  = detail?.selling_price ? parseFloat(detail.selling_price) : parseFloat(i.unit_price || 0)
      return s + (price * parseInt(i.quantity || 0))
    }, 0)
    const totalRevenueUSD  = matchedRevenue + unmatchedRevenue
    const unmatchedCost    = editableItems.filter(i => i.confirmed && !i.matched).reduce((s, i) => {
      const detail = unmatchedDetails[i.name]
      return s + (detail?.cost ? parseFloat(detail.cost) * parseInt(i.quantity || 0) : 0)
    }, 0)
    const totalExternalCost = extExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

    const drinkItems  = confirmedAll.filter(i => i.type === 'drink')
    const waterItems  = confirmedAll.filter(i => i.type === 'water')
    const foodItems   = confirmedAll.filter(i => i.type === 'food' || (!i.type && i.type !== 'delivery'))
    const delivItems  = confirmedAll.filter(i => i.type === 'delivery')

    try {
      await API.post('/business/revenue', {
        date, total_revenue: totalRevenueUSD,
        notes: `POS Scan: ${confirmedAll.length} items${rate ? ` · Rate: 1$=${rate}LL` : ''}`,
        scan_raw: JSON.stringify(editableItems)
      })

      // Save external expenses
      for (const exp of extExpenses) {
        try {
          await API.post('/expenses', { amount: exp.amount, category: 'Other', description: exp.description, date })
        } catch {}
      }

      let deductions = []
      let lowStockAlerts = []
      if (confirmedItems.length > 0) {
        const dr = await API.post('/business/deduct-stock', { items_sold: confirmedItems.map(i => ({ menu_item_id: i.matched_id, quantity_sold: i.quantity })) })
        deductions = dr.data?.deductions || []
      }

      try {
        const stockRes = await API.get('/business/stock')
        lowStockAlerts = (stockRes.data || []).filter(s => parseFloat(s.stock_quantity) <= parseFloat(s.low_stock_alert) && parseFloat(s.low_stock_alert) > 0)
      } catch {}

      // Save pending items for stock page
      const pendingItems = editableItems.filter(i => !i.matched && i.confirmed).map(i => ({
        name: i.name,
        selling_price: unmatchedDetails[i.name]?.selling_price || '',
        cost: unmatchedDetails[i.name]?.cost || '',
        quantity_sold: i.quantity,
        type: i.type,
        date
      }))
      if (pendingItems.length > 0) {
        localStorage.setItem('pending_stock_items', JSON.stringify(pendingItems))
      }

      // Auto-save day report
      try {
        const todayExpenses = (expenses || [])
          .filter(e => e.date?.split('T')[0] === date)
          .reduce((s, e) => s + safeNum(e.amount), 0)
        const topSeller = [...confirmedAll].sort((a, b) => b.quantity - a.quantity)[0]
        await API.post('/business/reports/days', {
          date, revenue: totalRevenueUSD,
          expenses: todayExpenses,
          external_expenses: totalExternalCost,
          profit: totalRevenueUSD - todayExpenses - totalExternalCost - unmatchedCost,
          items_sold: confirmedAll.length,
          top_seller: topSeller ? `${topSeller.matched_name || topSeller.name} × ${topSeller.quantity}` : null,
          num_customers: scanResult?.management?.num_customers || null,
          exchange_rate: rate,
          scan_data: { items: editableItems, management: scanResult?.management },
          notes: `POS Scan · ${confirmedAll.length} items${rate ? ` · 1$=${rate}LL` : ''}`
        })
      } catch (e) { console.log('Report save error:', e) }

      const topSeller2 = [...confirmedAll].sort((a, b) => b.quantity - a.quantity)[0]
      const totalQty   = confirmedAll.reduce((s, i) => s + parseInt(i.quantity || 0), 0)

      setSummary({
        date, revenueUSD: totalRevenueUSD,
        revenueLL: rate ? Math.round(totalRevenueUSD * rate) : null,
        matchedRevenue, unmatchedRevenue, unmatchedCost,
        totalExternalCost,
        itemCount: confirmedAll.length, totalQty,
        topSeller: topSeller2 ? `${topSeller2.matched_name || topSeller2.name} × ${topSeller2.quantity}` : null,
        matched: confirmedItems.length,
        unmatched: editableItems.filter(i => !i.matched).length,
        foodItems, drinkItems, waterItems, delivItems,
        totalDrinkQty: drinkItems.reduce((s,i)=>s+parseInt(i.quantity||0),0),
        totalWaterQty: waterItems.reduce((s,i)=>s+parseInt(i.quantity||0),0),
        deductions, lowStockAlerts,
        management: scanResult?.management || null,
        sales_by_category: scanResult?.sales_by_category || [],
        unmatchedItems: editableItems.filter(i => i.confirmed && !i.matched).map(i => ({ ...i, ...unmatchedDetails[i.name] })),
        externalExpenses: extExpenses,
      })
      setStep('summary')
    } catch { showToast('Error saving', 'error'); setStep('review') }
  }

  const totalRevenueUSD = editableItems.filter(i => i.confirmed).reduce((s, i) => {
    if (!i.matched) {
      const detail = unmatchedDetails[i.name]
      const price  = detail?.selling_price ? parseFloat(detail.selling_price) : parseFloat(i.unit_price || 0)
      return s + (price * parseInt(i.quantity || 0))
    }
    return s + (parseFloat(i.unit_price || 0) * parseInt(i.quantity || 0))
  }, 0)

  const drinkItems   = editableItems.filter(i => i.type === 'drink')
  const waterItems   = editableItems.filter(i => i.type === 'water')
  const foodItems    = editableItems.filter(i => i.type === 'food' || (!i.type && i.type !== 'delivery' && i.type !== 'drink' && i.type !== 'water'))
  const delivItems   = editableItems.filter(i => i.type === 'delivery')
  const unmatchedList = editableItems.filter(i => !i.matched)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl max-h-[94vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

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
          <div className="flex items-center gap-1 mt-4">
            {['Scan','Match','Review','Done'].map((s, i) => {
              const stepIdx = { upload:0, matching:1, review:2, expenses_prompt:2, saving:2, summary:3 }[step] ?? 0
              const done = i < stepIdx, active = i === stepIdx
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

          {step === 'upload' && (
            <MultiScanStep date={date} setDate={setDate} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate}
              onComplete={handleScanComplete} error={error} setError={setError}
              currencySymbol={currencySymbol} inputCls={inputCls} menuItems={menuItems} />
          )}

          {step === 'matching' && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">🔍</div>
              <div className="flex justify-center gap-2 mb-4">
                {[0,150,300].map(d => <div key={d} className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: d+'ms' }} />)}
              </div>
              <p className="font-bold text-gray-800 dark:text-white text-lg mb-1">Matching to your menu...</p>
              <p className="text-gray-400 text-sm">Grouping drinks, detecting items, linking to stock</p>
            </div>
          )}

          {step === 'review' && scanResult && (
            <>
              {/* Revenue banner */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 text-white">
                <p className="text-xs text-purple-200 mb-1">{scanResult.total_found} items · {scanResult.total_matched} matched</p>
                <p className="text-3xl font-bold tabular-nums">{currencySymbol}{totalRevenueUSD.toFixed(2)}</p>
                {rate && <p className="text-sm text-purple-200 mt-1">{Math.round(totalRevenueUSD * rate).toLocaleString()} LL</p>}
                <p className="text-xs text-purple-300 mt-1">{date}</p>
              </div>

              {/* Management summary */}
              {scanResult.management && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📋 Receipt Data</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      scanResult.management.num_customers && { label: 'Customers', value: scanResult.management.num_customers },
                      scanResult.management.num_invoices && { label: 'Invoices', value: scanResult.management.num_invoices },
                      scanResult.management.avg_check && { label: 'Avg Check', value: currencySymbol + parseFloat(scanResult.management.avg_check).toFixed(2) },
                      scanResult.management.discount && parseFloat(scanResult.management.discount) > 0 && { label: 'Discount', value: currencySymbol + parseFloat(scanResult.management.discount).toFixed(2) },
                    ].filter(Boolean).map((row, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-400">{row.label}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FOOD ITEMS */}
              {foodItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">🍔 Food ({foodItems.length} types)</p>
                  <div className="space-y-1.5">
                    {foodItems.map((item, idx) => {
                      const lineUSD = parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0)
                      const globalIdx = editableItems.findIndex(i => i.name === item.name)
                      return (
                        <div key={idx} className={`rounded-xl border p-2.5 flex items-center gap-2 ${item.confirmed ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10' : 'border-gray-200 opacity-50'}`}>
                          <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, confirmed: !it.confirmed } : it))}
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.confirmed ? 'bg-purple-600' : 'bg-gray-300'}`}>
                            {item.confirmed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{item.name}</p>
                            {item.matched
                              ? <p className="text-xs text-green-500">✓ {item.matched_name}</p>
                              : <p className="text-xs text-yellow-500">⚠ Not in menu</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: Math.max(1, (it.quantity||1)-1) } : it))} className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-bold flex items-center justify-center">−</button>
                            <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: (it.quantity||1)+1 } : it))} className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded text-xs font-bold flex items-center justify-center">+</button>
                          </div>
                          <p className="text-xs font-bold text-purple-600 tabular-nums flex-shrink-0 ml-1">{currencySymbol}{lineUSD.toFixed(2)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* DRINKS GROUP */}
              {drinkItems.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-semibold text-blue-600">🥤 Soft Drinks</p>
                    <p className="text-xs font-bold text-blue-600">{drinkItems.reduce((s,i)=>s+parseInt(i.quantity||0),0)} units</p>
                  </div>
                  {drinkItems.map((item, idx) => {
                    const globalIdx = editableItems.findIndex(i => i.name === item.name)
                    const lineUSD   = parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0)
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs mb-1">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">{item.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: Math.max(1, (it.quantity||1)-1) } : it))} className="w-4 h-4 bg-blue-200 rounded font-bold flex items-center justify-center">−</button>
                          <span className="font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: (it.quantity||1)+1 } : it))} className="w-4 h-4 bg-blue-200 rounded font-bold flex items-center justify-center">+</button>
                          <span className="text-blue-600 font-bold ml-1">{currencySymbol}{lineUSD.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* WATER GROUP */}
              {waterItems.length > 0 && (
                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-semibold text-cyan-600">💧 Water</p>
                    <p className="text-xs font-bold text-cyan-600">{waterItems.reduce((s,i)=>s+parseInt(i.quantity||0),0)} units</p>
                  </div>
                  {waterItems.map((item, idx) => {
                    const globalIdx = editableItems.findIndex(i => i.name === item.name)
                    const lineUSD   = parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0)
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs mb-1">
                        <span className="text-cyan-700 dark:text-cyan-300 font-medium">{item.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: Math.max(1, (it.quantity||1)-1) } : it))} className="w-4 h-4 bg-cyan-200 rounded font-bold flex items-center justify-center">−</button>
                          <span className="font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: (it.quantity||1)+1 } : it))} className="w-4 h-4 bg-cyan-200 rounded font-bold flex items-center justify-center">+</button>
                          <span className="text-cyan-600 font-bold ml-1">{currencySymbol}{lineUSD.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* DELIVERY */}
              {delivItems.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-3">
                  <p className="text-xs font-semibold text-yellow-600 mb-2">🛵 Delivery ({delivItems.reduce((s,i)=>s+parseInt(i.quantity||0),0)} orders)</p>
                  {delivItems.map((item, idx) => {
                    const globalIdx = editableItems.findIndex(i => i.name === item.name)
                    const lineUSD   = parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0)
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs mb-1">
                        <span className="text-yellow-700 dark:text-yellow-300 font-medium">{item.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: Math.max(1, (it.quantity||1)-1) } : it))} className="w-4 h-4 bg-yellow-200 rounded font-bold flex items-center justify-center">−</button>
                          <span className="font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => setEditableItems(prev => prev.map((it, i) => i === globalIdx ? { ...it, quantity: (it.quantity||1)+1 } : it))} className="w-4 h-4 bg-yellow-200 rounded font-bold flex items-center justify-center">+</button>
                          <span className="text-yellow-600 font-bold ml-1">{currencySymbol}{lineUSD.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* UNMATCHED ITEMS */}
              {unmatchedList.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-2xl p-4">
                  <p className="text-sm font-bold text-orange-600 mb-1">⚠️ {unmatchedList.length} items not in your menu</p>
                  <p className="text-xs text-orange-400 mb-3">Fill selling price and cost to calculate profit correctly.</p>
                  <div className="space-y-3">
                    {unmatchedList.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{item.name}</p>
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">× {item.quantity} sold</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Selling Price ({currencySymbol})</label>
                            <input type="number" placeholder="0.00" step="0.01" min="0"
                              value={unmatchedDetails[item.name]?.selling_price || ''}
                              onChange={e => setUnmatchedDetails(prev => ({ ...prev, [item.name]: { ...prev[item.name], selling_price: e.target.value } }))}
                              className="w-full px-2 py-1.5 border border-orange-200 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Cost to make ({currencySymbol})</label>
                            <input type="number" placeholder="0.00" step="0.01" min="0"
                              value={unmatchedDetails[item.name]?.cost || ''}
                              onChange={e => setUnmatchedDetails(prev => ({ ...prev, [item.name]: { ...prev[item.name], cost: e.target.value } }))}
                              className="w-full px-2 py-1.5 border border-orange-200 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
                          </div>
                        </div>
                        {unmatchedDetails[item.name]?.selling_price && unmatchedDetails[item.name]?.cost && (
                          <div className="mt-2 flex gap-3 text-xs flex-wrap">
                            <span className="text-green-600 font-semibold">Rev: {currencySymbol}{(parseFloat(unmatchedDetails[item.name].selling_price) * item.quantity).toFixed(2)}</span>
                            <span className="text-red-500 font-semibold">Cost: {currencySymbol}{(parseFloat(unmatchedDetails[item.name].cost) * item.quantity).toFixed(2)}</span>
                            <span className={`font-bold ${(parseFloat(unmatchedDetails[item.name].selling_price) - parseFloat(unmatchedDetails[item.name].cost)) >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                              Profit: {currencySymbol}{((parseFloat(unmatchedDetails[item.name].selling_price) - parseFloat(unmatchedDetails[item.name].cost)) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New item suggestions */}
              {newItemSuggestions.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl p-4">
                  <p className="text-sm font-bold text-blue-600 mb-1">🤖 Add unmatched items to menu?</p>
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
                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                              {s.adding ? '...' : '+ Add'}
                            </button>
                            <button onClick={() => setNewItemSuggestions(prev => prev.filter((_, i) => i !== idx))}
                              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1.5 rounded-lg">Skip</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editableItems.some(i => i.confirmed && i.matched) && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-2xl p-3">
                  <p className="text-xs font-semibold text-orange-600 mb-1">📦 Stock will be auto-deducted for {editableItems.filter(i => i.confirmed && i.matched).length} items</p>
                  <p className="text-xs text-orange-400">Low stock alerts will fire automatically</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setStep('upload'); setError('') }}
                  className="py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold text-sm">
                  ← Rescan
                </button>
                <button onClick={() => setStep('expenses_prompt')}
                  className="py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm">
                  Next →
                </button>
              </div>
            </>
          )}

          {/* EXTERNAL EXPENSES PROMPT */}
          {step === 'expenses_prompt' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white text-center">
                <p className="text-2xl mb-1">🧾</p>
                <p className="font-bold text-lg">Any extra expenses today?</p>
                <p className="text-orange-100 text-xs mt-1">Add any external costs before closing the day (supplies, delivery fees, gas, etc.)</p>
              </div>

              {externalExpenses.length > 0 && (
                <div className="space-y-2">
                  {externalExpenses.map((exp, i) => (
                    <div key={i} className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{exp.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-500">{currencySymbol}{parseFloat(exp.amount).toFixed(2)}</span>
                        <button onClick={() => setExternalExpenses(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold px-1">
                    <span className="text-gray-600 dark:text-gray-300">Total extra expenses</span>
                    <span className="text-red-500">{currencySymbol}{externalExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 space-y-2 border border-gray-100 dark:border-gray-600">
                <input type="text" placeholder="Description (e.g. gas, packaging)"
                  value={newExpense.description}
                  onChange={e => setNewExpense(f => ({ ...f, description: e.target.value }))}
                  className={inputCls} />
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount" step="0.01" min="0"
                    value={newExpense.amount}
                    onChange={e => setNewExpense(f => ({ ...f, amount: e.target.value }))}
                    className={inputCls} />
                  <button onClick={() => {
                    if (!newExpense.description || !newExpense.amount) return
                    setExternalExpenses(prev => [...prev, { ...newExpense }])
                    setNewExpense({ description: '', amount: '' })
                  }} className="bg-red-500 text-white px-4 rounded-xl font-bold text-sm flex-shrink-0 hover:bg-red-600 transition">+ Add</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStep('review')}
                  className="py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold text-sm">
                  ← Back
                </button>
                <button onClick={() => handleConfirm(externalExpenses)}
                  className="py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm">
                  {externalExpenses.length > 0 ? '💾 Save & Close Day' : '✓ Close Day'}
                </button>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 animate-pulse">💾</div>
              <p className="font-bold text-gray-800 dark:text-white text-lg mb-1">Closing the day...</p>
              <p className="text-gray-400 text-sm">Revenue saved · Stock deducted · Report generated</p>
            </div>
          )}

          {/* EMAIL-STYLE SUMMARY */}
          {step === 'summary' && summary && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">📧</div>
                  <div>
                    <p className="font-bold text-lg">End of Day Report</p>
                    <p className="text-gray-400 text-xs">{summary.date} · Generated by Spendly AI</p>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-gray-400 text-xs mb-1">NET REVENUE</p>
                  <p className="text-4xl font-bold text-green-400 tabular-nums">{currencySymbol}{summary.revenueUSD.toFixed(2)}</p>
                  {summary.revenueLL && <p className="text-gray-400 text-sm mt-1">{summary.revenueLL.toLocaleString()} LL</p>}
                </div>
              </div>

              {/* Financial */}
              <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">💰 Financial Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Revenue from menu items</span>
                    <span className="font-semibold text-green-600">+{currencySymbol}{summary.matchedRevenue.toFixed(2)}</span>
                  </div>
                  {summary.unmatchedRevenue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Revenue from other items</span>
                      <span className="font-semibold text-green-600">+{currencySymbol}{summary.unmatchedRevenue.toFixed(2)}</span>
                    </div>
                  )}
                  {summary.unmatchedCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Cost of unmatched items</span>
                      <span className="font-semibold text-red-500">-{currencySymbol}{summary.unmatchedCost.toFixed(2)}</span>
                    </div>
                  )}
                  {summary.totalExternalCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">External expenses</span>
                      <span className="font-semibold text-red-500">-{currencySymbol}{summary.totalExternalCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-gray-700 dark:text-white">Total Revenue (static)</span>
                    <span className="text-green-600">{currencySymbol}{summary.revenueUSD.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Sales */}
              <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">📊 Sales Breakdown</p>
                <div className="space-y-1.5">
                  {[
                    { label: '🍔 Food types', value: (summary.foodItems?.length || 0) + ' types · ' + (summary.foodItems?.reduce((s,i)=>s+parseInt(i.quantity||0),0)||0) + ' units' },
                    summary.totalDrinkQty > 0 && { label: '🥤 Soft drinks', value: summary.totalDrinkQty + ' units' },
                    summary.totalWaterQty > 0 && { label: '💧 Water', value: summary.totalWaterQty + ' units' },
                    summary.delivItems?.length > 0 && { label: '🛵 Delivery', value: summary.delivItems.reduce((s,i)=>s+parseInt(i.quantity||0),0) + ' orders' },
                    summary.topSeller && { label: '🏆 Top seller', value: summary.topSeller },
                    { label: '📦 Total units', value: summary.totalQty + ' units' },
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-600 last:border-0">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-semibold text-gray-800 dark:text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Management data */}
              {summary.management && (
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">📋 POS Report Data</p>
                  <div className="space-y-1.5">
                    {[
                      summary.management.num_customers && { label: 'Total customers', value: summary.management.num_customers },
                      summary.management.num_invoices && { label: 'Total invoices', value: summary.management.num_invoices },
                      summary.management.avg_check && { label: 'Average check', value: currencySymbol + parseFloat(summary.management.avg_check).toFixed(2) },
                      summary.management.discount && parseFloat(summary.management.discount) > 0 && { label: 'Discounts given', value: '-' + currencySymbol + parseFloat(summary.management.discount).toFixed(2) },
                      summary.management.first_invoice && { label: 'Invoice range', value: `#${summary.management.first_invoice} → #${summary.management.last_invoice}` },
                    ].filter(Boolean).map((row, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-600 last:border-0">
                        <span className="text-gray-500">{row.label}</span>
                        <span className="font-semibold text-gray-800 dark:text-white">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock deducted */}
              {summary.deductions?.length > 0 && (
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">📦 Stock Deducted Today</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {summary.deductions.map((d, i) => (
                      <div key={i} className="flex justify-between text-xs py-1">
                        <span className="text-gray-600 dark:text-gray-300">{d.ingredient}</span>
                        <span className={`font-semibold tabular-nums ${parseFloat(d.remaining) <= 0 ? 'text-red-500' : 'text-orange-500'}`}>
                          -{parseFloat(d.used).toFixed(3)} → {parseFloat(d.remaining).toFixed(2)} left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Restock alerts */}
              {summary.lowStockAlerts?.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-4">
                  <p className="text-sm font-bold text-red-600 mb-2">🚨 Restock Needed!</p>
                  <div className="space-y-2">
                    {summary.lowStockAlerts.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{ing.emoji || '📦'} {ing.name}</p>
                          <p className="text-xs text-red-500">{parseFloat(ing.stock_quantity).toFixed(1)} {ing.unit} left · min: {parseFloat(ing.low_stock_alert).toFixed(1)}</p>
                        </div>
                        <a href="/business/stock" className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg font-semibold">Restock →</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched recommendation */}
              {summary.unmatchedItems?.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl p-4">
                  <p className="text-sm font-bold text-blue-600 mb-2">💡 Add to Menu</p>
                  <p className="text-xs text-blue-400 mb-2">These items were sold but aren't in your menu yet:</p>
                  {summary.unmatchedItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs py-1">
                      <span className="text-blue-700 dark:text-blue-300">• {item.name} × {item.quantity}</span>
                      <a href="/business/menu" className="text-blue-600 font-semibold underline">Add →</a>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-center text-gray-400">📁 Day report saved automatically to Reports</p>

              <button onClick={onComplete} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold hover:opacity-90 transition">
                Done ✓
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AI EXPENSE SHEET ──────────────────────────────────────
function AIExpenseSheet({ onClose, onSave, currencySymbol, ingredients }) {
  const [step, setStep]           = useState('input')
  const [form, setForm]           = useState({
    amount: '', category: 'Ingredients', description: '',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    expense_scope: 'monthly', // 'daily' | 'monthly'
    linked_date: new Date().toISOString().split('T')[0],
  })
  const [aiResult, setAiResult]   = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError]     = useState('')
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

        <div className="flex justify-between items-center p-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Business Expense</h3>
            <p className="text-xs text-orange-500 font-medium mt-0.5">🤖 AI-powered verification</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">

          {step === 'input' && (
            <>
              {/* ── EXPENSE TYPE TOGGLE ── */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Expense Type</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, expense_scope: 'daily' }))}
                    className={`rounded-2xl p-3 border-2 text-left transition ${form.expense_scope === 'daily' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'}`}>
                    <p className="text-xl mb-1">📅</p>
                    <p className={`text-sm font-bold ${form.expense_scope === 'daily' ? 'text-orange-600' : 'text-gray-700 dark:text-gray-200'}`}>Daily</p>
                    <p className="text-xs text-gray-400 mt-0.5">Linked to a specific day's report (gas, packaging, today's supplies)</p>
                    {form.expense_scope === 'daily' && (
                      <span className="mt-1.5 inline-block text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold">✓ Selected</span>
                    )}
                  </button>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, expense_scope: 'monthly' }))}
                    className={`rounded-2xl p-3 border-2 text-left transition ${form.expense_scope === 'monthly' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'}`}>
                    <p className="text-xl mb-1">📆</p>
                    <p className={`text-sm font-bold ${form.expense_scope === 'monthly' ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-200'}`}>Monthly</p>
                    <p className="text-xs text-gray-400 mt-0.5">General overhead (rent, salaries, utilities, subscriptions)</p>
                    {form.expense_scope === 'monthly' && (
                      <span className="mt-1.5 inline-block text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-semibold">✓ Selected</span>
                    )}
                  </button>
                </div>

                {/* Explanation banner */}
                <div className={`mt-2 rounded-xl px-3 py-2 text-xs ${form.expense_scope === 'daily' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}>
                  {form.expense_scope === 'daily'
                    ? '📅 This expense will appear in the selected day\'s report folder and affect that day\'s profit calculation.'
                    : '📆 This expense will appear in the monthly overview. It\'s distributed across the month, not a specific day.'}
                </div>
              </div>

              {/* Date — label changes based on type */}
              {form.expense_scope === 'daily' ? (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    📅 Which day does this belong to?
                  </label>
                  <input type="date" value={form.linked_date}
                    onChange={e => setForm(f => ({ ...f, linked_date: e.target.value, date: e.target.value }))}
                    className={cls} />
                  <p className="text-xs text-orange-400 mt-1">This expense will be added to that day's report</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    📆 Date
                  </label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={cls} />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({currencySymbol})</label>
                <input type="number" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  min="0.01" step="0.01" className={cls + ' text-2xl font-bold'} />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {BIZ_CATS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setForm(f => ({ ...f, category: c }))}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${form.category === c ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {c === 'Ingredients' ? '🥩' : c === 'Staff' ? '👥' : c === 'Rent' ? '🏠' : c === 'Utilities' ? '💡' : c === 'Marketing' ? '📣' : c === 'Equipment' ? '🔧' : c === 'Packaging' ? '📦' : '🧾'} {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Description
                  {form.category === 'Ingredients' && <span className="text-orange-500 ml-1">(AI will parse & update stock)</span>}
                </label>
                <input type="text"
                  placeholder={form.category === 'Ingredients' ? 'e.g. 2 bags of burger buns, 5kg beef' : form.expense_scope === 'daily' ? 'e.g. gas for delivery, extra packaging' : 'e.g. monthly rent payment'}
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={cls} />
              </div>

              {/* Recurring — only for monthly */}
              {form.expense_scope === 'monthly' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_recurring}
                    onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                    className="accent-orange-500 w-4 h-4" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Recurring monthly expense</span>
                </label>
              )}

              {aiError && <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{aiError}</p>}

              {form.category === 'Ingredients' ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={runAI} disabled={!form.amount || !form.description || aiLoading}
                    className="bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {aiLoading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</>
                      : <><span>🤖</span>AI Check + Stock</>}
                  </button>
                  <button onClick={handleSkipAI} disabled={!form.amount || !form.date}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white py-4 rounded-2xl font-bold transition disabled:opacity-50">
                    Save Manually
                  </button>
                </div>
              ) : (
                <button onClick={handleSkipAI} disabled={!form.amount || !form.date}
                  className={`w-full py-4 rounded-2xl font-bold transition disabled:opacity-50 text-white ${form.expense_scope === 'daily' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {form.expense_scope === 'daily' ? '📅 Add Daily Expense' : '📆 Add Monthly Expense'}
                </button>
              )}
            </>
          )}

          {step === 'ai_review' && aiResult && (
            <>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🤖</span>
                  <p className="font-bold text-orange-600 text-sm">AI Verification Complete</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">{aiResult.summary}</p>

                {/* Show scope badge */}
                <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold mb-3 ${form.expense_scope === 'daily' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {form.expense_scope === 'daily' ? '📅 Daily expense — will appear in day report' : '📆 Monthly overhead'}
                </div>

                {aiResult.stock_updates?.length > 0 && (
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
                {aiResult.warnings?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {aiResult.warnings.map((w, i) => <p key={i} className="text-xs text-orange-600">⚠️ {w}</p>)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleConfirm}
                  className="bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition">
                  ✓ Confirm & Save
                </button>
                <button onClick={() => setStep('input')}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white py-4 rounded-2xl font-bold transition">
                  Edit
                </button>
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
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={cls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Total Revenue ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.total_revenue} onChange={e => setForm(f => ({ ...f, total_revenue: e.target.value }))} min="0" step="0.01" className={cls + ' text-2xl font-bold'} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
            <input type="text" placeholder="e.g. busy Friday night" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={cls} />
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
            <input type="text" placeholder="e.g. Ahmad Khalil" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={cls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={cls}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Salary Type</label>
              <select value={form.salary_type} onChange={e => setForm(f => ({ ...f, salary_type: e.target.value }))} className={cls}>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Salary ({currencySymbol}/{form.salary_type === 'monthly' ? 'month' : 'day'})</label>
            <input type="number" placeholder="0.00" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} min="0" step="0.01" className={cls + ' text-lg font-bold'} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone (optional)</label>
            <input type="tel" placeholder="+961 XX XXX XXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={cls} />
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

  const today     = new Date()
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
      if (stock_updates?.length > 0) await API.post('/business/apply-stock-updates', { stock_updates })
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
      {showPOS    && <POSScanner onClose={() => setShowPOS(false)} menuItems={menuItems} onComplete={() => { setShowPOS(false); fetchAll() }} showToast={showToast} currencySymbol={currencySymbol} ingredients={ingredients} expenses={expenses} />}

      <div className="max-w-2xl mx-auto px-4 py-5 pb-8">

        <div className="flex justify-between items-center mb-5">
          <div>
            <p className="text-xs text-gray-400">Business Dashboard</p>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{businessName}</h1>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isRestaurant ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            {isRestaurant ? '🍽️ Restaurant' : '🏪 Firm'}
          </span>
        </div>

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

        {/* Hero P&L */}
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

        {/* POS Scanner */}
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

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Last 7 Days Revenue</h3>
              <div className="flex items-end gap-2" style={{ height: 96 }}>
                {last7Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-400 tabular-nums">{day.value > 0 ? currencySymbol + (day.value >= 1000 ? (day.value/1000).toFixed(1)+'k' : day.value.toFixed(0)) : ''}</p>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col justify-end" style={{ height: 60 }}>
                      <div className={`w-full rounded-lg transition-all duration-500 ${day.isToday ? 'bg-orange-500' : 'bg-orange-200 dark:bg-orange-800'}`} style={{ height: (day.value / maxDay) * 60 }} />
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
                      <div className="flex items-center gap-1.5 flex-wrap">
  <p className="text-xs text-gray-400">{exp.date?.split('T')[0]} · {exp.category}</p>
  {exp.expense_scope === 'daily'
    ? <span className="text-xs bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full font-semibold">📅 Daily</span>
    : <span className="text-xs bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full font-semibold">📆 Monthly</span>}
</div>
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