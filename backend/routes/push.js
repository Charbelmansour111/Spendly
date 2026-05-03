const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BH0cwQ-D5FPAwRtR_WOKDzmVdSLFDPPZzsCgnuKqLuh2CoGu9R5V93w3xm2BcF5AyuJ0LJip89-nvI_adpqhcmI';

router.get('/vapid-public-key', (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ message: 'Invalid subscription' });
    await pool.query(
      'INSERT INTO push_subscriptions (user_id, subscription) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET subscription=$2',
      [req.userId, JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Push subscribe error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE user_id=$1', [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
