const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const pool = require('../db')
const auth = require('../middleware/auth')

// In-memory PIN attempt tracker { walletId: { attempts, lockedUntil } }
const pinAttempts = new Map()

function getPinState(walletId) {
  return pinAttempts.get(walletId) || { attempts: 0, lockedUntil: null }
}

function isLocked(walletId) {
  const s = getPinState(walletId)
  if (!s.lockedUntil) return false
  if (Date.now() < s.lockedUntil) return true
  pinAttempts.delete(walletId)
  return false
}

function recordAttempt(walletId) {
  const s = getPinState(walletId)
  const attempts = s.attempts + 1
  const lockedUntil = attempts >= 5 ? Date.now() + 5 * 60 * 1000 : null
  pinAttempts.set(walletId, { attempts, lockedUntil })
  return { attempts, lockedUntil }
}

function resetAttempts(walletId) {
  pinAttempts.delete(walletId)
}

// Verify user owns the wallet
async function verifyOwnership(walletId, userId) {
  const r = await pool.query(
    'SELECT id FROM wallets WHERE id=$1 AND user_id=$2 AND is_active=TRUE',
    [walletId, userId]
  )
  return r.rows.length > 0
}

// ── GET /api/wallets ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, user_id, name, color, avatar_type, avatar_value, avatar_photo,
              is_total_wallet, display_order, wallet_email, created_at
       FROM wallets
       WHERE user_id=$1 AND is_active=TRUE
       ORDER BY is_total_wallet ASC, display_order ASC, created_at ASC`,
      [req.userId]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/wallets ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, pin, color, avatar_type, avatar_value, avatar_photo } = req.body
    if (!name || !pin) return res.status(400).json({ message: 'Name and PIN required' })
    if (pin.length < 4 || pin.length > 6) return res.status(400).json({ message: 'PIN must be 4-6 digits' })

    // Count existing personal wallets
    const countR = await pool.query(
      "SELECT COUNT(*) FROM wallets WHERE user_id=$1 AND is_active=TRUE AND is_total_wallet=FALSE",
      [req.userId]
    )
    if (parseInt(countR.rows[0].count) >= 10) {
      return res.status(403).json({ message: 'Maximum 10 wallets per account' })
    }

    const pinHash = await bcrypt.hash(String(pin), 10)

    // Check if this user has any wallets yet (to decide if we create total wallet too)
    const isFirst = parseInt(countR.rows[0].count) === 0

    const r = await pool.query(
      `INSERT INTO wallets (user_id, name, pin, color, avatar_type, avatar_value, avatar_photo, is_total_wallet, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,
         (SELECT COALESCE(MAX(display_order),0)+1 FROM wallets WHERE user_id=$1 AND is_total_wallet=FALSE))
       RETURNING id, user_id, name, color, avatar_type, avatar_value, avatar_photo, is_total_wallet, display_order, created_at`,
      [req.userId, name.trim(), pinHash, color || 'violet', avatar_type || 'dicebear', avatar_value || 'spendly1', avatar_photo || null]
    )
    const wallet = r.rows[0]

    // Create total/family wallet if this is the user's first wallet
    if (isFirst) {
      await pool.query(
        `INSERT INTO wallets (user_id, name, pin, color, avatar_type, avatar_value, is_total_wallet, display_order)
         VALUES ($1,'Family Overview',$2,'purple','dicebear','family',TRUE,999)
         ON CONFLICT DO NOTHING`,
        [req.userId, pinHash]
      )
    }

    res.status(201).json(wallet)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/wallets/total/summary ───────────────────────────────────────────
router.get('/total/summary', auth, async (req, res) => {
  try {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Get all wallet IDs for this user (excluding total wallet)
    const walletsR = await pool.query(
      "SELECT id FROM wallets WHERE user_id=$1 AND is_active=TRUE AND is_total_wallet=FALSE",
      [req.userId]
    )
    const walletIds = walletsR.rows.map(w => w.id)
    const count = walletIds.length

    if (count === 0) {
      return res.json({ total_income: 0, total_expenses: 0, total_savings: 0, wallets_count: 0, category_breakdown: [], monthly_trend: [] })
    }

    // Total income this month
    const incomeR = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM wallet_income
       WHERE user_id=$1 AND wallet_id=ANY($2) AND month=$3 AND year=$4`,
      [req.userId, walletIds, month, year]
    )

    // Total expenses this month
    const expR = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM wallet_expenses
       WHERE user_id=$1 AND wallet_id=ANY($2)
         AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4`,
      [req.userId, walletIds, month, year]
    )

    // Category breakdown (combined, anonymous)
    const catR = await pool.query(
      `SELECT category, COALESCE(SUM(amount),0) AS total
       FROM wallet_expenses
       WHERE user_id=$1 AND wallet_id=ANY($2)
         AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4
       GROUP BY category ORDER BY total DESC`,
      [req.userId, walletIds, month, year]
    )

    // Total savings progress
    const savR = await pool.query(
      `SELECT COALESCE(SUM(saved_amount),0) AS total
       FROM wallet_savings
       WHERE user_id=$1 AND wallet_id=ANY($2)`,
      [req.userId, walletIds]
    )

    // 6-month trend
    const trendR = await pool.query(
      `SELECT TO_CHAR(date,'YYYY-MM') AS month, COALESCE(SUM(amount),0) AS total
       FROM wallet_expenses
       WHERE user_id=$1 AND wallet_id=ANY($2)
         AND date >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(date,'YYYY-MM')
       ORDER BY month`,
      [req.userId, walletIds]
    )

    res.json({
      total_income: parseFloat(incomeR.rows[0].total),
      total_expenses: parseFloat(expR.rows[0].total),
      total_savings: parseFloat(savR.rows[0].total),
      wallets_count: count,
      category_breakdown: catR.rows,
      monthly_trend: trendR.rows,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/wallets/total/transactions ──────────────────────────────────────
router.get('/total/transactions', auth, async (req, res) => {
  try {
    const walletsR = await pool.query(
      "SELECT id FROM wallets WHERE user_id=$1 AND is_active=TRUE AND is_total_wallet=FALSE",
      [req.userId]
    )
    const walletIds = walletsR.rows.map(w => w.id)
    if (walletIds.length === 0) return res.json([])

    const r = await pool.query(
      `SELECT we.id, we.wallet_id, w.name AS wallet_name, w.color AS wallet_color,
              we.amount, we.category, we.description, we.date
       FROM wallet_expenses we
       JOIN wallets w ON we.wallet_id = w.id
       WHERE we.user_id=$1 AND we.wallet_id = ANY($2)
       ORDER BY we.date DESC, we.created_at DESC
       LIMIT 30`,
      [req.userId, walletIds]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/wallets/:id ─────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const ok = await verifyOwnership(req.params.id, req.userId)
    if (!ok) return res.status(403).json({ message: 'Not your wallet' })

    const { name, color, avatar_type, avatar_value, avatar_photo, wallet_email } = req.body
    const r = await pool.query(
      `UPDATE wallets SET name=$1, color=$2, avatar_type=$3, avatar_value=$4, avatar_photo=$5, wallet_email=$6, updated_at=NOW()
       WHERE id=$7 AND user_id=$8
       RETURNING id, user_id, name, color, avatar_type, avatar_value, avatar_photo, is_total_wallet, display_order, wallet_email`,
      [name, color, avatar_type, avatar_value, avatar_photo || null, wallet_email || null, req.params.id, req.userId]
    )
    res.json(r.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/wallets/:id/verify-pin ─────────────────────────────────────────
router.post('/:id/verify-pin', auth, async (req, res) => {
  try {
    const walletId = parseInt(req.params.id)

    if (isLocked(walletId)) {
      const s = getPinState(walletId)
      const remaining = Math.ceil((s.lockedUntil - Date.now()) / 1000 / 60)
      return res.status(429).json({ message: `Too many attempts. Try again in ${remaining} minute(s).`, locked: true })
    }

    const ok = await verifyOwnership(walletId, req.userId)
    if (!ok) return res.status(403).json({ message: 'Not your wallet' })

    const { pin } = req.body
    const r = await pool.query('SELECT pin, is_total_wallet FROM wallets WHERE id=$1 AND user_id=$2', [walletId, req.userId])
    if (!r.rows[0]) return res.status(404).json({ message: 'Wallet not found' })

    const match = await bcrypt.compare(String(pin), r.rows[0].pin)
    if (!match) {
      const { attempts, lockedUntil } = recordAttempt(walletId)
      const attemptsLeft = 5 - attempts
      if (lockedUntil) return res.status(429).json({ message: 'Too many attempts. Locked for 5 minutes.', locked: true })
      return res.status(401).json({ message: 'Incorrect PIN', attemptsLeft })
    }

    resetAttempts(walletId)

    // Record session
    const fp = req.headers['x-device-fp'] || 'unknown'
    await pool.query(
      `INSERT INTO wallet_sessions (user_id, wallet_id, device_fingerprint, last_active)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT DO NOTHING`,
      [req.userId, walletId, fp]
    )

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/wallets/:id/change-pin ─────────────────────────────────────────
router.post('/:id/change-pin', auth, async (req, res) => {
  try {
    const ok = await verifyOwnership(req.params.id, req.userId)
    if (!ok) return res.status(403).json({ message: 'Not your wallet' })

    const { current_pin, new_pin } = req.body
    if (!new_pin || new_pin.length < 4) return res.status(400).json({ message: 'New PIN must be at least 4 digits' })

    const r = await pool.query('SELECT pin FROM wallets WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])
    const match = await bcrypt.compare(String(current_pin), r.rows[0].pin)
    if (!match) return res.status(401).json({ message: 'Current PIN is incorrect' })

    const newHash = await bcrypt.hash(String(new_pin), 10)
    await pool.query('UPDATE wallets SET pin=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3', [newHash, req.params.id, req.userId])
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/wallets/:id ──────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT is_total_wallet FROM wallets WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])
    if (!r.rows[0]) return res.status(404).json({ message: 'Wallet not found' })
    if (r.rows[0].is_total_wallet) return res.status(403).json({ message: 'Cannot delete the family wallet' })

    await pool.query('UPDATE wallets SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
