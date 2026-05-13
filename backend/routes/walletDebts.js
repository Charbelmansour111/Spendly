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

// GET /api/wallets/:walletId/debts
router.get('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'SELECT * FROM wallet_debts WHERE wallet_id=$1 AND user_id=$2 ORDER BY created_at DESC',
      [walletId, req.userId]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/wallets/:walletId/debts
router.post('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date } = req.body
    if (!name || !total_amount) return res.status(400).json({ message: 'Name and total amount required' })

    const r = await pool.query(
      `INSERT INTO wallet_debts
         (wallet_id, user_id, name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [walletId, req.userId, name, total_amount, remaining_amount ?? total_amount,
       monthly_payment || 0, interest_rate || 0, category || 'Other', due_date || null]
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/wallets/:walletId/debts/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date } = req.body
    const r = await pool.query(
      `UPDATE wallet_debts
       SET name=$1, total_amount=$2, remaining_amount=$3, monthly_payment=$4,
           interest_rate=$5, category=$6, due_date=$7
       WHERE id=$8 AND wallet_id=$9 AND user_id=$10 RETURNING *`,
      [name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date, id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Debt not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/wallets/:walletId/debts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'DELETE FROM wallet_debts WHERE id=$1 AND wallet_id=$2 AND user_id=$3 RETURNING id',
      [id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Debt not found' })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
