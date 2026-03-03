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

// GET profile stats
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.userId])
    const expenseStats = await pool.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1',
      [req.userId]
    )
    const topCategory = await pool.query(
      'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = $1 GROUP BY category ORDER BY total DESC LIMIT 1',
      [req.userId]
    )
    const incomeStats = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = $1',
      [req.userId]
    )
    res.json({
      user: user.rows[0],
      totalExpenses: parseFloat(expenseStats.rows[0].total),
      totalTransactions: parseInt(expenseStats.rows[0].count),
      topCategory: topCategory.rows[0]?.category || 'None',
      totalIncome: parseFloat(incomeStats.rows[0].total)
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
});

// UPDATE name
router.put('/name', verifyToken, async (req, res) => {
  try {
    const { name } = req.body
    if (!name || name.trim() === '') return res.status(400).json({ message: 'Name cannot be empty' })
    const updated = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email',
      [name.trim(), req.userId]
    )
    res.json(updated.rows[0])
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
});

module.exports = router;