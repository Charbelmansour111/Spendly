import { useEffect, useState } from 'react'
import API from '../utils/api'

function Profile() {
  const [profile, setProfile] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/login'; return }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfile(res.data)
      setNewName(res.data.user.name)
    } catch {
      console.log('Error fetching profile')
    }
    setLoading(false)
  }

  const handleUpdateName = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const res = await API.put('/profile/name', { name: newName }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const updatedUser = { ...JSON.parse(localStorage.getItem('user')), name: res.data.name }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setProfile({ ...profile, user: { ...profile.user, name: res.data.name } })
      setEditingName(false)
    } catch {
      console.log('Error updating name')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  const balance = profile.totalIncome - profile.totalExpenses
  const memberSince = new Date(profile.user.created_at).toLocaleDateString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <a href="/dashboard" className="text-2xl font-bold text-indigo-600">Spendly</a>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-gray-500 text-sm hover:text-indigo-600 transition">← Dashboard</a>
          <button onClick={handleLogout} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition">Logout</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-6 text-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
            👤
          </div>
          {editingName ? (
            <form onSubmit={handleUpdateName} className="flex gap-2 justify-center mt-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="px-4 py-2 rounded-xl text-gray-800 text-sm focus:outline-none"
                required
              />
              <button type="submit" className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-semibold">Save</button>
              <button type="button" onClick={() => setEditingName(false)} className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-xl text-sm">Cancel</button>
            </form>
          ) : (
            <div>
              <h2 className="text-2xl font-bold">{profile.user.name}</h2>
              <button onClick={() => setEditingName(true)} className="text-indigo-200 text-xs mt-1 hover:text-white transition">✏️ Edit name</button>
            </div>
          )}
          <p className="text-indigo-200 mt-2">{profile.user.email}</p>
          <p className="text-indigo-300 text-sm mt-1">Member since {memberSince}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-indigo-600">${profile.totalExpenses.toFixed(2)}</p>
            <p className="text-gray-500 text-sm mt-1">Total Spent Ever</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-green-600">${profile.totalIncome.toFixed(2)}</p>
            <p className="text-gray-500 text-sm mt-1">Total Income Ever</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {balance >= 0 ? '+' : '-'}${Math.abs(balance).toFixed(2)}
            </p>
            <p className="text-gray-500 text-sm mt-1">Overall Balance</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{profile.totalTransactions}</p>
            <p className="text-gray-500 text-sm mt-1">Total Transactions</p>
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">🏆 Most Spent Category</h3>
          <p className="text-2xl font-bold text-indigo-600">{profile.topCategory}</p>
          <p className="text-gray-400 text-sm mt-1">You spend the most on this category overall</p>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Name</span>
              <span className="font-medium text-gray-800">{profile.user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="font-medium text-gray-800">{profile.user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">Member Since</span>
              <span className="font-medium text-gray-800">{memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-gray-400 text-sm mt-8">
        <p>© 2026 <span className="text-indigo-600 font-semibold">Spendly</span> — Track smarter, spend better 💸</p>
      </footer>
    </div>
  )
}

export default Profile