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

// GET all expenses
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
    const { amount, category, description, date, is_recurring } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    const newExpense = await pool.query(
      'INSERT INTO expenses (user_id, amount, category, description, date, is_recurring) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, amount, category, description, date, is_recurring || false]
    );
    res.status(201).json(newExpense.rows[0]);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// EDIT expense
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { amount, category, description, date, is_recurring } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    const updated = await pool.query(
      'UPDATE expenses SET amount=$1, category=$2, description=$3, date=$4, is_recurring=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [amount, category, description, date, is_recurring || false, req.params.id, req.userId]
    );
    res.json(updated.rows[0]);
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

// AUTO-COPY recurring expenses to current month if not already there
router.post('/apply-recurring', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.body
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    // Get recurring expenses from previous month
    const recurring = await pool.query(
      `SELECT * FROM expenses WHERE user_id = $1 AND is_recurring = TRUE
       AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [req.userId, prevMonth, prevYear]
    )

    // Check which ones already exist this month
    const existing = await pool.query(
      `SELECT category, description FROM expenses WHERE user_id = $1
       AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3 AND is_recurring = TRUE`,
      [req.userId, month, year]
    )

    router.get('/trends', auth, async (req, res) => {
  try {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
    }

    const results = await Promise.all(months.map(async ({ month, year }) => {
      const expenses = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
        [req.user.id, month, year]
      )
      const income = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = $1 AND month = $2 AND year = $3`,
        [req.user.id, month, year]
      )
      const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' })
      return {
        label: `${monthName} ${year}`,
        spending: parseFloat(expenses.rows[0].total),
        income: parseFloat(income.rows[0].total),
        balance: parseFloat(income.rows[0].total) - parseFloat(expenses.rows[0].total)
      }
    }))

    res.json(results)
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
})

    const existingKeys = existing.rows.map(e => `${e.category}-${e.description}`)
    let added = 0

    for (const exp of recurring.rows) {
      const key = `${exp.category}-${exp.description}`
      if (!existingKeys.includes(key)) {
        const newDate = `${year}-${String(month).padStart(2, '0')}-01`
        await pool.query(
          'INSERT INTO expenses (user_id, amount, category, description, date, is_recurring) VALUES ($1, $2, $3, $4, $5, TRUE)',
          [req.userId, exp.amount, exp.category, exp.description, newDate]
        )
        added++
      }
    }

    res.json({ added })
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
});

module.exports = router;