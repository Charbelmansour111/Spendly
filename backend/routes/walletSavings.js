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

// GET /api/wallets/:walletId/savings
router.get('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'SELECT * FROM wallet_savings WHERE wallet_id=$1 AND user_id=$2 ORDER BY created_at DESC',
      [walletId, req.userId]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/wallets/:walletId/savings
router.post('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { name, target_amount, saved_amount, deadline, goal_type } = req.body
    if (!name || !target_amount) return res.status(400).json({ message: 'Name and target amount required' })

    const r = await pool.query(
      `INSERT INTO wallet_savings (wallet_id, user_id, name, target_amount, saved_amount, deadline, goal_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [walletId, req.userId, name, target_amount, saved_amount || 0, deadline || null, goal_type || 'Other']
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/wallets/:walletId/savings/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { name, target_amount, saved_amount, deadline, goal_type } = req.body
    const r = await pool.query(
      `UPDATE wallet_savings
       SET name=$1, target_amount=$2, saved_amount=$3, deadline=$4, goal_type=$5
       WHERE id=$6 AND wallet_id=$7 AND user_id=$8 RETURNING *`,
      [name, target_amount, saved_amount, deadline, goal_type, id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Savings goal not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/wallets/:walletId/savings/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'DELETE FROM wallet_savings WHERE id=$1 AND wallet_id=$2 AND user_id=$3 RETURNING id',
      [id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Savings goal not found' })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
