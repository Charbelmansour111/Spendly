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
    const { totalBudget } = req.body || {};
    const now = new Date();

    // Monthly income (average of last 3 months)
    const incomeRow = (await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM income
       WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '3 months'`,
      [req.userId]
    )).rows[0];
    const monthlyIncome = parseFloat(incomeRow?.total || 0) / 3;

    // Spending history (last 3 months)
    const catTotals = {};
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const rows = (await pool.query(
        `SELECT category, COALESCE(SUM(amount),0) as spent
         FROM expenses WHERE user_id=$1
         AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
         GROUP BY category`,
        [req.userId, d.getMonth() + 1, d.getFullYear()]
      )).rows;
      rows.forEach(r => {
        if (!catTotals[r.category]) catTotals[r.category] = [];
        catTotals[r.category].push(parseFloat(r.spent));
      });
    }

    const hasBudgetRef = monthlyIncome > 0 || (totalBudget && parseFloat(totalBudget) > 0);
    // No income at all and no manual amount — tell frontend to ask the user
    if (!hasBudgetRef) return res.json({ suggestions: [], noIncome: true });

    const budget = totalBudget && parseFloat(totalBudget) > 0 ? parseFloat(totalBudget) : monthlyIncome;
    const fromNetWorth = !!(totalBudget && parseFloat(totalBudget) > 0 && monthlyIncome === 0);

    const spendingLines = Object.keys(catTotals).length
      ? 'Spending history (last 3 months avg):\n' + Object.entries(catTotals).map(([cat, amts]) => {
          const avg = amts.reduce((s, a) => s + a, 0) / amts.length;
          return `  ${cat}: $${avg.toFixed(2)}/month avg`;
        }).join('\n')
      : 'No spending history yet.';

    const incomeContext = fromNetWorth
      ? `User has no recurring income. They want to spend from savings/net worth and set a total monthly budget of $${budget.toFixed(2)}.`
      : `Monthly income: $${budget.toFixed(2)}.`;

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
            content: `You are a financial advisor. Suggest monthly budget limits for each spending category.
Return ONLY a valid JSON array — no markdown, no explanation:
[{"category":"Food","suggested_amount":350,"reasoning":"One sentence mentioning the real numbers"}]
Rules:
- Only use categories from: Food, Coffee, Transport, Shopping, Entertainment, Health, Fitness, Education, Bills, Travel, Gifts, Subscriptions, Other
- Suggest 5–8 of the most relevant categories
- Total of all suggested_amounts must NOT exceed the monthly budget/income
- Use the 50/30/20 rule as a guide (needs/wants/savings)
- Reference the actual budget number in each reasoning sentence`
          },
          { role: 'user', content: `${incomeContext}\n\n${spendingLines}\n\nSuggest a monthly budget for each relevant category.` }
        ]
      })
    });
    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content?.trim() || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ suggestions, monthlyIncome: monthlyIncome > 0 ? monthlyIncome : null, fromNetWorth });
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
