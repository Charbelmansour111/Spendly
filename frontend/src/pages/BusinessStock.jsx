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
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [symbol, setSymbol] = useState('$')
  const [activeTab, setActiveTab] = useState('inventory')
  const [showAdd, setShowAdd] = useState(false)
  const [restockId, setRestockId] = useState(null)
  const [restockAmount, setRestockAmount] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [editingIng, setEditingIng] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [restockCost, setRestockCost] = useState('')
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0])

  const [form, setForm] = useState({
    name: '', unit: 'kg', cost_per_unit: '',
    stock_quantity: '', low_stock_alert: '', pieces_per_container: ''
  })

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.account_type !== 'business') {
      window.location.href = '/dashboard'
      return
    }
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    fetchStock()
  }, [])

  const fetchStock = async () => {
    setLoading(true)
    try {
      const r = await API.get('/business/stock')
      setIngredients(r.data || [])
    } catch {
      showToast('Error loading stock', 'error')
    }
    setLoading(false)
  }

  const handleRestock = async (id) => {
    const amount = safeNum(restockAmount)
    if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error')

    const ing = ingredients.find(i => i.id === id)
    if (!ing) return showToast('Ingredient not found', 'error') // ✅ FIX

    const newQty = safeNum(ing.stock_quantity) + amount
    const newCost = restockCost ? parseFloat(restockCost) : safeNum(ing.cost_per_unit)

    try {
      await API.put('/business/stock/' + id, {
        stock_quantity: newQty,
        cost_per_unit: newCost,
      })

      setRestockId(null)
      setRestockAmount('')
      setRestockCost('')
      fetchStock()

      showToast(`✅ ${ing.name} restocked`)
    } catch {
      showToast('Error', 'error')
    }
  }

  const filtered = ingredients
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* HEADER */}
        <h1 className="text-2xl font-bold mb-4">Stock & Ingredients</h1>

        {/* SEARCH */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full mb-4 p-2 border rounded"
        />

        {/* LIST */}
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No ingredients</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(ing => (
              <div key={ing.id} className="p-4 bg-white rounded shadow flex justify-between items-center">
                <div>
                  <p className="font-bold">{ing.name}</p>
                  <p className="text-sm text-gray-500">
                    {safeNum(ing.stock_quantity)} {ing.unit}
                  </p>
                </div>

                <button
                  onClick={() => setRestockId(ing.id)}
                  className="bg-orange-500 text-white px-3 py-1 rounded"
                >
                  Restock
                </button>
              </div>
            ))}
          </div>
        )}

        {/* RESTOCK BOX */}
        {restockId && (
          <div className="mt-5 p-4 bg-orange-100 rounded">
            <input
              type="number"
              value={restockAmount}
              onChange={e => setRestockAmount(e.target.value)}
              placeholder="Amount"
              className="border p-2 mr-2"
            />
            <button
              onClick={() => handleRestock(restockId)}
              className="bg-orange-500 text-white px-4 py-2 rounded"
            >
              Confirm
            </button>
          </div>
        )}

      </div>
    </Layout>
  )
}