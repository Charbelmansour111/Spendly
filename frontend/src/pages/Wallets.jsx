import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import API from '../utils/api'

const WALLET_EMOJIS = ['🏦', '💳', '💵', '🏧', '💰', '🏪', '📱', '💼']
const WALLET_COLORS = ['#6B7280', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
const WALLET_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
]

const TYPE_LABELS = {
  checking: 'Checking', savings: 'Savings', credit: 'Credit Card',
  cash: 'Cash', investment: 'Investment', other: 'Other',
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-6 right-4 left-4 md:left-auto md:right-6 z-50 px-5 py-4 rounded-2xl shadow-lg text-white text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <span className="flex-1 min-w-0">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70">✕</button>
    </div>
  )
}

const EMPTY_FORM = { name: '', type: 'checking', balance: '', currency: 'USD', color: '#6B7280', emoji: '🏦' }

function WalletModal({ wallet, onSave, onClose }) {
  const [form, setForm] = useState(wallet ? { ...wallet, balance: String(wallet.balance) } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{wallet ? 'Edit Wallet' : 'Add Wallet'}</h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Wallet Name</label>
            <input type="text" placeholder="e.g. Main Checking" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required className={inputCls} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                {WALLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Balance</label>
              <input type="number" placeholder="0.00" value={form.balance}
                onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                min="0" step="0.01" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {WALLET_EMOJIS.map(em => (
                <button key={em} type="button" onClick={() => setForm(f => ({ ...f, emoji: em }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${form.emoji === em ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-gray-700 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}>
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {WALLET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving || !form.name}
            className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold hover:bg-violet-700 transition text-sm disabled:opacity-50">
            {saving ? 'Saving…' : wallet ? 'Save Changes' : 'Add Wallet'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Wallets() {
  const [wallets, setWallets] = useState([])
  const [stats, setStats] = useState({}) // { [walletId]: { total_spent, transaction_count } }
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editWallet, setEditWallet] = useState(null)

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  const fetchWallets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await API.get('/wallets')
      setWallets(res.data || [])
      // Fetch stats for each wallet
      const statsMap = {}
      await Promise.all((res.data || []).map(async w => {
        try {
          const s = await API.get(`/wallets/${w.id}/stats`)
          statsMap[w.id] = s.data
        } catch {
          statsMap[w.id] = { total_spent: '0', transaction_count: '0' }
        }
      }))
      setStats(statsMap)
    } catch {
      showToast('Error loading wallets', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchWallets()
  }, [fetchWallets])

  const handleSave = async (form) => {
    try {
      if (editWallet) {
        await API.put(`/wallets/${editWallet.id}`, form)
        showToast('Wallet updated!')
      } else {
        await API.post('/wallets', form)
        showToast('Wallet added!')
      }
      setShowModal(false)
      setEditWallet(null)
      fetchWallets()
    } catch {
      showToast('Error saving wallet', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this wallet? Expenses linked to it will be unlinked.')) return
    try {
      await API.delete(`/wallets/${id}`)
      showToast('Wallet deleted')
      fetchWallets()
    } catch {
      showToast('Error deleting wallet', 'error')
    }
  }

  const openEdit = (w) => {
    setEditWallet(w)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditWallet(null)
  }

  const totalBalance = wallets.reduce((s, w) => s + parseFloat(w.balance || 0), 0)

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showModal && (
        <WalletModal
          wallet={editWallet}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallets</h1>
            <p className="text-gray-400 text-sm mt-0.5">Your accounts &amp; cash wallets</p>
          </div>
          <button
            onClick={() => { setEditWallet(null); setShowModal(true) }}
            className="bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Wallet
          </button>
        </div>

        {/* Total balance card */}
        {wallets.length > 0 && (
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl px-5 py-4 mb-6 text-white">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Total Balance</p>
            <p className="text-3xl font-bold tabular-nums">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-white/60 text-xs mt-1">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* Wallet cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <p className="text-5xl mb-3">🏦</p>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No wallets yet</p>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
              Add your bank accounts and cash wallets to track balances
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
              Add your first wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wallets.map(w => {
              const walletStats = stats[w.id] || { total_spent: '0', transaction_count: '0' }
              const txCount = parseInt(walletStats.transaction_count) || 0
              return (
                <div key={w.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: w.color + '22', color: w.color }}>
                        {w.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{w.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: w.color + '22', color: w.color }}>
                          {TYPE_LABELS[w.type] || w.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(w)}
                        className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(w.id)}
                        className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Balance */}
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Balance</p>
                    <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                      {w.currency === 'USD' ? '$' : w.currency}{parseFloat(w.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Stats */}
                  <p className="text-xs text-gray-400">{txCount} transaction{txCount !== 1 ? 's' : ''} logged</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
