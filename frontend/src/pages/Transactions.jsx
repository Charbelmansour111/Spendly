import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'
import QuickScanModal from '../components/QuickScanModal'
import SplitBillModal from '../components/SplitBillModal'
import CategoryManagerModal from '../components/CategoryManagerModal'
import useCategories from '../hooks/useCategories'
import { METHOD_ICONS, METHOD_COLORS } from '../utils/paymentMethods'
import { useHideNav } from '../hooks/useHideNav'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CAT_ICONS = { Food: '🍔', Coffee: '☕', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Fitness: '🏋️', Education: '🎓', Bills: '💡', Travel: '✈️', Gifts: '🎁', Subscriptions: '📱', Other: '📦', Salary: '💼', Freelance: '💻', Business: '🏪', Investment: '📈' }
const CAT_COLORS = { Food: '#F97316', Coffee: '#92400E', Transport: '#3B82F6', Shopping: '#EC4899', Entertainment: '#10B981', Health: '#EF4444', Fitness: '#F59E0B', Education: '#6366F1', Bills: '#0EA5E9', Travel: '#14B8A6', Gifts: '#E879F9', Subscriptions: '#8B5CF6', Other: '#6B7280' }
const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
const EXPENSE_CATS = ['Food', 'Coffee', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Fitness', 'Education', 'Bills', 'Travel', 'Gifts', 'Subscriptions', 'Other']

const haptic = (ms = 10) => navigator.vibrate?.(ms)

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmtMoney(amount, symbol) {
  return symbol + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function dayLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  return d.toLocaleDateString('default', { month: 'long', year: 'numeric' })
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-16 md:top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="hover:opacity-70 shrink-0">✕</button>
    </div>
  )
}

function UndoToast({ label, onUndo, onDismiss }) {
  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-72 z-50">
      <div className="bg-gray-900 dark:bg-gray-700 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3">
        <span className="text-sm flex-1 min-w-0 truncate">Deleted <span className="font-semibold">"{label}"</span></span>
        <button onClick={onUndo} className="text-violet-400 hover:text-violet-300 font-bold text-sm shrink-0 px-2 py-1 rounded-lg hover:bg-white/10 transition">Undo</button>
        <button onClick={onDismiss} className="text-gray-400 hover:text-white shrink-0 text-xl leading-none">×</button>
      </div>
    </div>
  )
}

