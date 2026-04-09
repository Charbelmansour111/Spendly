const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query('SELECT * FROM income WHERE user_id = $1 AND month = $2 AND year = $3', [req.userId, month, year]);
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, source, month, year, is_recurring } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    const result = await pool.query(
      `INSERT INTO income (user_id, amount, source, month, year, is_recurring)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, month, year, source) DO UPDATE SET amount = $2, is_recurring = $6 RETURNING *`,
      [req.userId, amount, source || 'Salary', month, year, is_recurring || false]
    );
    res.status(201).json(result.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/apply-recurring', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.body;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const recurring = await pool.query(
      `SELECT * FROM income WHERE user_id = $1 AND is_recurring = TRUE AND month = $2 AND year = $3`,
      [req.userId, prevMonth, prevYear]
    );
    const existing = await pool.query(
      `SELECT source FROM income WHERE user_id = $1 AND month = $2 AND year = $3 AND is_recurring = TRUE`,
      [req.userId, month, year]
    );
    const existingSources = existing.rows.map(e => e.source);
    let added = 0;
    for (const inc of recurring.rows) {
      if (!existingSources.includes(inc.source)) {
        await pool.query('INSERT INTO income (user_id, amount, source, month, year, is_recurring) VALUES ($1, $2, $3, $4, $5, TRUE)', [req.userId, inc.amount, inc.source, month, year]);
        added++;
      }
    }
    res.json({ added });
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM income WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Income deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;