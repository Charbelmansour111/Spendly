import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const CATEGORIES = ['Mortgage', 'Car Loan', 'Credit Card', 'Student Loan', 'Personal Loan', 'Medical', 'Other']

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', LBP: 'L£', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' }

function fmt(n, sym) { return `${sym}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

const EMPTY = { name: '', total_amount: '', remaining_amount: '', monthly_payment: '', interest_rate: '', category: 'Other', due_date: '' }

export default function Debts() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const sym = CURRENCY_SYMBOLS[user.currency] || '$'

  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    API.get('/debts').then(r => setDebts(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openAdd = () => { setForm(EMPTY); setEditing(null); setShowModal(true) }
  const openEdit = (d) => { setForm({ ...d, due_date: d.due_date ? d.due_date.split('T')[0] : '' }); setEditing(d.id); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.total_amount) return showToast('Name and total amount are required')
    setSaving(true)
    try {
      if (editing) {
        const r = await API.put(`/debts/${editing}`, form)
        setDebts(prev => prev.map(d => d.id === editing ? r.data : d))
        showToast('Debt updated')
      } else {
        const r = await API.post('/debts', form)
        setDebts(prev => [r.data, ...prev])
        showToast('Debt added')
      }
      setShowModal(false)
    } catch { showToast('Failed to save') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this debt?')) return
    try {
      await API.delete(`/debts/${id}`)
      setDebts(prev => prev.filter(d => d.id !== id))
      showToast('Debt deleted')
    } catch { showToast('Failed to delete') }
  }

  const totalDebt = debts.reduce((s, d) => s + parseFloat(d.remaining_amount || 0), 0)
  const totalMonthly = debts.reduce((s, d) => s + parseFloat(d.monthly_payment || 0), 0)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Toast */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg border border-gray-700 animate-fade-in">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debt Tracker</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Monitor and pay down what you owe</p>
          </div>
          <button onClick={openAdd} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-sm">
            + Add Debt
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Total Remaining</p>
            <p className="text-2xl font-bold text-red-500">{fmt(totalDebt, sym)}</p>
            <p className="text-xs text-gray-400 mt-1">{debts.length} debt{debts.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Monthly Payments</p>
            <p className="text-2xl font-bold text-orange-400">{fmt(totalMonthly, sym)}</p>
            <p className="text-xs text-gray-400 mt-1">per month</p>
          </div>
        </div>

        {/* Empty state */}
        {!loading && debts.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
            <div className="text-5xl mb-4">🏦</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No debts tracked yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs mx-auto">Add loans, credit cards, or any money you owe to track your payoff progress.</p>
            <button onClick={openAdd} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-700 transition">
              Add your first debt
            </button>
          </div>
        )}

        {/* Debt list */}
        {debts.length > 0 && (
          <div className="space-y-4">
            {debts.map(d => {
              const pct = Math.min(100, Math.round(((parseFloat(d.total_amount) - parseFloat(d.remaining_amount)) / parseFloat(d.total_amount)) * 100))
              return (
                <div key={d.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
                      <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-full">{d.category}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-violet-500 transition p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-500 transition p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{pct}% paid off</span>
                      <span>{fmt(d.remaining_amount, sym)} remaining</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400">Total</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-200">{fmt(d.total_amount, sym)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Monthly</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-200">{fmt(d.monthly_payment, sym)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Interest</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-200">{d.interest_rate}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{editing ? 'Edit Debt' : 'Add Debt'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Chase Credit Card"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Total Amount</label>
                    <input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                      placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Remaining</label>
                    <input type="number" value={form.remaining_amount} onChange={e => setForm(f => ({ ...f, remaining_amount: e.target.value }))}
                      placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Monthly Payment</label>
                    <input type="number" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))}
                      placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Interest Rate %</label>
                    <input type="number" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
                      placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Due Date (optional)</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition disabled:opacity-60">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Debt'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
