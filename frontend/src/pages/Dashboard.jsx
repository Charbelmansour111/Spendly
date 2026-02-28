import { useEffect, useState } from 'react'
import API from '../utils/api'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

function Dashboard() {  
  const [user, setUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      window.location.href = '/login'
    } else {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser) setUser(parsedUser)
      fetchExpenses()
    }
  }, [])

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await API.get('/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setExpenses(res.data)
    } catch {
      console.log('Error fetching expenses')
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await API.post('/expenses', form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setForm({
        amount: '',
        category: 'Food',
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
      fetchExpenses()
    } catch {
      console.log('Error adding expense')
    }
  }

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await API.delete(`/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchExpenses()
    } catch {
      console.log('Error deleting expense')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const categoryData = expenses.reduce((acc, e) => {
  const existing = acc.find(item => item.name === e.category)
  if (existing) {
    existing.value += parseFloat(e.amount)
  } else {
    acc.push({ name: e.category, value: parseFloat(e.amount) })
  }
  return acc
}, [])

const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      {user && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Welcome, {user.name} 👋</h1>
            <button onClick={handleLogout}
              style={{ padding: '10px 20px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>

          <div style={{ backgroundColor: '#4F46E5', color: 'white', padding: '20px', borderRadius: '10px', marginTop: '20px', textAlign: 'center' }}>
            <p style={{ margin: 0 }}>Total Spent This Month</p>
            <h2 style={{ margin: '10px 0 0 0', fontSize: '36px' }}>${total.toFixed(2)}</h2>
          </div>

          <div style={{ backgroundColor: '#F3F4F6', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
            <h3>Add Expense</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="number"
                  name="amount"
                  placeholder="Amount ($)"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #D1D5DB' }}
                />
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #D1D5DB' }}
                >
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Shopping</option>
                  <option>Subscriptions</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
                <input
                  type="text"
                  name="description"
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={handleChange}
                  style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #D1D5DB' }}
                />
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #D1D5DB' }}
                />
              </div>
              <button type="submit"
                style={{ width: '100%', padding: '10px', backgroundColor: '#4F46E5', color: 'white', fontSize: '16px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Add Expense
              </button>
            </form>
          </div>

{categoryData.length > 0 && (
  <div style={{ marginTop: '20px' }}>
    <h3>Spending by Category</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div style={{ backgroundColor: '#F9FAFB', padding: '20px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
        <h4 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>Pie Chart</h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {categoryData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ backgroundColor: '#F9FAFB', padding: '20px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
        <h4 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>Bar Chart</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={categoryData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Bar dataKey="value" fill="#4F46E5" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
)}

          <div style={{ marginTop: '20px' }}>
            <h3>Your Expenses</h3>
            {expenses.length === 0 ? (
              <p style={{ color: '#6B7280', textAlign: 'center' }}>No expenses yet. Add your first one!</p>
            ) : (
              expenses.map(expense => (
                <div key={expense.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '10px', border: '1px solid #E5E7EB' }}>
                  <div>
                    <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{expense.category}</span>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>${parseFloat(expense.amount).toFixed(2)}</p>
                    {expense.description && <p style={{ margin: '2px 0 0 0', color: '#6B7280', fontSize: '14px' }}>{expense.description}</p>}
                    <p style={{ margin: '2px 0 0 0', color: '#9CA3AF', fontSize: '12px' }}>{expense.date?.split('T')[0]}</p>
                  </div>
                  <button onClick={() => handleDelete(expense.id)}
                    style={{ padding: '8px 15px', backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard