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

    // Add goal_type to savings_goals
    await pool.query(`ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(50) DEFAULT 'Other'`);

    // Advisor profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS advisor_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(255),
        phone VARCHAR(50),
        country VARCHAR(100),
        city VARCHAR(100),
        bio TEXT,
        languages TEXT,
        years_experience INTEGER,
        license_type VARCHAR(100),
        license_number VARCHAR(100),
        institution VARCHAR(255),
        specialty VARCHAR(255),
        id_scan_front TEXT,
        id_scan_back TEXT,
        license_scan TEXT,
        selfie_with_id TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by VARCHAR(255),
        is_public BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        clients_helped INTEGER DEFAULT 0,
        consultation_fee DECIMAL(10,2) DEFAULT 0,
        fee_currency VARCHAR(10) DEFAULT 'USD',
        offers_free_consultation BOOLEAN DEFAULT false
      )
    `);

    // Advisor reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS advisor_reviews (
        id SERIAL PRIMARY KEY,
        advisor_id INTEGER REFERENCES advisor_profiles(id) ON DELETE CASCADE,
        reviewer_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Admin actions log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(100),
        target_id INTEGER,
        admin_email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add account_subtype to users
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_subtype VARCHAR(20) DEFAULT 'personal'`);

    console.log('DB migration complete');
  } catch (e) {
    console.error('DB migration error:', e.message);
  }
}

module.exports = migrate;
