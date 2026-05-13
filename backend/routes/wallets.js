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
const SELECT_WALLETS = `
  SELECT id, user_id, name, color, avatar_type, avatar_value, avatar_photo,
         is_total_wallet, display_order, wallet_email, created_at
  FROM wallets
  WHERE user_id=$1 AND is_active=TRUE
  ORDER BY is_total_wallet DESC NULLS LAST, display_order ASC, created_at ASC`

router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query(SELECT_WALLETS, [req.userId])
    const rows = r.rows
    const hasTotal    = rows.some(w => !!w.is_total_wallet)
    const hasPersonal = rows.some(w => !w.is_total_wallet)

    // Auto-create the total wallet for accounts that pre-date the feature
    if (hasPersonal && !hasTotal) {
      const dummyPin = await bcrypt.hash('spendly-family-total', 10)
      await pool.query(
        `INSERT INTO wallets (user_id, name, pin, color, avatar_type, avatar_value, is_total_wallet, display_order)
         VALUES ($1,'Family Overview',$2,'purple','dicebear','family',TRUE,999)`,
        [req.userId, dummyPin]
      )
      const r2 = await pool.query(SELECT_WALLETS, [req.userId])
      return res.json(r2.rows)
    }

    res.json(rows)
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

    // Count existing personal wallets (IS NOT TRUE handles NULL columns too)
    const countR = await pool.query(
      'SELECT COUNT(*) FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet = FALSE)',
      [req.userId]
    )
    if (parseInt(countR.rows[0].count) >= 10) {
      return res.status(403).json({ message: 'Maximum 10 wallets per account' })
    }

    const pinHash = await bcrypt.hash(String(pin), 10)
    const isFirst = parseInt(countR.rows[0].count) === 0

    const r = await pool.query(
      `INSERT INTO wallets (user_id, name, pin, color, avatar_type, avatar_value, avatar_photo, is_total_wallet, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,
         (SELECT COALESCE(MAX(display_order),0)+1 FROM wallets WHERE user_id=$1 AND (is_total_wallet IS NULL OR is_total_wallet = FALSE)))
       RETURNING id, user_id, name, color, avatar_type, avatar_value, avatar_photo, is_total_wallet, display_order, created_at`,
      [req.userId, name.trim(), pinHash, color || 'violet', avatar_type || 'dicebear', avatar_value || 'spendly1', avatar_photo || null]
    )
    const wallet = r.rows[0]

    if (isFirst) {
      await pool.query(
        `INSERT INTO wallets (user_id, name, pin, color, avatar_type, avatar_value, is_total_wallet, display_order)
         VALUES ($1,'Family Overview',$2,'purple','dicebear','family',TRUE,999)`,
        [req.userId, pinHash]
      )
    }

    res.status(201).json(wallet)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/wallets/total — get-or-create total wallet ──────────────────────
