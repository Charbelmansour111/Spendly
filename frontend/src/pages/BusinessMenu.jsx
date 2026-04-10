import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(a, s) { return s + Math.abs(safeNum(a)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const MENU_CATS = ['Burger', 'Sandwich', 'Pizza', 'Salad', 'Drink', 'Dessert', 'Side', 'Other']

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 truncate">{message}</span>
      <button onClick={onClose} className="font-bold opacity-70">x</button>
    </div>
  )
}

export default function BusinessMenu() {
  const [menuItems, setMenuItems]   = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [symbol, setSymbol]         = useState('$')
  const [showAddItem, setShowAddItem] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)
  const [showAddRecipe, setShowAddRecipe] = useState(null) // item id
  const [itemForm, setItemForm]     = useState({ name: '', category: 'Burger', price: '' })
  const [recipeForm, setRecipeForm] = useState({ ingredient_id: '', quantity: '' })

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.token && !localStorage.getItem('token')) { window.location.href = '/login'; return }
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

  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.price) { showToast('Name and price required', 'error'); return }
    try {
      await API.post('/business/menu', itemForm)
      setItemForm({ name: '', category: 'Burger', price: '' })
      setShowAddItem(false)
      fetchAll()
      showToast('Menu item added!')
    } catch { showToast('Error adding item', 'error') }
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Remove this item from menu?')) return
    try { await API.delete('/business/menu/' + id); fetchAll(); showToast('Item removed', 'error') } catch {}
  }

  const handleAddRecipe = async (menuItemId) => {
    if (!recipeForm.ingredient_id || !recipeForm.quantity) { showToast('Select ingredient and quantity', 'error'); return }
    try {
      await API.post('/business/recipe', { menu_item_id: menuItemId, ingredient_id: recipeForm.ingredient_id, quantity: recipeForm.quantity })
      setRecipeForm({ ingredient_id: '', quantity: '' })
      setShowAddRecipe(null)
      fetchAll()
      showToast('Recipe ingredient added!')
    } catch { showToast('Error adding recipe', 'error') }
  }

  const handleDeleteRecipe = async (recipeId) => {
    try { await API.delete('/business/recipe/' + recipeId); fetchAll(); showToast('Ingredient removed', 'error') } catch {}
  }

  // Calculate cost per item from its recipes
  const getItemCost = (item) => {
    if (!item.recipes || item.recipes.length === 0) return 0
    return item.recipes.reduce((sum, r) => {
      const ing = ingredients.find(i => i.id === r.ingredient_id)
      if (!ing) return sum
      return sum + safeNum(ing.cost_per_unit) * safeNum(r.quantity)
    }, 0)
  }

  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <Layout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto px-4 py-6">

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Builder</h1>
            <p className="text-gray-400 text-sm mt-0.5">{menuItems.length} items on the menu</p>
          </div>
          <button onClick={() => setShowAddItem(!showAddItem)}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
            {showAddItem ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Add item form */}
        {showAddItem && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-5 border-2 border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">New Menu Item</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Item Name</label>
                <input type="text" placeholder="e.g. Classic Burger" value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                  <select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className={cls}>
                    {MENU_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Selling Price ({symbol})</label>
                  <input type="number" placeholder="0.00" value={itemForm.price}
                    onChange={e => setItemForm({ ...itemForm, price: e.target.value })} min="0" step="0.01" className={cls} />
                </div>
              </div>
              <button onClick={handleAddItem} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition">
                Add to Menu
              </button>
            </div>
          </div>
        )}

        {/* No ingredients warning */}
        {ingredients.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 mb-5">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">
              No ingredients in stock yet.{' '}
              <a href="/business/stock" className="underline font-bold">Add ingredients first</a>
              {' '}to set up recipes and calculate costs.
            </p>
          </div>
        )}

        {/* Menu list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : menuItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-semibold text-gray-700 dark:text-white mb-1">No menu items yet</p>
            <p className="text-gray-400 text-sm">Add your first item to start building your menu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menuItems.map(item => {
              const cost    = getItemCost(item)
              const profit  = safeNum(item.price) - cost
              const margin  = safeNum(item.price) > 0 ? ((profit / safeNum(item.price)) * 100).toFixed(0) : 0
              const isExpanded = expandedItem === item.id
              return (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                  {/* Item header */}
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
                      {item.category === 'Burger' ? '🍔' : item.category === 'Sandwich' ? '🥪' : item.category === 'Pizza' ? '🍕' : item.category === 'Drink' ? '🥤' : item.category === 'Salad' ? '🥗' : item.category === 'Dessert' ? '🍰' : '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="font-bold text-orange-600 tabular-nums text-sm">{fmt(item.price, symbol)}</p>
                      {cost > 0 && (
                        <p className="text-xs text-green-600">{margin}% margin</p>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDeleteItem(item.id) }} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>

                  {/* Expanded recipe section */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4">
                      <div className="flex justify-between items-center mt-3 mb-2">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recipe / Ingredients</p>
                        <button onClick={() => setShowAddRecipe(showAddRecipe === item.id ? null : item.id)}
                          className="text-xs text-orange-500 font-semibold hover:underline">
                          + Add Ingredient
                        </button>
                      </div>

                      {/* Add recipe form */}
                      {showAddRecipe === item.id && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 mb-3 space-y-2">
                          <select value={recipeForm.ingredient_id}
                            onChange={e => setRecipeForm({ ...recipeForm, ingredient_id: e.target.value })}
                            className={cls + ' text-xs'}>
                            <option value="">Select ingredient...</option>
                            {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                          </select>
                          <div className="flex gap-2">
                            <input type="number" placeholder="Quantity" value={recipeForm.quantity}
                              onChange={e => setRecipeForm({ ...recipeForm, quantity: e.target.value })}
                              min="0" step="0.1" className={cls + ' text-xs'} />
                            <button onClick={() => handleAddRecipe(item.id)}
                              className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0 hover:bg-orange-600 transition">
                              Add
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Recipe list */}
                      {item.recipes && item.recipes.length > 0 ? (
                        <div className="space-y-1.5">
                          {item.recipes.map(r => {
                            const ing = ingredients.find(i => i.id === r.ingredient_id)
                            const ingCost = ing ? safeNum(ing.cost_per_unit) * safeNum(r.quantity) : 0
                            return (
                              <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                <span className="text-gray-700 dark:text-gray-200 font-medium">{ing?.name || 'Unknown'}</span>
                                <span className="text-gray-400">{r.quantity} {ing?.unit}</span>
                                <span className="text-orange-600 font-semibold tabular-nums">{fmt(ingCost, symbol)}</span>
                                <button onClick={() => handleDeleteRecipe(r.id)} className="text-red-400 hover:text-red-600 ml-2">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>
                            )
                          })}
                          <div className="flex justify-between pt-2 text-xs font-bold border-t border-gray-200 dark:border-gray-600">
                            <span className="text-gray-600 dark:text-gray-300">Total cost</span>
                            <span className="text-red-500">{fmt(cost, symbol)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-gray-600 dark:text-gray-300">Profit per item</span>
                            <span className="text-green-600">{fmt(profit, symbol)} ({margin}%)</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 py-2">No recipe set yet. Add ingredients to calculate cost and margin.</p>
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