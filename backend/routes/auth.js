const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0)
      return res.status(400).json({ message: 'An account with this email already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, account_type, business_type, onboarding_done, currency)
       VALUES ($1, $2, $3, 'personal', NULL, FALSE, 'USD') RETURNING id, name, email, account_type, business_type`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, account_type: user.account_type, business_type: user.business_type }
    });
  } catch (e) {
    console.log('Register error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Invalid email or password' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency || 'USD',
        account_type: user.account_type || 'personal',
        business_type: user.business_type || null,
        onboarding_done: user.onboarding_done || false,
        account_type_selected: user.account_type_selected || false,
      }
    });
  } catch (e) {
    console.log('Login error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/account-type', authenticateToken, async (req, res) => {
  try {
    const { account_type, business_type } = req.body;
    if (!account_type || !['personal', 'business'].includes(account_type))
      return res.status(400).json({ message: 'Invalid account type' });
    if (account_type === 'business' && !['restaurant', 'firm'].includes(business_type))
      return res.status(400).json({ message: 'Invalid business type' });

    await pool.query(
      'UPDATE users SET account_type=$1, business_type=$2, account_type_selected=TRUE WHERE id=$3',
      [account_type, account_type === 'business' ? business_type : null, req.userId]
    );
    res.json({ message: 'Account type updated', account_type, business_type });
  } catch (e) {
    console.log('Account type error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/switch-account-type', authenticateToken, async (req, res) => {
  try {
    const { account_type, business_type, confirm_text } = req.body;
    const current = await pool.query('SELECT account_type FROM users WHERE id=$1', [req.userId]);
    const currentType = current.rows[0]?.account_type;

    if (currentType === 'business' && account_type === 'personal') {
      if (confirm_text !== 'CONFIRM')
        return res.status(400).json({ message: 'Please type CONFIRM to switch to personal' });
    }

    await pool.query(
      'UPDATE users SET account_type=$1, business_type=$2 WHERE id=$3',
      [account_type, account_type === 'business' ? business_type : null, req.userId]
    );
    res.json({ message: 'Account type switched', account_type, business_type });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, currency, account_type, business_type, onboarding_done, account_type_selected FROM users WHERE id=$1',
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;