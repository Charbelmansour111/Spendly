const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, target_amount, saved_amount, deadline } = req.body;
    const result = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, saved_amount, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, name, target_amount, saved_amount || 0, deadline]
    );
    res.status(201).json(result.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { saved_amount } = req.body;
    const result = await pool.query('UPDATE savings_goals SET saved_amount = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [saved_amount, req.params.id, req.userId]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Goal deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;