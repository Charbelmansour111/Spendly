const express = require('express')
const router = express.Router({ mergeParams: true })
const pool = require('../db')
const auth = require('../middleware/auth')

async function verifyOwnership(walletId, userId) {
  const r = await pool.query(
    'SELECT id FROM wallets WHERE id=$1 AND user_id=$2 AND is_active=TRUE',
    [walletId, userId]
  )
  return r.rows.length > 0
}

// GET /api/wallets/:walletId/expenses
router.get('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { month, year } = req.query
    let query = `SELECT * FROM wallet_expenses WHERE wallet_id=$1 AND user_id=$2`
    const params = [walletId, req.userId]

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4`
      params.push(month, year)
    }
    query += ` ORDER BY date DESC`

    const r = await pool.query(query, params)
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/wallets/:walletId/expenses
router.post('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { amount, category, description, date, is_recurring, recurring_frequency, expense_scope, payment_method, notes } = req.body
    if (!amount || !date) return res.status(400).json({ message: 'Amount and date required' })

    const r = await pool.query(
      `INSERT INTO wallet_expenses
         (wallet_id, user_id, amount, category, description, date, is_recurring, recurring_frequency, expense_scope, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [walletId, req.userId, amount, category || 'Other', description || '', date,
       is_recurring || false, recurring_frequency || 'monthly', expense_scope || 'monthly',
       payment_method || 'Card', notes || null]
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/wallets/:walletId/expenses/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { amount, category, description, date, is_recurring, recurring_frequency, payment_method, notes } = req.body
    const r = await pool.query(
      `UPDATE wallet_expenses
       SET amount=$1, category=$2, description=$3, date=$4, is_recurring=$5,
           recurring_frequency=$6, payment_method=$7, notes=$8
       WHERE id=$9 AND wallet_id=$10 AND user_id=$11
       RETURNING *`,
      [amount, category, description, date, is_recurring, recurring_frequency, payment_method, notes, id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Expense not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/wallets/:walletId/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'DELETE FROM wallet_expenses WHERE id=$1 AND wallet_id=$2 AND user_id=$3 RETURNING id',
      [id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Expense not found' })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
