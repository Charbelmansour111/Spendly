const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const callAI = async (messages, maxTokens = 600) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'AI error');
  return data.choices[0].message.content;
};

const SHARED_RULES = () => {
  const today = new Date().toISOString().split('T')[0];
  return `
LANGUAGE DETECTION (always apply first):
- If user writes in ENGLISH → reply in English only.
- If user writes in ARABIC SCRIPT, or LEBANESE/ARABIC PHONETIC LATIN (any of: re7et, raye7, w, ana, shu, 3m, 2a, fi, ma, heik, hek, haida, yalla, ktir, kteer, xalas, 5alas, mashi, walla, inno, akid, shi, 7ada, 2adesh, ta3a, bala, 7elo, kif, kef, or any word using 2/3/5/7/8 as Arabic letter substitutes, or obvious Arabic-dialect words mixed with French or English) → reply BILINGUALLY in this EXACT format with no exception:

[Lebanese Latin script answer — WhatsApp-style casual Lebanese, use 3=ع 7=ح 2=أ/ء 5=خ, mix French/English naturally like Lebanese people do]
---
[نفس الجواب بالعربي — exact same content written in Arabic script, Lebanese dialect]

TRANSACTION DETECTION (apply every message):
- If the user mentions ANY spending, payment, or purchase (any amount, any currency, any language) — extract EVERY transaction they mentioned.
- In your reply, clearly list what you understood (description, amount, category) and ask "Ba3den fi shi tene? / هل في شي تاني?" (or English equivalent if they spoke English).
- At the VERY END of your reply, on its own line, output EXACTLY this (no extra text after it):
TXNS:[{"amount":NUMBER,"category":"Food|Transport|Shopping|Subscriptions|Entertainment|Other","description":"merchant or what it was","date":"${today}"}]
- One JSON object per transaction. Use ${today} unless user mentioned a different date.
- If NO spending was mentioned in this message, do NOT include the TXNS line at all.`;
};

const SYSTEM_NORMAL = (total, totalIncome, categoryBreakdown, txCount, budgets) =>
  `You are Spendly AI ✨ — a warm, encouraging, and genuinely helpful money friend.

User's financial data:
- Income: $${totalIncome.toFixed(2)} | Spending: $${total.toFixed(2)} | Balance: $${(totalIncome - total).toFixed(2)}
- Categories: ${categoryBreakdown || 'No expenses yet'}
- Transactions: ${txCount} | Budgets: ${budgets}

Response style:
- Start with a short warm reaction
- Use 2–3 bullet points (•) with real numbers
- End with one actionable tip
- Use **bold** for key numbers, 1–2 emojis max
- Keep it concise. Finance questions only.
${SHARED_RULES()}`;

const SYSTEM_SARCASTIC = (total, totalIncome, categoryBreakdown, txCount, budgets) =>
  `You are Spendly AI 😏 — sharp, witty, lovably savage. Funny best friend who's also a CPA.

User's financial data:
- Income: $${totalIncome.toFixed(2)} | Spending: $${total.toFixed(2)} | Balance: $${(totalIncome - total).toFixed(2)}
- Categories: ${categoryBreakdown || 'Nothing yet. Impressive restraint or just starting out?'}
- Transactions: ${txCount} | Budgets: ${budgets}

Response style:
- Open with a punchy 1-liner using their real numbers
- 2–3 bullet points mixing sass with real data
- Close with one genuine tip, slightly softened
- **bold** key numbers, 1–2 emojis max
- Finance questions only (make even serious ones fun).
${SHARED_RULES()}`;

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, history, mode } = req.body;
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
    const budgetSummary = budgets.rows.map(b => `${b.category}: $${b.amount}`).join(', ') || 'None set';
    const systemFn = mode === 'sarcastic' ? SYSTEM_SARCASTIC : SYSTEM_NORMAL;
    const systemMessage = {
      role: 'system',
      content: systemFn(total, totalIncome, categoryBreakdown, expenses.rows.length, budgetSummary),
    };
    const messages = [
      systemMessage,
      ...(history || []).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];
    const raw = await callAI(messages, 700);

    // Extract TXNS marker from end of reply
    const txnMarker = 'TXNS:';
    const txnIndex = raw.lastIndexOf(txnMarker);
    let pendingTransactions = [];
    let reply = raw.trim();
    if (txnIndex !== -1) {
      try {
        const jsonStr = raw.slice(txnIndex + txnMarker.length).trim();
        const bracketEnd = jsonStr.lastIndexOf(']');
        pendingTransactions = JSON.parse(jsonStr.slice(0, bracketEnd + 1));
        reply = raw.slice(0, txnIndex).trim();
      } catch { /* keep raw reply if parse fails */ }
    }

    res.json({ reply, pendingTransactions });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Error getting response' });
  }
});

router.post('/analyze-expense', authenticateToken, async (req, res) => {
  try {
    const { amount, category, description } = req.body;
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
    const budgetSummary = budgets.rows.map(b => `${b.category}: $${b.amount}`).join(', ') || 'None set';
    const messages = [
      {
        role: 'system',
        content: `You are a financial advisor. The user just logged a new expense. Evaluate if this purchase is financially unwise for this user.

User's financial context:
- Monthly Income: $${totalIncome.toFixed(2)} | Total Spending: $${total.toFixed(2)} | Remaining: $${(totalIncome - total).toFixed(2)}
- Spending by category: ${categoryBreakdown || 'None yet'}
- Budget limits: ${budgetSummary}

New transaction: ${description || category} — $${parseFloat(amount || 0).toFixed(2)} (${category})

Rules:
- If the expense seems FINE (within budget, reasonable for their income), respond ONLY with the word: OK
- If the expense is financially problematic (over budget, too high relative to income, or excessive pattern), give a SHORT honest message (1-2 sentences). Be warm but direct. Use their real numbers. Start with a relevant emoji.
- Never lecture. Just be real. If it's fine, say only "OK".`
      },
      { role: 'user', content: `I just logged: ${description || category} for $${parseFloat(amount || 0).toFixed(2)}` }
    ];
    const reply = await callAI(messages);
    const isBad = reply.trim().toUpperCase() !== 'OK' && !reply.trim().toUpperCase().startsWith('OK\n') && !reply.trim().toUpperCase().startsWith('OK ');
    res.json({ isBad, message: isBad ? reply.trim() : null });
  } catch (e) {
    console.error('Analyze expense error:', e);
    res.json({ isBad: false, message: null });
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