const webpush = require('web-push');
const pool = require('../db');

webpush.setVapidDetails(
  'mailto:support@spendly.app',
  process.env.VAPID_PUBLIC_KEY || 'BH0cwQ-D5FPAwRtR_WOKDzmVdSLFDPPZzsCgnuKqLuh2CoGu9R5V93w3xm2BcF5AyuJ0LJip89-nvI_adpqhcmI',
  process.env.VAPID_PRIVATE_KEY || 'Bt9uUNC5vRBshI8J9CUnx7IJaJ5m1bAm8Csyaa2R0zY'
);

async function sendPush(userId, payload) {
  try {
    const result = await pool.query('SELECT subscription FROM push_subscriptions WHERE user_id=$1', [userId]);
    if (!result.rows.length) return;
    await webpush.sendNotification(result.rows[0].subscription, JSON.stringify(payload));
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id=$1', [userId]);
    }
  }
}

async function sendPushToAll(payload) {
  try {
    const result = await pool.query('SELECT user_id FROM push_subscriptions');
    await Promise.allSettled(result.rows.map(r => sendPush(r.user_id, payload)));
  } catch (e) {
    console.error('Push broadcast error:', e.message);
  }
}

module.exports = { sendPush, sendPushToAll };
