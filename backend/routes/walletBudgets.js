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

// GET /api/wallets/:walletId/budgets
router.get('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'SELECT * FROM wallet_budgets WHERE wallet_id=$1 AND user_id=$2 ORDER BY created_at DESC',
      [walletId, req.userId]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/wallets/:walletId/budgets
router.post('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { category, amount, period, name } = req.body
    if (!amount) return res.status(400).json({ message: 'Amount required' })

    const r = await pool.query(
      `INSERT INTO wallet_budgets (wallet_id, user_id, category, amount, period, name)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [walletId, req.userId, category || 'Other', amount, period || 'monthly', name || null]
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/wallets/:walletId/budgets/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { category, amount, period, name } = req.body
    const r = await pool.query(
      `UPDATE wallet_budgets SET category=$1, amount=$2, period=$3, name=$4
       WHERE id=$5 AND wallet_id=$6 AND user_id=$7 RETURNING *`,
      [category, amount, period, name, id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Budget not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/wallets/:walletId/budgets/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'DELETE FROM wallet_budgets WHERE id=$1 AND wallet_id=$2 AND user_id=$3 RETURNING id',
      [id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Budget not found' })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
