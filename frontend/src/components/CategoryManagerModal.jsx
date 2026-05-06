import { useState } from 'react'

const EMOJI_PRESETS = ['🍔','☕','🚗','🛍️','🎬','🏥','🏋️','🎓','💡','✈️','🎁','📱','📦','🐾','👶','🎮','🎵','🏠','💊','🌿','🍺','🎯','💼','🏦','🚀','❤️','🌟','🎉']

export default function CategoryManagerModal({ categories, onAdd, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await onAdd(name.trim(), emoji)
      setName('')
      setEmoji('📦')
    } catch (e) {
      setError(e?.response?.data?.message || 'Already exists')
    }
    setSaving(false)
  }

  const custom = categories.filter(c => !c.isDefault)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Manage Categories</h2>
            <p className="text-xs text-gray-400 mt-0.5">{custom.length} custom · {categories.filter(c => c.isDefault).length} default</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Add new */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add custom category</p>
            {/* Emoji picker */}
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition ${emoji === e ? 'bg-violet-600 ring-2 ring-violet-400' : 'bg-white dark:bg-gray-700 hover:bg-violet-50'}`}>
                  {e}
                </button>
              ))}
            </div>
            {/* Name input + add button */}
            <div className="flex gap-2">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xl shrink-0">{emoji}</div>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Category name…"
                maxLength={30}
                className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 text-gray-900 dark:text-white"
              />
              <button onClick={handleAdd} disabled={!name.trim() || saving}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition shrink-0">
                {saving ? '…' : 'Add'}
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Custom categories list */}
          {custom.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your categories</p>
              <div className="space-y-2">
                {custom.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-3 py-3 border border-gray-100 dark:border-gray-700">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: (cat.color || '#6B7280') + '22' }}>
                      {cat.emoji}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-white">{cat.name}</span>
                    <button onClick={() => onDelete(cat.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default categories (read-only) */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Default categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.filter(c => c.isDefault).map(cat => (
                <div key={cat.name} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
