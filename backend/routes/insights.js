const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const callAI = async (messages) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 300 })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'AI error');
  return data.choices[0].message.content;
};

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    const expenses = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 50', [req.userId]);
    const income = await pool.query('SELECT * FROM income WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.userId]);
    const budgets = await pool.query('SELECT * FROM budgets WHERE user_id = $1', [req.userId]);
    const total = expenses.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalIncome = income.rows.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const categoryTotals = expenses.rows.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
      return acc;
    }, {});
    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(', ');
    const systemMessage = {
      role: 'system',
      content: `You are Spendly AI, a friendly personal finance assistant.
User's Financial Data:
- Total Income: $${totalIncome.toFixed(2)}
- Total Spending: $${total.toFixed(2)}
- Balance: $${(totalIncome - total).toFixed(2)}
- Spending by category: ${categoryBreakdown || 'No expenses yet'}
- Number of transactions: ${expenses.rows.length}
- Budget goals: ${budgets.rows.map(b => `${b.category}: $${b.amount}`).join(', ') || 'None set'}
Rules: Be friendly, short, and practical. Use emojis naturally. Use **bold** for important numbers. Answer ONLY finance related questions. Keep responses under 150 words`
    };
    const messages = [
      systemMessage,
      ...(history || []).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];
    const reply = await callAI(messages);
    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Error getting response' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const expenses = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 50', [req.userId]);
    if (expenses.rows.length === 0) return res.json({ insight: 'Add some expenses first to get AI insights!' });
    const total = expenses.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const categoryTotals = expenses.rows.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
      return acc;
    }, {});
    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)} (${((amt / total) * 100).toFixed(0)}%)`)
      .join(', ');
    const messages = [
      {
        role: 'system',
        content: 'You are a friendly personal finance advisor. Give exactly 4 short practical insights. Start each with an emoji. Use **bold** for key numbers. Keep each to 2 sentences max.'
      },
      {
        role: 'user',
        content: `Analyze my spending: Total: $${total.toFixed(2)}, Categories: ${categoryBreakdown}, Transactions: ${expenses.rows.length}`
      }
    ];
    const insight = await callAI(messages);
    res.json({ insight });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating insights' });
  }
});

module.exports = router;