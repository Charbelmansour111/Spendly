const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message, history } = req.body;

    const expenses = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 50',
      [req.userId]
    );
    const income = await pool.query(
      'SELECT * FROM income WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.userId]
    );
    const budgets = await pool.query(
      'SELECT * FROM budgets WHERE user_id = $1',
      [req.userId]
    );

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

    const systemContext = `
You are Spendly AI, a friendly and knowledgeable personal finance assistant. 
You have access to the user's real financial data and can answer any question about their finances.

User's Financial Data:
- Total Income: $${totalIncome.toFixed(2)}
- Total Spending: $${total.toFixed(2)}
- Balance: $${(totalIncome - total).toFixed(2)}
- Spending by category: ${categoryBreakdown || 'No expenses yet'}
- Number of transactions: ${expenses.rows.length}
- Budget goals: ${budgets.rows.map(b => `${b.category}: $${b.amount}`).join(', ') || 'None set'}

Rules:
- Be friendly, short, and practical
- Use emojis naturally
- Use **bold** for important numbers or key points
- Answer ONLY finance related questions
- If asked something unrelated to finance, politely redirect to finance topics
- Reference their actual data when relevant
- Keep responses under 150 words unless they ask for detail
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemContext }]
        },
        {
          role: 'model',
          parts: [{ text: 'Understood! I am Spendly AI, ready to help with personalized financial advice based on your real spending data.' }]
        },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      ]
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Error getting response' });
  }
});

// Keep old route for backward compatibility
router.get('/', verifyToken, async (req, res) => {
  try {
    const expenses = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 50',
      [req.userId]
    );
    if (expenses.rows.length === 0) {
      return res.json({ insight: 'Add some expenses first to get AI insights!' });
    }
    const total = expenses.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const categoryTotals = expenses.rows.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
      return acc;
    }, {});
    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)} (${((amt / total) * 100).toFixed(0)}%)`)
      .join(', ');

    const prompt = `You are a friendly personal finance advisor. Analyze this spending data and give exactly 4 short practical insights. Start each with an emoji. Use **bold** for key numbers. Keep each to 2 sentences max. Speak directly to the user.

Total Spending: $${total.toFixed(2)}
Categories: ${categoryBreakdown}
Transactions: ${expenses.rows.length}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    res.json({ insight: result.response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating insights' });
  }
});

module.exports = router;