const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.post('/command', authenticateToken, async (req, res) => {
  try {
    const { text, language, history = [] } = req.body;
    if (!text || text.trim().length < 1) return res.status(400).json({ message: 'Text required' });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    const [expResult, incResult, budResult, userResult, catResult, goalResult, debtResult] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3', [req.userId, month, year]),
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM income WHERE user_id=$1 AND month=$2 AND year=$3', [req.userId, month, year]),
      pool.query('SELECT category, amount FROM budgets WHERE user_id=$1', [req.userId]),
      pool.query('SELECT name, currency FROM users WHERE id=$1', [req.userId]),
      pool.query('SELECT category, COALESCE(SUM(amount),0) as spent FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3 GROUP BY category', [req.userId, month, year]),
      pool.query('SELECT id, name, target_amount, saved_amount, goal_type FROM savings_goals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10', [req.userId]),
      pool.query('SELECT id, name, total_amount, remaining_amount, monthly_payment FROM debts WHERE user_id=$1 AND remaining_amount > 0 ORDER BY created_at DESC LIMIT 10', [req.userId])
    ]);

    const totalSpent = parseFloat(expResult.rows[0].total);
    const totalIncome = parseFloat(incResult.rows[0].total);
    const currency = userResult.rows[0]?.currency || 'USD';
    const userName = userResult.rows[0]?.name || 'User';
    const catSpent = {};
    catResult.rows.forEach(r => { catSpent[r.category] = parseFloat(r.spent) });
    const budgetSummary = budResult.rows.length
      ? budResult.rows.map(b => {
          const spent = catSpent[b.category] || 0;
          const limit = parseFloat(b.amount);
          const pct = limit > 0 ? ((spent / limit) * 100).toFixed(0) : 0;
          const status = spent > limit ? 'OVER BUDGET' : spent / limit >= 0.8 ? 'near limit' : 'under budget';
          return `${b.category}: spent ${currency} ${spent.toFixed(2)} of ${currency} ${limit.toFixed(2)} limit (${pct}%) — ${status}`;
        }).join('\n')
      : 'none set';
    const monthName = now.toLocaleString('default', { month: 'long' });
    const isFollowUp = history.length > 0;

    const goalsSummary = goalResult.rows.length
      ? goalResult.rows.map(g => `"${g.name}" (${g.goal_type}): saved ${currency} ${parseFloat(g.saved_amount).toFixed(2)} of ${currency} ${parseFloat(g.target_amount).toFixed(2)}`).join('; ')
      : 'none';
    const debtsSummary = debtResult.rows.length
      ? debtResult.rows.map(d => `"${d.name}": ${currency} ${parseFloat(d.remaining_amount).toFixed(2)} remaining of ${currency} ${parseFloat(d.total_amount).toFixed(2)}`).join('; ')
      : 'none';

    const systemPrompt = `You are Spendly AI, a smart and friendly personal finance assistant. Always respond in the user's language (${language || 'en'}).

User: ${userName} | Currency: ${currency} | Today: ${today}
${monthName} ${year}: Spent ${currency} ${totalSpent.toFixed(2)} | Income ${currency} ${totalIncome.toFixed(2)} | Balance ${currency} ${(totalIncome - totalSpent).toFixed(2)}
Budget status: ${budgetSummary}
Savings goals: ${goalsSummary}
Active debts: ${debtsSummary}
${isFollowUp ? `\nThis is a FOLLOW-UP turn. Use the conversation history to understand what fields were already collected and what the user is now answering.` : ''}

Return ONLY a valid JSON object. No markdown, no explanation.

CRITICAL RULE — Check for missing required fields BEFORE executing:
- set_budget needs: category AND amount
- add_expense needs: amount (description optional)
- add_income needs: amount
- add_goal (savings) needs: name AND target_amount
- add_goal (debt) needs: name AND total_amount
- complete_goal needs: name (match from savings goals list above)
- complete_debt needs: name (match from active debts list above)
- add_funds_to_goal needs: name AND amount
- make_debt_payment needs: name AND amount
- add_networth_item needs: name, amount, type (asset or liability)
- If user says "add a goal" with no type → ask if it's a savings goal or a debt

Ask for ONE missing field at a time, starting with the most important.

Intent types:
- "need_more_info" → required field is missing, ask for it
- "navigate" → user wants to go to a page
- "add_expense" → log a purchase/expense
- "add_income" → log income
- "set_budget" → set a budget limit
- "add_goal" → create savings or debt goal
- "complete_goal" → mark a savings goal as done and add to net worth
- "complete_debt" → mark a debt as fully paid and remove from net worth
- "add_funds_to_goal" → add money toward a savings goal
- "make_debt_payment" → record a payment on a debt
- "add_networth_item" → add an asset or liability to net worth
- "chat" → question, advice, or anything else

Response JSON format:
{
  "intent": "<type>",
  "navigate_to": "<path or null>",
  "data": <object or null>,
  "response": "<friendly reply in user's language, max 2 sentences>",
  "question": "<if need_more_info: the specific question to ask>",
  "partial_intent": "<if need_more_info: the intended action>",
  "partial_data": <if need_more_info: data collected so far>
}

Data schemas:
- add_expense: { "amount": number, "category": "Food|Transport|Shopping|Subscriptions|Entertainment|Other", "description": "merchant/item", "date": "${today}" }
- add_income: { "amount": number, "source": "description", "month": ${month}, "year": ${year} }
- set_budget: { "category": "Food|Transport|Shopping|Subscriptions|Entertainment|Other", "amount": number, "period": "monthly" }
- add_goal (savings): { "name": "goal name", "target_amount": number, "saved_amount": 0, "goal_type": "Other" }
- add_goal (debt): { "name": "debt name", "total_amount": number, "remaining_amount": number, "monthly_payment": number, "interest_rate": 0, "category": "Other", "type": "debt" }
- complete_goal: { "name": "exact or partial goal name from list" }
- complete_debt: { "name": "exact or partial debt name from list" }
- add_funds_to_goal: { "name": "goal name", "amount": number }
- make_debt_payment: { "name": "debt name", "amount": number }
- add_networth_item: { "name": string, "amount": number, "type": "asset|liability", "category": "Cash & Bank|Savings|Investments|Real Estate|Vehicle|Credit Card|Mortgage|Car Loan|Student Loan|Personal Loan|Other" }
- navigate: set navigate_to to one of: /dashboard /transactions /budgets /goals /wellness /profile /reports /insights /net-worth

Category hints: Food=restaurants/groceries, Transport=Uber/gas/parking, Shopping=clothes/electronics, Subscriptions=Netflix/apps, Entertainment=cinema/bars/gaming, Other=rent/utilities/gym`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      { role: 'user', content: text }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 400, temperature: 0.2, messages })
    });

    const aiData = await response.json();
    if (!response.ok) throw new Error(aiData.error?.message || 'AI error');

    const raw = aiData.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ message: 'Could not understand', response: raw });

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (e) {
    console.error('AI command error:', e);
    res.status(500).json({ message: 'AI error', error: e.message });
  }
});

module.exports = router;
