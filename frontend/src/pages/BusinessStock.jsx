import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CONTAINER_UNITS = ['bags', 'boxes', 'bottles', 'cans']
const ALL_UNITS = ['g', 'kg', 'ml', 'L', 'pieces', 'bags', 'boxes', 'bottles', 'cans', 'slices']
const UNIT_CONVERSIONS = {
  'kg': { smaller: 'g',  factor: 1000,  label: '1 kg = 1000 g' },
  'L':  { smaller: 'ml', factor: 1000,  label: '1 L = 1000 ml' },
  'g':  { larger: 'kg',  factor: 0.001, label: '1000 g = 1 kg' },
  'ml': { larger: 'L',   factor: 0.001, label: '1000 ml = 1 L' },
}

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
    showToast('🤖 AI choosing color...', 'warning')
    let color = '#6B7280', emoji = '📦'
    try {
      const aiRes = await API.post('/business/ai-ingredient-info', { name: form.name })
      color = aiRes.data.color || '#6B7280'
      emoji = aiRes.data.emoji || '📦'
    } catch {}
    try {
      await API.post('/business/stock', { ...form, color, emoji })
      setForm({ name: '', unit: 'kg', cost_per_unit: '', stock_quantity: '', low_stock_alert: '', pieces_per_container: '' })
      setShowAdd(false)
      fetchStock()
      showToast(`${emoji} ${form.name} added!`)
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
      await API.put('/business/stock/' + editingIng.id, editingIng)
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

  const handleRefreshColors = async () => {
    showToast('🤖 Refreshing AI colors...', 'warning')
    for (const ing of ingredients) {
      if (!ing.color || ing.color === '#6B7280') {
        try {
          const aiRes = await API.post('/business/ai-ingredient-info', { name: ing.name })
          await API.put('/business/stock/' + ing.id, { color: aiRes.data.color, emoji: aiRes.data.emoji })
        } catch {}
      }
    }
    fetchStock(); showToast('Colors updated!')
  }

  // Derived
  const lowStockItems   = ingredients.filter(i => safeNum(i.stock_quantity) <= safeNum(i.low_stock_alert) && safeNum(i.low_stock_alert) > 0)
  const totalStockValue = ingredients.reduce((s, i) => s + safeNum(i.stock_quantity) * safeNum(i.cost_per_unit), 0)
  const hasUncolored    = ingredients.some(i => !i.color || i.color === '#6B7280')

  // Filtered + sorted
  const filtered = ingredients
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name')  return a.name.localeCompare(b.name)
      if (sortBy === 'stock') return safeNum(b.stock_quantity) - safeNum(a.stock_quantity)
      if (sortBy === 'value') return (safeNum(b.stock_quantity) * safeNum(b.cost_per_unit)) - (safeNum(a.stock_quantity) * safeNum(a.cost_per_unit))
      if (sortBy === 'low')   return (safeNum(a.stock_quantity) - safeNum(a.low_stock_alert)) - (safeNum(b.stock_quantity) - safeNum(b.low_stock_alert))
      return 0
    })

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Edit modal */}
      {editingIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setEditingIng(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: (editingIng.color || '#F97316') + '25', border: `2px solid ${editingIng.color || '#F97316'}55` }}>
                {editingIng.emoji || '📦'}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">Edit {editingIng.name}</h3>
                <p className="text-xs text-gray-400">Unit: {editingIng.unit}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Name</label>
                <input type="text" value={editingIng.name} onChange={e => setEditingIng({ ...editingIng, name: e.target.value })} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cost per {editingIng.unit} ({symbol})</label>
                  <input type="number" value={editingIng.cost_per_unit} onChange={e => setEditingIng({ ...editingIng, cost_per_unit: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Stock ({editingIng.unit})</label>
                  <input type="number" value={editingIng.stock_quantity} onChange={e => setEditingIng({ ...editingIng, stock_quantity: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Alert when below ({editingIng.unit})</label>
                <input type="number" value={editingIng.low_stock_alert} onChange={e => setEditingIng({ ...editingIng, low_stock_alert: e.target.value })} min="0" step="0.001" className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button onClick={() => setEditingIng(null)} className="py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold text-sm">Cancel</button>
                <button onClick={handleSaveEdit} className="py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition">Save</button>
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
            <p className="text-gray-400 text-sm mt-0.5">{ingredients.length} ingredients · {fmt(totalStockValue, symbol)} total value</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {hasUncolored && ingredients.length > 0 && (
              <button onClick={handleRefreshColors} className="bg-purple-100 text-purple-600 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-purple-200 transition">
                🤖 Fix Colors
              </button>
            )}
            <button onClick={() => setShowAdd(!showAdd)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${showAdd ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
              {showAdd ? 'Cancel' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', value: ingredients.length, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: '📦' },
            { label: 'Low Stock', value: lowStockItems.length, color: lowStockItems.length > 0 ? 'text-red-500' : 'text-gray-400', bg: lowStockItems.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800', icon: '⚠️' },
            { label: 'Healthy', value: ingredients.length - lowStockItems.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: '✅' },
            { label: 'Value', value: symbol + (totalStockValue >= 1000 ? (totalStockValue/1000).toFixed(1)+'k' : totalStockValue.toFixed(0)), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: '💰' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-3 text-center shadow-sm`}>
              <p className="text-lg mb-0.5">{s.icon}</p>
              <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-5 border-2 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Add Ingredient</h3>
                <p className="text-xs text-orange-500">AI will pick a unique color and emoji</p>
              </div>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Ingredient name (e.g. Beef Patty, Tomato...)"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Unit you buy in</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value, pieces_per_container: '' })} className={cls}>
                    {ALL_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  {UNIT_CONVERSIONS[form.unit] && (
                    <p className="text-xs text-orange-500 mt-1">Use in recipes as {UNIT_CONVERSIONS[form.unit].smaller || UNIT_CONVERSIONS[form.unit].larger}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cost per {form.unit} ({symbol})</label>
                  <input type="number" placeholder="0.000" value={form.cost_per_unit}
                    onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
              </div>

              {CONTAINER_UNITS.includes(form.unit) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-3">
                  <label className="text-xs font-semibold text-blue-600 mb-1 block">How many pieces in 1 {form.unit}?</label>
                  <input type="number" placeholder={`e.g. 6 buns per ${form.unit}`}
                    value={form.pieces_per_container} onChange={e => setForm({ ...form, pieces_per_container: e.target.value })}
                    min="1" step="1" className={cls} />
                  {form.pieces_per_container && form.cost_per_unit && (
                    <p className="text-xs text-blue-500 mt-1">Cost per piece: {symbol}{(safeNum(form.cost_per_unit) / safeNum(form.pieces_per_container)).toFixed(4)}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Current stock ({form.unit})</label>
                  <input type="number" placeholder="0" value={form.stock_quantity}
                    onChange={e => setForm({ ...form, stock_quantity: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Alert when below ({form.unit})</label>
                  <input type="number" placeholder="0" value={form.low_stock_alert}
                    onChange={e => setForm({ ...form, low_stock_alert: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
              </div>

              <button onClick={handleAdd} disabled={!form.name || !form.cost_per_unit || aiLoading}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {aiLoading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />AI is setting up...</>
                  : <><span>🤖</span>Add to Stock</>}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5">
          {[
            { key: 'inventory', label: 'Inventory' },
            { key: 'lowstock',  label: `Low Stock ${lowStockItems.length > 0 ? `(${lowStockItems.length})` : ''}` },
            { key: 'overview',  label: 'Overview' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.key
                ? `bg-white dark:bg-gray-700 text-orange-600 shadow-sm`
                : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── INVENTORY TAB ── */}
        {activeTab === 'inventory' && (
          <div>
            {/* Search + sort */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white" />
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="name">A-Z</option>
                <option value="stock">Most Stock</option>
                <option value="value">Most Value</option>
                <option value="low">Lowest Stock</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm">
                <p className="text-4xl mb-2">📦</p>
                <p className="text-gray-400 text-sm">{search ? 'No ingredients match your search' : 'No ingredients yet'}</p>
                {!search && <button onClick={() => setShowAdd(true)} className="mt-3 bg-orange-500 text-white px-5 py-2 rounded-xl text-sm font-semibold">+ Add First</button>}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(ing => {
                  const isLow   = safeNum(ing.stock_quantity) <= safeNum(ing.low_stock_alert) && safeNum(ing.low_stock_alert) > 0
                  const stockVal = safeNum(ing.stock_quantity) * safeNum(ing.cost_per_unit)
                  const pct = safeNum(ing.low_stock_alert) > 0
                    ? Math.min((safeNum(ing.stock_quantity) / (safeNum(ing.low_stock_alert) * 3)) * 100, 100)
                    : 80
                  const color = (ing.color && ing.color !== '#6B7280') ? ing.color : '#F97316'
                  const altUnit = UNIT_CONVERSIONS[ing.unit]
                  return (
                    <div key={ing.id} className="rounded-2xl overflow-hidden border"
                      style={{ borderColor: color + '44', backgroundColor: color + '08' }}>
                      <div className="px-4 py-3.5">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Colored emoji */}
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: color + '22', border: `2px solid ${color}44` }}>
                            {isLow ? '⚠️' : (ing.emoji || '📦')}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-gray-800 dark:text-white">{ing.name}</p>
                              {isLow && <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: '#EF4444' }}>Low!</span>}
                            </div>
                            <p className="text-xs text-gray-500">
                              {symbol}{safeNum(ing.cost_per_unit).toFixed(3)}/{ing.unit}
                              {altUnit && <span className="text-gray-400 ml-1">· {altUnit.label}</span>}
                              {safeNum(ing.pieces_per_container) > 0 && <span className="text-gray-400 ml-1">· {ing.pieces_per_container} pcs/{ing.unit}</span>}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="font-bold tabular-nums text-sm" style={{ color }}>{safeNum(ing.stock_quantity).toFixed(1)} {ing.unit}</p>
                            {altUnit && (
                              <p className="text-xs text-gray-400">{(safeNum(ing.stock_quantity) * altUnit.factor).toFixed(altUnit.factor >= 1 ? 0 : 3)} {altUnit.smaller || altUnit.larger}</p>
                            )}
                            {safeNum(ing.pieces_per_container) > 0 && (
                              <p className="text-xs text-gray-400">= {Math.floor(safeNum(ing.stock_quantity) * safeNum(ing.pieces_per_container))} pcs</p>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 bg-white/60 dark:bg-gray-700/60 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: Math.min(pct, 100) + '%', backgroundColor: isLow ? '#EF4444' : color }} />
                          </div>
                          <p className="text-xs text-gray-400 tabular-nums flex-shrink-0">{fmt(stockVal, symbol)}</p>
                        </div>

                        {/* Restock inline */}
                        {restockId === ing.id ? (
                          <div className="flex gap-2">
                            <input type="number" placeholder={`Add ${ing.unit}...`}
                              value={restockAmount} onChange={e => setRestockAmount(e.target.value)}
                              min="0.001" step="0.001"
                              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none" />
                            <button onClick={() => handleRestock(ing.id)} className="text-white px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: color }}>Add</button>
                            <button onClick={() => { setRestockId(null); setRestockAmount('') }} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white px-3 py-2 rounded-xl text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button onClick={() => setRestockId(ing.id)} className="text-xs font-bold" style={{ color }}>+ Restock</button>
                            <button onClick={() => setEditingIng({ ...ing })} className="text-indigo-400 hover:text-indigo-600 p-1 rounded-lg transition">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => handleDelete(ing.id)} className="text-red-400 hover:text-red-600 p-1 rounded-lg transition ml-auto">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            </button>
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

        {/* ── LOW STOCK TAB ── */}
        {activeTab === 'lowstock' && (
          <div>
            {lowStockItems.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-semibold text-green-600 mb-1">All stock levels are healthy!</p>
                <p className="text-gray-400 text-sm">No ingredients are running low right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-2">
                  <p className="text-red-600 font-bold text-sm">{lowStockItems.length} ingredient{lowStockItems.length > 1 ? 's' : ''} need restocking</p>
                </div>
                {lowStockItems.map(ing => {
                  const color = (ing.color && ing.color !== '#6B7280') ? ing.color : '#EF4444'
                  const needed = Math.max(0, safeNum(ing.low_stock_alert) * 2 - safeNum(ing.stock_quantity))
                  return (
                    <div key={ing.id} className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-red-200 dark:border-red-800 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-red-100 dark:bg-red-900/30 flex-shrink-0">⚠️</div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 dark:text-white text-sm">{ing.emoji} {ing.name}</p>
                          <p className="text-xs text-red-500">Current: {safeNum(ing.stock_quantity).toFixed(1)} {ing.unit} · Minimum: {safeNum(ing.low_stock_alert).toFixed(1)} {ing.unit}</p>
                        </div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3">
                        <p className="text-xs text-red-600 font-semibold">Suggested restock: {needed.toFixed(1)} {ing.unit}</p>
                        <p className="text-xs text-red-400">Estimated cost: {symbol}{(needed * safeNum(ing.cost_per_unit)).toFixed(2)}</p>
                      </div>
                      {restockId === ing.id ? (
                        <div className="flex gap-2">
                          <input type="number" placeholder={`Add ${ing.unit}...`}
                            value={restockAmount} onChange={e => setRestockAmount(e.target.value)}
                            min="0.001" step="0.001"
                            className="flex-1 px-3 py-2 border border-red-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none" />
                          <button onClick={() => handleRestock(ing.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold">Add</button>
                          <button onClick={() => { setRestockId(null); setRestockAmount('') }} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white px-3 py-2 rounded-xl text-xs">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setRestockId(ing.id)} className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition">
                          + Restock Now
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Total value breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Stock Value Breakdown</h3>
              {ingredients.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No ingredients yet</p>
              ) : (
                <div className="space-y-3">
                  {[...ingredients]
                    .sort((a, b) => (safeNum(b.stock_quantity) * safeNum(b.cost_per_unit)) - (safeNum(a.stock_quantity) * safeNum(a.cost_per_unit)))
                    .map(ing => {
                      const val = safeNum(ing.stock_quantity) * safeNum(ing.cost_per_unit)
                      const pct = totalStockValue > 0 ? (val / totalStockValue) * 100 : 0
                      const color = (ing.color && ing.color !== '#6B7280') ? ing.color : '#F97316'
                      return (
                        <div key={ing.id}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                              <span>{ing.emoji || '📦'}</span>{ing.name}
                            </span>
                            <span className="text-sm font-bold tabular-nums" style={{ color }}>
                              {fmt(val, symbol)} <span className="text-xs text-gray-400 font-normal">({Math.round(pct)}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{ width: pct + '%', backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 text-sm font-bold">
                    <span className="text-gray-600 dark:text-gray-300">Total Stock Value</span>
                    <span className="text-orange-600 tabular-nums">{fmt(totalStockValue, symbol)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Category breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Units Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {[...new Set(ingredients.map(i => i.unit))].map(unit => {
                  const items = ingredients.filter(i => i.unit === unit)
                  const totalVal = items.reduce((s, i) => s + safeNum(i.stock_quantity) * safeNum(i.cost_per_unit), 0)
                  return (
                    <div key={unit} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{unit}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{items.length} ingredient{items.length > 1 ? 's' : ''}</p>
                      <p className="text-xs text-orange-500 font-semibold tabular-nums">{fmt(totalVal, symbol)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stock health */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Stock Health</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div className="h-4 rounded-full bg-green-500 transition-all"
                    style={{ width: ingredients.length > 0 ? ((ingredients.length - lowStockItems.length) / ingredients.length * 100) + '%' : '0%' }} />
                </div>
                <p className="text-sm font-bold text-gray-700 dark:text-white flex-shrink-0">
                  {ingredients.length > 0 ? Math.round((ingredients.length - lowStockItems.length) / ingredients.length * 100) : 0}% healthy
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                  <p className="text-xl font-bold text-green-600">{ingredients.length - lowStockItems.length}</p>
                  <p className="text-xs text-gray-400">Well stocked</p>
                </div>
                <div className={`rounded-xl p-3 ${lowStockItems.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <p className={`text-xl font-bold ${lowStockItems.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>{lowStockItems.length}</p>
                  <p className="text-xs text-gray-400">Need restock</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}