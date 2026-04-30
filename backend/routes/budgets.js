const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const budgets = await pool.query('SELECT * FROM budgets WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(budgets.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, amount, period, name } = req.body;
    if (!category || !amount) return res.status(400).json({ message: 'Category and amount required' });
    const p = period || 'monthly';
    const existing = await pool.query(
      'SELECT id FROM budgets WHERE user_id = $1 AND category = $2 AND (period = $3 OR period IS NULL)',
      [req.userId, category, p]
    );
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        'UPDATE budgets SET amount=$1, period=$2, name=$3 WHERE user_id=$4 AND category=$5 AND (period=$2 OR period IS NULL) RETURNING *',
        [amount, p, name || null, req.userId, category]
      );
      return res.json(updated.rows[0]);
    }
    const result = await pool.query(
      'INSERT INTO budgets (user_id, category, amount, period, name) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.userId, category, amount, p, name || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
});

router.post('/suggest', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const catTotals = {};
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const rows = (await pool.query(
        `SELECT category, COALESCE(SUM(amount),0) as spent
         FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
         GROUP BY category`,
        [req.userId, d.getMonth() + 1, d.getFullYear()]
      )).rows;
      rows.forEach(r => {
        if (!catTotals[r.category]) catTotals[r.category] = [];
        catTotals[r.category].push(parseFloat(r.spent));
      });
    }
    if (!Object.keys(catTotals).length) return res.json({ suggestions: [] });
    const summary = Object.entries(catTotals)
      .map(([cat, amounts]) => {
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        return `${cat}: avg $${avg.toFixed(2)}/month`;
      }).join('\n');

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a financial advisor. Based on spending history suggest realistic monthly budget limits.
Return ONLY a valid JSON array, no markdown, no explanation:
[{"category":"Food","suggested_amount":350,"reasoning":"One short sentence"}]
Add a 10-15% buffer above the average so goals feel reachable.`
          },
          { role: 'user', content: `My average monthly spending:\n${summary}\n\nSuggest a monthly budget for each category.` }
        ]
      })
    });
    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content?.trim() || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ suggestions });
  } catch (e) {
    console.error('Budget suggest error:', e);
    res.status(500).json({ message: 'Failed to generate suggestions' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Budget deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;
