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

// GET /api/wallets/:walletId/income
router.get('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { month, year } = req.query
    let query = `SELECT * FROM wallet_income WHERE wallet_id=$1 AND user_id=$2`
    const params = [walletId, req.userId]

    if (month && year) {
      query += ` AND month=$3 AND year=$4`
      params.push(month, year)
    }
    query += ` ORDER BY year DESC, month DESC`

    const r = await pool.query(query, params)
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/wallets/:walletId/income
router.post('/', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { amount, source, description, month, year, is_recurring, recurring_frequency } = req.body
    if (!amount || !month || !year) return res.status(400).json({ message: 'Amount, month, and year required' })

    const r = await pool.query(
      `INSERT INTO wallet_income
         (wallet_id, user_id, amount, source, description, month, year, is_recurring, recurring_frequency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (wallet_id, source, month, year)
       DO UPDATE SET amount=EXCLUDED.amount, description=EXCLUDED.description
       RETURNING *`,
      [walletId, req.userId, amount, source || 'Other', description || '', month, year,
       is_recurring || false, recurring_frequency || 'monthly']
    )
    res.status(201).json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/wallets/:walletId/income/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const { amount, source, description, month, year, is_recurring, recurring_frequency } = req.body
    const r = await pool.query(
      `UPDATE wallet_income
       SET amount=$1, source=$2, description=$3, month=$4, year=$5, is_recurring=$6, recurring_frequency=$7
       WHERE id=$8 AND wallet_id=$9 AND user_id=$10
       RETURNING *`,
      [amount, source, description, month, year, is_recurring, recurring_frequency, id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Income not found' })
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/wallets/:walletId/income/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { walletId, id } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })

    const r = await pool.query(
      'DELETE FROM wallet_income WHERE id=$1 AND wallet_id=$2 AND user_id=$3 RETURNING id',
      [id, walletId, req.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Income not found' })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
