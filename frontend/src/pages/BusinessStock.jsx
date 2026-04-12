import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CONTAINER_UNITS = ['bags', 'boxes', 'bottles', 'cans']
const ALL_UNITS = ['g', 'kg', 'ml', 'L', 'pieces', 'bags', 'boxes', 'bottles', 'cans', 'slices']

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">x</button>
    </div>
  )
}

export default function BusinessStock() {
  const [ingredients, setIngredients]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [toast, setToast]                 = useState(null)
  const [symbol, setSymbol]               = useState('$')
  const [activeTab, setActiveTab]         = useState('inventory')
  const [showAdd, setShowAdd]             = useState(false)
  const [restockId, setRestockId]         = useState(null)
  const [restockAmount, setRestockAmount] = useState('')
  const [aiLoading, setAiLoading]         = useState(false)
  const [editingIng, setEditingIng]       = useState(null)
  const [search, setSearch]               = useState('')
  const [sortBy, setSortBy]               = useState('name')
  const [pendingItems, setPendingItems]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('pending_stock_items') || '[]') } catch { return [] }
  })
  const [form, setForm] = useState({
    name: '', unit: 'kg', cost_per_unit: '',
    stock_quantity: '', low_stock_alert: '', pieces_per_container: ''
  })

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.account_type !== 'business') { window.location.href = '/dashboard'; return }
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    fetchStock()
  }, [])

  const fetchStock = async () => {
    setLoading(true)
    try { const r = await API.get('/business/stock'); setIngredients(r.data || []) }
    catch { showToast('Error loading stock', 'error') }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!form.name || !form.unit || !form.cost_per_unit) { showToast('Name, unit and cost required', 'error'); return }
    setAiLoading(true)
    try {
      let color = '#6B7280', emoji = '📦'
      try {
        const aiRes = await API.post('/business/ai-ingredient-info', { name: form.name })
        color = aiRes.data.color || color
        emoji = aiRes.data.emoji || emoji
      } catch {}
      await API.post('/business/stock', { ...form, color, emoji })
      setForm({ name: '', unit: 'kg', cost_per_unit: '', stock_quantity: '', low_stock_alert: '', pieces_per_container: '' })
      setShowAdd(false)
      fetchStock()
      showToast('Ingredient added!')
    } catch { showToast('Error adding ingredient', 'error') }
    setAiLoading(false)
  }

  const handleRestock = async (id) => {
    const amount = safeNum(restockAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return }
    const ing = ingredients.find(i => i.id === id)
    const newQty = safeNum(ing.stock_quantity) + amount
    try {
      await API.put('/business/stock/' + id, { stock_quantity: newQty })
      setRestockId(null); setRestockAmount('')
      setIngredients(prev => prev.map(i => i.id === id ? { ...i, stock_quantity: newQty } : i))
      showToast('Stock updated!')
    } catch { showToast('Error', 'error') }
  }

  const handleSaveEdit = async () => {
    if (!editingIng) return
    try {
      await API.put('/business/stock/' + editingIng.id, {
        name: editingIng.name,
        unit: editingIng.unit,
        cost_per_unit: editingIng.cost_per_unit,
        stock_quantity: editingIng.stock_quantity,
        low_stock_alert: editingIng.low_stock_alert,
        pieces_per_container: editingIng.pieces_per_container
      })
      setEditingIng(null); fetchStock(); showToast('Updated!')
    } catch { showToast('Error', 'error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this ingredient?')) return
    try {
      await API.delete('/business/stock/' + id)
      setIngredients(prev => prev.filter(i => i.id !== id))
      showToast('Removed', 'error')
    } catch {}
  }

  const handleFixColors = async () => {
    const needFix = ingredients.filter(i => !i.color || i.color === '#6B7280')
    if (needFix.length === 0) { showToast('All ingredients already have colors!'); return }
    showToast(`Fixing colors for ${needFix.length} ingredients...`, 'warning')
    for (const ing of needFix) {
      try {
        const aiRes = await API.post('/business/ai-ingredient-info', { name: ing.name })
        await API.put('/business/stock/' + ing.id, { color: aiRes.data.color, emoji: aiRes.data.emoji })
      } catch {}
    }
    fetchStock(); showToast('Colors updated!')
  }

  const isContainer = CONTAINER_UNITS.includes(form.unit)
  const filtered    = ingredients
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name')  return a.name.localeCompare(b.name)
      if (sortBy === 'stock') return safeNum(a.stock_quantity) - safeNum(b.stock_quantity)
      if (sortBy === 'cost')  return safeNum(b.cost_per_unit) - safeNum(a.cost_per_unit)
      return 0
    })
  const lowStock    = ingredients.filter(i => safeNum(i.stock_quantity) <= safeNum(i.low_stock_alert) && safeNum(i.low_stock_alert) > 0)
  const totalValue  = ingredients.reduce((s, i) => s + safeNum(i.cost_per_unit) * safeNum(i.stock_quantity), 0)

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Edit Modal */}
      {editingIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setEditingIng(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span>{editingIng.emoji || '📦'}</span> Edit {editingIng.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Name</label>
                <input type="text" value={editingIng.name}
                  onChange={e => setEditingIng(p => ({ ...p, name: e.target.value }))} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Unit</label>
                  <select value={editingIng.unit} onChange={e => setEditingIng(p => ({ ...p, unit: e.target.value }))} className={cls}>
                    {ALL_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cost per {editingIng.unit}</label>
                  <input type="number" value={editingIng.cost_per_unit} step="0.01" min="0"
                    onChange={e => setEditingIng(p => ({ ...p, cost_per_unit: e.target.value }))} className={cls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Current Stock</label>
                  <input type="number" value={editingIng.stock_quantity} step="0.01" min="0"
                    onChange={e => setEditingIng(p => ({ ...p, stock_quantity: e.target.value }))} className={cls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Alert When Below</label>
                  <input type="number" value={editingIng.low_stock_alert} step="0.01" min="0"
                    onChange={e => setEditingIng(p => ({ ...p, low_stock_alert: e.target.value }))} className={cls} />
                </div>
              </div>
              {CONTAINER_UNITS.includes(editingIng.unit) && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Pieces per {editingIng.unit}</label>
                  <input type="number" value={editingIng.pieces_per_container || ''} step="1" min="0"
                    onChange={e => setEditingIng(p => ({ ...p, pieces_per_container: e.target.value }))} className={cls} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setEditingIng(null)}
                  className="py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold text-sm">Cancel</button>
                <button onClick={handleSaveEdit}
                  className="py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock & Ingredients</h1>
            <p className="text-gray-400 text-sm mt-0.5">{ingredients.length} ingredients · {fmt(totalValue, symbol)} total value</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleFixColors}
              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-xl font-semibold">
              🎨 Fix Colors
            </button>
            <button onClick={() => setShowAdd(!showAdd)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${showAdd ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
              {showAdd ? 'Cancel' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', value: ingredients.length, color: 'text-gray-800 dark:text-white', bg: 'bg-gray-100 dark:bg-gray-700', icon: '📦' },
            { label: 'Low Stock', value: lowStock.length, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: '⚠️' },
            { label: 'Healthy', value: ingredients.length - lowStock.length, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', icon: '✅' },
            { label: 'Value', value: fmt(totalValue, symbol), color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: '💰' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-3 text-center`}>
              <p className="text-lg">{s.icon}</p>
              <p className={`font-bold text-sm tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── PENDING ITEMS BANNER ── */}
        {pendingItems.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-2xl p-4 mb-5">
            <p className="font-bold text-orange-600 mb-1">⚠️ {pendingItems.length} item{pendingItems.length > 1 ? 's' : ''} from last scan need stock details</p>
            <p className="text-xs text-orange-400 mb-3">These were sold but aren't in your menu yet. Add them to stock so future scans can track them:</p>
            <div className="space-y-2">
              {pendingItems.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{item.name}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-orange-500">× {item.quantity_sold} sold</span>
                      <span className="text-gray-400">{item.date}</span>
                    </div>
                  </div>
                  {(item.selling_price || item.cost) && (
                    <div className="flex gap-3 text-xs mb-2">
                      {item.selling_price && <span className="text-green-600">Price: {symbol}{parseFloat(item.selling_price).toFixed(2)}</span>}
                      {item.cost && <span className="text-red-500">Cost: {symbol}{parseFloat(item.cost).toFixed(2)}</span>}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setForm(f => ({ ...f, name: item.name, cost_per_unit: item.cost || '' }))
                      setShowAdd(true)
                      const updated = pendingItems.filter((_, i) => i !== idx)
                      setPendingItems(updated)
                      localStorage.setItem('pending_stock_items', JSON.stringify(updated))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="w-full bg-orange-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition">
                    + Add "{item.name}" to Stock
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => { localStorage.removeItem('pending_stock_items'); setPendingItems([]) }}
              className="mt-3 text-xs text-gray-400 underline w-full text-center">Dismiss all</button>
          </div>
        )}

        {/* Add Form */}
        {showAdd && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-5 border-2 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-orange-500 text-xl">📦</span>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">Add Ingredient</h3>
                <p className="text-xs text-orange-500">AI will pick a unique color and emoji</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Ingredient Name</label>
                <input type="text" placeholder="e.g. Beef Patties" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Unit you buy in</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value, pieces_per_container: '' }))} className={cls}>
                    {ALL_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cost per {form.unit} ({symbol})</label>
                  <input type="number" placeholder="0.00" value={form.cost_per_unit}
                    onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} min="0" step="0.01" className={cls} />
                </div>
              </div>
              {isContainer && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <label className="text-xs font-semibold text-blue-600 mb-1 block">How many pieces in 1 {form.unit}?</label>
                  <input type="number" placeholder="e.g. 6" value={form.pieces_per_container}
                    onChange={e => setForm(f => ({ ...f, pieces_per_container: e.target.value }))} min="1" step="1" className={cls} />
                  {form.pieces_per_container && safeNum(form.cost_per_unit) > 0 && (
                    <p className="text-xs text-blue-500 mt-1">
                      Cost per piece: {symbol}{(safeNum(form.cost_per_unit) / safeNum(form.pieces_per_container)).toFixed(4)}
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Current stock ({form.unit})</label>
                  <input type="number" placeholder="0" value={form.stock_quantity}
                    onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} min="0" step="0.01" className={cls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Alert when below ({form.unit})</label>
                  <input type="number" placeholder="0" value={form.low_stock_alert}
                    onChange={e => setForm(f => ({ ...f, low_stock_alert: e.target.value }))} min="0" step="0.01" className={cls} />
                </div>
              </div>
              <button onClick={handleAdd} disabled={!form.name || !form.unit || !form.cost_per_unit || aiLoading}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {aiLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Getting AI colors...</> : '🤖 Add to Stock'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5">
          {[{ key: 'inventory', label: 'Inventory' }, { key: 'low', label: `Low Stock${lowStock.length > 0 ? ` (${lowStock.length})` : ''}` }, { key: 'overview', label: 'Overview' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.key ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type="text" placeholder="Search ingredients..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none">
                <option value="name">A-Z</option>
                <option value="stock">Low Stock</option>
                <option value="cost">High Cost</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">📦</p>
                <p className="font-semibold text-gray-700 dark:text-white">No ingredients yet</p>
                <button onClick={() => setShowAdd(true)} className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">+ Add First Ingredient</button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(ing => {
                  const isLow     = safeNum(ing.stock_quantity) <= safeNum(ing.low_stock_alert) && safeNum(ing.low_stock_alert) > 0
                  const pct       = ing.low_stock_alert > 0 ? Math.min(100, (safeNum(ing.stock_quantity) / safeNum(ing.low_stock_alert)) * 50) : 50
                  const color     = ing.color || '#6B7280'
                  const isRestock = restockId === ing.id
                  return (
                    <div key={ing.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
                      style={{ borderLeft: `4px solid ${color}` }}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ backgroundColor: color + '20' }}>
                            {ing.emoji || '📦'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-800 dark:text-white">{ing.name}</p>
                              {isLow && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Low!</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {safeNum(ing.stock_quantity).toFixed(2)} {ing.unit} left · {symbol}{safeNum(ing.cost_per_unit).toFixed(2)}/{ing.unit}
                            </p>
                            {CONTAINER_UNITS.includes(ing.unit) && safeNum(ing.pieces_per_container) > 0 && (
                              <p className="text-xs text-blue-500">{ing.pieces_per_container} pieces per {ing.unit}</p>
                            )}
                            <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all duration-500"
                                style={{ width: pct + '%', backgroundColor: isLow ? '#EF4444' : color }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setRestockId(isRestock ? null : ing.id)}
                              className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-2 py-1.5 rounded-lg font-semibold hover:bg-orange-200 transition">
                              +Stock
                            </button>
                            <button onClick={() => setEditingIng({ ...ing })}
                              className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => handleDelete(ing.id)}
                              className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          </div>
                        </div>

                        {isRestock && (
                          <div className="mt-3 flex gap-2">
                            <input type="number" placeholder={`Add amount (${ing.unit})`} value={restockAmount}
                              onChange={e => setRestockAmount(e.target.value)} min="0" step="0.01"
                              className="flex-1 px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <button onClick={() => handleRestock(ing.id)}
                              className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition">Add</button>
                            <button onClick={() => { setRestockId(null); setRestockAmount('') }}
                              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-xl text-sm">✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* LOW STOCK TAB */}
        {activeTab === 'low' && (
          <div className="space-y-3">
            {lowStock.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-semibold text-gray-700 dark:text-white">All stock levels are healthy!</p>
              </div>
            ) : lowStock.map(ing => {
              const needed = Math.max(0, safeNum(ing.low_stock_alert) - safeNum(ing.stock_quantity))
              const cost   = needed * safeNum(ing.cost_per_unit)
              return (
                <div key={ing.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ing.emoji || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-white">{ing.name}</p>
                      <p className="text-xs text-red-500">
                        {safeNum(ing.stock_quantity).toFixed(2)} {ing.unit} left · need {needed.toFixed(2)} more
                      </p>
                      <p className="text-xs text-gray-400">Est. restock cost: {symbol}{cost.toFixed(2)}</p>
                    </div>
                    <button onClick={() => { setRestockId(ing.id); setActiveTab('inventory') }}
                      className="bg-red-500 text-white px-3 py-2 rounded-xl text-xs font-bold">Restock</button>
                  </div>
                </div>
              )
            })}
            {lowStock.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4">
                <p className="text-sm font-bold text-red-600 mb-1">Total restock estimate</p>
                <p className="text-2xl font-bold text-red-500 tabular-nums">
                  {fmt(lowStock.reduce((s, i) => s + Math.max(0, safeNum(i.low_stock_alert) - safeNum(i.stock_quantity)) * safeNum(i.cost_per_unit), 0), symbol)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Stock Value Breakdown</h3>
              <div className="space-y-3">
                {ingredients
                  .sort((a, b) => (safeNum(b.cost_per_unit) * safeNum(b.stock_quantity)) - (safeNum(a.cost_per_unit) * safeNum(a.stock_quantity)))
                  .slice(0, 10)
                  .map((ing, i) => {
                    const val = safeNum(ing.cost_per_unit) * safeNum(ing.stock_quantity)
                    const pct = totalValue > 0 ? (val / totalValue) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span>{ing.emoji || '📦'}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-200">{ing.name}</span>
                          </div>
                          <span className="text-sm font-bold tabular-nums">{fmt(val, symbol)} <span className="text-xs text-gray-400">({Math.round(pct)}%)</span></span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: pct + '%', backgroundColor: ing.color || '#F97316' }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-center">
                <p className="text-3xl font-bold text-orange-500 tabular-nums">{ingredients.length}</p>
                <p className="text-xs text-gray-400 mt-1">Total ingredients</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-center">
                <p className="text-3xl font-bold text-red-500 tabular-nums">{lowStock.length}</p>
                <p className="text-xs text-gray-400 mt-1">Need restocking</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-center col-span-2">
                <p className="text-3xl font-bold text-green-500 tabular-nums">{fmt(totalValue, symbol)}</p>
                <p className="text-xs text-gray-400 mt-1">Total stock value</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}