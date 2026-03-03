const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to verify token
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

// GET all expenses for logged in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const expenses = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC',
      [req.userId]
    );
    res.json(expenses.rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD new expense
router.post('/', verifyToken, async (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
    const newExpense = await pool.query(
      'INSERT INTO expenses (user_id, amount, category, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, amount, category, description, date]
    );
    res.status(201).json(newExpense.rows[0]);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE expense
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Expense deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});
// EDIT expense
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
 
    if (!amount || parseFloat(amount) <= 0) {
  return res.status(400).json({ message: 'Amount must be greater than 0' })
}
    const updated = await pool.query(
      'UPDATE expenses SET amount=$1, category=$2, description=$3, date=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [amount, category, description, date, req.params.id, req.userId]
    );
    res.json(updated.rows[0]);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;