const pool = require('../db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        remaining_amount DECIMAL(12,2) NOT NULL,
        monthly_payment DECIMAL(12,2) DEFAULT 0,
        interest_rate DECIMAL(5,2) DEFAULT 0,
        category VARCHAR(100) DEFAULT 'Other',
        due_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        next_billing_date DATE,
        category VARCHAR(100) DEFAULT 'Other',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add period + name columns to budgets if they don't exist
    await pool.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS period VARCHAR(20) DEFAULT 'monthly'`);
    await pool.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);

    console.log('DB migration complete');
  } catch (e) {
    console.error('DB migration error:', e.message);
  }
}

module.exports = migrate;
