const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.userId]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.put('/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.userId]);
    res.json({ message: 'Marked as read' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/budget-alert', authenticateToken, async (req, res) => {
  try {
    const { category, spent, limit } = req.body;
    const pct = ((spent / limit) * 100).toFixed(0);
    const isOver = spent > limit;
    const message = isOver
      ? `Over budget on ${category}! Spent $${parseFloat(spent).toFixed(2)} of $${parseFloat(limit).toFixed(2)}`
      : `${pct}% of ${category} budget used ($${parseFloat(spent).toFixed(2)} of $${parseFloat(limit).toFixed(2)})`;
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [req.userId, 'budget_alert', message]
    );
    res.json({ message: 'Alert saved' });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Auto stock alert when ingredient drops low
router.post('/stock-alert', authenticateToken, async (req, res) => {
  try {
    const { ingredient_name, current_qty, unit, threshold } = req.body;
    const message = `Low stock: ${ingredient_name} is at ${current_qty}${unit} (minimum: ${threshold}${unit}). Time to reorder!`;
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [req.userId, 'stock_alert', message]
    );
    res.json({ message: 'Stock alert saved' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;