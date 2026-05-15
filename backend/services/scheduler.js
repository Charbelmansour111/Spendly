const cron = require('node-cron');
const pool = require('../db');
const { sendPush, sendPushToAll } = require('./push');

const REMINDERS = [
  "💸 Don't forget to log today's expenses!",
  "📊 Keep your budget on track — log your spending!",
  "🛒 Did you spend anything today? Log it in Fina!",
  "☕ Had a coffee or lunch today? Add it to Fina!",
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
      title: 'Fina',
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
            title: 'Fina 🕚',
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

  // 1st of month at 9 AM — monthly spending summary
  cron.schedule('0 9 1 * *', async () => {
    console.log('[scheduler] Sending monthly summaries');
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthName = new Date(lastYear, lastMonth - 1, 1).toLocaleString('default', { month: 'long' });
    try {
      const subs = await pool.query('SELECT user_id FROM push_subscriptions');
      for (const { user_id } of subs.rows) {
        const r = await pool.query(
          `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as cnt
           FROM expenses WHERE user_id=$1
           AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
          [user_id, lastMonth, lastYear]
        );
        const total = parseFloat(r.rows[0].total).toFixed(2);
        const cnt   = parseInt(r.rows[0].cnt);
        if (cnt > 0) {
          await sendPush(user_id, {
            title: `${monthName} Summary 📅`,
            body: `You logged ${cnt} expenses totalling $${total} last month. New month, fresh start!`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            url: '/reports',
            tag: 'monthly-summary',
          });
        }
      }
    } catch (e) {
      console.error('[scheduler] Monthly summary error:', e.message);
    }
  });

  // Daily 10 AM — subscription renewals in 1–2 days
  cron.schedule('0 10 * * *', async () => {
    console.log('[scheduler] Checking subscription renewals');
    try {
      const rows = await pool.query(
        `SELECT s.user_id, s.name, s.amount,
                s.next_billing_date::date - CURRENT_DATE AS days_until
         FROM subscriptions s
         JOIN push_subscriptions p ON p.user_id = s.user_id
         WHERE s.next_billing_date::date - CURRENT_DATE IN (1, 2)
           AND s.next_billing_date IS NOT NULL`
      );
      for (const row of rows.rows) {
        const when = row.days_until === 1 ? 'tomorrow' : 'in 2 days';
        await sendPush(row.user_id, {
          title: 'Subscription Renewing 💳',
          body: `${row.name} renews ${when} for $${parseFloat(row.amount).toFixed(2)}`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: '/subscriptions',
          tag: `sub-renewal-${row.name}`,
        });
      }
    } catch (e) {
      console.error('[scheduler] Subscription renewal error:', e.message);
    }
  });

  // Daily 6 PM — inactivity nudge (3+ days since last seen)
  cron.schedule('0 18 * * *', async () => {
    console.log('[scheduler] Checking inactive users');
    try {
      const rows = await pool.query(
        `SELECT p.user_id FROM push_subscriptions p
         LEFT JOIN user_activity a ON a.user_id = p.user_id
         WHERE a.last_seen IS NULL
            OR CURRENT_DATE - a.last_seen >= 3`
      );
      for (const { user_id } of rows.rows) {
        await sendPush(user_id, {
          title: 'Miss you on Fina 👋',
          body: "You haven't logged any expenses in a few days. Stay on top of your budget!",
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: '/dashboard',
          tag: 'inactivity',
        });
      }
    } catch (e) {
      console.error('[scheduler] Inactivity error:', e.message);
    }
  });

  // Daily 10 AM — debt due dates in 3 days or overdue
  cron.schedule('30 10 * * *', async () => {
    console.log('[scheduler] Checking debt due dates');
    try {
      const rows = await pool.query(
        `SELECT d.user_id, d.name, d.remaining_amount, d.monthly_payment,
                d.due_date::date - CURRENT_DATE AS days_until
         FROM debts d
         JOIN push_subscriptions p ON p.user_id = d.user_id
         WHERE d.due_date IS NOT NULL
           AND d.due_date::date - CURRENT_DATE BETWEEN -1 AND 3
           AND d.remaining_amount > 0`
      );
      for (const row of rows.rows) {
        const days = parseInt(row.days_until);
        const when = days < 0 ? 'overdue' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
        const isOverdue = days < 0;
        await sendPush(row.user_id, {
          title: isOverdue ? `Debt Overdue ⚠️` : `Debt Due Soon 💸`,
          body: `${row.name} payment of $${parseFloat(row.monthly_payment || row.remaining_amount).toFixed(2)} is due ${when}`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: '/debts',
          tag: `debt-due-${row.name}`,
        });
      }
    } catch (e) {
      console.error('[scheduler] Debt due date error:', e.message);
    }
  });

  console.log('[scheduler] Cron jobs started (daily reminders, monthly summary, renewals, inactivity, debt due dates)');
}

module.exports = { startScheduler };
