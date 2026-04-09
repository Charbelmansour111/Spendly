const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.userId]);
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
      ? `⚠️ Over budget on ${category}! Spent $${parseFloat(spent).toFixed(2)} of $${parseFloat(limit).toFixed(2)}`
      : `⚡ ${pct}% of ${category} budget used ($${parseFloat(spent).toFixed(2)} of $${parseFloat(limit).toFixed(2)})`;
    await pool.query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [req.userId, 'budget_alert', message]);
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const u = user.rows[0];
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Spendly <onboarding@resend.dev>',
      to: u.email,
      subject: isOver ? `⚠️ Over budget on ${category}!` : `⚡ Budget warning for ${category}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;"><h1 style="color:#4F46E5;">Spendly</h1><h2 style="color:${isOver ? '#EF4444' : '#F59E0B'};">${isOver ? '⚠️ Over Budget!' : '⚡ Budget Warning'}</h2><p>Hi ${u.name},</p><p>${message}</p></div>`
    });
    res.json({ message: 'Budget alert sent!' });
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;