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

// GET all budgets for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const budgets = await pool.query(
      'SELECT * FROM budgets WHERE user_id = $1',
      [req.userId]
    );
    res.json(budgets.rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// SET budget for a category
router.post('/', verifyToken, async (req, res) => {
  try {
    const { category, amount } = req.body;
    const budget = await pool.query(
      `INSERT INTO budgets (user_id, category, amount) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, category) 
       DO UPDATE SET amount = $3 
       RETURNING *`,
      [req.userId, category, amount]
    );
    res.json(budget.rows[0]);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;