function EditSheet({ expense, sym, onSave, onClose }) {
  useHideNav()
  const [form, setForm] = useState({
    amount: expense.amount,
    category: expense.category,
    description: expense.description || '',
    date: expense.date?.split('T')[0] || '',
    is_recurring: expense.is_recurring || false,
    recurring_frequency: expense.recurring_frequency || 'monthly',
    notes: expense.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }
  const cls = "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Edit Expense</h3>
          <button onClick={onClose} className="text-gray-400 p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({sym})</label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} min="0.01" step="0.01" className={cls + ' text-lg font-bold'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={cls}>
                {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={cls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" className={cls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details…" className={cls + ' resize-none'} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="accent-violet-600 w-4 h-4" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring</span>
          </label>
          {form.is_recurring && (
            <select value={form.recurring_frequency} onChange={e => setForm({ ...form, recurring_frequency: e.target.value })} className={cls}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
          <button onClick={handleSave} disabled={saving || !form.amount || !form.date}
            className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SwipeRow({ onDelete, children }) {
  const [swiped, setSwiped] = useState(false)
  const [startX, setStartX] = useState(null)
  const [liveOffset, setLiveOffset] = useState(0)
  const REVEAL = 76
  const THRESHOLD = 60

  const onTouchStart = e => {
    setStartX(e.touches[0].clientX)
  }
  const onTouchMove = e => {
    if (startX === null) return
    const d = startX - e.touches[0].clientX
    if (d > 0) setLiveOffset(Math.min(d, REVEAL + 20))
    else if (d < -20 && swiped) { setSwiped(false); setLiveOffset(0) }
  }
  const onTouchEnd = () => {
    if (liveOffset >= THRESHOLD) { haptic(12); setSwiped(true); setLiveOffset(REVEAL) }
    else { setSwiped(false); setLiveOffset(0) }
    setStartX(null)
  }
  const handleConfirmDelete = () => { haptic(20); setSwiped(false); setLiveOffset(0); onDelete() }
  const handleSnapBack = () => { setSwiped(false); setLiveOffset(0) }

  const displayOffset = swiped ? REVEAL : liveOffset

  return (
    <div className="relative overflow-hidden">
      {/* Red confirm-delete panel */}
      <div className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: REVEAL, opacity: displayOffset > 4 ? 1 : 0 }}>
        <button onClick={handleConfirmDelete}
          className="flex-1 bg-red-500 active:bg-red-600 flex flex-col items-center justify-center gap-0.5 transition-colors">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
          </svg>
          <span className="text-[9px] text-white font-bold tracking-wide">Delete</span>
        </button>
      </div>
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={swiped ? handleSnapBack : undefined}
        style={{ transform: `translateX(-${displayOffset}px)`, transition: startX === null ? 'transform 0.22s ease' : 'none' }}>
        {children}
      </div>
    </div>
  )
}

const BRAND_LOGOS = {
  Netflix: 'https://logo.clearbit.com/netflix.com', Spotify: 'https://logo.clearbit.com/spotify.com',
  'Disney+': 'https://logo.clearbit.com/disneyplus.com', 'HBO Max': 'https://logo.clearbit.com/hbo.com',
  'Amazon Prime': 'https://logo.clearbit.com/amazon.com', YouTube: 'https://logo.clearbit.com/youtube.com',
}
const SUBCATEGORIES = {
  Food: [{ label: 'Restaurant', emoji: '🍽️' }, { label: 'Groceries', emoji: '🛒' }, { label: 'Fast Food', emoji: '🍔' }, { label: 'Coffee', emoji: '☕' }],
  Transport: [{ label: 'Uber', emoji: '🚗' }, { label: 'Taxi', emoji: '🚕' }, { label: 'Gas', emoji: '⛽' }, { label: 'Parking', emoji: '🅿️' }],
  Shopping: [{ label: 'Amazon', emoji: '📦' }, { label: 'Clothes', emoji: '👗' }, { label: 'Electronics', emoji: '💻' }, { label: 'Shoes', emoji: '👟' }],
  Subscriptions: [
    { label: 'Netflix',        emoji: '🎬' }, { label: 'Spotify',       emoji: '🎵' },
    { label: 'ChatGPT',        emoji: '🤖' }, { label: 'YouTube',       emoji: '▶️' },
    { label: 'Disney+',        emoji: '🏰' }, { label: 'Amazon Prime',  emoji: '📦' },
    { label: 'Apple TV+',      emoji: '🍎' }, { label: 'Claude AI',     emoji: '✨' },
    { label: 'Electricity',    emoji: '⚡' }, { label: 'Water',         emoji: '💧' },
    { label: 'Touch',          emoji: '📡' }, { label: 'Alfa',          emoji: '📡' },
    { label: 'Internet',       emoji: '🌐' }, { label: 'HBO Max',       emoji: '🎭' },
    { label: 'Midjourney',     emoji: '🎨' }, { label: 'Microsoft 365', emoji: '💼' },
    { label: 'Adobe CC',       emoji: '🎨' }, { label: 'GitHub',        emoji: '💻' },
    { label: 'Notion',         emoji: '📝' }, { label: 'iCloud',        emoji: '☁️' },
    { label: 'Xbox Game Pass', emoji: '🎮' }, { label: 'PlayStation',   emoji: '🎮' },
    { label: 'Crunchyroll',    emoji: '🎌' }, { label: 'Gym',           emoji: '🏋️' },
  ],
  Entertainment: [{ label: 'Cinema', emoji: '🎥' }, { label: 'Concert', emoji: '🎵' }, { label: 'Gaming', emoji: '🎮' }, { label: 'Bar', emoji: '🍻' }],
}
const CATEGORY_HINTS_LOCAL = {
  Food: ['mcdonald','kfc','pizza','burger','grocery','restaurant','food','lunch','dinner','breakfast'],
  Coffee: ['starbucks','coffee','cafe','tea','juice'],
  Transport: ['uber','taxi','careem','gas','petrol','metro','bus','parking','fuel'],
  Shopping: ['amazon','clothing','zara','mall','store','shop'],
  Subscriptions: ['netflix','spotify','disney','hbo','youtube','subscription','monthly'],
  Entertainment: ['cinema','movie','bar','club','concert','gaming'],
  Health: ['hospital','doctor','pharmacy','dentist','medicine'],
  Fitness: ['gym','yoga','workout','crossfit'],
  Education: ['tuition','school','university','course'],
  Bills: ['rent','electricity','water','internet','phone bill','utility'],
  Travel: ['flight','hotel','airbnb','trip','vacation'],
  Gifts: ['gift','charity','donation'],
}
function suggestCategoryLocal(desc) {
  if (!desc || desc.length < 3) return null
  const lower = desc.toLowerCase()
  for (const [cat, words] of Object.entries(CATEGORY_HINTS_LOCAL)) {
    if (words.some(w => lower.includes(w))) return cat
  }
  return null
}

function AddExpenseModal({ onClose, onSave, sym, dynamicCats }) {
  useHideNav()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: today, is_recurring: false, recurring_frequency: 'monthly', billing_cycle: 'monthly' })
  const [suggestion, setSuggestion] = useState(null)
  const [saving, setSaving] = useState(false)

  const cats = dynamicCats?.length
    ? dynamicCats.map(c => ({ key: c.name, icon: c.emoji }))
    : [
      { key: 'Food', icon: '🍔' }, { key: 'Coffee', icon: '☕' }, { key: 'Transport', icon: '🚗' },
      { key: 'Shopping', icon: '🛍️' }, { key: 'Entertainment', icon: '🎬' }, { key: 'Health', icon: '🏥' },
      { key: 'Fitness', icon: '🏋️' }, { key: 'Education', icon: '🎓' }, { key: 'Bills', icon: '💡' },
      { key: 'Travel', icon: '✈️' }, { key: 'Gifts', icon: '🎁' }, { key: 'Subscriptions', icon: '📱' }, { key: 'Other', icon: '📦' },
    ]
  const subs = SUBCATEGORIES[form.category] || []
  const handleDesc = (val) => {
    setForm(f => ({ ...f, description: val }))
    const c = suggestCategoryLocal(val)
    setSuggestion(c && c !== form.category ? c : null)
  }
  const handleSave = async () => {
    if (!form.amount || saving) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Expense</h3>
          <button onClick={onClose} className="text-gray-400 p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({sym})</label>
            <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              min="0.01" step="0.01" autoFocus
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description (optional)</label>
            <input type="text" placeholder="What was this for?" value={form.description} onChange={e => handleDesc(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            {suggestion && (
              <div className="mt-1.5 flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl px-3 py-2">
                <span className="text-xs text-violet-700 dark:text-violet-300">🤖 Looks like <strong>{suggestion}</strong>?</span>
                <button type="button" onClick={() => { setForm(f => ({ ...f, category: suggestion })); setSuggestion(null) }}
                  className="ml-auto text-xs bg-violet-600 text-white px-3 py-1 rounded-lg font-semibold">Use it</button>
                <button type="button" onClick={() => setSuggestion(null)} className="text-gray-400 text-xs">✕</button>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {cats.map(({ key, icon }) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, category: key }))}
                  className={`py-1.5 px-3 rounded-full text-xs font-semibold border-2 transition ${form.category === key ? 'border-violet-500 bg-violet-600 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700/50'}`}>
                  {icon} {key}
                </button>
              ))}
            </div>
          </div>
          {subs.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Quick-fill</label>
              <div
                className={`grid grid-cols-4 gap-2 ${form.category === 'Subscriptions' ? 'max-h-44 overflow-y-auto' : ''}`}
                style={form.category === 'Subscriptions' ? { scrollbarWidth: 'thin' } : {}}
              >
                {subs.map(s => (
                  <button key={s.label} type="button" onClick={() => setForm(f => ({ ...f, description: s.label }))}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition ${form.description === s.label ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'}`}>
                    <span className="text-xl">{s.emoji}</span>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 leading-tight text-center">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.category === 'Subscriptions' ? (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Billing Cycle</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ key: 'weekly', label: 'Weekly', icon: '📅' }, { key: 'monthly', label: 'Monthly', icon: '📆' }, { key: 'yearly', label: 'Yearly', icon: '🗓️' }].map(({ key, label, icon }) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, billing_cycle: key, recurring_frequency: key, is_recurring: true }))}
                    className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                      form.billing_cycle === key
                        ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700/50'
                    }`}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
            <textarea rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any extra details…"
              className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
          </div>
          {form.category !== 'Subscriptions' && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Recurring</span>
              </label>
              {form.is_recurring && (
                <select value={form.recurring_frequency} onChange={e => setForm(f => ({ ...f, recurring_frequency: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                </select>
              )}
            </>
          )}
        </div>
        {/* Sticky footer */}
        <div className="shrink-0 px-6 pt-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-3xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
          <button onClick={handleSave} disabled={!form.amount || saving}
            className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-violet-700 transition disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddIncomeModal({ onClose, onSave, sym }) {
  useHideNav()
  const [form, setForm] = useState({ amount: '', source: 'Salary', is_recurring: false, recurring_frequency: 'monthly' })
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!form.amount || saving) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Income</h3>
          <button onClick={onClose} className="text-gray-400 p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount ({sym})</label>
            <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              min="0.01" step="0.01" autoFocus
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Source</label>
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Salary</option><option>Freelance</option><option>Business</option><option>Investment</option><option>Other</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="w-4 h-4 accent-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring</span>
          </label>
          {form.is_recurring && (
            <select value={form.recurring_frequency} onChange={e => setForm(f => ({ ...f, recurring_frequency: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          )}
        </div>
        <div className="shrink-0 px-6 pt-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-3xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
          <button onClick={handleSave} disabled={!form.amount || saving}
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-700 transition disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Income'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddPickerModal({ onClose, onExpense, onIncome, onScan, onSplit }) {
  useHideNav()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-5" />
        <p className="text-base font-bold text-gray-800 dark:text-white text-center mb-5">What would you like to add?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onExpense}
            className="flex flex-col items-center gap-3 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-100 dark:border-rose-800 rounded-2xl py-6 hover:border-rose-300 active:scale-95 transition-all">
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 dark:text-white text-sm">Expense</p>
              <p className="text-xs text-gray-400 mt-0.5">Log a purchase</p>
            </div>
          </button>
          <button onClick={onIncome}
            className="flex flex-col items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 rounded-2xl py-6 hover:border-emerald-300 active:scale-95 transition-all">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 dark:text-white text-sm">Income</p>
              <p className="text-xs text-gray-400 mt-0.5">Log earnings</p>
            </div>
          </button>
          <button onClick={onScan}
            className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-100 dark:border-violet-800 rounded-2xl px-4 py-4 hover:border-violet-400 active:scale-95 transition-all">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-xl shrink-0">📩</div>
            <div className="text-left">
              <p className="font-bold text-gray-800 dark:text-white text-sm">Quick Scan</p>
              <p className="text-xs text-gray-400 mt-0.5">SMS or screenshot</p>
            </div>
          </button>
          <button onClick={onSplit}
            className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-2xl px-4 py-4 hover:border-blue-400 active:scale-95 transition-all">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-xl shrink-0">🤝</div>
            <div className="text-left">
              <p className="font-bold text-gray-800 dark:text-white text-sm">Split Bill</p>
              <p className="text-xs text-gray-400 mt-0.5">Divide with friends</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  Main page
// ──────────────────────────────────────────────────────────────
function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
        <p className="text-4xl font-bold text-violet-600 tabular-nums break-all leading-tight">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-bold hover:bg-violet-700 transition">Done</button>
      </div>
    </div>
  )
}

export default function Transactions() {
  const [expenses, setExpenses] = useState([])
  const [income, setIncome]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('all')   // all | expenses | income
  const [sym] = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const [toast, setToast]       = useState(null)
  const [editing, setEditing]   = useState(null)
  const [undoLabel, setUndoLabel] = useState(null)
  const undoRef = useRef(null)
  const undoTimerRef = useRef(null)
  const tabSwipeRef = useRef(null)
  const TABS = ['all', 'expenses', 'income']
  useEffect(() => () => clearTimeout(undoTimerRef.current), [])

  // ── Bulk selection ──
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showRecatSheet, setShowRecatSheet] = useState(false)

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setShowRecatSheet(false)
  }
  const toggleSelectMode = () => {
    if (selectMode) exitSelectMode()
    else setSelectMode(true)
  }
  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const [numModal, setNumModal] = useState(null)
  const [showRecurring, setShowRecurring] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showAddExp, setShowAddExp] = useState(false)
  const [showAddInc, setShowAddInc] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [recurringHint, setRecurringHint] = useState(null) // { merchant, expense_id }

  const { categories: dynCats, refresh: refreshCats, addCategory, removeCategory } = useCategories()

  // Filters
  const [search, setSearch]       = useState('')
  const [catFilter, setCat]       = useState('All')
  const [sortBy, setSort]         = useState('newest')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const longPressTimer = useRef(null)

  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])

  // Hide bottom nav when inline recategorize sheet is open
  useEffect(() => {
    if (showRecatSheet) document.body.classList.add('modal-open')
    else document.body.classList.remove('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [showRecatSheet])

  const [visibleCount, setVisibleCount] = useState(8)

  // Reset visible count when filters/tab change
  const filterKey = `${tab}|${catFilter}|${sortBy}|${dateFrom}|${dateTo}|${search}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setVisibleCount(8)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    Promise.all([API.get('/expenses'), API.get('/income')])
      .then(([e, i]) => {
        setExpenses(e.data || [])
        setIncome((i.data || []).map(inc => ({
          ...inc,
          date: inc.created_at || new Date(inc.year, (inc.month || 1) - 1, 1).toISOString()
        })))
      })
      .catch(() => showToast('Error loading data', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])


  const commitExpenseDelete = (id, backup) => {
    API.delete('/expenses/' + id).catch(() => {
      setExpenses(prev => [...prev, backup].sort((a, b) => new Date(b.date) - new Date(a.date)))
      showToast('Error deleting', 'error')
    })
  }

  const handleDeleteExpense = (id) => {
    // Flush any pending undo before starting a new delete
    if (undoRef.current) {
      clearTimeout(undoTimerRef.current)
      commitExpenseDelete(undoRef.current.id, undoRef.current.backup)
      undoRef.current = null
    }
    const backup = expenses.find(e => e.id === id)
    if (!backup) return
    haptic(20)
    setExpenses(prev => prev.filter(e => e.id !== id))
    setUndoLabel(backup.description || backup.category || 'Expense')
    undoRef.current = { id, backup }
    undoTimerRef.current = setTimeout(() => {
      if (!undoRef.current || undoRef.current.id !== id) return
      const b = undoRef.current.backup
      undoRef.current = null
      setUndoLabel(null)
      commitExpenseDelete(id, b)
    }, 4000)
  }

  const handleUndoExpense = () => {
    if (!undoRef.current) return
    clearTimeout(undoTimerRef.current)
    haptic(10)
    setExpenses(prev => [undoRef.current.backup, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)))
    undoRef.current = null
    setUndoLabel(null)
  }

  const handleDismissUndo = () => {
    if (!undoRef.current) return
    clearTimeout(undoTimerRef.current)
    commitExpenseDelete(undoRef.current.id, undoRef.current.backup)
    undoRef.current = null
    setUndoLabel(null)
  }

  const handleDeleteIncome = async (id) => {
    const backup = income.find(i => i.id === id)
    if (!backup) return
    haptic(20)
    setIncome(prev => prev.filter(i => i.id !== id))
    showToast('Income deleted')
    try { await API.delete('/income/' + id) } catch {
      setIncome(prev => [...prev, backup].sort((a, b) => new Date(b.date) - new Date(a.date)))
      showToast('Error deleting income', 'error')
    }
  }

  const handleEditSave = async (form) => {
    const id = editing.id
    const original = { ...editing }
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...form } : e))
    setEditing(null)
    try {
      await API.put('/expenses/' + id, form)
      showToast('Updated!')
    } catch {
      setExpenses(prev => prev.map(e => e.id === id ? original : e))
      showToast('Error updating', 'error')
    }
  }

  const handleAddExpense = async (form) => {
    try {
      const now = new Date()
      const { data } = await API.post('/expenses', {
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description || '',
        date: form.date || now.toISOString().split('T')[0],
        is_recurring: form.is_recurring || false,
        recurring_frequency: form.recurring_frequency || 'monthly',
        notes: form.notes || null,
      })
      if (data.suggestion?.type === 'recurring') {
        setRecurringHint({ merchant: data.suggestion.merchant, expense_id: data.suggestion.expense_id })
      }
      if (form.category === 'Subscriptions' && form.description) {
        const cycle = form.billing_cycle || 'monthly'
        const next = new Date()
        if (cycle === 'weekly') next.setDate(next.getDate() + 7)
        else if (cycle === 'yearly') next.setFullYear(next.getFullYear() + 1)
        else next.setMonth(next.getMonth() + 1)
        API.post('/subscriptions', {
          name: form.description,
          amount: parseFloat(form.amount),
          billing_cycle: cycle,
          next_billing_date: next.toISOString().split('T')[0],
          category: 'Subscriptions',
        }).catch(() => {})
      }
      const res = await API.get('/expenses')
      setExpenses(res.data || [])
      setShowAddExp(false)
      setShowPicker(false)
      showToast('Expense added!')
    } catch { showToast('Error adding expense', 'error') }
  }

  const markRecurring = async (expenseId) => {
    try {
      await API.put('/expenses/' + expenseId, { is_recurring: true })
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, is_recurring: true } : e))
      showToast('Marked as recurring!')
    } catch { showToast('Error updating', 'error') }
    setRecurringHint(null)
  }

  const handleScanAdded = async () => {
    const [e, i] = await Promise.all([API.get('/expenses'), API.get('/income')])
    setExpenses(e.data || [])
    setIncome((i.data || []).map(inc => ({
      ...inc,
      date: inc.created_at || new Date(inc.year, (inc.month || 1) - 1, 1).toISOString()
    })))
    showToast('Transaction added!')
  }

  const handleAddIncome = async (form) => {
    try {
      const now = new Date()
      await API.post('/income', {
        amount: parseFloat(form.amount),
        source: form.source || 'Other',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        is_recurring: form.is_recurring || false,
        recurring_frequency: form.recurring_frequency || 'monthly',
      })
      const res = await API.get('/income')
      setIncome((res.data || []).map(inc => ({
        ...inc,
        date: inc.created_at || new Date(inc.year, (inc.month || 1) - 1, 1).toISOString()
      })))
      setShowAddInc(false)
      setShowPicker(false)
      showToast('Income added!')
    } catch { showToast('Error adding income', 'error') }
  }

  // ── Bulk actions ──
  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    const ids = [...selected]
    const count = ids.length
    // flush undo if pending
    if (undoRef.current) {
      clearTimeout(undoTimerRef.current)
      commitExpenseDelete(undoRef.current.id, undoRef.current.backup)
      undoRef.current = null
      setUndoLabel(null)
    }
    setExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    exitSelectMode()
    try {
      await Promise.all(ids.map(id => API.delete('/expenses/' + id)))
      showToast(`${count} deleted`)
    } catch {
      const res = await API.get('/expenses')
      setExpenses(res.data || [])
      showToast('Error deleting some items', 'error')
    }
  }

  const handleBulkRecategorize = async (newCategory) => {
    if (selected.size === 0) return
    // only expense ids (income rows are not recategorizable via this action)
    const expenseIds = [...selected].filter(id => expenses.some(e => e.id === id))
    const count = expenseIds.length
    if (count === 0) return
    setExpenses(prev => prev.map(e => expenseIds.includes(e.id) ? { ...e, category: newCategory } : e))
    setShowRecatSheet(false)
    exitSelectMode()
    try {
      await Promise.all(expenseIds.map(id => API.put('/expenses/' + id, { category: newCategory })))
      showToast(`${count} updated`)
    } catch {
      const res = await API.get('/expenses')
      setExpenses(res.data || [])
      showToast('Error updating some items', 'error')
    }
  }

  // ── Derived data ──
  const applyFilters = (list, isIncome) => list
    .filter(tx => !search.trim() || [tx.description, tx.category, tx.source, String(tx.amount)].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
    .filter(tx => {
      const cat = isIncome ? (tx.source || 'Other') : (tx.category || 'Other')
      return catFilter === 'All' || cat === catFilter
    })
    .filter(tx => {
      const d = new Date(tx.date || tx.created_at)
      if (dateFrom && d < new Date(dateFrom)) return false
      if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
    .sort((a, b) => {
      const da = new Date(a.date || a.created_at), db = new Date(b.date || b.created_at)
      if (sortBy === 'newest')  return db - da
      if (sortBy === 'oldest')  return da - db
      if (sortBy === 'highest') return safeNum(b.amount) - safeNum(a.amount)
      if (sortBy === 'lowest')  return safeNum(a.amount) - safeNum(b.amount)
      return 0
    })

  const filteredExpenses = applyFilters(expenses, false)
  const filteredIncome   = applyFilters(income, true)

  const totalExpenses  = filteredExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const totalIncome    = filteredIncome.reduce((s, i) => s + safeNum(i.amount), 0)
  const net            = totalIncome - totalExpenses

  // Current-month stats (match Dashboard view)
  const _now = new Date()
  const _cm = _now.getMonth() + 1, _cy = _now.getFullYear()
  const monthExpenses = expenses.filter(e => {
    const s = String(e.date).split('T')[0]; const [y, m] = s.split('-').map(Number)
    return m === _cm && y === _cy
  })
  const monthIncome = income.filter(i => Number(i.month) === _cm && Number(i.year) === _cy)
  const monthSpent  = monthExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const monthEarned = monthIncome.reduce((s, i) => s + safeNum(i.amount), 0)
  const monthNet    = monthEarned - monthSpent

  // Recurring
  const recurringExpenses     = expenses.filter(e => e.is_recurring)
  const recurringIncome       = income.filter(i => i.is_recurring)
  const recurringExpenseTotal = recurringExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const recurringIncomeTotal  = recurringIncome.reduce((s, i) => s + safeNum(i.amount), 0)

  // Category breakdown for the active tab
  const expenseByCat = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + safeNum(e.amount); return acc
  }, {})
  const incomeBySrc = filteredIncome.reduce((acc, i) => {
    const src = i.source || 'Other'
    acc[src] = (acc[src] || 0) + safeNum(i.amount); return acc
  }, {})

  // Group by date
  const groupByDate = (list, isIncome) => list.reduce((acc, tx) => {
    const label = dayLabel(tx.date || tx.created_at)
    if (!acc[label]) acc[label] = []
    acc[label].push({ ...tx, _isIncome: isIncome })
    return acc
  }, {})

  const allMixed = [
    ...filteredExpenses.map(e => ({ ...e, _isIncome: false })),
    ...filteredIncome.map(i => ({ ...i, _isIncome: true, category: i.source || 'Income', date: i.date || i.created_at })),
  ].sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date)
    if (sortBy === 'newest')  return db - da
    if (sortBy === 'oldest')  return da - db
    if (sortBy === 'highest') return safeNum(b.amount) - safeNum(a.amount)
    if (sortBy === 'lowest')  return safeNum(a.amount) - safeNum(b.amount)
    return 0
  })
  const allMixedGrouped = allMixed.reduce((acc, tx) => {
    const label = dayLabel(tx.date)
    if (!acc[label]) acc[label] = []
    acc[label].push(tx)
    return acc
  }, {})

  const groupedExpenses = groupByDate(filteredExpenses, false)
  const groupedIncome   = groupByDate(filteredIncome, true)