router.get('/total', auth, async (req, res) => {
  try {
    const COLS = `id, user_id, name, color, avatar_type, avatar_value, avatar_photo,
                  is_total_wallet, display_order, wallet_email, created_at`

    let r = await pool.query(
      `SELECT ${COLS} FROM wallets WHERE user_id=$1 AND is_active=TRUE AND is_total_wallet=TRUE`,
      [req.userId]
    )
    if (r.rows.length > 0) return res.json(r.rows[0])

    const dead = await pool.query(
      'SELECT id FROM wallets WHERE user_id=$1 AND is_total_wallet=TRUE AND is_active=FALSE',
      [req.userId]
    )
    if (dead.rows.length > 0) {
      const reactivated = await pool.query(
        `UPDATE wallets SET is_active=TRUE, updated_at=NOW() WHERE id=$1 RETURNING ${COLS}`,
        [dead.rows[0].id]
      )
      return res.json(reactivated.rows[0])
    }

    const dummyPin = await bcrypt.hash('spendly-family-total', 10)
    const ins = await pool.query(
      `INSERT INTO wallets (user_id, name, pin, color, avatar_type, avatar_value, is_total_wallet, display_order)
       VALUES ($1,'Family Overview',$2,'purple','dicebear','family',TRUE,999)
       RETURNING ${COLS}`,
      [req.userId, dummyPin]
    )
    res.status(201).json(ins.rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/wallets/verify-family-pin ──────────────────────────────────────
router.post('/verify-family-pin', auth, async (req, res) => {
  try {
    const { pin } = req.body
    if (!pin) return res.status(400).json({ message: 'PIN required' })

    const lockKey = `family_${req.userId}`
    if (isLocked(lockKey)) {
      const s = getPinState(lockKey)
      const remaining = Math.ceil((s.lockedUntil - Date.now()) / 1000 / 60)
      return res.status(429).json({ message: `Too many attempts. Try again in ${remaining} minute(s).`, locked: true })
    }

    // IS NOT TRUE matches both FALSE and NULL — critical for legacy rows
    const personalR = await pool.query(
      'SELECT pin FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet = FALSE)',
      [req.userId]
    )
    if (personalR.rows.length === 0)
      return res.status(400).json({ message: 'No wallets found' })

    let matched = false
    for (const w of personalR.rows) {
      if (await bcrypt.compare(String(pin), w.pin)) { matched = true; break }
    }

    if (!matched) {
      const { attempts, lockedUntil } = recordAttempt(lockKey)
      const attemptsLeft = 5 - attempts
      if (lockedUntil) return res.status(429).json({ message: 'Too many attempts. Locked for 5 minutes.', locked: true })
      return res.status(401).json({ message: 'Incorrect PIN — use any of your wallet PINs', attemptsLeft })
    }

    resetAttempts(lockKey)

    const COLS = `id, user_id, name, color, avatar_type, avatar_value, avatar_photo,
                  is_total_wallet, display_order, wallet_email, created_at`

    let totalR = await pool.query(
      `SELECT ${COLS} FROM wallets WHERE user_id=$1 AND is_active=TRUE AND is_total_wallet=TRUE`,
      [req.userId]
    )

    let totalWallet
    if (totalR.rows.length > 0) {
      totalWallet = totalR.rows[0]
    } else {
      const dead = await pool.query(
        'SELECT id FROM wallets WHERE user_id=$1 AND is_total_wallet=TRUE AND is_active=FALSE',
        [req.userId]
      )
      if (dead.rows.length > 0) {
        const reactivated = await pool.query(
          `UPDATE wallets SET is_active=TRUE, updated_at=NOW() WHERE id=$1 RETURNING ${COLS}`,
          [dead.rows[0].id]
        )
        totalWallet = reactivated.rows[0]
      } else {
        const dummyPin = await bcrypt.hash('spendly-family-total', 10)
        const ins = await pool.query(
          `INSERT INTO wallets (user_id, name, pin, color, avatar_type, avatar_value, is_total_wallet, display_order)
           VALUES ($1,'Family Overview',$2,'purple','dicebear','family',TRUE,999)
           RETURNING ${COLS}`,
          [req.userId, dummyPin]
        )
        totalWallet = ins.rows[0]
      }
    }

    res.json({ success: true, wallet: totalWallet })
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

    const walletsR = await pool.query(
      'SELECT id FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet = FALSE)',
      [req.userId]
    )
    const walletIds = walletsR.rows.map(w => w.id)
    const count = walletIds.length

    if (count === 0) {
      return res.json({ total_income: 0, total_expenses: 0, total_savings: 0, wallets_count: 0, category_breakdown: [], monthly_trend: [] })
    }

    const incomeR = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM wallet_income
       WHERE user_id=$1 AND wallet_id=ANY($2) AND month=$3 AND year=$4`,
      [req.userId, walletIds, month, year]
    )

    const expR = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM wallet_expenses
       WHERE user_id=$1 AND wallet_id=ANY($2)
         AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4`,
      [req.userId, walletIds, month, year]
    )

    const catR = await pool.query(
      `SELECT category, COALESCE(SUM(amount),0) AS total
       FROM wallet_expenses
       WHERE user_id=$1 AND wallet_id=ANY($2)
         AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4
       GROUP BY category ORDER BY total DESC`,
      [req.userId, walletIds, month, year]
    )

    const savR = await pool.query(
      `SELECT COALESCE(SUM(saved_amount),0) AS total
       FROM wallet_savings
       WHERE user_id=$1 AND wallet_id=ANY($2)`,
      [req.userId, walletIds]
    )

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
      'SELECT id FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet = FALSE)',
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
       LIMIT 200`,
      [req.userId, walletIds]
    )
    res.json(r.rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/wallets/total/networth ─────────────────────────────────────────
router.get('/total/networth', auth, async (req, res) => {
  try {
    const walletsR = await pool.query(
      'SELECT id FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet=FALSE)',
      [req.userId]
    )
    const walletIds = walletsR.rows.map(w => w.id)
    const globalItemsR = await pool.query(
      'SELECT * FROM net_worth_items WHERE user_id=$1 ORDER BY type, category, name',
      [req.userId]
    )
    if (walletIds.length === 0) {
      const gi = globalItemsR.rows
      const ta = gi.filter(i => i.type === 'asset').reduce((s, i) => s + parseFloat(i.amount), 0)
      const tl = gi.filter(i => i.type === 'liability').reduce((s, i) => s + parseFloat(i.amount), 0)
      return res.json({ items: gi, totalAssets: ta, totalLiabilities: tl, netWorth: ta - tl, cashBalance: 0 })
    }
    const [incR, expR, savR, debtR] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_income WHERE user_id=$1 AND wallet_id=ANY($2)', [req.userId, walletIds]),
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_expenses WHERE user_id=$1 AND wallet_id=ANY($2)', [req.userId, walletIds]),
      pool.query('SELECT COALESCE(SUM(saved_amount),0) AS t FROM wallet_savings WHERE user_id=$1 AND wallet_id=ANY($2)', [req.userId, walletIds]),
      pool.query('SELECT COALESCE(SUM(remaining_amount),0) AS t FROM wallet_debts WHERE user_id=$1 AND wallet_id=ANY($2) AND remaining_amount>0', [req.userId, walletIds]),
    ])
    const cash = parseFloat(incR.rows[0].t) - parseFloat(expR.rows[0].t)
    const savTotal = parseFloat(savR.rows[0].t)
    const debtTotal = parseFloat(debtR.rows[0].t)
    const walletAssets = [
      { id: 'wc_cash', name: 'Combined Cash Balance', category: 'Cash & Bank', amount: cash, type: 'asset', source: 'computed' },
      ...(savTotal > 0 ? [{ id: 'wc_sav', name: 'Combined Savings Goals', category: 'Savings', amount: savTotal, type: 'asset', source: 'auto' }] : []),
    ]
    const walletLiabs = debtTotal > 0
      ? [{ id: 'wc_debt', name: 'Combined Debts', category: 'Personal Loan', amount: debtTotal, type: 'liability', source: 'auto' }]
      : []
    const allItems = [...walletAssets, ...globalItemsR.rows, ...walletLiabs]
    const ta = allItems.filter(i => i.type === 'asset').reduce((s, i) => s + parseFloat(i.amount), 0)
    const tl = allItems.filter(i => i.type === 'liability').reduce((s, i) => s + parseFloat(i.amount), 0)
    res.json({ items: allItems, totalAssets: ta, totalLiabilities: tl, netWorth: ta - tl, cashBalance: cash })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
})

// ── GET /api/wallets/total/breakdown ─────────────────────────────────────────
router.get('/total/breakdown', auth, async (req, res) => {
  try {
    const now = new Date(); const month = now.getMonth() + 1; const year = now.getFullYear()
    const walletsR = await pool.query(
      `SELECT id, name, color, avatar_type, avatar_value, avatar_photo
       FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet=FALSE)
       ORDER BY display_order ASC, created_at ASC`,
      [req.userId]
    )
    const wallets = walletsR.rows
    if (wallets.length === 0) return res.json([])
    const results = await Promise.all(wallets.map(async w => {
      const [incR, expR, savR] = await Promise.all([
        pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_income WHERE wallet_id=$1 AND user_id=$2 AND month=$3 AND year=$4', [w.id, req.userId, month, year]),
        pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_expenses WHERE wallet_id=$1 AND user_id=$2 AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4', [w.id, req.userId, month, year]),
        pool.query('SELECT COALESCE(SUM(saved_amount),0) AS t FROM wallet_savings WHERE wallet_id=$1 AND user_id=$2', [w.id, req.userId]),
      ])
      return {
        id: w.id, name: w.name, color: w.color, avatar_type: w.avatar_type, avatar_value: w.avatar_value, avatar_photo: w.avatar_photo,
        income: parseFloat(incR.rows[0].t), expenses: parseFloat(expR.rows[0].t), savings: parseFloat(savR.rows[0].t),
      }
    }))
    res.json(results)
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
})

// ── GET /api/wallets/total/income ─────────────────────────────────────────────
router.get('/total/income', auth, async (req, res) => {
  try {
    const walletsR = await pool.query(
      'SELECT id FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet=FALSE)',
      [req.userId]
    )
    const walletIds = walletsR.rows.map(w => w.id)
    if (walletIds.length === 0) return res.json([])
    const r = await pool.query(
      `SELECT wi.id, wi.wallet_id, w.name AS wallet_name, w.color AS wallet_color,
              wi.amount, wi.source, wi.description, wi.month, wi.year,
              (wi.year::text || '-' || LPAD(wi.month::text,2,'0') || '-01')::date AS date
       FROM wallet_income wi
       JOIN wallets w ON wi.wallet_id = w.id
       WHERE wi.user_id=$1 AND wi.wallet_id=ANY($2)
       ORDER BY wi.year DESC, wi.month DESC, wi.created_at DESC
       LIMIT 200`,
      [req.userId, walletIds]
    )
    res.json(r.rows)
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
})

// ── POST /api/wallets/total/advise ───────────────────────────────────────────
router.post('/total/advise', auth, async (req, res) => {
  try {
    const now = new Date(); const month = now.getMonth() + 1; const year = now.getFullYear()
    const walletsR = await pool.query(
      'SELECT id, name FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet=FALSE)',
      [req.userId]
    )
    const walletIds = walletsR.rows.map(w => w.id)
    if (walletIds.length === 0) return res.json({ insights: [] })

    const [incR, expR, catR, savR, trendR, bdR] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_income WHERE user_id=$1 AND wallet_id=ANY($2) AND month=$3 AND year=$4', [req.userId, walletIds, month, year]),
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_expenses WHERE user_id=$1 AND wallet_id=ANY($2) AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4', [req.userId, walletIds, month, year]),
      pool.query('SELECT category, COALESCE(SUM(amount),0) AS total FROM wallet_expenses WHERE user_id=$1 AND wallet_id=ANY($2) AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4 GROUP BY category ORDER BY total DESC LIMIT 8', [req.userId, walletIds, month, year]),
      pool.query('SELECT COALESCE(SUM(saved_amount),0) AS t FROM wallet_savings WHERE user_id=$1 AND wallet_id=ANY($2)', [req.userId, walletIds]),
      pool.query(`SELECT TO_CHAR(date,'YYYY-MM') AS mo, COALESCE(SUM(amount),0) AS total FROM wallet_expenses WHERE user_id=$1 AND wallet_id=ANY($2) AND date>=NOW()-INTERVAL '3 months' GROUP BY TO_CHAR(date,'YYYY-MM') ORDER BY mo`, [req.userId, walletIds]),
      pool.query('SELECT w.name, COALESCE(SUM(e.amount),0) AS expenses FROM wallets w LEFT JOIN wallet_expenses e ON e.wallet_id=w.id AND EXTRACT(MONTH FROM e.date)=$3 AND EXTRACT(YEAR FROM e.date)=$4 WHERE w.user_id=$1 AND w.id=ANY($2) AND w.is_active=TRUE GROUP BY w.name', [req.userId, walletIds, month, year]),
    ])

    const income = parseFloat(incR.rows[0].t)
    const expenses = parseFloat(expR.rows[0].t)
    const savings = income - expenses
    const savingsRate = income > 0 ? Math.round((Math.max(savings, 0) / income) * 100) : 0
    const goalsTotal = parseFloat(savR.rows[0].t)
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

    const catLines = catR.rows.length
      ? catR.rows.map(c => `  ${c.category}: $${parseFloat(c.total).toFixed(2)}`).join('\n')
      : '  No spending data this month'

    const walletLines = bdR.rows.map(w => `  ${w.name}: $${parseFloat(w.expenses).toFixed(2)} spent`).join('\n')

    const trendLines = trendR.rows.length
      ? trendR.rows.map(t => `  ${t.mo}: $${parseFloat(t.total).toFixed(2)}`).join('\n')
      : '  No recent trend data'

    const prompt = `Family finance summary for ${monthName}:
- Total income: $${income.toFixed(2)}
- Total expenses: $${expenses.toFixed(2)}
- Net savings: $${savings.toFixed(2)} (${savingsRate}% savings rate)
- Savings goals total: $${goalsTotal.toFixed(2)}
- Wallets: ${walletsR.rows.length}

Spending by category:
${catLines}

Per-wallet expenses:
${walletLines}

3-month trend:
${trendLines}`

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 900,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a sharp family financial adviser. Analyze the data and return ONLY a valid JSON array — no markdown, no text outside the array:
[{"title":"...","icon":"emoji","type":"positive|warning|danger","content":"2-3 sentence insight with specific numbers"}]
Rules:
1. Return exactly 4-5 insights
2. Be specific — mention actual dollar amounts and percentages
3. Types: "positive" for good news, "warning" for areas to watch, "danger" for urgent issues
4. Cover: savings rate, top spending categories, wallet balance, trend, and one actionable tip
5. Keep each content to 2-3 sentences max`
          },
          { role: 'user', content: prompt }
        ]
      })
    })

    const aiData = await aiRes.json()
    const text = aiData.choices?.[0]?.message?.content?.trim() || '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    res.json({ insights, monthName })
  } catch (e) {
    console.error('Advise error:', e)
    res.status(500).json({ message: 'Failed to generate advice' })
  }
})

