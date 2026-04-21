const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer')
const pool = require('../db')
const auth = require('../middleware/auth')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

// POST /api/support/ticket
router.post('/ticket', auth, async (req, res) => {
  const { subject, message } = req.body
  const userId = req.user.id

  if (!subject || !message || message.trim().length < 10) {
    return res.status(400).json({ message: 'Subject and message (min 10 chars) are required.' })
  }

  try {
    const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId])
    const user = userRes.rows[0]
    const userEmail = user?.email || 'unknown'
    const userName = user?.name || 'Unknown'

    await pool.query(
      'INSERT INTO support_tickets (user_id, user_email, subject, message) VALUES ($1, $2, $3, $4)',
      [userId, userEmail, subject, message]
    )

    await transporter.sendMail({
      from: `"Spendly Support" <${process.env.GMAIL_USER}>`,
      to: 'charbel.mansourb@gmail.com',
      subject: `[Spendly Support] ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2 style="color:#7c3aed">New Support Ticket</h2>
          <p><strong>From:</strong> ${userName} (${userEmail})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr/>
          <p style="white-space:pre-wrap">${message}</p>
        </div>
      `,
    })

    res.json({ message: 'Ticket submitted successfully.' })
  } catch (e) {
    console.error('Support ticket error:', e.message)
    res.status(500).json({ message: 'Failed to send ticket.' })
  }
})

module.exports = router