const onTabSwipeStart = (e) => {
    tabSwipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTabSwipeEnd = (e) => {
    if (!tabSwipeRef.current) return
    const dx = tabSwipeRef.current.x - e.changedTouches[0].clientX
    const dy = tabSwipeRef.current.y - e.changedTouches[0].clientY
    tabSwipeRef.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const idx = TABS.indexOf(tab)
    if (dx > 0 && idx < TABS.length - 1) { setTab(TABS[idx + 1]); setCat('All'); haptic(8) }
    else if (dx < 0 && idx > 0) { setTab(TABS[idx - 1]); setCat('All'); haptic(8) }
  }

  const hasFilters = catFilter !== 'All' || sortBy !== 'newest' || dateFrom || dateTo || search

  // ── Render helpers ──
  const renderExpenseRow = (tx, idx, total) => {
    const isSelected = selected.has(tx.id)
    const rowContent = (
      <div
        key={tx.id}
        onClick={selectMode ? () => toggleItem(tx.id) : undefined}
        onTouchStart={!selectMode ? () => { longPressTimer.current = setTimeout(() => { haptic(30); setSelectMode(true); toggleItem(tx.id) }, 500) } : undefined}
        onTouchEnd={!selectMode ? () => clearTimeout(longPressTimer.current) : undefined}
        onTouchMove={!selectMode ? () => clearTimeout(longPressTimer.current) : undefined}
        className={`flex items-center gap-3 px-4 py-4 group transition select-none
          ${selectMode ? 'cursor-pointer' : ''}
          ${isSelected
            ? 'bg-violet-50 dark:bg-violet-900/20'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40'}
          ${idx < total - 1 ? 'border-b border-gray-100 dark:border-gray-700/40' : ''}`}
      >
        {/* Checkbox OR colour bar */}
        {selectMode ? (
          <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition
            ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-gray-500'}`}>
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 6 5 9 10 3"/>
              </svg>
            )}
          </div>
        ) : (
          <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: CAT_COLORS[tx.category] || '#6B7280' }} />
        )}
        {/* Left violet border when selected */}
        {selectMode && isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r" />
        )}
        {/* Icon */}
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
          style={{ background: (CAT_COLORS[tx.category] || '#6B7280') + '22' }}>
          {CAT_ICONS[tx.category] || '📦'}
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-white truncate leading-tight">
            {tx.description || tx.category}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{tx.category}</span>
            {tx.payment_method && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${METHOD_COLORS[tx.payment_method] || 'bg-gray-100 text-gray-500'}`}>
                {METHOD_ICONS[tx.payment_method]} {tx.payment_method}
              </span>
            )}
            {tx.is_recurring && <span className="text-[11px] text-purple-500 font-semibold">↻ Recurring</span>}
            <span className="text-[11px] text-gray-400">{fmtDate(tx.date)}</span>
          </div>
        </div>
        {/* Amount + actions */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-black text-sm tabular-nums text-red-500 dark:text-red-400 leading-tight">
            -{sym}{safeNum(tx.amount).toFixed(2)}
          </span>
          {!selectMode && (
            <div className="hidden group-hover:flex items-center gap-1 mt-0.5">
              <button onClick={() => setEditing(tx)} className="text-violet-400 hover:text-violet-600 p-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={() => handleDeleteExpense(tx.id)} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    )
    if (selectMode) {
      return <div key={tx.id} className="relative">{rowContent}</div>
    }
    return (
      <SwipeRow key={tx.id} onDelete={() => handleDeleteExpense(tx.id)}>
        {rowContent}
      </SwipeRow>
    )
  }

  const renderIncomeRow = (tx, idx, total) => {
    const isSelected = selected.has(tx.id)
    const rowContent = (
      <div
        key={tx.id}
        onClick={selectMode ? () => toggleItem(tx.id) : undefined}
        onTouchStart={!selectMode ? () => { longPressTimer.current = setTimeout(() => { haptic(30); setSelectMode(true); toggleItem(tx.id) }, 500) } : undefined}
        onTouchEnd={!selectMode ? () => clearTimeout(longPressTimer.current) : undefined}
        onTouchMove={!selectMode ? () => clearTimeout(longPressTimer.current) : undefined}
        className={`relative flex items-center gap-3 px-4 py-4 transition select-none
          ${selectMode ? 'cursor-pointer' : ''}
          ${isSelected
            ? 'bg-violet-50 dark:bg-violet-900/20'
            : 'bg-white dark:bg-gray-800'}
          ${idx < total - 1 ? 'border-b border-gray-100 dark:border-gray-700/40' : ''}`}
      >
        {selectMode && isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r" />
        )}
        {selectMode ? (
          <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition
            ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-gray-500'}`}>
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 6 5 9 10 3"/>
              </svg>
            )}
          </div>
        ) : (
          <div className="w-1 self-stretch rounded-full shrink-0 bg-emerald-400" />
        )}
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
          {CAT_ICONS[tx.source] || '💰'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-white truncate leading-tight">
            {tx.description || tx.source || 'Income'}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">{tx.source || 'Income'}</span>
            {tx.is_recurring && <span className="text-[11px] text-purple-500 font-semibold">↻ Recurring</span>}
            <span className="text-[11px] text-gray-400">{fmtDate(tx.date || tx.created_at)}</span>
          </div>
        </div>
        <span className="font-black text-sm tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
          +{sym}{safeNum(tx.amount).toFixed(2)}
        </span>
      </div>
    )
    if (selectMode) {
      return <div key={tx.id} className="relative">{rowContent}</div>
    }
    return (
      <SwipeRow key={tx.id} onDelete={() => handleDeleteIncome(tx.id)}>
        {rowContent}
      </SwipeRow>
    )
  }

  const filterBar = (isIncome) => {
    const showPills = catFilter !== 'All'
    const anyFilter = hasFilters
    return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4">
      {/* Compact toolbar row */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* Search — always visible */}
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full pl-8 pr-7 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white transition" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Filter button */}
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shrink-0
            ${showFilters || anyFilter ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-violet-400'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          {anyFilter ? 'Filtered •' : 'Filters'}
        </button>
      </div>

      {/* Category quick pills */}
      {showPills && (
        <div className="flex gap-1.5 flex-wrap px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700 pt-3">
          <button onClick={() => setCat('All')} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${catFilter === 'All' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>All</button>
          {(isIncome ? INCOME_SOURCES : EXPENSE_CATS).map(c => (
            <button key={c} onClick={() => setCat(c === catFilter ? 'All' : c)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${catFilter === c ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'}`}>
              {CAT_ICONS[c]} {c}
            </button>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700 pt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Sort by</label>
            <select value={sortBy} onChange={e => setSort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">From date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">To date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {anyFilter && (
            <div className="col-span-2">
              <button onClick={() => { setCat('All'); setSort('newest'); setDateFrom(''); setDateTo(''); setSearch(''); setShowSearch(false) }}
                className="text-xs text-red-500 font-semibold hover:underline">Clear all filters</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
  }

  const renderGrouped = (grouped, isIncome, options = {}) => {
    const { rowRenderer, showTotal = true } = options
    const allTxs = Object.values(grouped).flat()
    const totalCount = allTxs.length
    const visibleTxs = allTxs.slice(0, visibleCount)
    const hasMore = totalCount > visibleCount
    const renderRow = rowRenderer || ((tx, idx, total) =>
      isIncome ? renderIncomeRow(tx, idx, total) : renderExpenseRow(tx, idx, total))
    const reGrouped = {}
    visibleTxs.forEach(tx => {
      const label = dayLabel(tx.date)
      if (!reGrouped[label]) reGrouped[label] = []
      reGrouped[label].push(tx)
    })
    return (
      <div className="space-y-4">
        {Object.entries(reGrouped).map(([label, txs]) => (
          <div key={label}>
            <div className="flex items-center gap-3 mb-2 px-1">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</p>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              {showTotal && (
                <p className="text-xs font-semibold tabular-nums whitespace-nowrap">
                  {isIncome
                    ? <span className="text-green-600">+{sym}{txs.reduce((s,t) => s + safeNum(t.amount), 0).toFixed(2)}</span>
                    : <span className="text-red-500">-{sym}{txs.reduce((s,t) => s + safeNum(t.amount), 0).toFixed(2)}</span>
                  }
                </p>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              {txs.map((tx, idx) => renderRow(tx, idx, txs.length))}
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setVisibleCount(p => p + 8)}
              className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-violet-600 dark:text-violet-400 text-sm font-semibold rounded-2xl shadow-sm hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-95 transition">
              Load more
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout>
      {toast     && <Toast {...toast} onClose={() => setToast(null)} />}
      {undoLabel && <UndoToast label={undoLabel} onUndo={handleUndoExpense} onDismiss={handleDismissUndo} />}
      {editing   && <EditSheet expense={editing} sym={sym} onSave={handleEditSave} onClose={() => setEditing(null)} />}
      {showPicker && <AddPickerModal onClose={() => setShowPicker(false)} onExpense={() => { setShowPicker(false); setShowAddExp(true) }} onIncome={() => { setShowPicker(false); setShowAddInc(true) }} onScan={() => { setShowPicker(false); setShowScan(true) }} onSplit={() => { setShowPicker(false); setShowSplit(true) }} />}
      {showAddExp && <AddExpenseModal onClose={() => setShowAddExp(false)} onSave={handleAddExpense} sym={sym} dynamicCats={dynCats} />}
      {showAddInc && <AddIncomeModal onClose={() => setShowAddInc(false)} onSave={handleAddIncome} sym={sym} />}
      {showScan && <QuickScanModal onClose={() => setShowScan(false)} onAdded={handleScanAdded} />}
      {showSplit && <SplitBillModal onClose={() => setShowSplit(false)} onSaved={() => { const r = API.get('/expenses'); r.then(e => setExpenses(e.data || [])); showToast('Split bill logged!') }} />}
      {showCatManager && <CategoryManagerModal categories={dynCats} onAdd={addCategory} onDelete={removeCategory} onClose={() => { setShowCatManager(false); refreshCats() }} />}

      {/* Recurring hint banner */}
      {recurringHint && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50">
          <div className="bg-violet-600 text-white rounded-2xl shadow-2xl px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🔁</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Recurring pattern detected</p>
                <p className="text-white/70 text-xs mt-0.5 truncate">"{recurringHint.merchant}" appears regularly</p>
              </div>
              <button onClick={() => setRecurringHint(null)} className="text-white/60 hover:text-white text-xl leading-none shrink-0">×</button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => markRecurring(recurringHint.expense_id)} className="flex-1 bg-white text-violet-600 font-bold text-sm py-2 rounded-xl hover:bg-violet-50 transition">
                Mark Recurring
              </button>
              <button onClick={() => setRecurringHint(null)} className="flex-1 bg-white/20 text-white font-semibold text-sm py-2 rounded-xl hover:bg-white/30 transition">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 page-enter">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-400 text-sm mt-0.5">{expenses.length + income.length} total entries</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCatManager(true)}
              title="Add or remove custom spending categories"
              className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-violet-100 dark:hover:bg-violet-800/30 hover:border-violet-400 active:scale-95 transition shadow-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              Categories
            </button>
<button onClick={toggleSelectMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shadow-sm
                ${selectMode
                  ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-violet-300 hover:text-violet-600'}`}>
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          </div>
        </div>

        {/* Overview */}
        {numModal && <NumberModal {...numModal} onClose={() => setNumModal(null)} />}
        <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 rounded-2xl px-5 py-4 mb-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white" />
          </div>
          <div className="relative mb-3">
            <p className="text-violet-200 text-xs font-medium">{_now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            <p className={`text-3xl font-bold tabular-nums mt-0.5 ${monthNet < 0 ? 'text-red-200' : 'text-white'}`}>
              {monthNet >= 0 ? '+' : '-'}{fmtMoney(Math.abs(monthNet), sym)}
            </p>
            <p className="text-violet-300 text-xs mt-0.5">{monthNet >= 0 ? 'surplus this month' : 'over income this month'}</p>
          </div>
          <div className="relative grid grid-cols-3 gap-2">
            <button onClick={() => setNumModal({ label: 'Income this month', value: '+' + fmtMoney(monthEarned, sym), sub: monthIncome.length + ' entries' })}
              className="bg-white/15 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-green-300 text-[10px] mb-0.5">Income</p>
              <p className="text-white font-bold text-sm tabular-nums truncate">+{fmtMoney(monthEarned, sym)}</p>
              <p className="text-white/50 text-[10px]">{monthIncome.length} entr{monthIncome.length !== 1 ? 'ies' : 'y'}</p>
            </button>
            <button onClick={() => setNumModal({ label: 'Spent this month', value: '-' + fmtMoney(monthSpent, sym), sub: monthExpenses.length + ' expenses' })}
              className="bg-white/15 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-red-300 text-[10px] mb-0.5">Spent</p>
              <p className="text-white font-bold text-sm tabular-nums truncate">-{fmtMoney(monthSpent, sym)}</p>
              <p className="text-white/50 text-[10px]">{monthExpenses.length} expense{monthExpenses.length !== 1 ? 's' : ''}</p>
            </button>
            <button onClick={() => setNumModal({ label: 'All entries', value: String(expenses.length + income.length), sub: 'across all time' })}
              className="bg-white/15 rounded-xl px-3 py-2.5 text-left active:scale-95 transition-transform">
              <p className="text-violet-200 text-[10px] mb-0.5">All time</p>
              <p className="text-white font-bold text-sm tabular-nums">{expenses.length + income.length}</p>
              <p className="text-white/50 text-[10px]">entries</p>
            </button>
          </div>
        </div>

        {/* Recurring Commitments — collapsed by default */}
        {(recurringExpenses.length > 0 || recurringIncome.length > 0) && (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl mb-5 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowRecurring(v => !v)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors">
              <span className="text-sky-500 text-base shrink-0">↻</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 dark:text-white font-bold text-sm">Recurring Commitments</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {recurringExpenses.length + recurringIncome.length} item{recurringExpenses.length + recurringIncome.length !== 1 ? 's' : ''}
                  <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-red-400">-{fmtMoney(recurringExpenseTotal, sym)}</span>
                  <span className="mx-1 text-gray-300 dark:text-gray-600">/</span>
                  <span className="text-green-500">+{fmtMoney(recurringIncomeTotal, sym)}</span>
                  <span className="ml-1 text-gray-400">mo</span>
                </p>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`text-gray-400 shrink-0 transition-transform duration-200 ${showRecurring ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showRecurring && (
              <div className="px-5 pb-4 space-y-0 border-t border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                    <p className="text-red-400 text-[10px] mb-0.5">Monthly Out</p>
                    <p className="text-red-600 dark:text-red-400 font-bold text-sm tabular-nums">-{fmtMoney(recurringExpenseTotal, sym)}</p>
                    <p className="text-gray-400 text-[10px]">{recurringExpenses.length} expense{recurringExpenses.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2.5">
                    <p className="text-green-500 text-[10px] mb-0.5">Monthly In</p>
                    <p className="text-green-600 dark:text-green-400 font-bold text-sm tabular-nums">+{fmtMoney(recurringIncomeTotal, sym)}</p>
                    <p className="text-gray-400 text-[10px]">{recurringIncome.length} income{recurringIncome.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {recurringExpenses.map(e => (
                    <div key={e.id} className="flex items-center gap-2.5">
                      <span className="text-base w-6 text-center shrink-0">{CAT_ICONS[e.category] || '📦'}</span>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{e.description || e.category}</span>
                      <span className="text-xs font-semibold text-red-500 tabular-nums shrink-0">-{sym}{safeNum(e.amount).toFixed(2)}/{(e.recurring_frequency || 'mo').replace('monthly','mo').replace('weekly','wk').replace('daily','day')}</span>
                    </div>
                  ))}
                  {recurringIncome.map(i => (
                    <div key={i.id} className="flex items-center gap-2.5">
                      <span className="text-base w-6 text-center shrink-0">💵</span>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{i.description || i.source || 'Income'}</span>
                      <span className="text-xs font-semibold text-green-500 tabular-nums shrink-0">+{sym}{safeNum(i.amount).toFixed(2)}/{(i.recurring_frequency || 'mo').replace('monthly','mo').replace('weekly','wk').replace('daily','day')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-5"
          onTouchStart={onTabSwipeStart} onTouchEnd={onTabSwipeEnd}>
          {[
            { key: 'all',      label: `📋 All`,       count: filteredExpenses.length + filteredIncome.length },
            { key: 'expenses', label: `💸 Expenses`, count: filteredExpenses.length },
            { key: 'income',   label: `💵 Income`,   count: filteredIncome.length },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setCat('All') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                tab === t.key ? 'bg-white dark:bg-gray-700 text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <span>{t.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Expenses tab */}
        {tab === 'expenses' && (
          <>
            {/* Quick Scan banner */}
            <button onClick={() => setShowScan(true)}
              className="w-full flex items-center gap-4 bg-linear-to-r from-violet-600 to-indigo-600 rounded-2xl px-5 py-4 mb-4 shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-transform text-left">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl shrink-0">📷</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Quick Scan</p>
                <p className="text-white/70 text-xs mt-0.5">Camera · Gallery · Paste SMS — AI adds it for you</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="opacity-70 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            {filterBar(false)}

            {/* Category breakdown */}
            {filteredExpenses.length > 0 && Object.keys(expenseByCat).length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Breakdown by category</p>
                <div className="space-y-2">
                  {Object.entries(expenseByCat).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => {
                    const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-lg shrink-0">{CAT_ICONS[cat] || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{cat}</span>
                            <span className="text-gray-400 tabular-nums">{sym}{amt.toFixed(2)} · {pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1,2].map(g => (
                  <div key={g}>
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-16 mb-2 mx-1" />
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                      {[1,2,3].map((r,i) => (
                        <div key={r} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
                          <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-700 animate-pulse shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse mb-2" style={{ width: `${50+r*15}%` }} />
                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${30+r*10}%` }} />
                          </div>
                          <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">💸</p>
                <p className="font-semibold text-gray-700 dark:text-white mb-1">No expenses found</p>
                <p className="text-gray-400 text-sm">{hasFilters ? 'Try adjusting your filters.' : 'Add expenses from the Dashboard.'}</p>
              </div>
            ) : renderGrouped(groupedExpenses, false)}
          </>
        )}

        {/* Income tab */}
        {tab === 'income' && (
          <>
            {/* Quick Scan banner */}
            <button onClick={() => setShowScan(true)}
              className="w-full flex items-center gap-4 bg-linear-to-r from-emerald-500 to-teal-600 rounded-2xl px-5 py-4 mb-4 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform text-left">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl shrink-0">📷</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Quick Scan</p>
                <p className="text-white/70 text-xs mt-0.5">Snap salary slip or bank credit SMS — auto-detected</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="opacity-70 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            {filterBar(true)}

            {/* Source breakdown */}
            {filteredIncome.length > 0 && Object.keys(incomeBySrc).length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Breakdown by source</p>
                <div className="space-y-2">
                  {Object.entries(incomeBySrc).sort((a,b) => b[1]-a[1]).map(([src, amt]) => {
                    const pct = totalIncome > 0 ? (amt / totalIncome) * 100 : 0
                    return (
                      <div key={src} className="flex items-center gap-3">
                        <span className="text-lg shrink-0">{CAT_ICONS[src] || '💵'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{src}</span>
                            <span className="text-gray-400 tabular-nums">{sym}{amt.toFixed(2)} · {pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1,2].map(g => (
                  <div key={g}>
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-16 mb-2 mx-1" />
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                      {[1,2,3].map((r,i) => (
                        <div key={r} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
                          <div className="w-11 h-11 rounded-2xl bg-green-100/60 dark:bg-gray-700 animate-pulse shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse mb-2" style={{ width: `${50+r*15}%` }} />
                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${30+r*10}%` }} />
                          </div>
                          <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredIncome.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">💵</p>
                <p className="font-semibold text-gray-700 dark:text-white mb-1">No income entries found</p>
                <p className="text-gray-400 text-sm">{hasFilters ? 'Try adjusting your filters.' : 'Add income from the Dashboard.'}</p>
              </div>
            ) : renderGrouped(groupedIncome, true)}
          </>
        )}

        {/* All tab */}
        {tab === 'all' && (
          <>
            {filterBar(false)}
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(g => (
                  <div key={g}>
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse w-16 mb-2 mx-1" />
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                      {[1,2].map((r,i) => (
                        <div key={r} className={`flex items-center gap-3 px-4 py-3.5 ${i < 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
                          <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-700 animate-pulse shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse mb-2" style={{ width: `${50+r*20}%` }} />
                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${30+r*12}%` }} />
                          </div>
                          <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : allMixed.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-semibold text-gray-700 dark:text-white mb-1">No transactions found</p>
                <p className="text-gray-400 text-sm">{hasFilters ? 'Try adjusting your filters.' : 'Add transactions from the Dashboard.'}</p>
              </div>
            ) : renderGrouped(allMixedGrouped, false, {
              rowRenderer: (tx, idx, total) => tx._isIncome ? renderIncomeRow(tx, idx, total) : renderExpenseRow(tx, idx, total),
              showTotal: false,
            })}
          </>
        )}
      </div>

      {/* FAB — hidden in select mode */}
      {!selectMode && !showAddExp && !showAddInc && !showPicker && !editing && !showScan && (
        <button onClick={() => setShowPicker(true)}
          className="fixed bottom-28 right-5 md:bottom-8 md:right-8 z-40 w-14 h-14 bg-violet-600 hover:bg-violet-700 active:scale-90 rounded-2xl shadow-lg shadow-violet-600/30 flex items-center justify-center transition-all"
          aria-label="Add transaction">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-40 flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl shadow-2xl px-4 py-3">
          {/* Left: count + select all */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-bold whitespace-nowrap">{selected.size} selected</span>
            <button
              onClick={() => {
                const visibleIds = [
                  ...(tab === 'income' ? [] : filteredExpenses.map(e => e.id)),
                  ...(tab === 'expenses' ? [] : filteredIncome.map(i => i.id)),
                ]
                const allVisible = new Set(visibleIds)
                const allSelected = visibleIds.every(id => selected.has(id))
                setSelected(allSelected ? new Set() : allVisible)
              }}
              className="text-violet-400 hover:text-violet-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/10 transition whitespace-nowrap">
              {(() => {
                const visibleIds = [
                  ...(tab === 'income' ? [] : filteredExpenses.map(e => e.id)),
                  ...(tab === 'expenses' ? [] : filteredIncome.map(i => i.id)),
                ]
                return visibleIds.every(id => selected.has(id)) ? 'Deselect All' : 'Select All'
              })()}
            </button>
          </div>
          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Re-categorize — only when at least one expense is selected */}
            {[...selected].some(id => expenses.some(e => e.id === id)) && (
              <button
                onClick={() => setShowRecatSheet(true)}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
                🏷️ Re-cat
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {/* Re-categorize sheet */}
      {showRecatSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowRecatSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <p className="text-base font-bold text-gray-800 dark:text-white mb-4">Choose new category</p>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATS.map(cat => (
                <button key={cat} onClick={() => handleBulkRecategorize(cat)}
                  className="py-1.5 px-3 rounded-full text-xs font-semibold border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:border-violet-500 hover:bg-violet-600 hover:text-white transition">
                  {CAT_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
