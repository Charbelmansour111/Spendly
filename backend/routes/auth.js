const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  }
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'INSERT INTO users (name, email, password, is_verified, verification_token) VALUES ($1, $2, $3, FALSE, $4)',
      [name, email, hashed, token]
    );

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
      from: `"Spendly 💸" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ Verify your Spendly account',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
          <h1 style="color: #4F46E5; font-size: 28px; margin-bottom: 4px;">Spendly 💸</h1>
          <p style="color: #6B7280; font-size: 14px; margin-bottom: 32px;">Track smarter, spend better</p>
          <h2 style="color: #111827; font-size: 20px;">Verify your email</h2>
          <p style="color: #374151;">Hi ${name}, thanks for signing up! Click the button below to verify your email and get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; margin: 24px 0; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">✅ Verify My Email</a>
          <p style="color: #9CA3AF; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
          <p style="color: #9CA3AF; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
      `
    });

    res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY EMAIL
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const result = await pool.query('SELECT * FROM users WHERE verification_token = $1', [token]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired token' });

    await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1',
      [token]
    );

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const user = result.rows[0];
    if (!user.is_verified) return res.status(403).json({ message: 'Please verify your email before logging in.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;