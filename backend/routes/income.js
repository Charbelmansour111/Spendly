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

// GET income for a specific month/year
router.get('/', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query(
      'SELECT * FROM income WHERE user_id = $1 AND month = $2 AND year = $3',
      [req.userId, month, year]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD or UPDATE income entry
router.post('/', verifyToken, async (req, res) => {
  try {
    const { amount, source, month, year } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    const result = await pool.query(
      `INSERT INTO income (user_id, amount, source, month, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, month, year, source)
       DO UPDATE SET amount = $2
       RETURNING *`,
      [req.userId, amount, source || 'Salary', month, year]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE income entry
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM income WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Income deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;