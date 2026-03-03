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
    const user = await pool.query(
      'SELECT id, name, email, created_at, phone, country, interests, currency, onboarding_done FROM users WHERE id = $1',
      [req.userId]
    )
    const expenseStats = await pool.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1',
      [req.userId]
    )
    const incomeStats = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = $1',
      [req.userId]
    )

    // Best month = month with highest (income - expenses)
    const monthlyIncome = await pool.query(
      'SELECT month, year, COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = $1 GROUP BY month, year',
      [req.userId]
    )
    const monthlyExpenses = await pool.query(
      `SELECT EXTRACT(MONTH FROM date) as month, EXTRACT(YEAR FROM date) as year, COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE user_id = $1 GROUP BY month, year`,
      [req.userId]
    )

    let bestMonth = null
    let bestBalance = null
    for (const inc of monthlyIncome.rows) {
      const exp = monthlyExpenses.rows.find(e => parseInt(e.month) === inc.month && parseInt(e.year) === inc.year)
      const balance = parseFloat(inc.total) - parseFloat(exp?.total || 0)
      if (bestBalance === null || balance > bestBalance) {
        bestBalance = balance
        bestMonth = { month: inc.month, year: inc.year, balance }
      }
    }

    res.json({
      user: user.rows[0],
      totalExpenses: parseFloat(expenseStats.rows[0].total),
      totalTransactions: parseInt(expenseStats.rows[0].count),
      totalIncome: parseFloat(incomeStats.rows[0].total),
      bestMonth
    })
  } catch (e) {
    console.log(e)
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

// UPDATE onboarding info
router.put('/onboarding', verifyToken, async (req, res) => {
  try {
    const { phone, country, interests, currency } = req.body
    await pool.query(
      'UPDATE users SET phone=$1, country=$2, interests=$3, currency=$4, onboarding_done=TRUE WHERE id=$5',
      [phone, country, interests, currency || 'USD', req.userId]
    )
    res.json({ message: 'Profile updated' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
});

// UPDATE currency only
router.put('/currency', verifyToken, async (req, res) => {
  try {
    const { currency } = req.body
    await pool.query('UPDATE users SET currency=$1 WHERE id=$2', [currency, req.userId])
    res.json({ message: 'Currency updated' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
});

module.exports = router;