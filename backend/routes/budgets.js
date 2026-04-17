const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const budgets = await pool.query('SELECT * FROM budgets WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(budgets.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, amount, period, name } = req.body;
    if (!category || !amount) return res.status(400).json({ message: 'Category and amount required' });
    const p = period || 'monthly';
    const existing = await pool.query(
      'SELECT id FROM budgets WHERE user_id = $1 AND category = $2 AND (period = $3 OR period IS NULL)',
      [req.userId, category, p]
    );
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        'UPDATE budgets SET amount=$1, period=$2, name=$3 WHERE user_id=$4 AND category=$5 AND (period=$2 OR period IS NULL) RETURNING *',
        [amount, p, name || null, req.userId, category]
      );
      return res.json(updated.rows[0]);
    }
    const result = await pool.query(
      'INSERT INTO budgets (user_id, category, amount, period, name) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.userId, category, amount, p, name || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Budget deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;
