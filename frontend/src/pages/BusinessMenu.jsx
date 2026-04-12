import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const FOOD_CATS = ['Burger','Sandwich','Pizza','Shawarma','Wrap','Salad','Soup','Pasta','Rice Dish','Grilled','Fried','Breakfast','Dessert','Side Dish','Kids Meal','Seafood','Vegetarian','Other Food']
const DRINK_CATS = ['Drink - Can','Drink - Bottle','Water']
const ALL_MENU_CATS = [...FOOD_CATS, ...DRINK_CATS, 'Delivery']
const CAT_ICONS = {
  'Burger':'🍔','Sandwich':'🥪','Pizza':'🍕','Shawarma':'🌯','Wrap':'🌯','Salad':'🥗','Soup':'🍲',
  'Pasta':'🍝','Rice Dish':'🍚','Grilled':'🥩','Fried':'🍟','Breakfast':'🍳','Dessert':'🍰',
  'Side Dish':'🍟','Kids Meal':'🧒','Seafood':'🦐','Vegetarian':'🥦','Other Food':'🍽️',
  'Drink - Can':'🥤','Drink - Bottle':'🍶','Water':'💧','Delivery':'🛵'
}

const CAN_SIZES    = ['185 ml (small can)','355 ml (classic can)','Custom']
const BOTTLE_SIZES = ['250 ml (small glass)','330 ml (PET)','500 ml (PET)','1 L','1.25 L','1.5 L (family)','2 L','2.25 L (jumbo)','Custom']
const WATER_SIZES  = [
  '200 ml (Reem small)','250 ml (small glass)','330 ml','500 ml',
  '600 ml','1 L','1.5 L','2 L','2.25 L (jumbo)','Custom'
]

// All known soft drink keywords — for POS matching
const SOFT_DRINK_KEYWORDS = [
  'pepsi','pepsi diet','pepsi max','pepsi zero','pepsi 1.25',
  '7up','7 up','7up free','7up diet',
  'miranda','miranda orange','miranda apple',
  'sprite','sprite zero',
  'fanta','fanta orange','fanta lemon',
  'cola','diet cola',
  'ice tea','ice tea peach','ice tea lemon','ice tea diet','lipton',
  'redbull','red bull',
  'schweppes','tonic',
  'ab3a','aba','abo'
]

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">x</button>
    </div>
  )
}

const EMPTY_ROW = { ingredient_id: '', quantity: '', unit: '' }

export default function BusinessMenu() {
  const [menuItems, setMenuItems]       = useState([])
  const [ingredients, setIngredients]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState(null)
  const [symbol, setSymbol]             = useState('$')
  const [showAddItem, setShowAddItem]   = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)
  const [editingItem, setEditingItem]   = useState(null)
  const [recipeRows, setRecipeRows]     = useState([{ ...EMPTY_ROW }])

  const [itemForm, setItemForm] = useState({ name: '', category: 'Burger', price: '', num_ingredients: 1 })
  const [drinkDetails, setDrinkDetails] = useState({
  drink_type: 'can',         // can | bottle | water
  size: '',
  custom_size: '',
  box_cost: '',
  box_cost_currency: 'USD',  // USD | LBP
  cans_per_box: '',
  exchange_rate: localStorage.getItem('pos_exchange_rate') || '90000',
  })
  const isDrink = DRINK_CATS.includes(itemForm.category)
  const isWater = itemForm.category === 'Water'
  const isDelivery = itemForm.category === 'Delivery'

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!localStorage.getItem('token')) { window.location.href = '/login'; return }
    if (user.account_type !== 'business') { window.location.href = '/dashboard'; return }
    setSymbol(CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [m, s] = await Promise.all([API.get('/business/menu'), API.get('/business/stock')])
      setMenuItems(m.data || [])
      setIngredients(s.data || [])
    } catch { showToast('Error loading menu', 'error') }
    setLoading(false)
  }

  const handleNumIngredients = (n) => {
    const num = parseInt(n)
    setItemForm(f => ({ ...f, num_ingredients: num }))
    setRecipeRows(prev => {
      if (num > prev.length) return [...prev, ...Array(num - prev.length).fill({ ...EMPTY_ROW })]
      return prev.slice(0, num)
    })
  }

  const handleIngredientSelect = (rowIdx, ingredient_id) => {
    const ing = ingredients.find(i => String(i.id) === String(ingredient_id))
    setRecipeRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, ingredient_id, unit: ing?.unit || '' } : r))
  }

  const handleRecipeRowChange = (rowIdx, field, value) => {
    setRecipeRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r))
  }

