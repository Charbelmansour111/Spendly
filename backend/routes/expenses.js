const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const expenses = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC', [req.userId]);
    res.json(expenses.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, category, description, date, is_recurring, expense_scope, linked_date } = req.body;
    if (!amount || !date) return res.status(400).json({ message: 'Amount and date required' });
    const result = await pool.query(
      `INSERT INTO expenses (user_id, amount, category, description, date, is_recurring, expense_scope, linked_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.userId, amount, category || 'Other',
        description || null, date,
        is_recurring || false,
        expense_scope || 'monthly',
        linked_date || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.log('Expense error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { amount, category, description, date, is_recurring } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    const updated = await pool.query(
      'UPDATE expenses SET amount=$1, category=$2, description=$3, date=$4, is_recurring=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [amount, category, description, date, is_recurring || false, req.params.id, req.userId]
    );
    res.json(updated.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Expense deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/apply-recurring', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.body
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const recurring = await pool.query(
      `SELECT * FROM expenses WHERE user_id = $1 AND is_recurring = TRUE AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [req.userId, prevMonth, prevYear]
    )
    const existing = await pool.query(
      `SELECT category, description FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3 AND is_recurring = TRUE`,
      [req.userId, month, year]
    )
    const existingKeys = existing.rows.map(e => `${e.category}-${e.description}`)
    let added = 0
    for (const exp of recurring.rows) {
      const key = `${exp.category}-${exp.description}`
      if (!existingKeys.includes(key)) {
        const newDate = `${year}-${String(month).padStart(2, '0')}-01`
        await pool.query(
          'INSERT INTO expenses (user_id, amount, category, description, date, is_recurring) VALUES ($1, $2, $3, $4, $5, TRUE)',
          [req.userId, exp.amount, exp.category, exp.description, newDate]
        )
        added++
      }
    }
    res.json({ added })
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
});

router.post('/parse-natural', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body
    if (!text || text.trim().length < 3) return res.status(400).json({ message: 'Text required' })
    const today = new Date().toISOString().split('T')[0]
    const systemPrompt = `You are a transaction parser for a personal finance app. Extract ALL expense transactions from the user's message.

Return ONLY a valid JSON array — no explanation, no markdown, no extra text. Just the raw JSON array.

Each object must have:
- "amount": number (required, no currency symbol)
- "category": exactly one of "Food", "Transport", "Shopping", "Subscriptions", "Entertainment", "Other"
- "description": merchant or item name (max 5 words)
- "date": "YYYY-MM-DD" (use today ${today} if not mentioned)

Category rules:
- Food → restaurants, cafes, groceries, delivery, fast food
- Transport → Uber, taxi, gas, parking, flight, metro, bus
- Shopping → clothes, electronics, pharmacy, Amazon, household items
- Subscriptions → Netflix, Spotify, streaming, software, monthly/annual plans
- Entertainment → cinema, bars, gaming, concerts, clubs, bowling
- Other → rent, utilities, healthcare, gym, insurance, gifts

If multiple transactions are mentioned, return ALL as separate objects.
Example output: [{"amount":6.50,"category":"Food","description":"Starbucks coffee","date":"${today}"},{"amount":22,"category":"Transport","description":"Uber to mall","date":"${today}"}]`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]
      })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'AI error')
    const raw = data.choices[0].message.content.trim()
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return res.status(422).json({ message: 'Could not parse transactions from text' })
    const transactions = JSON.parse(jsonMatch[0])
    if (!Array.isArray(transactions) || transactions.length === 0) return res.status(422).json({ message: 'No transactions found' })
    res.json({ transactions })
  } catch (e) {
    console.error('Parse natural error:', e)
    res.status(500).json({ message: 'Error parsing transactions' })
  }
})

router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
    }
    const results = await Promise.all(months.map(async ({ month, year }) => {
      const expenses = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
        [req.userId, month, year]
      )
      const income = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = $1 AND month = $2 AND year = $3`,
        [req.userId, month, year]
      )
      const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' })
      return {
        label: `${monthName} ${year}`,
        spending: parseFloat(expenses.rows[0].total),
        income: parseFloat(income.rows[0].total),
        balance: parseFloat(income.rows[0].total) - parseFloat(expenses.rows[0].total)
      }
    }))
    res.json(results)
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
});

module.exports = router;  