// ── GET /api/wallets/:walletId/summary ───────────────────────────────────────
router.get('/:walletId/summary', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })
    const now = new Date(); const month = now.getMonth() + 1; const year = now.getFullYear()
    const [incR, expR, catR, savR, trendR, allIncR] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_income WHERE wallet_id=$1 AND user_id=$2 AND month=$3 AND year=$4', [walletId, req.userId, month, year]),
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_expenses WHERE wallet_id=$1 AND user_id=$2 AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4', [walletId, req.userId, month, year]),
      pool.query('SELECT category, COALESCE(SUM(amount),0) AS total FROM wallet_expenses WHERE wallet_id=$1 AND user_id=$2 AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4 GROUP BY category ORDER BY total DESC', [walletId, req.userId, month, year]),
      pool.query('SELECT COALESCE(SUM(saved_amount),0) AS t FROM wallet_savings WHERE wallet_id=$1 AND user_id=$2', [walletId, req.userId]),
      pool.query(`SELECT TO_CHAR(date,'YYYY-MM') AS month, COALESCE(SUM(amount),0) AS total FROM wallet_expenses WHERE wallet_id=$1 AND user_id=$2 AND date >= NOW()-INTERVAL '6 months' GROUP BY TO_CHAR(date,'YYYY-MM') ORDER BY month`, [walletId, req.userId]),
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_income WHERE wallet_id=$1 AND user_id=$2', [walletId, req.userId]),
    ])
    res.json({
      total_income: parseFloat(incR.rows[0].t),
      total_expenses: parseFloat(expR.rows[0].t),
      total_savings: parseFloat(savR.rows[0].t),
      all_time_income: parseFloat(allIncR.rows[0].t),
      category_breakdown: catR.rows,
      monthly_trend: trendR.rows,
    })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
})

