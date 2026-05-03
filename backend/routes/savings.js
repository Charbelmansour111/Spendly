const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { sendPush } = require('../services/push');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, target_amount, saved_amount, deadline, goal_type } = req.body;
    const result = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, saved_amount, deadline, goal_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, name, target_amount, saved_amount || 0, deadline || null, goal_type || 'Other']
    );
    res.status(201).json(result.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.patch('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const goalRes = await pool.query('SELECT * FROM savings_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    if (!goalRes.rows[0]) return res.status(404).json({ message: 'Goal not found' });
    const goal = goalRes.rows[0];

    await pool.query('DELETE FROM savings_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);

    // Deduct the saved amount from cash balance (money is now spent/paid out)
    const savedAmount = parseFloat(goal.saved_amount) || 0;
    let deductedFromCash = false;
    if (savedAmount > 0) {
      await pool.query(
        `INSERT INTO net_worth_adjustments (user_id, amount, description, type) VALUES ($1,$2,$3,'goal_paid')`,
        [req.userId, -savedAmount, `Goal paid: ${goal.name}`]
      );
      deductedFromCash = true;
    }

    res.json({ message: 'Goal completed', goalName: goal.name, savedAmount, deductedFromCash });

    sendPush(req.userId, {
      title: '🎉 Goal Completed!',
      body: `You paid off your "${goal.name}" goal!${deductedFromCash ? ` ${savedAmount > 0 ? '$' + savedAmount.toFixed(2) + ' deducted from cash balance.' : ''}` : ''}`,
      icon: '/icon-192.png', badge: '/icon-192.png',
      url: '/goals', tag: `goal-done-${req.params.id}`,
    });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { saved_amount } = req.body;
    const prev = await pool.query('SELECT * FROM savings_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    const result = await pool.query('UPDATE savings_goals SET saved_amount = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [saved_amount, req.params.id, req.userId]);
    res.json(result.rows[0]);

    // Goal milestone push — fire and forget
    if (prev.rows[0]) {
      const goal = prev.rows[0];
      const target = parseFloat(goal.target_amount);
      if (target > 0) {
        const oldPct = parseFloat(goal.saved_amount) / target;
        const newPct = parseFloat(saved_amount) / target;
        if (oldPct < 0.5 && newPct >= 0.5) {
          sendPush(req.userId, {
            title: "Halfway there! 🎯",
            body: `You're 50% of the way to your "${goal.name}" goal. Keep it up!`,
            icon: '/icon-192.png', badge: '/icon-192.png',
            url: '/goals', tag: `goal-50-${goal.id}`,
          });
        } else if (oldPct < 0.9 && newPct >= 0.9) {
          sendPush(req.userId, {
            title: "Almost there! 🔥",
            body: `90% saved for "${goal.name}" — you're so close!`,
            icon: '/icon-192.png', badge: '/icon-192.png',
            url: '/goals', tag: `goal-90-${goal.id}`,
          });
        }
      }
    }
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Goal deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;