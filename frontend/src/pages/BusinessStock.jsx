import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }

// Units that need a "pieces per container" field
const CONTAINER_UNITS = ['bags', 'boxes', 'bottles', 'cans']
const ALL_UNITS = ['g', 'kg', 'ml', 'L', 'pieces', 'bags', 'boxes', 'bottles', 'cans', 'slices']

const UNIT_CONVERSIONS = {
  'kg':  { smaller: 'g',  factor: 1000,  label: '1 kg = 1000 g' },
  'L':   { smaller: 'ml', factor: 1000,  label: '1 L = 1000 ml' },
  'g':   { larger: 'kg',  factor: 0.001, label: '1000 g = 1 kg' },
  'ml':  { larger: 'L',   factor: 0.001, label: '1000 ml = 1 L' },
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

function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
}
function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

function IngredientCard({ ing, symbol, onDelete, onEdit, restockId, restockAmount, setRestockAmount, setRestockId, handleRestock }) {
  const isLow    = safeNum(ing.stock_quantity) <= safeNum(ing.low_stock_alert) && safeNum(ing.low_stock_alert) > 0
  const stockVal = safeNum(ing.stock_quantity) * safeNum(ing.cost_per_unit)
  const pct = safeNum(ing.low_stock_alert) > 0
    ? Math.min((safeNum(ing.stock_quantity) / (safeNum(ing.low_stock_alert) * 3)) * 100, 100)
    : Math.min((safeNum(ing.stock_quantity) / 100) * 100, 100)
  const color    = (ing.color && ing.color !== '#6B7280') ? ing.color : null
  const emoji    = ing.emoji || '📦'
  const altUnit  = UNIT_CONVERSIONS[ing.unit]

  const cardStyle = color ? {
    borderColor: color + '55',
    backgroundColor: color + '0D'
  } : {}

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
      style={cardStyle}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          {/* Colored emoji badge */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={color ? { backgroundColor: color + '25', border: `2px solid ${color}55` } : { backgroundColor: '#F97316' + '20', border: '2px solid #F9731630' }}>
            {isLow ? '⚠️' : emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-800 dark:text-white">{ing.name}</p>
              {isLow && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: color || '#EF4444' }}>
                  Low!
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {symbol}{safeNum(ing.cost_per_unit).toFixed(3)}/{ing.unit}
              {altUnit && <span className="text-gray-400 ml-1">· {altUnit.label}</span>}
              {ing.pieces_per_container > 0 && <span className="text-gray-400 ml-1">· {ing.pieces_per_container} pieces/{ing.unit}</span>}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-base font-bold tabular-nums" style={color ? { color } : { color: '#F97316' }}>
              {safeNum(ing.stock_quantity).toFixed(1)} {ing.unit}
            </p>
            {altUnit && safeNum(ing.stock_quantity) > 0 && (
              <p className="text-xs text-gray-400">
                = {(safeNum(ing.stock_quantity) * altUnit.factor).toFixed(altUnit.factor >= 1 ? 0 : 3)} {altUnit.smaller || altUnit.larger}
              </p>
            )}
            {ing.pieces_per_container > 0 && (
              <p className="text-xs text-gray-400">
                = {Math.floor(safeNum(ing.stock_quantity) * safeNum(ing.pieces_per_container))} pieces total
              </p>
            )}
            {safeNum(ing.low_stock_alert) > 0 && (
              <p className="text-xs text-gray-400">min: {safeNum(ing.low_stock_alert).toFixed(1)}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: Math.min(pct, 100) + '%', backgroundColor: isLow ? '#EF4444' : (color || '#F97316') }} />
          </div>
          <p className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{fmt(stockVal, symbol)}</p>
        </div>

        {/* Actions */}
        {restockId === ing.id ? (
          <div className="flex gap-2 mt-2">
            <input type="number" placeholder={'Add ' + ing.unit + '...'}
              value={restockAmount} onChange={e => setRestockAmount(e.target.value)}
              min="0.001" step="0.001"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <button onClick={() => handleRestock(ing.id)}
              className="text-white px-4 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: color || '#F97316' }}>
              Add
            </button>
            <button onClick={() => { setRestockId(null); setRestockAmount('') }}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white px-3 py-2 rounded-xl text-xs">
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-1">
            <button onClick={() => setRestockId(ing.id)}
              className="text-xs font-bold hover:underline"
              style={{ color: color || '#F97316' }}>
              + Restock
            </button>
            <button onClick={() => onEdit(ing)}
              className="text-indigo-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
              <EditIcon />
            </button>
            <button onClick={() => onDelete(ing.id)}
              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto">
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BusinessStock() {
  const [ingredients, setIngredients]         = useState([])
  const [loading, setLoading]                 = useState(true)
  const [toast, setToast]                     = useState(null)
  const [symbol, setSymbol]                   = useState('$')
  const [showAdd, setShowAdd]                 = useState(false)
  const [restockId, setRestockId]             = useState(null)
  const [restockAmount, setRestockAmount]     = useState('')
  const [aiLoading, setAiLoading]             = useState(false)
  const [editingIng, setEditingIng]           = useState(null)
  const [form, setForm] = useState({
    name: '', unit: 'kg', cost_per_unit: '',
    stock_quantity: '', low_stock_alert: '',
    pieces_per_container: ''
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
      await API.put('/business/stock/' + id, { ...ing, stock_quantity: newQty })
      setRestockId(null)
      setRestockAmount('')
      setIngredients(prev => prev.map(i => i.id === id ? { ...i, stock_quantity: newQty } : i))
      showToast('Stock updated!')
    } catch { showToast('Error updating stock', 'error') }
  }

  const handleSaveEdit = async () => {
    if (!editingIng) return
    try {
      await API.put('/business/stock/' + editingIng.id, editingIng)
      setEditingIng(null)
      fetchStock()
      showToast('Ingredient updated!')
    } catch { showToast('Error updating', 'error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this ingredient?')) return
    try {
      await API.delete('/business/stock/' + id)
      setIngredients(prev => prev.filter(i => i.id !== id))
      showToast('Ingredient removed', 'error')
    } catch {}
  }

  const handleRefreshColors = async () => {
    showToast('🤖 AI refreshing colors for all ingredients...', 'warning')
    for (const ing of ingredients) {
      if (!ing.color || ing.color === '#6B7280') {
        try {
          const aiRes = await API.post('/business/ai-ingredient-info', { name: ing.name })
          await API.put('/business/stock/' + ing.id, { ...ing, color: aiRes.data.color, emoji: aiRes.data.emoji })
        } catch {}
      }
    }
    fetchStock()
    showToast('Colors updated!')
  }

  const lowStockItems   = ingredients.filter(i => safeNum(i.stock_quantity) <= safeNum(i.low_stock_alert) && safeNum(i.low_stock_alert) > 0)
  const totalStockValue = ingredients.reduce((s, i) => s + safeNum(i.stock_quantity) * safeNum(i.cost_per_unit), 0)
  const hasUncollored   = ingredients.some(i => !i.color || i.color === '#6B7280')

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Edit modal */}
      {editingIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setEditingIng(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Edit {editingIng.emoji} {editingIng.name}</h3>
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
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Current Stock</label>
                  <input type="number" value={editingIng.stock_quantity} onChange={e => setEditingIng({ ...editingIng, stock_quantity: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Alert when below</label>
                <input type="number" value={editingIng.low_stock_alert} onChange={e => setEditingIng({ ...editingIng, low_stock_alert: e.target.value })} min="0" step="0.001" className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
            <p className="text-gray-400 text-sm mt-0.5">{ingredients.length} ingredients tracked</p>
          </div>
          <div className="flex gap-2">
            {hasUncollored && ingredients.length > 0 && (
              <button onClick={handleRefreshColors}
                className="bg-purple-100 text-purple-600 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-purple-200 transition">
                🤖 Fix Colors
              </button>
            )}
            <button onClick={() => setShowAdd(!showAdd)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${showAdd ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
              {showAdd ? 'Cancel' : '+ Add Ingredient'}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Total Items</p>
            <p className="text-xl font-bold text-orange-600">{ingredients.length}</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm text-center ${lowStockItems.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}`}>
            <p className="text-xs text-gray-400 mb-1">Low Stock</p>
            <p className={`text-xl font-bold ${lowStockItems.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>{lowStockItems.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Stock Value</p>
            <p className="text-sm font-bold text-green-600 tabular-nums truncate">{fmt(totalStockValue, symbol)}</p>
          </div>
        </div>

        {/* Low stock banner */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-5">
            <p className="text-red-600 font-semibold text-sm mb-2">⚠️ Low Stock Alerts</p>
            {lowStockItems.map(i => (
              <div key={i.id} className="flex justify-between items-center text-sm py-1">
                <span className="font-medium" style={{ color: i.color || '#EF4444' }}>{i.emoji} {i.name}</span>
                <span className="text-red-500 text-xs tabular-nums">{safeNum(i.stock_quantity).toFixed(1)} {i.unit} left</span>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-5 border-2 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Add Ingredient</h3>
                <p className="text-xs text-orange-500">AI will choose a unique color and emoji</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Ingredient Name</label>
                <input type="text" placeholder="e.g. Beef Patty, Tomato, Burger Bun..."
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Unit you buy in</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value, pieces_per_container: '' })} className={cls}>
                    {ALL_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  {UNIT_CONVERSIONS[form.unit] && (
                    <p className="text-xs text-orange-500 mt-1">
                      Can use in recipes as {UNIT_CONVERSIONS[form.unit].smaller || UNIT_CONVERSIONS[form.unit].larger}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cost per {form.unit} ({symbol})</label>
                  <input type="number" placeholder="0.000" value={form.cost_per_unit}
                    onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
              </div>

              {/* Container units — ask pieces per bag/box/etc */}
              {CONTAINER_UNITS.includes(form.unit) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                  <label className="text-xs font-semibold text-blue-600 mb-1 block">
                    How many pieces are in 1 {form.unit}?
                  </label>
                  <input type="number" placeholder="e.g. 6 buns per bag"
                    value={form.pieces_per_container}
                    onChange={e => setForm({ ...form, pieces_per_container: e.target.value })}
                    min="1" step="1" className={cls} />
                  {form.pieces_per_container && form.cost_per_unit && (
                    <p className="text-xs text-blue-500 mt-1">
                      Cost per piece: {symbol}{(safeNum(form.cost_per_unit) / safeNum(form.pieces_per_container)).toFixed(4)}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Current Stock ({form.unit})</label>
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
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> AI is setting up...</>
                  : <><span>🤖</span> Add to Stock</>}
              </button>
            </div>
          </div>
        )}

        {/* Stock list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : ingredients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-semibold text-gray-700 dark:text-white mb-1">No ingredients yet</p>
            <button onClick={() => setShowAdd(true)} className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">+ Add First Ingredient</button>
          </div>
        ) : (
          <div className="space-y-3">
            {ingredients.map(ing => (
              <IngredientCard key={ing.id} ing={ing} symbol={symbol}
                onDelete={handleDelete} onEdit={setEditingIng}
                restockId={restockId} restockAmount={restockAmount}
                setRestockAmount={setRestockAmount} setRestockId={setRestockId}
                handleRestock={handleRestock} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}