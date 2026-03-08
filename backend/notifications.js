const cron = require('node-cron');
const pool = require('./db');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html) {
  try {
    await resend.emails.send({
      from: 'Spendly <onboarding@resend.dev>',
      to,
      subject,
      html
    });
  } catch (e) {
    console.log('Email error:', e);
  }
}

async function createNotification(userId, type, message) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
    [userId, type, message]
  );
}

// DAILY EXPENSE REMINDER - 9 PM
cron.schedule('0 21 * * *', async () => {
  console.log('Running 9PM expense reminder...');
  try {
    const users = await pool.query('SELECT * FROM users WHERE is_verified = TRUE');
    const today = new Date().toISOString().split('T')[0];

    for (const user of users.rows) {
      const expenses = await pool.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND DATE(date) = $2',
        [user.id, today]
      );

      if (expenses.rows.length === 0) {
        await createNotification(user.id, 'daily_reminder', "Don't forget to log your expenses today!");
        await sendEmail(
          user.email,
          "Don't forget to log your expenses!",
          `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
            <h1 style="color: #4F46E5;">Spendly</h1>
            <p>Hi ${user.name},</p>
            <p>You haven't logged any expenses today. Keep your finances on track!</p>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;margin:16px 0;background:#4F46E5;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">Log Expenses Now</a>
            <p style="color:#9CA3AF;font-size:12px;">Spendly - Track smarter, spend better</p>
          </div>
          `
        );
      }
    }
  } catch (e) {
    console.log('9PM reminder error:', e);
  }
});

// DAILY EXPENSE REMINDER - 11 PM (resend if still no expenses)
cron.schedule('0 23 * * *', async () => {
  console.log('Running 11PM expense reminder...');
  try {
    const users = await pool.query('SELECT * FROM users WHERE is_verified = TRUE');
    const today = new Date().toISOString().split('T')[0];

    for (const user of users.rows) {
      const expenses = await pool.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND DATE(date) = $2',
        [user.id, today]
      );

      if (expenses.rows.length === 0) {
        await createNotification(user.id, 'daily_reminder', 'Last chance! You still have no expenses logged today.');
        await sendEmail(
          user.email,
          'Last chance to log your expenses today!',
          `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
            <h1 style="color: #4F46E5;">Spendly</h1>
            <p>Hi ${user.name},</p>
            <p>You still haven't logged any expenses today. This is your last reminder!</p>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;margin:16px 0;background:#4F46E5;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">Log Expenses Now</a>
            <p style="color:#9CA3AF;font-size:12px;">Spendly - Track smarter, spend better</p>
          </div>
          `
        );
      }
    }
  } catch (e) {
    console.log('11PM reminder error:', e);
  }
});

// MONTHLY SUMMARY - 1st of each month at 8 AM
cron.schedule('0 8 1 * *', async () => {
  console.log('Running monthly summary...');
  try {
    const users = await pool.query('SELECT * FROM users WHERE is_verified = TRUE');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthName = lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    for (const user of users.rows) {
      const expenses = await pool.query(
        'SELECT SUM(amount) as total, category FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3 GROUP BY category ORDER BY SUM(amount) DESC',
        [user.id, firstDay, lastDay]
      );

      if (expenses.rows.length === 0) continue;

      const total = expenses.rows.reduce((sum, r) => sum + parseFloat(r.total), 0).toFixed(2);
      const topCategory = expenses.rows[0].category;
      const breakdown = expenses.rows.map(r => `<li>${r.category}: $${parseFloat(r.total).toFixed(2)}</li>`).join('');

      const message = `Your ${monthName} summary: $${total} spent, most on ${topCategory}`;
      await createNotification(user.id, 'monthly_summary', message);
      await sendEmail(
        user.email,
        `Your ${monthName} Spending Summary`,
        `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
          <h1 style="color: #4F46E5;">Spendly</h1>
          <h2>Your ${monthName} Summary</h2>
          <p>Hi ${user.name}, here's how you spent last month:</p>
          <div style="background:white;border-radius:12px;padding:20px;margin:16px 0;">
            <p style="font-size:24px;font-weight:700;color:#4F46E5;">Total: $${total}</p>
            <p>Top category: <strong>${topCategory}</strong></p>
            <ul style="color:#374151;">${breakdown}</ul>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;margin:16px 0;background:#4F46E5;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">View Dashboard</a>
          <p style="color:#9CA3AF;font-size:12px;">Spendly - Track smarter, spend better</p>
        </div>
        `
      );
    }
  } catch (e) {
    console.log('Monthly summary error:', e);
  }
});

module.exports = { createNotification };
