const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.userId = decoded.id || decoded.userId;
    next();
  });
}

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_onboarding WHERE user_id = $1',
      [req.userId]
    );
    res.json(result.rows[0] || null);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch onboarding data' });
  }
});

router.post('/', auth, async (req, res) => {
  const {
    life_situation, housing, education, pays_tuition,
    dependents, employment_status, financial_priority, monthly_income_estimate
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO user_onboarding
        (user_id, life_situation, housing, education, pays_tuition,
         dependents, employment_status, financial_priority, monthly_income_estimate, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
        life_situation = $2, housing = $3, education = $4,
        pays_tuition = $5, dependents = $6, employment_status = $7,
        financial_priority = $8, monthly_income_estimate = $9,
        updated_at = NOW()
       RETURNING *`,
      [req.userId, life_situation, housing, education, pays_tuition,
       dependents, employment_status, financial_priority, monthly_income_estimate]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Failed to save onboarding data' });
  }
});

module.exports = router;
