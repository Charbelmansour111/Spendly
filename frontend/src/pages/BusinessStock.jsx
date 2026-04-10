import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const UNITS = ['g', 'kg', 'ml', 'L', 'pieces', 'boxes', 'bags', 'bottles', 'cans', 'slices']
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">x</button>
    </div>
  )
}

export default function BusinessStock() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading]         = useState(true)
  const [toast, setToast]             = useState(null)
  const [symbol, setSymbol]           = useState('$')
  const [showAdd, setShowAdd]         = useState(false)
  const [restockId, setRestockId]     = useState(null)
  const [restockAmount, setRestockAmount] = useState('')
  const [form, setForm] = useState({ name: '', unit: 'kg', cost_per_unit: '', stock_quantity: '', low_stock_alert: '' })

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

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
    if (!form.name || !form.unit || !form.cost_per_unit) { showToast('Name, unit and cost are required', 'error'); return }
    try {
      await API.post('/business/stock', form)
      setForm({ name: '', unit: 'kg', cost_per_unit: '', stock_quantity: '', low_stock_alert: '' })
      setShowAdd(false)
      fetchStock()
      showToast('Ingredient added!')
    } catch { showToast('Error adding ingredient', 'error') }
  }

  const handleRestock = async (id) => {
    const amount = safeNum(restockAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return }
    try {
      const ing = ingredients.find(i => i.id === id)
      const newQty = safeNum(ing.stock_quantity) + amount
      await API.put('/business/stock/' + id, { ...ing, stock_quantity: newQty })
      setRestockId(null)
      setRestockAmount('')
      fetchStock()
      showToast('Stock updated!')
    } catch { showToast('Error updating stock', 'error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this ingredient?')) return
    try { await API.delete('/business/stock/' + id); fetchStock(); showToast('Ingredient removed', 'error') } catch {}
  }

  const lowStockItems  = ingredients.filter(i => safeNum(i.stock_quantity) <= safeNum(i.low_stock_alert) && safeNum(i.low_stock_alert) > 0)
  const totalStockValue = ingredients.reduce((s, i) => s + safeNum(i.stock_quantity) * safeNum(i.cost_per_unit), 0)

  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock & Ingredients</h1>
            <p className="text-gray-400 text-sm mt-0.5">{ingredients.length} ingredients tracked</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
            {showAdd ? 'Cancel' : '+ Add Ingredient'}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Total Items</p>
            <p className="text-xl font-bold text-orange-600">{ingredients.length}</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm text-center ${lowStockItems.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}`}>
            <p className="text-xs text-gray-400 mb-1">Low Stock</p>
            <p className={`text-xl font-bold ${lowStockItems.length > 0 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
              {lowStockItems.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Stock Value</p>
            <p className="text-sm font-bold text-green-600 tabular-nums truncate">{fmt(totalStockValue, symbol)}</p>
          </div>
        </div>

        {/* Low stock alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-5">
            <p className="text-red-600 font-semibold text-sm mb-2">⚠️ Low Stock Alerts</p>
            {lowStockItems.map(i => (
              <div key={i.id} className="flex justify-between items-center text-sm py-1">
                <span className="text-red-700 dark:text-red-300 font-medium">{i.name}</span>
                <span className="text-red-500 tabular-nums">{safeNum(i.stock_quantity).toFixed(1)} {i.unit} left (min: {safeNum(i.low_stock_alert).toFixed(1)})</span>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-5 border-2 border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Add Ingredient</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Ingredient Name</label>
                <input type="text" placeholder="e.g. Beef Patty" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={cls}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Cost per unit ({symbol})</label>
                  <input type="number" placeholder="0.00" value={form.cost_per_unit}
                    onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} min="0" step="0.001" className={cls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Current Stock</label>
                  <input type="number" placeholder="0" value={form.stock_quantity}
                    onChange={e => setForm({ ...form, stock_quantity: e.target.value })} min="0" step="0.1" className={cls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Low Stock Alert at</label>
                  <input type="number" placeholder="0" value={form.low_stock_alert}
                    onChange={e => setForm({ ...form, low_stock_alert: e.target.value })} min="0" step="0.1" className={cls} />
                </div>
              </div>
              <button onClick={handleAdd} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition">
                Add to Stock
              </button>
            </div>
          </div>
        )}

        {/* Stock list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : ingredients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-semibold text-gray-700 dark:text-white mb-1">No ingredients yet</p>
            <p className="text-gray-400 text-sm">Add ingredients to track stock and calculate recipe costs</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            {ingredients.map((ing, idx) => {
              const isLow   = safeNum(ing.stock_quantity) <= safeNum(ing.low_stock_alert) && safeNum(ing.low_stock_alert) > 0
              const stockVal = safeNum(ing.stock_quantity) * safeNum(ing.cost_per_unit)
              const pct = safeNum(ing.low_stock_alert) > 0
                ? Math.min((safeNum(ing.stock_quantity) / (safeNum(ing.low_stock_alert) * 3)) * 100, 100)
                : 100
              return (
                <div key={ing.id} className={`px-4 py-4 ${idx < ingredients.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''} ${isLow ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isLow ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                      {isLow ? '⚠️' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{ing.name}</p>
                        {isLow && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Low!</span>}
                      </div>
                      <p className="text-xs text-gray-400">{symbol}{safeNum(ing.cost_per_unit).toFixed(3)} per {ing.unit} · Value: {fmt(stockVal, symbol)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${isLow ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                        {safeNum(ing.stock_quantity).toFixed(1)} {ing.unit}
                      </p>
                      {safeNum(ing.low_stock_alert) > 0 && (
                        <p className="text-xs text-gray-400">min: {safeNum(ing.low_stock_alert).toFixed(1)}</p>
                      )}
                    </div>
                  </div>

                  {/* Stock level bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                    <div className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-orange-400'}`}
                      style={{ width: pct + '%' }} />
                  </div>

                  {/* Restock section */}
                  {restockId === ing.id ? (
                    <div className="flex gap-2 mt-2">
                      <input type="number" placeholder={'Add ' + ing.unit + '...'} value={restockAmount}
                        onChange={e => setRestockAmount(e.target.value)} min="0.1" step="0.1"
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      <button onClick={() => handleRestock(ing.id)} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition">Add</button>
                      <button onClick={() => { setRestockId(null); setRestockAmount('') }} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white px-3 py-2 rounded-xl text-xs hover:bg-gray-200 transition">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setRestockId(ing.id)} className="text-xs text-orange-500 font-semibold hover:underline">+ Restock</button>
                      <button onClick={() => handleDelete(ing.id)} className="text-xs text-red-400 font-semibold hover:underline ml-2">Remove</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}