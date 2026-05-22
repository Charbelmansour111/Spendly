import Layout from '../components/Layout'
import VoiceAssistant from '../components/VoiceAssistant'
import { useEffect, useState, useCallback, useRef } from 'react'
import API from '../utils/api'
import ReceiptScanner from '../components/ReceiptScanner'
import { DashboardSkeleton } from '../components/Skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Onboarding from '../components/Onboarding'
import OnboardingQuestions from '../components/OnboardingQuestions'
import MonthlyWrap from '../components/MonthlyWrap'
import DailyInsightBoard from '../components/DailyInsightBoard'
import { useHideNav } from '../hooks/useHideNav'
import { requestNotificationPermission, isNotificationsEnabled } from '../utils/notifications'
import useCategories from '../hooks/useCategories'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', LBP: 'L\u00a3', AED: 'AED', SAR: 'SAR', CAD: 'C$', AUD: 'A$' }
const CATEGORY_ICONS  = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Subscriptions: '📱', Entertainment: '🎬', Other: '📦' }
const CATEGORY_COLORS = { Food: '#F97316', Transport: '#3B82F6', Shopping: '#EC4899', Subscriptions: '#8B5CF6', Entertainment: '#10B981', Other: '#6B7280' }
const CAT_PALETTE = ['#9333EA','#2563EB','#059669','#D97706','#DC2626','#DB2777','#0891B2','#EA580C','#4F46E5','#0D9488','#65A30D','#7C3AED','#4B5563']

function getWalletKey() {
  try {
    const session = JSON.parse(localStorage.getItem('spendly_wallet_remember') || '{}')
    const wid = session?.wallet?.id
    if (wid) return String(wid)
    return JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'
  } catch { return 'guest' }
}

function safeNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

function fmt(amount, symbol) {
  return symbol + Math.abs(safeNum(amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}

// ── Sub-components ───────────────────────────────────────
function NumberModal({ label, value, sub, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 text-center w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-bold text-violet-600 tabular-nums break-all">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-2">{sub}</p>}
        <button onClick={onClose} className="mt-6 w-full bg-violet-600 text-white py-3 rounded-2xl font-semibold">Done</button>
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-orange-500' : 'bg-green-500'
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${bg}`}>
      <span className="flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="shrink-0 font-bold opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel, confirmText = 'Delete' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <p className="text-4xl mb-3">🗑️</p>
        <p className="font-semibold text-gray-800 dark:text-white mb-1">{message}</p>
        <p className="text-gray-400 text-sm mb-5">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white py-3 rounded-xl font-semibold">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

const BRAND_LOGOS = {
  "Netflix":        "https://logo.clearbit.com/netflix.com",
  "Spotify":        "https://logo.clearbit.com/spotify.com",
  "Disney+":        "https://logo.clearbit.com/disneyplus.com",
  "HBO Max":        "https://logo.clearbit.com/hbo.com",
  "Amazon Prime":   "https://logo.clearbit.com/amazon.com",
  "Apple TV+":      "https://logo.clearbit.com/apple.com",
  "YouTube":        "https://logo.clearbit.com/youtube.com",
  "Crunchyroll":    "https://logo.clearbit.com/crunchyroll.com",
  "ChatGPT":        "https://logo.clearbit.com/openai.com",
  "Gemini":         "https://logo.clearbit.com/google.com",
  "Perplexity":     "https://logo.clearbit.com/perplexity.ai",
  "Midjourney":     "https://logo.clearbit.com/midjourney.com",
  "Microsoft 365":  "https://logo.clearbit.com/microsoft.com",
  "Adobe CC":       "https://logo.clearbit.com/adobe.com",
  "GitHub":         "https://logo.clearbit.com/github.com",
  "Notion":         "https://logo.clearbit.com/notion.so",
  "iCloud":         "https://logo.clearbit.com/apple.com",
  "Xbox Game Pass": "https://logo.clearbit.com/xbox.com",
  "PlayStation":    "https://logo.clearbit.com/playstation.com",
  "McDonald's":     "https://logo.clearbit.com/mcdonalds.com",
  "KFC":            "https://logo.clearbit.com/kfc.com",
  "Starbucks":      "https://logo.clearbit.com/starbucks.com",
  "Pizza Hut":      "https://logo.clearbit.com/pizzahut.com",
  "Burger King":    "https://logo.clearbit.com/burgerking.com",
  "Uber":           "https://logo.clearbit.com/uber.com",
  "Shell":          "https://logo.clearbit.com/shell.com",
  "Amazon":         "https://logo.clearbit.com/amazon.com",
  "IKEA":           "https://logo.clearbit.com/ikea.com",
}

const SUBCATEGORIES = {
  Food: [
    { label: "McDonald's", emoji: '🍔' }, { label: 'KFC', emoji: '🍗' },
    { label: 'Pizza Hut', emoji: '🍕' }, { label: 'Burger King', emoji: '🍔' },
    { label: 'Groceries', emoji: '🛒' }, { label: 'Restaurant', emoji: '🍽️' },
    { label: 'Delivery', emoji: '🛵' }, { label: 'Shawarma', emoji: '🌯' },
  ],
  Coffee: [
    { label: 'Starbucks', emoji: '☕' }, { label: 'Costa Coffee', emoji: '☕' },
    { label: 'Dunkin', emoji: '🍩' }, { label: 'Tim Hortons', emoji: '☕' },
    { label: 'Cafe Lattè', emoji: '☕' }, { label: 'Espresso', emoji: '☕' },
    { label: 'Tea', emoji: '🍵' }, { label: 'Juice Bar', emoji: '🧃' },
  ],
  Transport: [
    { label: 'Uber', emoji: '🚗' }, { label: 'Taxi', emoji: '🚕' },
    { label: 'Shell', emoji: '⛽' }, { label: 'Metro', emoji: '🚇' },
    { label: 'Bus', emoji: '🚌' }, { label: 'Parking', emoji: '🅿️' },
    { label: 'Careem', emoji: '🚗' }, { label: 'Bike Rental', emoji: '🚲' },
  ],
  Shopping: [
    { label: 'Amazon', emoji: '📦' }, { label: 'Clothing', emoji: '👕' },
    { label: 'Electronics', emoji: '💻' }, { label: 'Beauty', emoji: '💄' },
    { label: 'IKEA', emoji: '🛋️' }, { label: 'Books', emoji: '📚' },
    { label: 'Shoes', emoji: '👟' }, { label: 'Accessories', emoji: '👜' },
  ],
  Entertainment: [
    { label: 'Cinema', emoji: '🎥' }, { label: 'Gaming', emoji: '🎮' },
    { label: 'Bar', emoji: '🍺' }, { label: 'Concert', emoji: '🎤' },
    { label: 'Club', emoji: '🎉' }, { label: 'Arcade', emoji: '🕹️' },
    { label: 'Live Show', emoji: '🎭' }, { label: 'Bowling', emoji: '🎳' },
  ],
  Health: [
    { label: 'Doctor', emoji: '🩺' }, { label: 'Hospital', emoji: '🏥' },
    { label: 'Pharmacy', emoji: '💊' }, { label: 'Dentist', emoji: '🦷' },
    { label: 'Lab Tests', emoji: '🧪' }, { label: 'Eye Care', emoji: '👁️' },
    { label: 'Therapy', emoji: '🧠' }, { label: 'Insurance', emoji: '🛡️' },
  ],
  Fitness: [
    { label: 'Gym', emoji: '🏋️' }, { label: 'Yoga', emoji: '🧘' },
    { label: 'Swimming', emoji: '🏊' }, { label: 'Running Gear', emoji: '👟' },
    { label: 'Supplements', emoji: '💪' }, { label: 'Sports Club', emoji: '⚽' },
    { label: 'Cycling', emoji: '🚴' }, { label: 'Personal Trainer', emoji: '🏅' },
  ],
  Education: [
    { label: 'Tuition', emoji: '🎓' }, { label: 'Online Course', emoji: '💻' },
    { label: 'Books', emoji: '📚' }, { label: 'School Supplies', emoji: '✏️' },
    { label: 'Language Class', emoji: '🗣️' }, { label: 'Certification', emoji: '📜' },
    { label: 'Workshop', emoji: '🛠️' }, { label: 'Tutoring', emoji: '📖' },
  ],
  Bills: [
    { label: 'Rent', emoji: '🏠' }, { label: 'Electricity', emoji: '💡' },
    { label: 'Water', emoji: '💧' }, { label: 'Internet', emoji: '📶' },
    { label: 'Phone', emoji: '📱' }, { label: 'Gas', emoji: '🔥' },
    { label: 'Cable TV', emoji: '📺' }, { label: 'Loan Payment', emoji: '🏦' },
  ],
  Travel: [
    { label: 'Flight', emoji: '✈️' }, { label: 'Hotel', emoji: '🏨' },
    { label: 'Airbnb', emoji: '🏡' }, { label: 'Car Rental', emoji: '🚗' },
    { label: 'Travel Insurance', emoji: '🛡️' }, { label: 'Tour', emoji: '🗺️' },
    { label: 'Visa', emoji: '📋' }, { label: 'Baggage', emoji: '🧳' },
  ],
  Gifts: [
    { label: 'Birthday Gift', emoji: '🎂' }, { label: 'Wedding Gift', emoji: '💍' },
    { label: 'Flowers', emoji: '💐' }, { label: 'Charity', emoji: '❤️' },
    { label: 'Donation', emoji: '🤲' }, { label: 'Baby Shower', emoji: '👶' },
    { label: 'Anniversary', emoji: '🥂' }, { label: 'Holiday Gift', emoji: '🎁' },
  ],
  Subscriptions: [
    { label: 'Netflix',       emoji: '🎬' }, { label: 'Spotify',        emoji: '🎵' },
    { label: 'ChatGPT',       emoji: '🤖' }, { label: 'YouTube',        emoji: '▶️' },
    { label: 'Disney+',       emoji: '🏰' }, { label: 'Amazon Prime',   emoji: '📦' },
    { label: 'Apple TV+',     emoji: '🍎' }, { label: 'Gemini',         emoji: '🌟' },
    { label: 'Electricity',   emoji: '⚡' }, { label: 'Water',          emoji: '💧' },
    { label: 'Touch',         emoji: '📡' }, { label: 'Alfa',           emoji: '📡' },
    { label: 'Internet',      emoji: '🌐' }, { label: 'HBO Max',        emoji: '🎭' },
    { label: 'Midjourney',    emoji: '🎨' }, { label: 'Microsoft 365',  emoji: '💼' },
    { label: 'Adobe CC',      emoji: '🎨' }, { label: 'GitHub',         emoji: '💻' },
    { label: 'Notion',        emoji: '📝' }, { label: 'iCloud',         emoji: '☁️' },
    { label: 'Perplexity',    emoji: '🔍' }, { label: 'PlayStation',    emoji: '🎮' },
    { label: 'Crunchyroll',   emoji: '🎌' }, { label: 'Gym',            emoji: '🏋️' },
  ],
  Other: [
    { label: 'Personal Care', emoji: '💆' }, { label: 'Haircut', emoji: '💈' },
    { label: 'Laundry', emoji: '👔' }, { label: 'Pet Care', emoji: '🐾' },
    { label: 'Home Repair', emoji: '🔧' }, { label: 'Parking Fine', emoji: '🚨' },
    { label: 'Tax', emoji: '📋' }, { label: 'Miscellaneous', emoji: '📦' },
  ],
}

const CATEGORY_HINTS = {
  Food:          ['mcdonald','kfc','pizza','burger','grocery','restaurant','food','lunch','dinner','breakfast','sushi','taco','domino','subway','delivery','eat','shawarma','groceries'],
  Coffee:        ['starbucks','coffee','cafe','espresso','latte','cappuccino','dunkin','costa','tea','juice','smoothie','drink','beverage'],
  Transport:     ['uber','taxi','lyft','careem','gas','shell','petrol','metro','bus','parking','airline','fuel','train','toll','bolt','transit','carpool'],
  Shopping:      ['amazon','clothing','h&m','zara','ikea','book','sport','samsung','laptop','phone','mall','store','shop','clothes','fashion','shoes'],
  Subscriptions: ['netflix','spotify','disney','hbo','youtube','apple tv','crunchyroll','prime video','subscription','plan','monthly fee','streaming'],
  Entertainment: ['cinema','movie','bar','club','concert','gaming','game','arcade','bowling','show','theatre','party','nightclub','festival'],
  Health:        ['hospital','doctor','pharmacy','dentist','clinic','medicine','lab','xray','therapy','prescription','medical','health','eye'],
  Fitness:       ['gym','yoga','crossfit','swimming','supplement','protein','trainer','fitness','sport club','pilates','cycling','workout'],
  Education:     ['tuition','course','school','university','certificate','book','class','lesson','workshop','tutorial','learning','study'],
  Bills:         ['rent','electricity','water','internet','phone bill','gas bill','cable','loan','mortgage','utility','utilities','bill'],
  Travel:        ['flight','hotel','airbnb','booking','visa','tour','baggage','resort','cruise','travel','trip','vacation','holiday'],
  Gifts:         ['gift','present','flowers','charity','donation','birthday','wedding','anniversary','baby shower'],
  Other:         ['haircut','barber','laundry','pet','repair','fine','tax','insurance','miscellaneous'],
}

function suggestCategory(desc) {
  if (!desc || desc.length < 3) return null
  const lower = desc.toLowerCase()
  for (const [cat, words] of Object.entries(CATEGORY_HINTS)) {
    if (words.some(w => lower.includes(w))) return cat
  }
  return null
}

function SubTile({ sub, selected, onClick }) {
  const logo = BRAND_LOGOS[sub.label]
  const [imgOk, setImgOk] = useState(true)
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition ${
        selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-gray-100 dark:border-gray-700 hover:border-violet-300 bg-gray-50 dark:bg-gray-700/50'
      }`}>
      {logo && imgOk
        ? <img src={logo} alt={sub.label} className="w-7 h-7 rounded-md object-contain" onError={() => setImgOk(false)} />
        : <span className="text-xl">{sub.emoji}</span>
      }
      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 leading-tight text-center">{sub.label}</span>
    </button>
  )
}

