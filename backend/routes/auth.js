const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();

    await pool.query(
      'INSERT INTO users (name, email, password, is_verified, verification_token) VALUES ($1, $2, $3, FALSE, $4)',
      [name, email, hashed, code]
    );

    const { error } = await resend.emails.send({
      from: 'Spendly <onboarding@resend.dev>',
      to: email,
      subject: 'Your Spendly verification code',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
          <h1 style="color: #4F46E5; font-size: 28px; margin-bottom: 4px;">Spendly</h1>
          <p style="color: #6B7280; font-size: 14px; margin-bottom: 32px;">Track smarter, spend better</p>
          <h2 style="color: #111827; font-size: 20px;">Your verification code</h2>
          <p style="color: #374151;">Hi ${name}, use the code below to verify your account:</p>
          <div style="margin: 24px 0; background: white; border: 2px solid #4F46E5; border-radius: 12px; padding: 24px; text-align: center;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4F46E5;">${code}</span>
          </div>
          <p style="color: #9CA3AF; font-size: 12px;">This code expires in 24 hours. If you did not create an account, ignore this email.</p>
        </div>
      `
    });

    if (error) {
      console.log('Resend error:', error);
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.status(201).json({ message: 'Registration successful! Please check your email for the verification code.' });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY CODE
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND verification_token = $2', [email, code]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired code' });

    await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE email = $1',
      [email]
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

// Forgot password - send reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (user.rows.length === 0) return res.status(404).json({ message: 'No account found with this email' })

    const code = Math.floor(10000000 + Math.random() * 90000000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await pool.query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3', [code, expires, email])

    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Spendly <onboarding@resend.dev>',
      to: email,
      subject: '🔐 Your Spendly Password Reset Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
          <h1 style="color:#4F46E5;">Spendly</h1>
          <h2>Password Reset Code</h2>
          <p>Hi ${user.rows[0].name},</p>
          <p>Your password reset code is:</p>
          <div style="background:#4F46E5;color:white;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;border-radius:12px;margin:24px 0;">
            ${code}
          </div>
          <p style="color:#9CA3AF;font-size:13px;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `
    })
    res.json({ message: 'Reset code sent!' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// Reset password - verify code and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (user.rows.length === 0) return res.status(404).json({ message: 'No account found' })

    const u = user.rows[0]
    if (u.reset_token !== code) return res.status(400).json({ message: 'Invalid code' })
    if (new Date() > new Date(u.reset_token_expires)) return res.status(400).json({ message: 'Code expired' })

    const bcrypt = require('bcryptjs')
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2', [hashed, email])

    res.json({ message: 'Password reset successfully!' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router;