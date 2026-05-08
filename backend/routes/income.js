const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let result;
    if (month && year) {
      result = await pool.query('SELECT * FROM income WHERE user_id = $1 AND month = $2 AND year = $3 ORDER BY created_at DESC', [req.userId, month, year]);
    } else {
      result = await pool.query('SELECT * FROM income WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    }
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, source, month, year, is_recurring, recurring_frequency } = req.body;
    const existing = await pool.query(
      'SELECT id FROM income WHERE user_id = $1 AND month = $2 AND year = $3 AND source = $4',
      [req.userId, month, year, source]
    );
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE income SET amount = $1, is_recurring = $2, recurring_frequency = $3 WHERE id = $4 RETURNING *',
        [amount, is_recurring || false, recurring_frequency || 'monthly', existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO income (user_id, amount, source, month, year, is_recurring, recurring_frequency)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.userId, amount, source, month, year, is_recurring || false, recurring_frequency || 'monthly']
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.log('Income error:', e);
    res.status(500).json({ message: 'Server error' });
  }
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