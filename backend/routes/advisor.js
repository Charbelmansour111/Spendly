const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const nodemailer = require('nodemailer');

// ─── Email helper ────────────────────────────────────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });
}

async function sendEmail({ to, subject, html }) {
  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: `"Spendly" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error('Email send error:', e.message);
  }
}

// ─── Admin middleware ─────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: invalid admin key' });
  }
  next();
}

// ─── POST /apply ─────────────────────────────────────────────────────────────
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const {
      full_name, phone, country, city, bio, languages,
      license_type, license_number, institution, years_experience, specialty,
      consultation_fee, fee_currency, offers_free_consultation,
      id_scan_front, id_scan_back, license_scan, selfie_with_id,
    } = req.body;

    // Check if already applied
    const existing = await pool.query(
      'SELECT id, status FROM advisor_profiles WHERE user_id = $1',
      [req.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'You have already submitted an application', status: existing.rows[0].status });
    }

    const result = await pool.query(
      `INSERT INTO advisor_profiles
        (user_id, full_name, phone, country, city, bio, languages,
         license_type, license_number, institution, years_experience, specialty,
         consultation_fee, fee_currency, offers_free_consultation,
         id_scan_front, id_scan_back, license_scan, selfie_with_id, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'pending',NOW())
       RETURNING id, status, submitted_at`,
      [
        req.userId, full_name, phone, country, city, bio, languages,
        license_type, license_number, institution, years_experience || 0, specialty,
        consultation_fee || 0, fee_currency || 'USD', offers_free_consultation || false,
        id_scan_front, id_scan_back, license_scan, selfie_with_id,
      ]
    );

    const profile = result.rows[0];

    // Get applicant email
    const userRow = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.userId]);
    const applicant = userRow.rows[0];

    // Email to admin
    await sendEmail({
      to: 'charbel.mansourb@gmail.com',
      subject: `New Advisor Application — ${full_name}`,
      html: `
        <h2>New Advisor Application Received</h2>
        <p><strong>Name:</strong> ${full_name}</p>
        <p><strong>Email:</strong> ${applicant?.email}</p>
        <p><strong>License Type:</strong> ${license_type}</p>
        <p><strong>Specialty:</strong> ${specialty}</p>
        <p><strong>Country:</strong> ${country}</p>
        <p><strong>Institution:</strong> ${institution}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        <p><a href="${process.env.FRONTEND_URL || 'https://spendly.app'}/admin/advisors">Review in Admin Panel</a></p>
      `,
    });

    // Confirmation email to applicant
    await sendEmail({
      to: applicant?.email,
      subject: 'Your Advisor Application Was Received — Spendly',
      html: `
        <h2>Application Received!</h2>
        <p>Hi ${applicant?.name || full_name},</p>
        <p>We've received your application to join the Spendly Verified Advisor Network.</p>
        <p>Our team will review your application within <strong>1–3 business days</strong>. You'll receive an email once a decision has been made.</p>
        <p>Application ID: <strong>#${profile.id}</strong></p>
        <br/>
        <p>Thank you for your interest in helping others manage their finances!</p>
        <p>— The Spendly Team</p>
      `,
    });

    res.status(201).json({ message: 'Application submitted successfully', id: profile.id, status: 'pending' });
  } catch (e) {
    console.error('Advisor apply error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /my-status ───────────────────────────────────────────────────────────
router.get('/my-status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status, rejection_reason, submitted_at FROM advisor_profiles WHERE user_id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No application found' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    console.error('my-status error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /my-profile ─────────────────────────────────────────────────────────
router.get('/my-profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ap.*, u.email, u.name as user_name
       FROM advisor_profiles ap
       JOIN users u ON u.id = ap.user_id
       WHERE ap.user_id = $1`,
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No application found' });
    }
    // Strip documents from profile GET (sensitive)
    const row = { ...result.rows[0] };
    delete row.id_scan_front;
    delete row.id_scan_back;
    delete row.license_scan;
    delete row.selfie_with_id;
    res.json(row);
  } catch (e) {
    console.error('my-profile error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /my-profile ─────────────────────────────────────────────────────────
router.put('/my-profile', authenticateToken, async (req, res) => {
  try {
    // Only approved advisors can update
    const check = await pool.query(
      'SELECT status FROM advisor_profiles WHERE user_id = $1',
      [req.userId]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: 'No application found' });
    if (check.rows[0].status !== 'approved') {
      return res.status(403).json({ message: 'Only approved advisors can update their profile' });
    }

    const {
      bio, phone, city, languages, specialty,
      consultation_fee, offers_free_consultation, is_public,
    } = req.body;

    await pool.query(
      `UPDATE advisor_profiles
       SET bio=$1, phone=$2, city=$3, languages=$4, specialty=$5,
           consultation_fee=$6, offers_free_consultation=$7, is_public=$8
       WHERE user_id=$9`,
      [bio, phone, city, languages, specialty, consultation_fee, offers_free_consultation, is_public, req.userId]
    );

    res.json({ message: 'Profile updated' });
  } catch (e) {
    console.error('update profile error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /directory ──────────────────────────────────────────────────────────
router.get('/directory', async (req, res) => {
  try {
    const { specialty, country } = req.query;
    let query = `
      SELECT ap.id, ap.full_name, ap.country, ap.city, ap.bio, ap.languages,
             ap.license_type, ap.license_number, ap.institution, ap.specialty,
             ap.years_experience, ap.consultation_fee, ap.fee_currency,
             ap.offers_free_consultation, ap.rating, ap.total_reviews, ap.clients_helped
      FROM advisor_profiles ap
      WHERE ap.status = 'approved' AND ap.is_public = true
    `;
    const params = [];

    if (specialty) {
      params.push(specialty);
      query += ` AND ap.specialty = $${params.length}`;
    }
    if (country) {
      params.push(country);
      query += ` AND ap.country = $${params.length}`;
    }

    query += ' ORDER BY ap.rating DESC, ap.total_reviews DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    console.error('directory error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /admin/applications ─────────────────────────────────────────────────
router.get('/admin/applications', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ap.id, ap.full_name, ap.phone, ap.country, ap.city, ap.bio, ap.languages,
              ap.license_type, ap.license_number, ap.institution, ap.specialty,
              ap.years_experience, ap.consultation_fee, ap.fee_currency,
              ap.offers_free_consultation, ap.status, ap.rejection_reason,
              ap.submitted_at, ap.reviewed_at, ap.reviewed_by,
              ap.is_public, ap.rating, ap.total_reviews, ap.clients_helped,
              u.email, u.name as user_name
       FROM advisor_profiles ap
       JOIN users u ON u.id = ap.user_id
       ORDER BY ap.submitted_at DESC`
    );
    res.json(result.rows);
  } catch (e) {
    console.error('admin applications error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /admin/application/:id ───────────────────────────────────────────────
router.get('/admin/application/:id', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ap.*, u.email, u.name as user_name
       FROM advisor_profiles ap
       JOIN users u ON u.id = ap.user_id
       WHERE ap.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Application not found' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error('admin application detail error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /admin/approve/:id ─────────────────────────────────────────────────
router.post('/admin/approve/:id', adminAuth, async (req, res) => {
  try {
    const { notes } = req.body;
    const appResult = await pool.query(
      'SELECT ap.*, u.email, u.name as user_name FROM advisor_profiles ap JOIN users u ON u.id = ap.user_id WHERE ap.id = $1',
      [req.params.id]
    );
    if (appResult.rows.length === 0) return res.status(404).json({ message: 'Application not found' });
    const app = appResult.rows[0];

    await pool.query(
      `UPDATE advisor_profiles
       SET status='approved', is_public=true, reviewed_at=NOW(), reviewed_by=$1
       WHERE id=$2`,
      ['admin', req.params.id]
    );

    // Update user account_subtype
    await pool.query(
      "UPDATE users SET account_subtype='advisor_approved' WHERE id=$1",
      [app.user_id]
    );

    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions (action_type, target_id, admin_email, notes) VALUES ('approve_advisor', $1, $2, $3)`,
      [req.params.id, 'admin', notes || null]
    );

    // Approval email to applicant
    await sendEmail({
      to: app.email,
      subject: 'Congratulations! Your Advisor Application is Approved — Spendly',
      html: `
        <h2>You're Now a Verified Advisor on Spendly!</h2>
        <p>Hi ${app.user_name || app.full_name},</p>
        <p>We're excited to inform you that your application to join the <strong>Spendly Verified Advisor Network</strong> has been <strong>approved</strong>!</p>
        <p>Your profile is now live in our public advisor directory.</p>
        <p>Log in to your Spendly account and visit your <strong>Advisor Dashboard</strong> to update your profile, set your availability, and start helping users.</p>
        ${notes ? `<p><em>Note from our team: ${notes}</em></p>` : ''}
        <br/>
        <p>Welcome aboard!</p>
        <p>— The Spendly Team</p>
      `,
    });

    res.json({ message: 'Application approved' });
  } catch (e) {
    console.error('admin approve error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /admin/reject/:id ───────────────────────────────────────────────────
router.post('/admin/reject/:id', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

    const appResult = await pool.query(
      'SELECT ap.*, u.email, u.name as user_name FROM advisor_profiles ap JOIN users u ON u.id = ap.user_id WHERE ap.id = $1',
      [req.params.id]
    );
    if (appResult.rows.length === 0) return res.status(404).json({ message: 'Application not found' });
    const app = appResult.rows[0];

    await pool.query(
      `UPDATE advisor_profiles
       SET status='rejected', rejection_reason=$1, reviewed_at=NOW(), reviewed_by=$2
       WHERE id=$3`,
      [reason, 'admin', req.params.id]
    );

    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions (action_type, target_id, admin_email, notes) VALUES ('reject_advisor', $1, $2, $3)`,
      [req.params.id, 'admin', reason]
    );

    // Rejection email to applicant
    await sendEmail({
      to: app.email,
      subject: 'Update on Your Advisor Application — Spendly',
      html: `
        <h2>Advisor Application Update</h2>
        <p>Hi ${app.user_name || app.full_name},</p>
        <p>Thank you for applying to the Spendly Verified Advisor Network.</p>
        <p>After careful review, we're unable to approve your application at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>You're welcome to reapply after addressing the above concerns. If you have questions, please contact us at support@spendly.app.</p>
        <br/>
        <p>— The Spendly Team</p>
      `,
    });

    res.json({ message: 'Application rejected' });
  } catch (e) {
    console.error('admin reject error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
