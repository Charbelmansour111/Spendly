const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const budgets = await pool.query('SELECT * FROM budgets WHERE user_id = $1', [req.userId]);
    res.json(budgets.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, amount } = req.body;
    const budget = await pool.query(
      `INSERT INTO budgets (user_id, category, amount) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category) DO UPDATE SET amount = $3 RETURNING *`,
      [req.userId, category, amount]
    );
    res.json(budget.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Budget deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;