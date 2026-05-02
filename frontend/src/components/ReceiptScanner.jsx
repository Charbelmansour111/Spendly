import { useState, useRef } from 'react'
import API from '../utils/api'

const ALL_CATEGORIES = ['Food', 'Coffee', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Fitness', 'Education', 'Bills', 'Travel', 'Gifts', 'Subscriptions', 'Other']

export default function ReceiptScanner({ onScanComplete }) {
  const [phase, setPhase]       = useState('idle')   // idle | scanning | items | error
  const [preview, setPreview]   = useState(null)
  const [merchant, setMerchant] = useState('')
  const [items, setItems]       = useState([])        // [{name, price, qty, checked}]
  const [category, setCategory] = useState('Food')
  const [date, setDate]         = useState('')
  const [error, setError]       = useState(null)
  const fileRef   = useRef(null)
  const cameraRef = useRef(null)

  const reset = () => {
    setPhase('idle'); setPreview(null); setMerchant(''); setItems([])
    setCategory('Food'); setDate(''); setError(null)
    if (fileRef.current)   fileRef.current.value   = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const processImage = async (file) => {
    if (!file) return
    setError(null)
    setPreview(URL.createObjectURL(file))
    setPhase('scanning')

    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const { data } = await API.post('/receipts/scan', { imageBase64: base64, mimeType: file.type })

      setMerchant(data.merchant || '')
      setCategory(ALL_CATEGORIES.includes(data.category) ? data.category : 'Other')
      setDate(data.date || new Date().toISOString().split('T')[0])
      setItems((data.items || [{ name: data.merchant || 'Purchase', price: data.total || 0, qty: 1 }]).map(i => ({
        ...i, checked: true
      })))
      setPhase('items')
    } catch {
      setError('Could not read receipt. Try a clearer photo.')
      setPhase('error')
    }
  }

  const checkedTotal = items
    .filter(i => i.checked)
    .reduce((s, i) => s + i.price * i.qty, 0)

  const handleConfirm = () => {
    const checkedItems = items.filter(i => i.checked)
    const description = merchant
      ? `${merchant}: ${checkedItems.map(i => i.qty > 1 ? `${i.name} x${i.qty}` : i.name).join(', ')}`
      : checkedItems.map(i => i.qty > 1 ? `${i.name} x${i.qty}` : i.name).join(', ')
    onScanComplete({ amount: checkedTotal.toFixed(2), description, category, date })
    reset()
  }

  const toggleItem = (idx) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it))
  const updatePrice = (idx, val) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, price: parseFloat(val) || 0 } : it))
  const updateName  = (idx, val) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, name: val } : it))
  const removeItem  = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const addItem     = () => setItems(prev => [...prev, { name: '', price: 0, qty: 1, checked: true }])

  if (phase === 'idle') return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📷 Scan Receipt <span className="text-gray-400 font-normal">(optional)</span></label>
      <div className="flex gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl cursor-pointer hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
          <span className="text-violet-600 dark:text-violet-400 font-medium text-sm">📁 Upload</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={e => processImage(e.target.files[0])} className="hidden" />
        </label>
        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl cursor-pointer hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
          <span className="text-violet-600 dark:text-violet-400 font-medium text-sm">📸 Camera</span>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e => processImage(e.target.files[0])} className="hidden" />
        </label>
      </div>
    </div>
  )

  return (
    <div className="mb-4 space-y-3">
      {/* Preview + reset */}
      <div className="relative">
        {preview && <img src={preview} alt="Receipt" className="w-full max-h-40 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />}
        <button onClick={reset} className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition shadow-md">✕</button>
      </div>

      {phase === 'scanning' && (
        <div className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-3">
          <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-violet-700 dark:text-violet-300 text-sm font-medium">Reading your receipt…</span>
        </div>
      )}

      {phase === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={reset} className="text-red-500 text-xs underline mt-1">Try another photo</button>
        </div>
      )}

      {phase === 'items' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 dark:text-green-400 text-sm font-bold">✅ Receipt read!</p>
              {merchant && <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{merchant}</p>}
            </div>
            <span className="text-lg font-bold text-gray-800 dark:text-white">${checkedTotal.toFixed(2)}</span>
          </div>

          {/* Item list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${item.checked ? 'bg-white dark:bg-gray-700 border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 opacity-50'}`}>
                <input type="checkbox" checked={item.checked} onChange={() => toggleItem(idx)} className="accent-violet-600 shrink-0" />
                <input
                  type="text" value={item.name}
                  onChange={e => updateName(idx, e.target.value)}
                  className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none min-w-0"
                  placeholder="Item name"
                />
                {item.qty > 1 && <span className="text-[10px] text-gray-400 shrink-0">×{item.qty}</span>}
                <input
                  type="number" value={item.price} min="0" step="0.01"
                  onChange={e => updatePrice(idx, e.target.value)}
                  className="w-16 text-xs text-right bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none"
                />
                <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition text-xs shrink-0">✕</button>
              </div>
            ))}
          </div>

          {/* Add item */}
          <button onClick={addItem} className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline">+ Add item</button>

          {/* Category + date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mb-1 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {ALL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleConfirm} disabled={checkedTotal <= 0 || items.filter(i => i.checked).length === 0}
              className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
              Use ${checkedTotal.toFixed(2)}
            </button>
            <button onClick={reset} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Rescan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