// ── GET /api/wallets/:walletId/networth ──────────────────────────────────────
router.get('/:walletId/networth', auth, async (req, res) => {
  try {
    const { walletId } = req.params
    if (!(await verifyOwnership(walletId, req.userId)))
      return res.status(403).json({ message: 'Not your wallet' })
    const [incR, expR, savR, debtR] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_income WHERE wallet_id=$1 AND user_id=$2', [walletId, req.userId]),
      pool.query('SELECT COALESCE(SUM(amount),0) AS t FROM wallet_expenses WHERE wallet_id=$1 AND user_id=$2', [walletId, req.userId]),
      pool.query('SELECT id, name, target_amount, saved_amount, goal_type FROM wallet_savings WHERE wallet_id=$1 AND user_id=$2 ORDER BY created_at DESC', [walletId, req.userId]),
      pool.query('SELECT id, name, category, remaining_amount FROM wallet_debts WHERE wallet_id=$1 AND user_id=$2 AND remaining_amount>0 ORDER BY created_at DESC', [walletId, req.userId]),
    ])
    const cash = parseFloat(incR.rows[0].t) - parseFloat(expR.rows[0].t)
    const assets = [
      { id: 'cash', name: 'Cash Balance', category: 'Cash & Bank', amount: cash, type: 'asset', source: 'computed' },
      ...savR.rows.map(g => ({ id: `sav_${g.id}`, name: g.name, category: 'Savings', amount: parseFloat(g.saved_amount || 0), type: 'asset', source: 'auto' })),
    ]
    const liabilities = debtR.rows.map(d => ({ id: `debt_${d.id}`, name: d.name, category: d.category || 'Personal Loan', amount: parseFloat(d.remaining_amount || 0), type: 'liability', source: 'auto' }))
    const ta = assets.reduce((s, i) => s + parseFloat(i.amount), 0)
    const tl = liabilities.reduce((s, i) => s + parseFloat(i.amount), 0)
    res.json({ items: [...assets, ...liabilities], totalAssets: ta, totalLiabilities: tl, netWorth: ta - tl, cashBalance: cash, savings: savR.rows, debts: debtR.rows })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
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

    // Total wallet: accept any personal wallet's PIN (IS NOT TRUE handles NULL legacy rows)
    if (r.rows[0].is_total_wallet) {
      const personalR = await pool.query(
        'SELECT pin FROM wallets WHERE user_id=$1 AND is_active=TRUE AND (is_total_wallet IS NULL OR is_total_wallet = FALSE)',
        [req.userId]
      )
      let matched = false
      for (const w of personalR.rows) {
        if (await bcrypt.compare(String(pin), w.pin)) { matched = true; break }
      }
      if (!matched) {
        const { attempts, lockedUntil } = recordAttempt(walletId)
        const attemptsLeft = 5 - attempts
        if (lockedUntil) return res.status(429).json({ message: 'Too many attempts. Locked for 5 minutes.', locked: true })
        return res.status(401).json({ message: 'Incorrect PIN — try any of your wallet PINs', attemptsLeft })
      }
      resetAttempts(walletId)
      const fp2 = req.headers['x-device-fp'] || 'unknown'
      await pool.query(
        `INSERT INTO wallet_sessions (user_id, wallet_id, device_fingerprint, last_active)
         VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
        [req.userId, walletId, fp2]
      )
      return res.json({ success: true })
    }

    const match = await bcrypt.compare(String(pin), r.rows[0].pin)
    if (!match) {
      const { attempts, lockedUntil } = recordAttempt(walletId)
      const attemptsLeft = 5 - attempts
      if (lockedUntil) return res.status(429).json({ message: 'Too many attempts. Locked for 5 minutes.', locked: true })
      return res.status(401).json({ message: 'Incorrect PIN', attemptsLeft })
    }

    resetAttempts(walletId)

    const fp = req.headers['x-device-fp'] || 'unknown'
    await pool.query(
      `INSERT INTO wallet_sessions (user_id, wallet_id, device_fingerprint, last_active)
       VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
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
