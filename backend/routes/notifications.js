const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// GET all notifications
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// MARK all as read
router.put('/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/budget-alert', auth, async (req, res) => {
  try {
    const { category, spent, limit } = req.body
    const pct = ((spent / limit) * 100).toFixed(0)
    const isOver = spent > limit
    const message = isOver
      ? `⚠️ Over budget on ${category}! Spent $${parseFloat(spent).toFixed(2)} of $${parseFloat(limit).toFixed(2)}`
      : `⚡ ${pct}% of ${category} budget used ($${parseFloat(spent).toFixed(2)} of $${parseFloat(limit).toFixed(2)})`

    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [req.user.id, 'budget_alert', message]
    );

    const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    const u = user.rows[0]
    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Spendly <onboarding@resend.dev>',
      to: u.email,
      subject: isOver ? `⚠️ Over budget on ${category}!` : `⚡ Budget warning for ${category}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
          <h1 style="color:#4F46E5;">Spendly</h1>
          <h2 style="color:${isOver ? '#EF4444' : '#F59E0B'};">${isOver ? '⚠️ Over Budget!' : '⚡ Budget Warning'}</h2>
          <p>Hi ${u.name},</p>
          <p>${message}</p>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;margin:16px 0;background:#4F46E5;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">View Dashboard</a>
        </div>
      `
    })

    res.json({ message: 'Budget alert sent!' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router;