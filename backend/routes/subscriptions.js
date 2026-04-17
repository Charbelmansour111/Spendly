const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, amount, billing_cycle, next_billing_date, category } = req.body;
    if (!name || !amount) return res.status(400).json({ message: 'Name and amount required' });
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, name, amount, billing_cycle, next_billing_date, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.userId, name, amount, billing_cycle || 'monthly', next_billing_date || null, category || 'Other']
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, amount, billing_cycle, next_billing_date, category } = req.body;
    const result = await pool.query(
      `UPDATE subscriptions SET name=$1, amount=$2, billing_cycle=$3, next_billing_date=$4, category=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [name, amount, billing_cycle, next_billing_date || null, category, req.params.id, req.userId]
    );
    res.json(result.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM subscriptions WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Subscription deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;
