const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

router.get('/', auth, async (req, res) => {
  try {
    const items = await pool.query(
      'SELECT * FROM net_worth_items WHERE user_id=$1 ORDER BY type, category, name',
      [req.userId]
    )
    const history = await pool.query(
      'SELECT * FROM net_worth_snapshots WHERE user_id=$1 ORDER BY snapshot_date DESC LIMIT 6',
      [req.userId]
    )
    const assets = items.rows.filter(i => i.type === 'asset')
    const liabilities = items.rows.filter(i => i.type === 'liability')
    const totalAssets = assets.reduce((s, i) => s + parseFloat(i.amount), 0)
    const totalLiabilities = liabilities.reduce((s, i) => s + parseFloat(i.amount), 0)
    const netWorth = totalAssets - totalLiabilities
    res.json({ items: items.rows, totalAssets, totalLiabilities, netWorth, history: history.rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/item', auth, async (req, res) => {
  try {
    const { name, category, amount, type } = req.body
    if (!name || amount === undefined || !type) return res.status(400).json({ message: 'Missing fields' })
    const result = await pool.query(
      'INSERT INTO net_worth_items (user_id, name, category, amount, type) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.userId, name, category || 'Other', parseFloat(amount) || 0, type]
    )
    res.status(201).json(result.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/item/:id', auth, async (req, res) => {
  try {
    const { name, category, amount } = req.body
    const result = await pool.query(
      'UPDATE net_worth_items SET name=$1, category=$2, amount=$3, updated_at=NOW() WHERE id=$4 AND user_id=$5 RETURNING *',
      [name, category, parseFloat(amount) || 0, req.params.id, req.userId]
    )
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/item/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM net_worth_items WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/snapshot', auth, async (req, res) => {
  try {
    const { totalAssets, totalLiabilities, netWorth } = req.body
    const today = new Date().toISOString().split('T')[0]
    await pool.query(
      `INSERT INTO net_worth_snapshots (user_id, total_assets, total_liabilities, net_worth, snapshot_date)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, snapshot_date) DO UPDATE SET total_assets=$2, total_liabilities=$3, net_worth=$4`,
      [req.userId, totalAssets, totalLiabilities, netWorth, today]
    )
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
