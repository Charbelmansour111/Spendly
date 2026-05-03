const cron = require('node-cron');
const pool = require('../db');
const { sendPush, sendPushToAll } = require('./push');

const REMINDERS = [
  "💸 Don't forget to log today's expenses!",
  "📊 Keep your budget on track — log your spending!",
  "🛒 Did you spend anything today? Log it in Spendly!",
  "☕ Had a coffee or lunch today? Add it to Spendly!",
  "🎯 Stay on target — track what you spent today!",
];

function randomReminder() {
  return REMINDERS[Math.floor(Math.random() * REMINDERS.length)];
}

function startScheduler() {
  // 9 PM daily — expense reminder for everyone
  cron.schedule('0 21 * * *', async () => {
    console.log('[scheduler] Sending 9 PM reminders');
    await sendPushToAll({
      title: 'Spendly',
      body: randomReminder(),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: '/transactions',
      tag: 'daily-9pm',
    });
  });

  // 11 PM — only users with NO expenses logged today
  cron.schedule('0 23 * * *', async () => {
    console.log('[scheduler] Sending 11 PM reminders to inactive users');
    const today = new Date().toISOString().split('T')[0];
    try {
      const subs = await pool.query('SELECT user_id FROM push_subscriptions');
      for (const { user_id } of subs.rows) {
        const exp = await pool.query(
          'SELECT COUNT(*) FROM expenses WHERE user_id=$1 AND date=$2',
          [user_id, today]
        );
        if (parseInt(exp.rows[0].count) === 0) {
          await sendPush(user_id, {
            title: 'Spendly 🕚',
            body: "You haven't logged anything today. Add your expenses before midnight!",
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            url: '/transactions',
            tag: 'daily-11pm',
          });
        }
      }
    } catch (e) {
      console.error('[scheduler] 11 PM error:', e.message);
    }
  });

  console.log('[scheduler] Cron jobs started');
}

module.exports = { startScheduler };
