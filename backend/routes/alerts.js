const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM spending_alerts WHERE user_id = $1 ORDER BY created_at DESC', [req.userId])
    res.json(result.rows)
  } catch { res.status(500).json({ message: 'Server error' }) }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, category, period, amount } = req.body
    const result = await pool.query(
      'INSERT INTO spending_alerts (user_id, name, category, period, amount) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.userId, name, category, period, amount]
    )
    res.json(result.rows[0])
  } catch { res.status(500).json({ message: 'Server error' }) }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM spending_alerts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId])
    res.json({ message: 'Deleted' })
  } catch { res.status(500).json({ message: 'Server error' }) }
})

router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE spending_alerts SET is_active = NOT is_active WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.userId]
    )
    res.json(result.rows[0])
  } catch { res.status(500).json({ message: 'Server error' }) }
})

module.exports = router;