const calcDrinkCostUSD = () => {
  const rate = parseFloat(drinkDetails.exchange_rate) || 90000
  const boxCost = parseFloat(drinkDetails.box_cost) || 0
  const cansPerBox = parseFloat(drinkDetails.cans_per_box) || 1
  const costPerCan = boxCost / cansPerBox
  if (drinkDetails.box_cost_currency === 'LBP') {
    return { usd: (costPerCan / rate).toFixed(4), lbp: costPerCan.toFixed(0) }
  }
  return { usd: costPerCan.toFixed(4), lbp: (costPerCan * rate).toFixed(0) }
}

  const handleAddItem = async () => {
  if (!itemForm.name || !itemForm.price) { showToast('Name and price required', 'error'); return }
  
  // Drinks and delivery don't need recipes
  const needsRecipe = !isDrink && !isDelivery
  const validRows = recipeRows.filter(r => r.ingredient_id && r.quantity && parseFloat(r.quantity) > 0)
  if (needsRecipe && validRows.length === 0) { showToast('Add at least 1 ingredient', 'error'); return }
  
  try {
    const itemRes = await API.post('/business/menu', {
      name: itemForm.name,
      category: itemForm.category,
      price: itemForm.price,
      drink_details: isDrink || isWater ? drinkDetails : null
    })
    const newItemId = itemRes.data.id
    if (validRows.length > 0) {
      await Promise.all(validRows.map(row =>
        API.post('/business/recipe', { menu_item_id: newItemId, ingredient_id: row.ingredient_id, quantity: row.quantity, recipe_unit: row.unit })
      ))
    }
    setItemForm({ name: '', category: 'Burger', price: '', num_ingredients: 1 })
    setRecipeRows([{ ...EMPTY_ROW }])
    setDrinkDetails({ drink_type: 'can', size: '', custom_size: '', box_cost: '', box_cost_currency: 'USD', cans_per_box: '', exchange_rate: localStorage.getItem('pos_exchange_rate') || '90000' })
    setShowAddItem(false)
    fetchAll()
    showToast('Menu item added!')
  } catch (e) {
    showToast(e.response?.data?.message || 'Error adding item', 'error')
  }
}

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Remove this item?')) return
    try { await API.delete('/business/menu/' + id); fetchAll(); showToast('Item removed', 'error') } catch {}
  }

  const handleDeleteRecipe = async (recipeId) => {
    try { await API.delete('/business/recipe/' + recipeId); fetchAll() } catch {}
  }

  const handleSaveEdit = async () => {
    if (!editingItem?.name || !editingItem?.price) { showToast('Name and price required', 'error'); return }
    try {
      await API.put('/business/menu/' + editingItem.id, { name: editingItem.name, category: editingItem.category, price: editingItem.price })
      setEditingItem(null); fetchAll(); showToast('Item updated!')
    } catch { showToast('Error updating', 'error') }
  }

  const getItemCost = (item) => {
    if (!item.recipes || item.recipes.length === 0) return 0
    return item.recipes.reduce((sum, r) => {
      const ing = ingredients.find(i => i.id === r.ingredient_id)
      return sum + (ing ? safeNum(ing.cost_per_unit) * safeNum(r.quantity) : 0)
    }, 0)
  }

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setEditingItem(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Edit Item</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Name</label>
                <input type="text" value={editingItem.name}
                  onChange={e => setEditingItem(prev => ({ ...prev, name: e.target.value }))} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                  <select value={editingItem.category} onChange={e => setEditingItem(prev => ({ ...prev, category: e.target.value }))} className={cls}>
                    {FOOD_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Price ({symbol})</label>
                  <input type="number" value={editingItem.price}
                    onChange={e => setEditingItem(prev => ({ ...prev, price: e.target.value }))} min="0" step="0.01" className={cls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setEditingItem(null)} className="py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold text-sm">Cancel</button>
                <button onClick={handleSaveEdit} className="py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Builder</h1>
            <p className="text-gray-400 text-sm mt-0.5">{menuItems.length} items on the menu</p>
          </div>
          <button onClick={() => { setShowAddItem(!showAddItem); setExpandedItem(null) }}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${showAddItem ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
            {showAddItem ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {ingredients.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-2xl p-4 mb-5">
            <p className="text-yellow-700 text-sm font-medium">
              No ingredients yet. <a href="/business/stock" className="underline font-bold">Add ingredients first →</a>
            </p>
          </div>
        )}

        {/* ── ADD ITEM FORM — inlined to fix focus bug ── */}
        {showAddItem && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-6 border-2 border-orange-200 dark:border-orange-800">
            <h3 className="font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <span className="text-orange-500">🍽️</span> New Menu Item
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Item Name *</label>
                <input type="text" placeholder="e.g. Classic Burger" value={itemForm.name}
                  onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Category *</label>
                  <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} className={cls}>
                    {FOOD_CATS.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Selling Price ({symbol}) *</label>
                  <input type="number" placeholder="0.00" value={itemForm.price}
                    onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} min="0" step="0.01" className={cls} />
                </div>
              </div>
              {/* DRINK SPECIAL FIELDS */}
{(isDrink || isWater) && (
  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-4 space-y-3">
    <p className="text-xs font-bold text-blue-600 mb-1">
      {isWater ? '💧 Water Details' : '🥤 Drink Details'}
    </p>

    {/* Size selector */}
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">Size</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(isWater ? WATER_SIZES : itemForm.category === 'Drink - Can' ? CAN_SIZES : BOTTLE_SIZES).map(s => (
          <button key={s} type="button"
            onClick={() => setDrinkDetails(d => ({ ...d, size: s, custom_size: '' }))}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${drinkDetails.size === s ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-blue-200'}`}>
            {s}
          </button>
        ))}
      </div>
      {drinkDetails.size === 'Custom' && (
        <input type="text" placeholder="Enter custom size (e.g. 473 ml)"
          value={drinkDetails.custom_size}
          onChange={e => setDrinkDetails(d => ({ ...d, custom_size: e.target.value }))}
          className={cls} />
      )}
    </div>

    {/* Box cost + cans per box */}
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        Cost per {itemForm.category === 'Water' ? 'pack/case' : 'box/case'}
      </label>
      <div className="flex gap-2 items-center">
        <input type="number" placeholder="0.00" step="0.01" min="0"
          value={drinkDetails.box_cost}
          onChange={e => setDrinkDetails(d => ({ ...d, box_cost: e.target.value }))}
          className={cls} />
        {/* Currency toggle */}
        <button type="button"
          onClick={() => setDrinkDetails(d => ({ ...d, box_cost_currency: d.box_cost_currency === 'USD' ? 'LBP' : 'USD' }))}
          className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition ${drinkDetails.box_cost_currency === 'USD' ? 'bg-green-500 text-white border-green-500' : 'bg-orange-500 text-white border-orange-500'}`}>
          {drinkDetails.box_cost_currency === 'USD' ? '$' : 'LL'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">Tap $ / LL to switch currency</p>
    </div>

    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        How many {itemForm.category === 'Drink - Can' ? 'cans' : itemForm.category === 'Water' ? 'bottles' : 'bottles'} per box?
      </label>
      <input type="number" placeholder="e.g. 24" step="1" min="1"
        value={drinkDetails.cans_per_box}
        onChange={e => setDrinkDetails(d => ({ ...d, cans_per_box: e.target.value }))}
        className={cls} />
    </div>

    {/* Exchange rate for LL conversion */}
    {drinkDetails.box_cost_currency === 'LBP' && (
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Exchange Rate (1$ = ? LL)</label>
        <input type="number" placeholder="e.g. 90000"
          value={drinkDetails.exchange_rate}
          onChange={e => { setDrinkDetails(d => ({ ...d, exchange_rate: e.target.value })); localStorage.setItem('pos_exchange_rate', e.target.value) }}
          className={cls} />
      </div>
    )}

    {/* Live cost calculation */}
    {drinkDetails.box_cost && drinkDetails.cans_per_box && (() => {
      const calc = calcDrinkCostUSD()
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 space-y-1">
          <p className="text-xs font-bold text-blue-600 mb-1">💡 Cost per unit</p>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">In USD</span>
            <span className="font-bold text-green-600">${calc.usd}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">In LBP</span>
            <span className="font-bold text-orange-500">{parseInt(calc.lbp).toLocaleString()} LL</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Box of {drinkDetails.cans_per_box} units</span>
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {drinkDetails.box_cost_currency === 'USD'
                ? `$${parseFloat(drinkDetails.box_cost).toFixed(2)}`
                : `${parseInt(drinkDetails.box_cost).toLocaleString()} LL`}
            </span>
          </div>
        </div>
      )
    })()}
  </div>
)}

{/* DELIVERY SPECIAL FIELDS */}
{isDelivery && (
  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-2xl p-4">
    <p className="text-xs font-bold text-yellow-600 mb-2">🛵 Delivery Zone</p>
    <p className="text-xs text-yellow-500">The selling price above is the delivery fee charged to the customer. No recipe or stock needed for delivery zones.</p>
  </div>
)}
               <div>
               <div className="flex justify-between items-center mb-2">
               <label className="text-xs font-semibold text-gray-500">Number of Ingredients</label>
               <span className="text-xl font-bold text-orange-500">{itemForm.num_ingredients}</span>
               </div>
                <input type="range" min="1" max="20" value={itemForm.num_ingredients}
                  onChange={e => handleNumIngredients(e.target.value)} className="w-full accent-orange-500 h-2" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-3 block">
                  Recipe — {itemForm.num_ingredients} ingredient{itemForm.num_ingredients > 1 ? 's' : ''}
                </label>
                {ingredients.length === 0 ? (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                    <p className="text-orange-600 text-sm">No ingredients yet.</p>
                    <a href="/business/stock" className="text-orange-600 font-bold text-xs underline">Add ingredients first →</a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recipeRows.map((row, idx) => {
                      const selectedIng = ingredients.find(i => String(i.id) === String(row.ingredient_id))
                      const ingCost = selectedIng && row.quantity ? safeNum(selectedIng.cost_per_unit) * safeNum(row.quantity) : 0
                      return (
                        <div key={idx} className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-3">
                          <p className="text-xs font-semibold text-orange-500 mb-2">Ingredient {idx + 1}</p>
                          <div className="space-y-2">
                            <select value={row.ingredient_id} onChange={e => handleIngredientSelect(idx, e.target.value)}
                              className="w-full px-3 py-2.5 border border-orange-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                              <option value="">Select ingredient...</option>
                              {ingredients.map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.emoji || '📦'} {ing.name} (stock: {safeNum(ing.stock_quantity).toFixed(1)} {ing.unit})</option>
                              ))}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Quantity per item</label>
                                <input type="number" placeholder="e.g. 150"
                                  value={row.quantity} onChange={e => handleRecipeRowChange(idx, 'quantity', e.target.value)}
                                  min="0" step="0.001"
                                  className="w-full px-3 py-2 border border-orange-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Use in recipe as</label>
                                <select value={row.unit || selectedIng?.unit || ''}
                                  onChange={e => handleRecipeRowChange(idx, 'unit', e.target.value)}
                                  className="w-full px-3 py-2 border border-orange-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold">
                                  {selectedIng ? (
                                    <>
                                      <option value={selectedIng.unit}>{selectedIng.unit} (same as stock)</option>
                                      {selectedIng.unit === 'kg' && <option value="g">g (grams)</option>}
                                      {selectedIng.unit === 'g'  && <option value="kg">kg</option>}
                                      {selectedIng.unit === 'L'  && <option value="ml">ml</option>}
                                      {selectedIng.unit === 'ml' && <option value="L">L</option>}
                                      {selectedIng.unit === 'cans' && <option value="pieces">pieces</option>}
                                      {selectedIng.unit === 'bags' && <option value="pieces">pieces</option>}
                                      {selectedIng.unit === 'boxes' && <option value="pieces">pieces</option>}
                                    </>
                                  ) : <option value="">Select ingredient first</option>}
                                </select>
                              </div>
                            </div>
                            {selectedIng && row.unit && row.unit !== selectedIng.unit && row.quantity && (
                              <p className="text-xs text-orange-500 font-medium">
                                {row.quantity} {row.unit} = {
                                  row.unit === 'g'  && selectedIng.unit === 'kg' ? (safeNum(row.quantity)/1000).toFixed(4)+' kg' :
                                  row.unit === 'kg' && selectedIng.unit === 'g'  ? (safeNum(row.quantity)*1000).toFixed(1)+' g' :
                                  row.unit === 'ml' && selectedIng.unit === 'L'  ? (safeNum(row.quantity)/1000).toFixed(4)+' L' :
                                  row.unit === 'L'  && selectedIng.unit === 'ml' ? (safeNum(row.quantity)*1000).toFixed(1)+' ml' :
                                  row.unit === 'pieces' && safeNum(selectedIng.pieces_per_container) > 0 ? (safeNum(row.quantity) / safeNum(selectedIng.pieces_per_container)).toFixed(4)+' '+selectedIng.unit : ''
                                } deducted from stock
                              </p>
                            )}
                            {selectedIng && row.quantity && (
                              <p className="text-xs text-orange-600 font-medium">Cost: {symbol}{ingCost.toFixed(4)} per item</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Live cost summary */}
              {recipeRows.some(r => r.ingredient_id && r.quantity) && (() => {
                const totalCost = recipeRows.reduce((sum, r) => {
                  const ing = ingredients.find(i => String(i.id) === String(r.ingredient_id))
                  return sum + (ing && r.quantity ? safeNum(ing.cost_per_unit) * safeNum(r.quantity) : 0)
                }, 0)
                const price  = safeNum(itemForm.price)
                const profit = price - totalCost
                const margin = price > 0 ? ((profit / price) * 100).toFixed(0) : 0
                return (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div><p className="text-xs text-gray-500">Ingredient cost</p><p className="font-bold text-red-500 tabular-nums">-{symbol}{totalCost.toFixed(3)}</p></div>
                      <div><p className="text-xs text-gray-500">Selling price</p><p className="font-bold text-gray-800 dark:text-white tabular-nums">{price > 0 ? fmt(price, symbol) : '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Profit</p><p className={`font-bold tabular-nums ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{profit >= 0 ? '+' : '-'}{fmt(Math.abs(profit), symbol)} ({profit < 0 ? '-' : ''}{Math.abs(margin)}%)</p></div>
                    </div>
                  </div>
                )
              })()}

              <button onClick={handleAddItem} disabled={!itemForm.name || !itemForm.price}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-orange-600 transition disabled:opacity-50">
                Add to Menu
              </button>
            </div>
          </div>
        )}

        {/* Menu list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : menuItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-5xl mb-3">🍽️</p>
            <p className="font-semibold text-gray-700 dark:text-white mb-1">No menu items yet</p>
            <button onClick={() => setShowAddItem(true)} className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">+ Add First Item</button>
          </div>
        ) : (
          <div className="space-y-3">
            {menuItems.map(item => {
              const cost   = getItemCost(item)
              const profit = safeNum(item.price) - cost
              const margin = safeNum(item.price) > 0 ? ((profit / safeNum(item.price)) * 100).toFixed(0) : 0
              const isExpanded = expandedItem === item.id
              return (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                    <div className="w-11 h-11 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                      {CAT_ICONS[item.category] || '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.category} · {item.recipes?.length || 0} ingredients</p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-1">
                      <p className="font-bold text-orange-600 tabular-nums">{fmt(item.price, symbol)}</p>
                      {cost > 0 && (
                        <p className={`text-xs font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {profit >= 0 ? '+' : '-'}{Math.abs(margin)}% margin
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setEditingItem({ ...item }) }}
                        className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteItem(item.id) }}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                      <span className={`text-gray-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3">
                      {item.recipes && item.recipes.length > 0 ? (
                        <>
                          <p className="text-xs font-semibold text-gray-500 mb-3">Recipe</p>
                          <div className="space-y-2 mb-3">
                            {item.recipes.map(r => {
                              const ing     = ingredients.find(i => i.id === r.ingredient_id)
                              const ingCost = ing ? safeNum(ing.cost_per_unit) * safeNum(r.quantity) : 0
                              const isLow   = ing && safeNum(ing.low_stock_alert) > 0 && safeNum(ing.stock_quantity) <= safeNum(ing.low_stock_alert)
                              return (
                                <div key={r.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5">
                                  <span className="text-lg flex-shrink-0">{ing?.emoji || '📦'}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{ing?.name || 'Unknown'}</p>
                                      {isLow && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full flex-shrink-0">Low!</span>}
                                    </div>
                                    <p className="text-xs text-gray-400">Stock: {safeNum(ing?.stock_quantity).toFixed(1)} {ing?.unit}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">{safeNum(r.quantity)} {ing?.unit}</p>
                                    <p className="text-xs text-orange-500 tabular-nums">-{symbol}{ingCost.toFixed(3)}</p>
                                  </div>
                                  <button onClick={() => handleDeleteRecipe(r.id)} className="text-red-300 hover:text-red-500 p-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-gray-400">Cost to make</p>
                              <p className="font-bold text-red-500 tabular-nums text-sm">-{symbol}{cost.toFixed(3)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Sell price</p>
                              <p className="font-bold text-gray-800 dark:text-white tabular-nums text-sm">{fmt(item.price, symbol)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Profit</p>
                              <p className={`font-bold tabular-nums text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {profit >= 0 ? '+' : '-'}{fmt(Math.abs(profit), symbol)}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 py-2">No recipe set. Delete and re-add to set ingredients.</p>
                      )}
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