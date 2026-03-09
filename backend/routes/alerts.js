const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM spending_alerts WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id])
    res.json(result.rows)
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, period, amount } = req.body
    const result = await pool.query(
      'INSERT INTO spending_alerts (user_id, name, category, period, amount) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, name, category, period, amount]
    )
    res.json(result.rows[0])
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM spending_alerts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ message: 'Deleted' })
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE spending_alerts SET is_active = NOT is_active WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    )
    res.json(result.rows[0])
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

module.exports = router