const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.post('/command', authenticateToken, async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || text.trim().length < 2) return res.status(400).json({ message: 'Text required' });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    const [expResult, incResult, budResult, userResult] = await Promise.all([
      pool.query(
        'SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3',
        [req.userId, month, year]
      ),
      pool.query(
        'SELECT COALESCE(SUM(amount),0) as total FROM income WHERE user_id=$1 AND month=$2 AND year=$3',
        [req.userId, month, year]
      ),
      pool.query('SELECT category, amount FROM budgets WHERE user_id=$1', [req.userId]),
      pool.query('SELECT name, currency FROM users WHERE id=$1', [req.userId])
    ]);

    const totalSpent = parseFloat(expResult.rows[0].total);
    const totalIncome = parseFloat(incResult.rows[0].total);
    const currency = userResult.rows[0]?.currency || 'USD';
    const userName = userResult.rows[0]?.name || 'User';
    const budgetSummary = budResult.rows.length
      ? budResult.rows.map(b => `${b.category}: ${currency} ${b.amount}`).join(', ')
      : 'none set';
    const monthName = now.toLocaleString('default', { month: 'long' });

    const systemPrompt = `You are Spendly AI, a smart and friendly personal finance assistant embedded in a mobile app. Always respond in the same language the user speaks (detected: ${language || 'en'}).

User: ${userName} | Currency: ${currency} | Today: ${today}
${monthName} ${year} snapshot:
  - Spent: ${currency} ${totalSpent.toFixed(2)}
  - Income: ${currency} ${totalIncome.toFixed(2)}
  - Balance: ${currency} ${(totalIncome - totalSpent).toFixed(2)}
  - Budgets: ${budgetSummary}

Return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Intent types:
- "navigate" → user wants to go to a page
- "add_expense" → user wants to log a purchase/expense
- "add_income" → user wants to log income/salary
- "set_budget" → user wants to set or update a spending limit
- "add_goal" → user wants to create a savings or debt goal
- "chat" → question, advice, financial summary, or anything else

JSON format:
{
  "intent": "<intent_type>",
  "navigate_to": "<path or null>",
  "data": <object or null>,
  "response": "<friendly reply in user's language, max 2 sentences, confirm what was done or answer the question>"
}

Data schemas:
- add_expense: { "amount": number, "category": "Food|Transport|Shopping|Subscriptions|Entertainment|Other", "description": "short merchant/item name", "date": "YYYY-MM-DD" }
- add_income: { "amount": number, "source": "description", "month": ${month}, "year": ${year} }
- set_budget: { "category": "Food|Transport|Shopping|Subscriptions|Entertainment|Other", "amount": number, "period": "monthly" }
- add_goal (savings): { "name": "goal name", "target_amount": number, "saved_amount": 0, "goal_type": "savings" }
- add_goal (debt): { "name": "debt name", "total_amount": number, "remaining_amount": number, "monthly_payment": number, "interest_rate": 0, "category": "Other", "type": "debt" }
- navigate: null (set navigate_to to one of: /dashboard /transactions /budgets /goals /wellness /profile /reports /insights)
- chat: null

Category mapping:
- Food → restaurants, cafes, groceries, delivery, fast food
- Transport → Uber, taxi, gas, parking, flight, metro, bus
- Shopping → clothes, electronics, pharmacy, Amazon, household
- Subscriptions → Netflix, Spotify, streaming, software, apps
- Entertainment → cinema, bars, gaming, concerts, clubs
- Other → rent, utilities, healthcare, gym, insurance`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]
      })
    });

    const aiData = await response.json();
    if (!response.ok) throw new Error(aiData.error?.message || 'AI error');

    const raw = aiData.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ message: 'Could not understand request', response: raw });

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (e) {
    console.error('AI command error:', e);
    res.status(500).json({ message: 'AI error', error: e.message });
  }
});

module.exports = router;
