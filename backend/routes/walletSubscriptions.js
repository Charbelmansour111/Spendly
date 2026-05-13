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

// GET /api/wallets/:walletId/subscriptions
router.get('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'SELECT * FROM wallet_subscriptions WHERE wallet_id=$1 AND user_id=$2 ORDER BY created_at DESC',
      [walletId, req.userId]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/wallets/:walletId/subscriptions
router.post('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { name, amount, billing_cycle, next_billing_date, category } = req.body
    if (!name || !amount) return res.status(400).json({ message: 'Name and amount required' })

    const r = await pool.query(
      `INSERT INTO wallet_subscriptions (wallet_id, user_id, name, amount, billing_cycle, next_billing_date, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [walletId, req.userId, name, amount, billing_cycle || 'monthly', next_billing_date || null, category || 'Other']
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/wallets/:walletId/subscriptions/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { name, amount, billing_cycle, next_billing_date, category } = req.body
    const r = await pool.query(
      `UPDATE wallet_subscriptions
       SET name=$1, amount=$2, billing_cycle=$3, next_billing_date=$4, category=$5
       WHERE id=$6 AND wallet_id=$7 AND user_id=$8 RETURNING *`,
      [name, amount, billing_cycle, next_billing_date, category, id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Subscription not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/wallets/:walletId/subscriptions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'DELETE FROM wallet_subscriptions WHERE id=$1 AND wallet_id=$2 AND user_id=$3 RETURNING id',
      [id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Subscription not found' })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
