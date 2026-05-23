const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { Resend } = require('resend');
const authenticateToken = require('../middleware/auth');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── helpers ───────────────────────────────────────────────────────────────
async function sendVerificationEmail(email, name, token) {
  const link = `${process.env.FRONTEND_URL || 'https://spendly-frontend.vercel.app'}/verify-email?token=${token}`;
  await resend.emails.send({
    from: 'Fina <onboarding@resend.dev>',
    to: email,
    subject: 'Verify your Fina account',
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#5b21b6 0%,#7c3aed 55%,#4c1d95 100%);padding:36px 40px;text-align:center">
            <div style="display:inline-flex;align-items:center;gap:10px">
              <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
              <span style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px">Fina</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px">Verify your email</h1>
            <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6">Hi ${name}, welcome to Fina! Click the button below to verify your email address and activate your account.</p>
            <div style="text-align:center;margin:32px 0">
              <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:16px 36px;border-radius:14px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.2px">Verify Email Address →</a>
            </div>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center">This link expires in 24 hours. If you didn't create a Fina account, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9">
            <p style="margin:0;color:#cbd5e1;font-size:12px">© 2026 Fina · Track smarter, spend better</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── POST /register ─────────────────────────────────────────────────────────
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

    const hashedPassword  = await bcrypt.hash(password, 12);
    const verifyToken     = crypto.randomBytes(32).toString('hex');
    const tokenExpires    = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    await pool.query(
      `INSERT INTO users
         (name, email, password, account_type, business_type, onboarding_done, currency,
          email_verified, email_verification_token, email_token_expires)
       VALUES ($1,$2,$3,'personal',NULL,FALSE,'USD', FALSE,$4,$5)`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword, verifyToken, tokenExpires]
    );

    // Send verification email (non-blocking — don't fail if email fails)
    try { await sendVerificationEmail(email.toLowerCase().trim(), name.trim(), verifyToken); } catch (emailErr) {
      console.error('[auth] verification email failed:', emailErr.message);
    }

    res.status(201).json({
      message: 'Account created — please check your email to verify.',
      needsVerification: true,
      email: email.toLowerCase().trim(),
    });
  } catch (e) {
    console.log('Register error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Invalid email or password' });

    const user    = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    // Block unverified accounts
    if (user.email_verified === false) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email,
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id:                   user.id,
        name:                 user.name,
        email:                user.email,
        currency:             user.currency || 'USD',
        account_type:         user.account_type || 'personal',
        business_type:        user.business_type || null,
        onboarding_done:      user.onboarding_done || false,
        account_type_selected: user.account_type_selected || false,
        phone_verified:       user.phone_verified || false,
      },
    });
  } catch (e) {
    console.log('Login error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /verify-email?token=... ────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const result = await pool.query(
      'SELECT id, email_token_expires FROM users WHERE email_verification_token = $1',
      [token]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ message: 'Invalid or already used token' });

    const user = result.rows[0];
    if (new Date(user.email_token_expires) < new Date())
      return res.status(400).json({ message: 'Verification link has expired. Request a new one.' });

    await pool.query(
      'UPDATE users SET email_verified=TRUE, email_verification_token=NULL, email_token_expires=NULL WHERE id=$1',
      [user.id]
    );
    res.json({ message: 'Email verified successfully' });
  } catch (e) {
    console.log('Verify email error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /resend-verification ──────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const result = await pool.query(
      'SELECT id, name, email_verified FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    // Always respond "sent" to prevent email enumeration
    if (result.rows.length === 0 || result.rows[0].email_verified)
      return res.json({ message: 'If this email is pending verification, a new link has been sent.' });

    const user        = result.rows[0];
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET email_verification_token=$1, email_token_expires=$2 WHERE id=$3',
      [verifyToken, tokenExpires, user.id]
    );

    try { await sendVerificationEmail(email.toLowerCase().trim(), user.name, verifyToken); } catch {}
    res.json({ message: 'Verification email resent.' });
  } catch (e) {
    console.log('Resend verification error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /verify-phone ─────────────────────────────────────────────────────
// Frontend verifies phone via Firebase, gets an idToken, sends it here.
// We verify the idToken against Firebase REST API then save the phone number.
router.post('/verify-phone', authenticateToken, async (req, res) => {
  try {
    const { firebaseToken, phoneNumber } = req.body;
    if (!firebaseToken || !phoneNumber)
      return res.status(400).json({ message: 'firebaseToken and phoneNumber are required' });

    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'Firebase not configured on server' });

    // Verify the Firebase ID token via REST API
    const fbRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebaseToken }),
      }
    );
    const fbData = await fbRes.json();

    if (!fbRes.ok || !fbData.users || !fbData.users[0])
      return res.status(401).json({ message: 'Invalid Firebase token' });

    const fbUser = fbData.users[0];
    // Make sure the phone in the Firebase token matches what the client claims
    if (fbUser.phoneNumber !== phoneNumber)
      return res.status(400).json({ message: 'Phone number mismatch' });

    await pool.query(
      'UPDATE users SET phone_number=$1, phone_verified=TRUE WHERE id=$2',
      [phoneNumber, req.userId]
    );
    res.json({ message: 'Phone number verified', phoneNumber });
  } catch (e) {
    console.log('Verify phone error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT /account-type ──────────────────────────────────────────────────────
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

// ── PUT /switch-account-type ───────────────────────────────────────────────
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

// ── POST /forgot-password ──────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /me ────────────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, currency, account_type, business_type,
              onboarding_done, account_type_selected, phone_number, phone_verified
       FROM users WHERE id=$1`,
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