const CAT_EMOJIS = ['📌','🏠','🌟','💡','🔥','💎','🎯','⚡','🌿','🎪','🎨','🎵','🏆','🚀','🌈','🦋','🍀','🎲','🔑','💫','🌙','🏖️','🧩','🎀']

const EXP_CATS = [
  { key: 'Food', icon: '🍔' }, { key: 'Coffee', icon: '☕' },
  { key: 'Transport', icon: '🚗' }, { key: 'Shopping', icon: '🛍️' },
  { key: 'Entertainment', icon: '🎬' }, { key: 'Health', icon: '🏥' },
  { key: 'Fitness', icon: '🏋️' }, { key: 'Education', icon: '🎓' },
  { key: 'Bills', icon: '💡' }, { key: 'Travel', icon: '✈️' },
  { key: 'Gifts', icon: '🎁' }, { key: 'Subscriptions', icon: '📱' },
  { key: 'Other', icon: '📦' },
]

function AddExpenseSheet({ onClose, onSave, currencySymbol, categories: propCats, onAddCategory }) {
  useHideNav()
  const [form, setForm] = useState({
    amount: '', category: 'Food', description: '',
    date: new Date().toISOString().split('T')[0], is_recurring: false, recurring_frequency: 'monthly',
    billing_cycle: 'monthly', payment_method: 'Card', notes: ''
  })
  const [selectedSub, setSelectedSub] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [showCreateCat, setShowCreateCat] = useState(false)
  const [newCatEmoji, setNewCatEmoji] = useState('📌')
  const [newCatName, setNewCatName] = useState('')
  const [creating, setCreating] = useState(false)

  const cats = propCats?.length
    ? propCats.map(c => ({ key: c.name, icon: c.emoji }))
    : EXP_CATS

  const handleCategoryChange = (cat) => {
    setForm(f => ({ ...f, category: cat, is_recurring: cat === 'Subscriptions' ? true : f.is_recurring }))
    setSelectedSub(null)
    setSuggestion(null)
  }
  const handleSubSelect = (sub) => {
    setSelectedSub(sub.label)
    setForm(f => ({ ...f, description: sub.label }))
    setSuggestion(null)
  }
  const handleDescChange = (val) => {
    setForm(f => ({ ...f, description: val }))
    const cat = suggestCategory(val)
    setSuggestion(cat && cat !== form.category ? cat : null)
  }
  const handleCreateCat = async () => {
    if (!newCatName.trim() || creating) return
    setCreating(true)
    try {
      if (onAddCategory) await onAddCategory(newCatName.trim(), newCatEmoji)
      handleCategoryChange(newCatName.trim())
      setShowCreateCat(false)
      setNewCatName('')
      setNewCatEmoji('📌')
    } finally { setCreating(false) }
  }

  const subs = SUBCATEGORIES[form.category] || []

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Expense</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
          <ReceiptScanner onScanComplete={data => setForm(f => ({ ...f, amount: data.amount, description: data.description, category: data.category || f.category, date: data.date || f.date }))} />

          {/* Amount */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 block">Amount ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required min="0.01" step="0.01"
              className="w-full bg-transparent text-3xl font-black text-gray-900 dark:text-white focus:outline-none placeholder-gray-300 dark:placeholder-gray-600" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Description <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="text" placeholder="What was this for?" value={form.description}
              onChange={e => handleDescChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            {suggestion && (
              <div className="mt-1.5 flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/50 rounded-xl px-3 py-2">
                <span className="text-xs text-rose-700 dark:text-rose-300">🤖 Looks like <strong>{suggestion}</strong>?</span>
                <button type="button" onClick={() => handleCategoryChange(suggestion)}
                  className="ml-auto text-xs bg-rose-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-rose-600 transition">Use it</button>
                <button type="button" onClick={() => setSuggestion(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5 block">Category</label>
            <div className="flex gap-2.5 overflow-x-auto pb-1.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {cats.map(({ key, icon }) => (
                <button key={key} type="button" onClick={() => handleCategoryChange(key)}
                  className={`flex flex-col items-center gap-1.5 shrink-0 w-[70px] pt-3 pb-2.5 rounded-2xl border-2 transition-all ${
                    form.category === key
                      ? 'border-rose-400 bg-linear-to-b from-rose-400 to-pink-500 shadow-sm shadow-rose-200 dark:shadow-none'
                      : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-700/50 hover:border-rose-200'
                  }`}>
                  <span className="text-2xl leading-none">{icon}</span>
                  <span className={`text-[10px] font-semibold leading-tight text-center px-0.5 ${form.category === key ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>{key}</span>
                </button>
              ))}
              <button type="button" onClick={() => setShowCreateCat(v => !v)}
                className={`flex flex-col items-center gap-1.5 shrink-0 w-[70px] pt-3 pb-2.5 rounded-2xl border-2 border-dashed transition-all ${
                  showCreateCat ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 hover:border-violet-300'
                }`}>
                <span className="text-2xl leading-none">➕</span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Create</span>
              </button>
            </div>

            {/* Inline create category */}
            {showCreateCat && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300">New Category</p>
                  <button type="button" onClick={() => { setShowCreateCat(false); setNewCatName(''); setNewCatEmoji('📌') }}
                    className="text-gray-400 hover:text-gray-600 text-sm w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">✕</button>
                </div>
                <div className="grid grid-cols-6 gap-1.5 mb-3">
                  {CAT_EMOJIS.map(em => (
                    <button key={em} type="button" onClick={() => setNewCatEmoji(em)}
                      className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        newCatEmoji === em ? 'bg-violet-100 dark:bg-violet-900/40 ring-2 ring-violet-400' : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}>
                      {em}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="Category name…" value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCat()}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-2.5" />
                <button type="button" onClick={handleCreateCat} disabled={!newCatName.trim() || creating}
                  className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
                  {creating ? 'Creating…' : `${newCatEmoji} Create "${newCatName || '…'}"`}
                </button>
              </div>
            )}
          </div>

          {/* Quick-fill */}
          {subs.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Quick-fill</label>
              <div
                className={`grid grid-cols-4 gap-2 ${form.category === 'Subscriptions' ? 'max-h-44 overflow-y-auto pr-0.5' : ''}`}
                style={form.category === 'Subscriptions' ? { scrollbarWidth: 'thin' } : {}}
              >
                {subs.map(sub => (
                  <SubTile key={sub.label} sub={sub} selected={selectedSub === sub.label} onClick={() => handleSubSelect(sub)} />
                ))}
              </div>
            </div>
          )}

          {/* Billing cycle or date */}
          {form.category === 'Subscriptions' ? (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Billing Cycle</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ key: 'weekly', label: 'Weekly', icon: '📅' }, { key: 'monthly', label: 'Monthly', icon: '📆' }, { key: 'yearly', label: 'Yearly', icon: '🗓️' }].map(({ key, label, icon }) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, billing_cycle: key, recurring_frequency: key, is_recurring: true }))}
                    className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                      form.billing_cycle === key
                        ? 'border-rose-400 bg-linear-to-b from-rose-400 to-pink-500 text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:border-rose-300'
                    }`}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          )}

          {/* Recurring */}
          {form.category !== 'Subscriptions' && (
            <>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="w-4 h-4 accent-rose-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Recurring</span>
              </label>
              {form.is_recurring && (
                <select value={form.recurring_frequency} onChange={e => setForm(f => ({ ...f, recurring_frequency: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </>
          )}

          {/* Payment method */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Paid with</label>
            <div className="flex gap-2">
              {['Card', 'Cash', 'Mobile Pay', 'Bank Transfer'].map(m => (
                <button key={m} type="button" onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition ${
                    form.payment_method === m
                      ? 'border-rose-400 bg-linear-to-b from-rose-400 to-pink-500 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700/50 hover:border-rose-300'
                  }`}>
                  {m === 'Card' ? '💳' : m === 'Cash' ? '💵' : m === 'Mobile Pay' ? '📱' : '🏦'} {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Notes <span className="font-normal">(optional)</span></label>
            <input type="text" placeholder="Any extra details…" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-6 pt-4 pb-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-3xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
          <button onClick={() => onSave(form)}
            disabled={!form.amount || !form.date}
            className="w-full bg-linear-to-r from-rose-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-base hover:from-rose-600 hover:to-pink-600 transition disabled:opacity-50 shadow-md shadow-rose-200/60 dark:shadow-none">
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}

function AddIncomeSheet({ onClose, onSave, currencySymbol }) {
  useHideNav()
  const [form, setForm] = useState({ amount: '', source: 'Salary', is_recurring: false, recurring_frequency: 'monthly' })
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Income</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Amount ({currencySymbol})</label>
            <input type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              min="0.01" step="0.01"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Source</label>
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Salary</option><option>Freelance</option><option>Business</option><option>Investment</option><option>Other</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="w-4 h-4 accent-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Recurring</span>
          </label>
          {form.is_recurring && (
            <select value={form.recurring_frequency} onChange={e => setForm({ ...form, recurring_frequency: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
        </div>
        <div className="shrink-0 px-6 pt-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-3xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
          <button onClick={() => onSave(form)}
            disabled={!form.amount}
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-700 transition disabled:opacity-50">
            Add Income
          </button>
        </div>
      </div>
    </div>
  )
}

const CAT_ICONS_MAP = { Food:'🍔', Coffee:'☕', Transport:'🚗', Shopping:'🛍️', Entertainment:'🎬', Health:'🏥', Fitness:'🏋️', Education:'🎓', Bills:'💡', Travel:'✈️', Gifts:'🎁', Subscriptions:'📱', Other:'📦' }
const EXAMPLE_PROMPTS = [
  "Starbucks $6 this morning, Uber $22 to the mall, KFC lunch $11",
  "Netflix monthly $15, groceries at Carrefour $85, parking $4",
  "Yesterday: McDonald's $9, Shell gas $45, cinema tickets $28",
  "Rent $800, gym subscription $30, Amazon order $55, coffee $4.50",
]

function QuickLogSheet({ onClose, onSaved, currencySymbol }) {
  useHideNav()
  const today = new Date().toISOString().split('T')[0]
  const [text, setText] = useState('')
  const [step, setStep] = useState('input')   // input | preview | saving | done
  const [parsed, setParsed] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [micActive, setMicActive] = useState(false)
  const exampleRef = useState(() => EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)])[0]
  const micRef = useRef(null)

  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = localStorage.getItem('fina_lang_mic') || 'en-US'
    rec.interimResults = false
    micRef.current = rec
    rec.onstart = () => setMicActive(true)
    rec.onresult = e => setText(t => t ? t + ', ' + e.results[0][0].transcript : e.results[0][0].transcript)
    rec.onend = () => { setMicActive(false); micRef.current = null }
    rec.onerror = () => { setMicActive(false); micRef.current = null }
    rec.start()
  }

  const stopMic = () => { micRef.current?.stop() }

  const parse = async () => {
    if (!text.trim()) return
    setStep('input')
    setError('')
    setSaving(true)
    try {
      const res = await API.post('/expenses/parse-natural', { text })
      setParsed(res.data.transactions.map((tx, i) => ({ ...tx, _id: i, date: tx.date || today })))
      setStep('preview')
    } catch (e) {
      setError(e.response?.data?.message || 'Could not parse — try rephrasing')
    }
    setSaving(false)
  }

  const updateRow = (id, field, val) => {
    setParsed(prev => prev.map(tx => tx._id === id ? { ...tx, [field]: val } : tx))
  }

  const removeRow = (id) => setParsed(prev => prev.filter(tx => tx._id !== id))

  const saveAll = async () => {
    setSaving(true)
    let count = 0
    for (const tx of parsed) {
      try {
        await API.post('/expenses', { amount: tx.amount, category: tx.category, description: tx.description, date: tx.date, is_recurring: false })
        count++
      } catch { /* skip failed ones */ }
    }
    setSavedCount(count)
    setStep('done')
    setSaving(false)
    setTimeout(() => { onSaved(); onClose() }, 1500)
  }

  const inputCls = "px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 w-full"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-linear-to-br from-violet-600 to-indigo-700 rounded-t-3xl md:rounded-t-3xl px-6 pt-6 pb-5 text-white shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight">Smart Log</h3>
                <p className="text-white/60 text-[10px] font-medium">AI-powered expense capture</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <p className="text-white/70 text-xs leading-relaxed mt-1">
            Type or speak your expenses — AI parses amounts, categories &amp; dates instantly.
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {step === 'input' && (
            <div className="space-y-4">
              {/* Input with mic */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">What did you spend?</label>
                  {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
                    <button
                      type="button"
                      onClick={micActive ? stopMic : startMic}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        micActive
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-200'
                      }`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <rect x="9" y="2" width="6" height="12" rx="3" fill={micActive ? 'currentColor' : 'none'} fillOpacity="0.3"/>
                        <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6"/>
                      </svg>
                      {micActive ? 'Stop' : 'Speak'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`e.g. "${exampleRef}"`}
                    rows={4}
                    autoFocus
                    className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:outline-none focus:border-violet-400 bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white text-sm resize-none leading-relaxed transition"
                  />
                  {micActive && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      Listening…
                    </div>
                  )}
                </div>
                {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</p>}
              </div>

              {/* Quick example pills */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick examples</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((p, i) => (
                    <button key={i} type="button" onClick={() => setText(p)}
                      className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 transition border border-gray-200 dark:border-gray-600">
                      {p.substring(0, 28)}…
                    </button>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 rounded-xl px-4 py-3">
                <span className="text-violet-500 text-sm mt-0.5">✦</span>
                <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                  Include merchant name, amount, and optionally <span className="font-semibold">"yesterday"</span> or a date. Multiple expenses in one sentence work great.
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{parsed.length} transaction{parsed.length !== 1 ? 's' : ''} found</p>
                <button onClick={() => setStep('input')} className="text-xs text-violet-600 font-semibold hover:underline">← Edit text</button>
              </div>
              {parsed.map(t => (
                <div key={t._id} className="bg-gray-50 dark:bg-gray-700/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{CAT_ICONS_MAP[t.category] || '📦'}</span>
                    <input value={t.description} onChange={e => updateRow(t._id, 'description', e.target.value)}
                      className={inputCls + ' font-semibold flex-1'} />
                    <button onClick={() => removeRow(t._id)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 mb-0.5 block">Amount ({currencySymbol})</label>
                      <input type="number" value={t.amount} onChange={e => updateRow(t._id, 'amount', parseFloat(e.target.value) || 0)}
                        className={inputCls + ' font-bold text-violet-600'} min="0.01" step="0.01" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 mb-0.5 block">Category</label>
                      <select value={t.category} onChange={e => updateRow(t._id, 'category', e.target.value)} className={inputCls}>
                        {Object.keys(CAT_ICONS_MAP).map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 mb-0.5 block">Date</label>
                      <input type="date" value={t.date} onChange={e => updateRow(t._id, 'date', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              ))}
              {parsed.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🗑️</p>
                  <p className="text-sm">All removed — go back and rephrase</p>
                  <button onClick={() => setStep('input')} className="mt-3 text-violet-600 text-sm font-semibold hover:underline">← Edit text</button>
                </div>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-10">
              <span className="text-5xl">✅</span>
              <p className="text-lg font-bold text-gray-800 dark:text-white mt-4">{savedCount} expense{savedCount !== 1 ? 's' : ''} added!</p>
              <p className="text-gray-400 text-sm mt-1">Closing...</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {step === 'input' && (
          <div className="px-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-700" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
            <button onClick={parse} disabled={!text.trim() || saving}
              className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Parsing...</>
              ) : '🤖 Parse with AI'}
            </button>
          </div>
        )}

        {step === 'preview' && parsed.length > 0 && (
          <div className="px-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-700" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
            <button onClick={saveAll} disabled={saving}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : `✅ Add All ${parsed.length} Transaction${parsed.length !== 1 ? 's' : ''}`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">You can edit any field above before confirming</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Rotating Fact Card (Panel 1) ─────────────────────────
const FACT_THEMES = [
  'linear-gradient(135deg,#3B82F6,#4F46E5)',  // 0  blue-indigo
  'linear-gradient(135deg,#10B981,#059669)',  // 1  emerald
  'linear-gradient(135deg,#EF4444,#E11D48)',  // 2  red-rose
  'linear-gradient(135deg,#8B5CF6,#7C3AED)',  // 3  violet
  'linear-gradient(135deg,#F97316,#EA580C)',  // 4  orange
  'linear-gradient(135deg,#EC4899,#DB2777)',  // 5  pink
  'linear-gradient(135deg,#0891B2,#0E7490)',  // 6  cyan
  'linear-gradient(135deg,#0D9488,#0F766E)',  // 7  teal
  'linear-gradient(135deg,#6366F1,#4338CA)',  // 8  indigo
  'linear-gradient(135deg,#D97706,#B45309)',  // 9  amber-brown
  'linear-gradient(135deg,#DC2626,#991B1B)',  // 10 deep-red
  'linear-gradient(135deg,#7C3AED,#4C1D95)',  // 11 deep-violet
  'linear-gradient(135deg,#0369A1,#075985)',  // 12 deep-blue
]

function RotatingFactCard({ expenses, incomeList, budgets, currencySymbol }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  const now       = new Date()
  const todayStr  = now.toISOString().split('T')[0]
  const dayOfMonth   = now.getDate()
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft     = daysInMonth - dayOfMonth

  // Today's expenses
  const todayExp   = expenses.filter(e => (e.date || '').split('T')[0] === todayStr)
  const todaySpent = todayExp.reduce((s, e) => s + safeNum(e.amount), 0)

  // This month's expenses
  const monthExp   = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const monthSpent = monthExp.reduce((s, e) => s + safeNum(e.amount), 0)

  // Last 7 days
  const weekAgo   = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const weekExp   = expenses.filter(e => new Date(e.date) >= weekAgo)
  const weekSpent = weekExp.reduce((s, e) => s + safeNum(e.amount), 0)

  // Income this month
  const thisMonthInc = incomeList.filter(i => Number(i.month) === now.getMonth() + 1 && Number(i.year) === now.getFullYear())
  const totalIncome  = thisMonthInc.reduce((s, i) => s + safeNum(i.amount), 0)
  const savingsRate  = totalIncome > 0 ? Math.round(((totalIncome - monthSpent) / totalIncome) * 100) : null
  const balance      = totalIncome - monthSpent

  // Read user's savings target from settings (default 20%)
  const savedPrefs       = (() => { try { return JSON.parse(localStorage.getItem('fina_prefs') || '{}') } catch { return {} } })()
  const savingsTargetPct = savedPrefs.savingsTarget ?? 20
  const spendingPct      = (100 - savingsTargetPct) / 100  // e.g. 20% savings → 0.80 spending

  // Daily allowance — income-based (user's savings target) takes priority over budget-based
  // e.g. $10k income, 20% savings target → $8k spending / 30 days = $266/day
  const monthlyBudgets      = budgets.filter(b => b.period === 'monthly')
  const totalMonthlyBudget  = monthlyBudgets.reduce((s, b) => s + safeNum(b.amount), 0)
  const incomeBasedDaily    = totalIncome > 0 ? (totalIncome * spendingPct) / daysInMonth : 0
  const budgetBasedDaily    = totalMonthlyBudget > 0 ? totalMonthlyBudget / daysInMonth : 0
  const dailyAllowance      = incomeBasedDaily || budgetBasedDaily
  const dailyBasis          = incomeBasedDaily > 0 ? `income (saving ${savingsTargetPct}%)` : 'budget'

  // Monthly pace (projected spend at current daily rate)
  const dailyRate   = dayOfMonth > 0 ? monthSpent / dayOfMonth : 0
  const projected   = dailyRate * daysInMonth
  const projectedVsIncome = totalIncome > 0 ? projected - totalIncome : null

  // Category breakdowns
  const todayCatMap = {}
  todayExp.forEach(e => { todayCatMap[e.category] = (todayCatMap[e.category] || 0) + safeNum(e.amount) })
  const topCatToday = Object.entries(todayCatMap).sort((a, b) => b[1] - a[1])[0]

  const monthCatMap = {}
  monthExp.forEach(e => { monthCatMap[e.category] = (monthCatMap[e.category] || 0) + safeNum(e.amount) })
  const topCatMonth = Object.entries(monthCatMap).sort((a, b) => b[1] - a[1])[0]

  // Biggest expense today and this month
  const biggestToday = todayExp.reduce((m, e) => safeNum(e.amount) > safeNum(m?.amount || 0) ? e : m, null)
  const biggestMonth = monthExp.reduce((m, e) => safeNum(e.amount) > safeNum(m?.amount || 0) ? e : m, null)

  // Budget under most pressure
  const pressuredBudget = monthlyBudgets.map(b => {
    const spent = monthExp.filter(e => e.category === b.category).reduce((s, e) => s + safeNum(e.amount), 0)
    const pct   = safeNum(b.amount) > 0 ? (spent / safeNum(b.amount)) * 100 : 0
    return { ...b, spent, pct }
  }).sort((a, b) => b.pct - a.pct)[0]

  // ── Build facts array ──────────────────────────────────
  const facts = []

  // 1. Today's spending (always)
  facts.push({
    label: 'Today\'s Spending',
    value: `${currencySymbol}${todaySpent.toFixed(2)}`,
    sub: todayExp.length === 0
      ? 'No transactions yet today — don\'t forget to log!'
      : `${todayExp.length} transaction${todayExp.length !== 1 ? 's' : ''} logged today`,
    theme: FACT_THEMES[0], icon: '💳',
  })

  // 2. Daily allowance (income-based)
  if (dailyAllowance > 0) {
    const rem  = dailyAllowance - todaySpent
    const over = rem < 0
    facts.push({
      label: over ? 'Daily Limit Exceeded' : 'Daily Allowance',
      value: over
        ? `${currencySymbol}${Math.abs(rem).toFixed(2)} over`
        : `${currencySymbol}${rem.toFixed(2)} left today`,
      sub: over
        ? `Your daily limit is ${currencySymbol}${dailyAllowance.toFixed(2)} based on your ${dailyBasis}`
        : `${currencySymbol}${dailyAllowance.toFixed(2)}/day based on your ${dailyBasis} — you're on track`,
      theme: over ? FACT_THEMES[2] : FACT_THEMES[1], icon: over ? '🚨' : '✅',
    })
  }

  // 3. Monthly pace / projection
  if (monthSpent > 0) {
    const onTrack = projectedVsIncome !== null ? projectedVsIncome <= 0 : projected <= totalMonthlyBudget
    facts.push({
      label: 'Month-End Projection',
      value: `${currencySymbol}${projected.toFixed(0)}`,
      sub: projectedVsIncome !== null
        ? projectedVsIncome > 0
          ? `At this pace you'll spend ${currencySymbol}${projectedVsIncome.toFixed(0)} more than your income`
          : `On track — projected ${currencySymbol}${Math.abs(projectedVsIncome).toFixed(0)} surplus this month`
        : `Projected total based on ${currencySymbol}${dailyRate.toFixed(0)}/day spending pace`,
      theme: onTrack ? FACT_THEMES[7] : FACT_THEMES[9], icon: onTrack ? '📈' : '⚠️',
    })
  }

  // 4. Net position this month
  if (totalIncome > 0) {
    facts.push({
      label: 'Net Position',
      value: `${balance >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(balance).toFixed(2)}`,
      sub: balance >= 0
        ? `${currencySymbol}${totalIncome.toFixed(0)} income · ${currencySymbol}${monthSpent.toFixed(0)} spent this month`
        : `Spending ${currencySymbol}${Math.abs(balance).toFixed(0)} more than earned — review your budgets`,
      theme: balance >= 0 ? FACT_THEMES[1] : FACT_THEMES[2], icon: balance >= 0 ? '💚' : '📉',
    })
  }

  // 5. Savings rate
  if (savingsRate !== null) {
    facts.push({
      label: 'Savings Rate',
      value: `${Math.max(0, savingsRate)}%`,
      sub: savingsRate >= 20
        ? 'Excellent discipline — you\'re saving 20%+ this month!'
        : savingsRate > 0
          ? `You're saving ${savingsRate}% — push to 20% for real financial security`
          : 'Spending exceeds income — cut one non-essential category this week',
      theme: savingsRate >= 20 ? FACT_THEMES[1] : savingsRate > 0 ? FACT_THEMES[9] : FACT_THEMES[2], icon: '💰',
    })
  }

  // 6. Top category this month
  if (topCatMonth) {
    const pct = monthSpent > 0 ? Math.round((topCatMonth[1] / monthSpent) * 100) : 0
    facts.push({
      label: 'Top Category This Month',
      value: topCatMonth[0],
      sub: `${currencySymbol}${topCatMonth[1].toFixed(2)} spent — ${pct}% of your total monthly spending`,
      theme: FACT_THEMES[3], icon: '📊',
    })
  }

  // 7. Top category today (only if different from month top or has today data)
  if (topCatToday && (!topCatMonth || topCatToday[0] !== topCatMonth[0])) {
    facts.push({
      label: 'Top Spend Today',
      value: topCatToday[0],
      sub: `${currencySymbol}${topCatToday[1].toFixed(2)} on ${topCatToday[0]} today`,
      theme: FACT_THEMES[8], icon: '🎯',
    })
  }

  // 8. Biggest expense this month
  if (biggestMonth && safeNum(biggestMonth.amount) > 0) {
    facts.push({
      label: 'Biggest Expense This Month',
      value: `${currencySymbol}${safeNum(biggestMonth.amount).toFixed(2)}`,
      sub: (biggestMonth.description || biggestMonth.category || 'Largest single transaction') + ` · ${new Date(biggestMonth.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      theme: FACT_THEMES[4], icon: '🛒',
    })
  }

  // 9. Budget under most pressure
  if (pressuredBudget && pressuredBudget.pct > 50) {
    const over = pressuredBudget.pct >= 100
    facts.push({
      label: over ? 'Budget Exceeded' : 'Budget Alert',
      value: `${pressuredBudget.category}`,
      sub: over
        ? `${currencySymbol}${pressuredBudget.spent.toFixed(0)} spent — ${Math.round(pressuredBudget.pct - 100)}% over your ${currencySymbol}${safeNum(pressuredBudget.amount).toFixed(0)} limit`
        : `${Math.round(pressuredBudget.pct)}% used — ${currencySymbol}${(safeNum(pressuredBudget.amount) - pressuredBudget.spent).toFixed(0)} remaining in ${pressuredBudget.category}`,
      theme: over ? FACT_THEMES[10] : FACT_THEMES[9], icon: over ? '🔴' : '🟠',
    })
  }

  // 10. Days left + daily budget remaining
  if (daysLeft > 0 && (totalIncome > 0 || totalMonthlyBudget > 0)) {
    const remaining    = totalIncome > 0 ? (totalIncome * spendingPct) - monthSpent : totalMonthlyBudget - monthSpent
    const perDayLeft   = remaining > 0 ? remaining / daysLeft : 0
    facts.push({
      label: `${daysLeft} Days Left This Month`,
      value: `${currencySymbol}${Math.max(0, perDayLeft).toFixed(0)}/day`,
      sub: remaining > 0
        ? `${currencySymbol}${remaining.toFixed(0)} remaining — spend ${currencySymbol}${perDayLeft.toFixed(0)} per day to finish on budget`
        : `You've used your full ${dailyBasis === 'income' ? '80% income allocation' : 'budget'} for the month`,
      theme: perDayLeft > 0 ? FACT_THEMES[6] : FACT_THEMES[2], icon: '📅',
    })
  }

  // 11. Weekly spending summary
  if (weekSpent > 0) {
    facts.push({
      label: 'Last 7 Days',
      value: `${currencySymbol}${weekSpent.toFixed(2)}`,
      sub: `${weekExp.length} transaction${weekExp.length !== 1 ? 's' : ''} over the past week — ${currencySymbol}${(weekSpent / 7).toFixed(0)}/day average`,
      theme: FACT_THEMES[12], icon: '📆',
    })
  }

  // 12. Transaction count this month
  if (monthExp.length > 0) {
    facts.push({
      label: 'Transactions This Month',
      value: `${monthExp.length}`,
      sub: `${monthExp.length} expense${monthExp.length !== 1 ? 's' : ''} logged · averaging ${currencySymbol}${monthExp.length > 0 ? (monthSpent / monthExp.length).toFixed(0) : 0} per transaction`,
      theme: FACT_THEMES[11], icon: '🧾',
    })
  }

  // 13. Log reminder (only if nothing logged today)
  if (todayExp.length === 0) {
    facts.push({
      label: 'Quick Reminder',
      value: 'Log Today',
      sub: 'You haven\'t tracked anything yet today — consistency is what makes budgeting work.',
      theme: FACT_THEMES[5], icon: '📝',
    })
  }

  const safe = Math.max(facts.length, 1)
  const cur  = idx % safe

  useEffect(() => {
    if (facts.length <= 1) return
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % facts.length); setVisible(true) }, 280)
    }, 15000)
    return () => clearInterval(t)
  }, [facts.length])

  const fact = facts[cur] || facts[0]
  if (!fact) return null

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: fact.theme, minHeight: '212px', transition: 'background 0.4s ease' }}>
      <div className="p-6 flex flex-col justify-between h-full relative overflow-hidden" style={{ minHeight: '212px' }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full text-white">{fact.label}</span>
            <span className="text-2xl">{fact.icon}</span>
          </div>
          <p className="text-4xl font-bold text-white tabular-nums mb-2 leading-tight break-all">{fact.value}</p>
          <p className="text-white/75 text-sm leading-relaxed">{fact.sub}</p>
        </div>
        <div className="relative flex items-center justify-between mt-5" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
          <div className="flex gap-1.5 flex-wrap">
            {facts.map((_, i) => (
              <button key={i} onClick={() => { setVisible(false); setTimeout(() => { setIdx(i); setVisible(true) }, 280) }}
                className="rounded-full transition-all duration-200"
                style={{ width: i === cur ? 20 : 6, height: 6, background: i === cur ? 'white' : 'rgba(255,255,255,0.35)' }} />
            ))}
          </div>
          <p className="text-white/40 text-[10px] shrink-0 ml-2">auto · 15s</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────
export default function Dashboard() {
  const [user]                        = useState(() => {
    const u = localStorage.getItem('user')
    if (!u) { window.location.href = '/login'; return null }
    return JSON.parse(u)
  })
  const [expenses, setExpenses]       = useState([])
  const [budgets, setBudgets]         = useState([])
  const [incomeList, setIncomeList]   = useState([])
  const [savingsGoals, setSavings]    = useState([])
  const [notifications, setNotifs]    = useState([])
  const [trendsData, setTrends]       = useState([])
  const [subscriptions, setSubs]      = useState([])
  const [loading, setLoading]         = useState(true)
  const [currencySymbol]              = useState(() => CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$')
  const { categories: dynCats, addCategory, refresh: refreshCats } = useCategories()
  const [toast, setToast]             = useState(null)
  const [confirm, setConfirm]         = useState(null)
  const [modalData, setModalData]     = useState(null)
  const [showAddExp, setShowAddExp]     = useState(false)
  const [showAddInc, setShowAddInc]     = useState(false)
  const [showVoice, setShowVoice]       = useState(false)
  const [editingExpense, setEditing]  = useState(null)
  const [editForm, setEditForm]       = useState({ amount: '', category: 'Food', description: '', date: '', is_recurring: false })
  const [showNotifs, setShowNotifs]   = useState(false)
  const [behaviorAlert, setBehaviorAlert] = useState(null)
  const [monthlyCheckModal, setMonthlyCheckModal] = useState(false)
  const [showQuestions, setShowQuestions] = useState(() => {
    const wid = getWalletKey()
    return !localStorage.getItem(`fina_questions_${wid}`)
  })
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const wid = getWalletKey()
    return !!(localStorage.getItem(`fina_questions_${wid}`) && !localStorage.getItem(`fina_onboarded_${wid}`))
  })
  const [dismissedGoals, setDismissedGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fina_dismissed_goals') || '[]') } catch { return [] }
  })
  const [showNotifPrompt, setShowNotifPrompt] = useState(() =>
    !localStorage.getItem('fina_notif_asked') && !isNotificationsEnabled()
  )

  const [showMonthSelector, setShowMonthSelector] = useState(() =>
    localStorage.getItem('fina_show_month_selector') === 'true'
  )
  const toggleMonthSelector = () => setShowMonthSelector(v => {
    localStorage.setItem('fina_show_month_selector', !v)
    return !v
  })

  // Monthly Wrap
  const [showWrap, setShowWrap] = useState(false)
  const _now = new Date()
  const wrapKey = `fina_wrap_watched_${_now.getFullYear()}-${_now.getMonth() + 1}`
  const _lastDay = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate()
  const showWrapBanner = _now.getDate() >= _lastDay - 2 && !localStorage.getItem(wrapKey)

  // Carousel + news state
  const [carouselPanel, setCarousel]  = useState(0)
  const [news, setNews]               = useState([])
  const [newsLoading, setNewsLoading] = useState(() => !!localStorage.getItem('token'))

  const touchStartX = useRef(null)
  const notifRef    = useRef(null)

  const today = new Date()
  const [selectedMonth, setMonth] = useState(today.getMonth())
  const [selectedYear, setYear]   = useState(today.getFullYear())
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear()
  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  const showToast  = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])
  const askConfirm = (msg, fn) => setConfirm({ message: msg, onConfirm: fn })

  // Fire reminder notifications for today
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const todayStr = new Date().toISOString().split('T')[0]
    try {
      const all = JSON.parse(localStorage.getItem('fina_reminders') || '[]')
      const due = all.filter(r => r.date === todayStr && !r.notified)
      due.forEach(r => new Notification('Fina Reminder 🔔', { body: r.text, icon: '/favicon.ico' }))
      if (due.length > 0) {
        const updated = all.map(r => due.find(d => d.id === r.id) ? { ...r, notified: true } : r)
        localStorage.setItem('fina_reminders', JSON.stringify(updated))
      }
    } catch { /* noop */ }
  }, [])

  const fetchExpenses = useCallback(async () => { try { const r = await API.get('/expenses'); setExpenses(r.data) } catch { /* noop */ } }, [])
  const fetchBudgets  = useCallback(async () => { try { const r = await API.get('/budgets'); setBudgets(r.data) } catch { /* noop */ } }, [])
  const fetchSavings  = useCallback(async () => { try { const r = await API.get('/savings'); setSavings(r.data) } catch { /* noop */ } }, [])
  const fetchTrends   = useCallback(async () => { try { const r = await API.get('/expenses/trends'); setTrends(r.data) } catch { /* noop */ } }, [])
  const fetchNotifs   = useCallback(async () => { try { const r = await API.get('/notifications'); setNotifs(r.data) } catch { /* noop */ } }, [])
  const fetchSubs     = useCallback(async () => { try { const r = await API.get('/subscriptions'); setSubs(r.data || []) } catch { /* noop */ } }, [])
  const fetchIncome   = useCallback(async () => {
    try { const r = await API.get('/income'); setIncomeList(r.data) } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    Promise.all([fetchExpenses(), fetchBudgets(), fetchSavings(), fetchTrends(), fetchNotifs(), fetchSubs(), fetchIncome()])
      .finally(() => setLoading(false))
  }, [fetchExpenses, fetchBudgets, fetchSavings, fetchTrends, fetchNotifs, fetchSubs, fetchIncome])

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    const run = async () => {
      if (isCurrentMonth) {
        try {
          const r1 = await API.post('/expenses/apply-recurring', { month: selectedMonth + 1, year: selectedYear })
          if (r1.data.added > 0) { fetchExpenses(); showToast(r1.data.added + ' recurring expense(s) added', 'warning') }
        } catch { /* noop */ }
        try {
          const r2 = await API.post('/income/apply-recurring', { month: selectedMonth + 1, year: selectedYear })
          if (r2.data.added > 0) { fetchIncome(); showToast(r2.data.added + ' recurring income(s) added', 'warning') }
        } catch { /* noop */ }
      }
    }
    run()
  }, [selectedMonth, selectedYear, isCurrentMonth, fetchIncome, fetchExpenses, showToast])

  // Refresh expenses + income whenever user comes back to this tab / navigates back
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchExpenses()
        fetchIncome()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchExpenses, fetchIncome])

  // Fetch news on mount (newsLoading starts true via lazy init above)
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    API.get('/news').then(r => setNews(r.data || [])).catch(() => { /* noop */ }).finally(() => setNewsLoading(false))
  }, [])

  // Monthly recurring confirmation check
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    const key = 'fina_month_confirmed'
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`
    if (localStorage.getItem(key) !== currentKey) {
      const timer = setTimeout(() => setMonthlyCheckModal(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Close notification panel on outside click
  useEffect(() => {
    if (!showNotifs) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  const markRead = async () => {
    try { await API.put('/notifications/read', {}); setNotifs(prev => prev.map(n => ({ ...n, is_read: true }))) } catch { /* noop */ }
  }

  const deleteNotif = async (id) => {
    try { await API.delete('/notifications/' + id); setNotifs(prev => prev.filter(n => n.id !== id)) } catch { /* noop */ }
  }

  const clearAllNotifs = async () => {
    try {
      await Promise.all(notifications.map(n => API.delete('/notifications/' + n.id)))
      setNotifs([])
    } catch { /* noop */ }
  }

  // Carousel touch swipe — disabled on panel 2 (news) so horizontal scroll works
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50 && carouselPanel !== 2) setCarousel(p => Math.max(0, Math.min(2, p + (diff > 0 ? 1 : -1))))
    touchStartX.current = null
  }

  const refreshNews = () => {
    setNewsLoading(true)
    API.get('/news').then(r => setNews(r.data || [])).catch(() => {}).finally(() => setNewsLoading(false))
  }

  // Derived values — parse date string directly to avoid UTC-offset month drift
  const monthExpenses = expenses.filter(e => {
    const s = (e.date instanceof Date ? e.date.toISOString() : String(e.date)).split('T')[0]
    const [y, m] = s.split('-').map(Number)
    return (m - 1) === selectedMonth && y === selectedYear
  })
  const total       = monthExpenses.reduce((s, e) => s + safeNum(e.amount), 0)
  const monthIncome = incomeList.filter(i => Number(i.month) === selectedMonth + 1 && Number(i.year) === selectedYear)
  const totalIncome = monthIncome.reduce((s, i) => s + safeNum(i.amount), 0)
  const balance     = totalIncome - total
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0
  const unread      = notifications.filter(n => !n.is_read).length

  const categoryData = monthExpenses.reduce((acc, e) => {
    const f = acc.find(i => i.name === e.category)
    if (f) f.value += safeNum(e.amount)
    else acc.push({ name: e.category, value: safeNum(e.amount) })
    return acc
  }, []).sort((a, b) => b.value - a.value)

  const recentExpenses = [...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3)

  // Financial tips computed from real user data
  const tips = (() => {
    const list = []
    if (balance < 0) {
      list.push({ icon: '🚨', title: 'Spending Alert', desc: `You're ${fmt(Math.abs(balance), currencySymbol)} over income this month. Cut non-essentials.`, color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' })
    } else if (savingsRate < 10 && totalIncome > 0) {
      list.push({ icon: '💡', title: 'Low Savings Rate', desc: `Saving ${savingsRate}% this month. Aim for 20%+ for financial security.`, color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' })
    } else if (savingsRate >= 20) {
      list.push({ icon: '🎉', title: 'Great Savings!', desc: `You're saving ${savingsRate}% of income this month — excellent discipline!`, color: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20' })
    } else if (totalIncome > 0) {
      list.push({ icon: '📈', title: 'On Track', desc: `${savingsRate}% savings rate. Push to 20% for stronger long-term security.`, color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' })
    }
    const overBudget = categoryData.filter(cat => {
      const b = budgets.find(bud => bud.category === cat.name)
      return b && cat.value > safeNum(b.amount)
    })
    if (overBudget.length > 0) {
      list.push({ icon: '⚠️', title: 'Budget Exceeded', desc: `Over budget on: ${overBudget.map(c => c.name).join(', ')}. Review your limits.`, color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' })
    }
    if (categoryData.length > 0) {
      const top = categoryData[0]
      const pct = total > 0 ? Math.round((top.value / total) * 100) : 0
      if (pct > 40) {
        list.push({ icon: CATEGORY_ICONS[top.name] || '📦', title: `Heavy ${top.name} Spending`, desc: `${top.name} is ${pct}% of your spending. Small changes here have the biggest impact.`, color: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20' })
      }
    }
    const nearGoals = savingsGoals.filter(g => {
      const pct = safeNum(g.target_amount) > 0 ? safeNum(g.saved_amount) / safeNum(g.target_amount) : 0
      return pct >= 0.8 && pct < 1
    })
    if (nearGoals.length > 0) {
      list.push({ icon: '🏆', title: 'Almost There!', desc: `Close to reaching: ${nearGoals.map(g => g.name).join(', ')}. One final push!`, color: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' })
    }
    if (list.length === 0) {
      list.push({ icon: '📊', title: 'Start Tracking', desc: 'Log expenses regularly to unlock personalized financial insights.', color: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20' })
    }
    list.push({ icon: '💰', title: '50/30/20 Rule', desc: 'Allocate 50% to needs, 30% to wants, 20% to savings for a balanced budget.', color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' })
    list.push({ icon: '🔄', title: 'Emergency Fund', desc: 'Aim for 3–6 months of expenses in a liquid savings account for financial security.', color: 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20' })
    return list
  })()

  // Handlers
  const handleAddExpense = async (form) => {
    const tempId = `_opt_${Date.now()}`
    const tempExp = { ...form, id: tempId, _optimistic: true, date: form.date || new Date().toISOString().split('T')[0] }
    setExpenses(prev => [tempExp, ...prev])
    setShowAddExp(false)
    try {
      await API.post('/expenses', form)
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
      await fetchExpenses()
      const budget = budgets.find(b => b.category === form.category)
      if (budget) {
        const r = await API.get('/expenses')
        const monthExp = r.data.filter(ex => { const d = new Date(ex.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
        const spent = monthExp.filter(ex => ex.category === form.category).reduce((s, ex) => s + safeNum(ex.amount), 0)
        const pct = (spent / safeNum(budget.amount)) * 100
        if (spent > safeNum(budget.amount)) {
          showToast('Over budget on ' + form.category + '!', 'error')
          await API.post('/notifications/budget-alert', { category: form.category, spent, limit: budget.amount }).catch(() => {})
          fetchNotifs()
        } else if (pct >= 80) {
          showToast(Math.round(pct) + '% of ' + form.category + ' budget used', 'warning')
        } else {
          showToast('Expense added!')
        }
      } else {
        showToast('Expense added!')
      }
      API.post('/insights/analyze-expense', { amount: form.amount, category: form.category, description: form.description })
        .then(r => { if (r.data.isBad) setBehaviorAlert(r.data.message) })
        .catch(() => {})
    } catch {
      setExpenses(prev => prev.filter(e => e.id !== tempId))
      showToast('Error adding expense', 'error')
    }
  }

  const handleAddIncome = async (form) => {
    try {
      await API.post('/income', { ...form, month: selectedMonth + 1, year: selectedYear })
      setShowAddInc(false)
      await fetchIncome()
      showToast('Income added!')
    } catch { showToast('Error adding income', 'error') }
  }

  const handleDeleteExpense = (id) => {
    askConfirm('Delete this expense?', async () => {
      setConfirm(null)
      try { await API.delete('/expenses/' + id); fetchExpenses(); showToast('Expense deleted', 'error') } catch { /* noop */ }
    })
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    try {
      await API.put('/expenses/' + editingExpense, editForm)
      setEditing(null); fetchExpenses(); showToast('Expense updated!')
    } catch { showToast('Error updating', 'error') }
  }

  const handleDeleteIncome = (id) => {
    askConfirm('Delete this income entry?', async () => {
      setConfirm(null)
      try { await API.delete('/income/' + id); fetchIncome(); showToast('Income deleted', 'error') } catch { /* noop */ }
    })
  }

  const prevMonth = () => { if (selectedMonth === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (selectedMonth === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  if (loading) return (
    <Layout unreadCount={0}>
      <div className="min-h-screen"><DashboardSkeleton /></div>
    </Layout>
  )

  const inputCls = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
  const PANEL_LABELS = ['Overview', 'Today', 'World News']

  const recurringExpensesList = expenses.filter(e => e.is_recurring)
  const recurringIncomeList   = incomeList.filter(i => i.is_recurring)

  return (
    <Layout unreadCount={unread} onBellClick={() => { setShowNotifs(v => !v); if (!showNotifs) markRead() }}>
      {toast    && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm  && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {showQuestions && <OnboardingQuestions onDone={() => { setShowQuestions(false); setShowOnboarding(true) }} />}
      {!showQuestions && showOnboarding && <Onboarding onDone={() => { localStorage.setItem(`fina_onboarded_${getWalletKey()}`, '1'); setShowOnboarding(false) }} />}
      {modalData && <NumberModal {...modalData} onClose={() => setModalData(null)} />}
      {showAddExp   && <AddExpenseSheet onClose={() => setShowAddExp(false)} onSave={handleAddExpense} currencySymbol={currencySymbol} categories={dynCats} onAddCategory={async (name, emoji) => { await addCategory(name, emoji); refreshCats() }} />}
      {showAddInc   && <AddIncomeSheet  onClose={() => setShowAddInc(false)} onSave={handleAddIncome} currencySymbol={currencySymbol} />}
      {showVoice    && <VoiceAssistant onClose={() => setShowVoice(false)} />}
      {showWrap && <MonthlyWrap onClose={() => { localStorage.setItem(wrapKey, '1'); setShowWrap(false) }} />}

      {/* Push notification prompt banner */}
      {showNotifPrompt && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-violet-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <span className="text-lg">🔔</span>
          <span className="flex-1 text-sm font-medium">Get budget alerts &amp; daily reminders</span>
          <button
            onClick={async () => {
              localStorage.setItem('fina_notif_asked', '1')
              setShowNotifPrompt(false)
              await requestNotificationPermission()
            }}
            className="bg-white text-violet-700 font-semibold text-sm px-4 py-1.5 rounded-xl shrink-0"
          >Enable</button>
          <button
            onClick={() => { localStorage.setItem('fina_notif_asked', '1'); setShowNotifPrompt(false) }}
            className="text-violet-200 text-xl leading-none shrink-0"
            aria-label="Dismiss"
          >×</button>
        </div>
      )}

      {/* AI Behavior Alert */}
      {behaviorAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBehaviorAlert(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-xl">💬</div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white text-sm">AI Notice</p>
                <p className="text-gray-400 text-xs">About your last transaction</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-5">{behaviorAlert}</p>
            <div className="flex gap-2">
              <button onClick={() => setBehaviorAlert(null)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-2xl font-semibold text-sm">Got it</button>
              <button onClick={() => { setBehaviorAlert(null); window.location.href = '/insights' }}
                className="flex-1 bg-violet-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-violet-700 transition">Chat with AI</button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Recurring Check Modal */}
      {monthlyCheckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center text-xl">📋</div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">Monthly Check-in</p>
                <p className="text-gray-400 text-xs">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">Here are your scheduled recurring transactions. Make sure everything still looks right:</p>
            <div className="overflow-y-auto flex-1 space-y-2 mb-4">
              {recurringExpensesList.length === 0 && recurringIncomeList.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No recurring transactions set up yet.</p>
              )}
              {recurringExpensesList.map(e => (
                <div key={e.id} className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                  <span className="text-base shrink-0">{CAT_ICONS_MAP[e.category] || '📦'}</span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{e.description || e.category}</span>
                  <span className="text-xs font-bold text-red-500 shrink-0">-{currencySymbol}{parseFloat(e.amount).toFixed(2)}/{(e.recurring_frequency || 'monthly').replace('monthly','mo').replace('weekly','wk').replace('daily','day')}</span>
                </div>
              ))}
              {recurringIncomeList.map(i => (
                <div key={i.id} className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2.5">
                  <span className="text-base shrink-0">💵</span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{i.source || 'Income'}</span>
                  <span className="text-xs font-bold text-green-500 shrink-0">+{currencySymbol}{parseFloat(i.amount).toFixed(2)}/mo</span>
                </div>
              ))}
            </div>
            <button onClick={() => {
              const now = new Date()
              localStorage.setItem('fina_month_confirmed', `${now.getFullYear()}-${now.getMonth() + 1}`)
              setMonthlyCheckModal(false)
            }} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition">
              Looks good ✓
            </button>
          </div>
        </div>
      )}

      {/* Notifications panel */}
      {showNotifs && (
        <div ref={notifRef} className="fixed top-16 right-4 z-40 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Notifications</p>
            {notifications.length > 0 && (
              <button onClick={clearAllNotifs} className="text-xs text-red-500 hover:underline font-medium">Clear all</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="text-3xl">🔔</span>
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 15).map(n => (
                <div key={n.id} className={`flex items-start gap-2 px-4 py-3 border-b border-gray-50 dark:border-gray-700/60 group ${n.is_read ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-violet-500'}`} />
                  <p className="text-xs flex-1 leading-relaxed">{n.message}</p>
                  <button onClick={() => deleteNotif(n.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition p-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 pb-8 page-enter">

        {/* Month Selector — hidden by default, user-controlled */}
        {showMonthSelector ? (
          <div className="flex items-center justify-between mb-4 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-violet-50 hover:text-violet-600 transition font-bold text-lg">&lsaquo;</button>
            <div className="text-center">
              <p className="font-semibold text-gray-800 dark:text-white text-sm">{monthName}</p>
              {isCurrentMonth && <span className="text-xs text-violet-500 font-medium">Current month</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={nextMonth} disabled={isCurrentMonth}
                className={`w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition font-bold text-lg ${isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-violet-50 hover:text-violet-600'}`}>
                &rsaquo;
              </button>
              <button onClick={toggleMonthSelector} className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-400 transition text-base">✕</button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end mb-3">
            <button onClick={toggleMonthSelector} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition font-medium">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Browse months
            </button>
          </div>
        )}

        {/* ── Swipeable Carousel ────────────────────────────── */}
        <div className="mb-5">
          {/* Panel tabs */}
          <div className="flex gap-1 mb-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {PANEL_LABELS.map((label, i) => (
              <button key={i} onClick={() => setCarousel(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${i === carouselPanel ? 'bg-white dark:bg-gray-700 text-violet-600 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Sliding panels wrapper */}
          <div className="overflow-hidden rounded-3xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${carouselPanel * 100}%)` }}>

              {/* Panel 0 — Balance overview */}
              <div className="w-full shrink-0">
                <div className="bg-linear-to-br from-violet-600 via-violet-700 to-purple-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white" />
                    <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white" />
                  </div>
                  <div className="relative">
                    <p className="text-violet-200 text-xs font-medium mb-1">
                      {user?.name ? 'Hey, ' + user.name.split(' ')[0] : 'Balance'} — {monthName}
                    </p>
                    <button onClick={() => setModalData({ label: 'Balance — ' + monthName, value: (balance >= 0 ? '+' : '-') + fmt(Math.abs(balance), currencySymbol), sub: savingsRate + '% savings rate' })}
                      className="text-left w-full">
                      <p className={`text-4xl font-bold text-white tabular-nums mb-1 ${balance < 0 ? 'text-red-200' : ''}`}>
                        {balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance), currencySymbol)}
                      </p>
                    </button>
                    <p className="text-violet-200 text-xs">
                      {balance >= 0 ? savingsRate + '% saved this month' : 'Spending over income'}
                    </p>
                    {/* Spending forecast inline */}
                    {isCurrentMonth && total > 0 && (() => {
                      const dayOfMonth = today.getDate()
                      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
                      const daysLeft = daysInMonth - dayOfMonth
                      const projected = (total / dayOfMonth) * daysInMonth
                      const diff = projected - totalIncome
                      const pct = Math.min((total / Math.max(projected, 1)) * 100, 100)
                      return (
                        <div className="mt-3 bg-white/10 rounded-2xl px-4 py-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-white text-xs font-semibold">Month-End Estimate</p>
                              <p className="text-violet-300 text-[10px] mt-0.5">Based on your daily pace · {daysLeft}d left</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-base font-bold tabular-nums ${diff > 0 ? 'text-red-300' : 'text-green-300'}`}>{fmt(projected, currencySymbol)}</p>
                              <p className={`text-[10px] font-medium ${diff > 0 ? 'text-red-300' : 'text-green-300'}`}>
                                {diff > 0 ? `↑ ${fmt(diff, currencySymbol)} over` : `✓ ${fmt(Math.abs(diff), currencySymbol)} surplus`}
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${diff > 0 ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="relative grid grid-cols-3 gap-2 mt-4">
                    <button onClick={() => setModalData({ label: 'Income — ' + monthName, value: fmt(totalIncome, currencySymbol), sub: monthIncome.length + ' source(s)' })}
                      className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                      <p className="text-green-300 text-xs mb-0.5">Income</p>
                      <p className="text-white font-bold text-sm tabular-nums truncate">{fmt(totalIncome, currencySymbol)}</p>
                    </button>
                    <button onClick={() => setModalData({ label: 'Spent — ' + monthName, value: fmt(total, currencySymbol), sub: monthExpenses.length + ' transactions' })}
                      className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                      <p className="text-red-300 text-xs mb-0.5">Spent</p>
                      <p className="text-white font-bold text-sm tabular-nums truncate">{fmt(total, currencySymbol)}</p>
                    </button>
                    <button onClick={() => setModalData({ label: 'Transactions', value: String(monthExpenses.length), sub: 'this month' })}
                      className="bg-white/15 rounded-2xl px-3 py-3 text-left active:scale-95 transition-transform">
                      <p className="text-violet-200 text-xs mb-0.5">Txns</p>
                      <p className="text-white font-bold text-sm tabular-nums">{monthExpenses.length}</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel 1 — Rotating Today Stats */}
              <div className="w-full shrink-0">
                <RotatingFactCard expenses={expenses} incomeList={incomeList} budgets={budgets} currencySymbol={currencySymbol} />
              </div>

              {/* Panel 2 — World & Financial News */}
              <div className="w-full shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden" style={{ minHeight: '212px' }}>
                  <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/60">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">World & Financial News</p>
                    <div className="flex items-center gap-2">
                      <button onClick={refreshNews} disabled={newsLoading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition disabled:opacity-40"
                        title="Refresh news">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          className={newsLoading ? 'animate-spin' : ''}>
                          <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                      </button>
                      <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
                      </span>
                    </div>
                  </div>
                  {newsLoading ? (
                    <div className="flex items-center justify-center py-12 gap-3">
                      <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">Loading headlines…</p>
                    </div>
                  ) : news.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-2 px-4 text-center">
                      <span className="text-3xl">📰</span>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">News unavailable</p>
                      <p className="text-gray-400 text-xs">Add a NEWS_API_KEY to your backend .env to enable live headlines</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="flex gap-3 px-4 py-4" style={{ width: 'max-content' }}>
                        {news.map((article, i) => (
                          <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                            className="w-52 shrink-0 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-700/50 block group">
                            <div className="relative h-28 overflow-hidden bg-gray-200 dark:bg-gray-600">
                              <img src={article.urlToImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={e => { e.target.parentElement.style.background = '#374151' }} />
                              <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[90%]">
                                {article.source?.name}
                              </span>
                            </div>
                            <div className="p-2.5">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight line-clamp-3">{article.title}</p>
                              <p className="text-[10px] text-gray-400 mt-1.5">{timeAgo(article.publishedAt)}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setCarousel(i)}
                className={`rounded-full transition-all duration-200 ${i === carouselPanel ? 'w-5 h-1.5 bg-violet-600' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600'}`} />
            ))}
          </div>
        </div>
        {/* ── End Carousel ─────────────────────────────────── */}


        {/* Budget Alerts */}
        {(() => {
          const alerts = budgets.map(b => {
            const spent = monthExpenses.filter(e => e.category === b.category).reduce((s, e) => s + safeNum(e.amount), 0)
            const limit = safeNum(b.amount)
            const pct   = limit > 0 ? (spent / limit) * 100 : 0
            return { ...b, spent, pct }
          }).filter(b => b.pct >= 80).sort((a, b) => b.pct - a.pct)
          if (alerts.length === 0) return null
          return (
            <div className="mb-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-orange-100 dark:border-orange-900/30">
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                <div className="w-7 h-7 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center text-sm shrink-0">⚠️</div>
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">Budget Alerts</p>
                  <p className="text-xs text-gray-400">{alerts.length} budget{alerts.length !== 1 ? 's' : ''} near or over limit</p>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-3 mt-1">
                {alerts.map(b => (
                  <div key={b.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 tabular-nums">{fmt(b.spent, currencySymbol)} / {fmt(b.amount, currencySymbol)}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${b.pct >= 100 ? 'bg-red-100 text-red-600 dark:bg-red-900/40' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40'}`}>
                          {Math.round(b.pct)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${b.pct >= 100 ? 'bg-red-500' : 'bg-orange-400'}`}
                        style={{ width: `${Math.min(b.pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Monthly Wrap Banner — last 3 days of month, disappears after watching */}
        {showWrapBanner && (
          <button onClick={() => setShowWrap(true)}
            className="w-full mb-4 relative overflow-hidden rounded-2xl bg-linear-to-r from-violet-600 via-indigo-600 to-violet-700 p-4 flex items-center gap-4 active:scale-95 transition-transform shadow-lg">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -bottom-4 right-16 w-16 h-16 bg-white/5 rounded-full" />
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl shrink-0 relative">🎊</div>
            <div className="text-left flex-1 min-w-0 relative">
              <p className="text-white font-black text-sm leading-tight">{new Date().toLocaleString('en-US',{month:'long'})} Wrapped is here!</p>
              <p className="text-white/70 text-xs mt-0.5 leading-tight">Your monthly highlights, reviewed by AI ✨</p>
            </div>
            <span className="text-white/60 text-lg relative">→</span>
          </button>
        )}

        {/* Quick Actions */}
        {isCurrentMonth && (
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-4 gap-2.5">
              {[
                {
                  label: 'Expense',
                  grad: 'from-rose-400 to-pink-500',
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
                  action: () => setShowAddExp(true),
                },
                {
                  label: 'Income',
                  grad: 'from-emerald-400 to-teal-500',
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
                  action: () => setShowAddInc(true),
                },
                {
                  label: 'AI Log',
                  grad: 'from-violet-500 to-purple-600',
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
                  action: () => setShowVoice(true),
                },
                {
                  label: 'Reports',
                  grad: 'from-sky-400 to-blue-500',
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
                  action: () => window.location.href = '/reports',
                },
              ].map((a, i) => (
                <button key={i} onClick={a.action}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
                  <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${a.grad} flex items-center justify-center shadow-sm`}>{a.icon}</div>
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Bills */}
        {/* Bills Due Soon (from Budgets → Bills tab) */}
        {(() => {
          const allBills = (() => { try { return JSON.parse(localStorage.getItem('fina_bills') || '[]') } catch { return [] } })()
          const pKey = `fina_paid_bills_${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`
          const paid = (() => { try { return JSON.parse(localStorage.getItem(pKey) || '[]') } catch { return [] } })()
          const calcDays = (dueDay) => {
            const now = new Date()
            const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), dueDay)
            if (thisMonthDue >= now) return Math.ceil((thisMonthDue - now) / 864e5)
            return Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, dueDay) - now) / 864e5)
          }
          const upcoming = allBills
            .filter(b => !paid.includes(b.id))
            .map(b => ({ ...b, days: calcDays(parseInt(b.dueDay)) }))
            .filter(b => b.days <= 7)
            .sort((a, b) => a.days - b.days)
          if (!upcoming.length) return null
          return (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-amber-800 dark:text-amber-400 text-sm">📅 Bills Due Soon</h3>
                <a href="/budgets" className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline">Manage →</a>
              </div>
              <div className="space-y-2.5">
                {upcoming.map(b => (
                  <div key={b.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{b.emoji || '📅'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{b.name}</p>
                        <p className={`text-xs font-semibold ${b.days === 0 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                          {b.days === 0 ? '⚠️ Due today' : `In ${b.days} day${b.days !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-white text-sm tabular-nums shrink-0">
                      {currencySymbol}{parseFloat(b.amount || 0).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Transactions</h3>
            <a href="/transactions" className="text-violet-600 text-xs font-semibold hover:underline">View all →</a>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">💸</p>
              <p className="text-gray-400 text-sm">No expenses for {monthName}</p>
              {isCurrentMonth && (
                <div className="flex gap-2 justify-center mt-3">
                  <button onClick={() => setShowAddExp(true)} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">+ Add Expense</button>
                  <a href="/transactions" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-xs font-semibold">View All</a>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {recentExpenses.map(expense => (
                <div key={expense.id}>
                  {editingExpense === expense.id ? (
                    <form onSubmit={handleEditSave} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} required min="0.01" step="0.01" className={inputCls} />
                        <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className={inputCls}>
                          <option>Food</option><option>Transport</option><option>Shopping</option><option>Subscriptions</option><option>Entertainment</option><option>Other</option>
                        </select>
                        <input type="text" placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={inputCls} />
                        <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} required className={inputCls} />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={editForm.is_recurring} onChange={e => setEditForm({ ...editForm, is_recurring: e.target.checked })} className="accent-violet-600" />
                        Recurring monthly
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold">Save</button>
                        <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white py-2 rounded-xl text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 transition group">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: (CATEGORY_COLORS[expense.category] || '#6B7280') + '22' }}>
                        {CATEGORY_ICONS[expense.category] || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {expense.description || expense.category}
                        </p>
                        <p className="text-xs text-gray-400">{expense.date?.split('T')[0]}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="font-bold text-gray-800 dark:text-white tabular-nums text-sm">
                          -{currencySymbol}{safeNum(expense.amount).toFixed(2)}
                        </p>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={() => { setEditing(expense.id); setEditForm({ amount: expense.amount, category: expense.category, description: expense.description || '', date: expense.date?.split('T')[0], is_recurring: expense.is_recurring || false }) }}
                            className="text-violet-400 hover:text-violet-600 p-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-400 hover:text-red-600 p-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spending by Category */}
        {categoryData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Spending by Category</h3>
              <a href="/budgets" className="text-violet-600 text-xs font-semibold hover:underline">Budgets →</a>
            </div>
            <div className="flex items-center gap-5">
              {/* Donut chart */}
              <div className="shrink-0" style={{ width: 130, height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={60}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CAT_PALETTE[i % CAT_PALETTE.length]} />
                      ))}
                    </Pie>
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}>Total</text>
                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: '#7C3AED', fontWeight: 800 }}>{currencySymbol}{total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toFixed(0)}</text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category list with percentages */}
              <div className="flex-1 space-y-2.5 min-w-0">
                {categoryData.slice(0, 5).map((cat, i) => {
                  const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0
                  const color = CAT_PALETTE[i % CAT_PALETTE.length]
                  return (
                    <div key={cat.name} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate block mb-0.5">{cat.name}</span>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: pct + '%', backgroundColor: color }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0 min-w-[42px]">
                        <span className="text-sm font-bold tabular-nums" style={{ color }}>{pct}%</span>
                        <p className="text-[10px] text-gray-400 tabular-nums">{currencySymbol}{cat.value.toFixed(0)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions snapshot */}
        {subscriptions.length > 0 && (() => {
          const totalPerMonth = subscriptions.reduce((s, sub) => {
            const a = parseFloat(sub.amount) || 0
            if (sub.billing_cycle === 'yearly') return s + a / 12
            if (sub.billing_cycle === 'weekly')  return s + a * 4.33
            return s + a
          }, 0)
          const upcoming = subscriptions
            .filter(s => s.next_billing_date)
            .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
            .slice(0, 3)
          return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Subscriptions</h3>
                <a href="/subscriptions" className="text-violet-600 text-xs font-semibold hover:underline">Manage →</a>
              </div>
              <div className="flex items-center justify-between mb-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400">Monthly cost</p>
                  <p className="text-lg font-black text-violet-600 tabular-nums">{currencySymbol}{totalPerMonth.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Active</p>
                  <p className="text-lg font-black text-gray-800 dark:text-white">{subscriptions.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Per year</p>
                  <p className="text-sm font-bold text-gray-500 tabular-nums">{currencySymbol}{(totalPerMonth * 12).toFixed(0)}</p>
                </div>
              </div>
              {upcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Upcoming renewals</p>
                  {upcoming.map(sub => {
                    const days = Math.round((new Date(sub.next_billing_date) - new Date().setHours(0,0,0,0)) / 86400000)
                    return (
                      <div key={sub.id} className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate flex-1">{sub.name}</p>
                        <span className={`text-[11px] font-semibold ml-2 shrink-0 ${days <= 3 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {days === 0 ? 'Today' : days < 0 ? 'Overdue' : `in ${days}d`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* Income this month */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Income — {monthName}</h3>
            {isCurrentMonth && (
              <button onClick={() => setShowAddInc(true)} className="text-xs text-green-600 font-semibold hover:underline">+ Add</button>
            )}
          </div>
          {incomeList.length === 0 ? (
            <p className="text-gray-400 text-sm">No income recorded for {monthName}.</p>
          ) : (
            <div className="space-y-2">
              {incomeList.map(inc => (
                <div key={inc.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-sm">💵</div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{inc.source}</p>
                      {inc.is_recurring && <span className="text-xs text-green-600">Recurring</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600 tabular-nums text-sm">+{currencySymbol}{safeNum(inc.amount).toFixed(2)}</span>
                    {isCurrentMonth && (
                      <button onClick={() => handleDeleteIncome(inc.id)} className="text-red-400 hover:text-red-600 p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 font-semibold">Total</span>
                <span className="font-bold text-green-600 tabular-nums text-sm">{currencySymbol}{totalIncome.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 6-Month Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-4">6-Month Trend</h3>
          {trendsData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No trend data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendsData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <Tooltip formatter={v => currencySymbol + safeNum(v).toFixed(2)} />
                <Line type="monotone" dataKey="income"   stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Income" />
                <Line type="monotone" dataKey="spending" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Spent" />
                <Line type="monotone" dataKey="balance"  stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Savings Goals Preview */}
        {savingsGoals.filter(g => !dismissedGoals.includes(g.id)).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Savings Goals</h3>
              <a href="/goals" className="text-violet-600 text-xs font-semibold hover:underline">View all</a>
            </div>
            <div className="space-y-3">
              {savingsGoals.filter(g => !dismissedGoals.includes(g.id)).slice(0, 3).map((g, i) => {
                const saved  = safeNum(g.saved_amount)
                const target = safeNum(g.target_amount)
                const pct    = target > 0 ? Math.min((saved / target) * 100, 100) : 0
                const isComplete = pct >= 100
                return (
                  <div key={g.id}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{['🏖️','🚗','🏠','💻','✈️'][i % 5]}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-32">{g.name}</span>
                        {isComplete && <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Done!</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500 tabular-nums">{Math.round(pct)}%</span>
                        {isComplete && (
                          <button
                            onClick={() => {
                              const updated = [...dismissedGoals, g.id]
                              setDismissedGoals(updated)
                              localStorage.setItem('fina_dismissed_goals', JSON.stringify(updated))
                            }}
                            title="Remove from dashboard"
                            className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500 transition p-0.5 rounded">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-violet-500'}`}
                        style={{ width: pct + '%' }} />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs text-gray-400">{currencySymbol}{saved.toFixed(0)} saved</span>
                      <span className="text-xs text-gray-400">Goal: {currencySymbol}{target.toFixed(0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}


      </div>

    </Layout>
  )
}
