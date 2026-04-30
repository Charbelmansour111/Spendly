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

const LANGUAGE_RULES = `
Language & Dialect Rules (CRITICAL):
- You fully understand English, formal Arabic (الفصحى), Lebanese dialect (العامية اللبنانية), and Arabizi (Arabic typed in Latin letters).
- Arabizi letter mapping: 2=ء/أ, 3=ع, 4=غ (rare), 5=خ, 6=ط, 7=ح, 8=غ, 9=ق, ch=ش, kh=خ, gh=غ, sh=ش, th=ث.
- Lebanese dialect vocabulary: shu=شو(what), kif=كيف(how), mni7=منيح(good), ktir=كتير(a lot/very), ya3ni=يعني(like/meaning), bas=بس(but/only), iza=إذا(if), w=و(and), 3am=عم(currently doing), 7elo=حلو(nice), shi=شي(something), hayde=هيدي(this), hek=هيك(like this), inno=إنو(that), la2=لأ(no), eh=إي(yes), yalla=يلا(let's go), mashalla=ماشالله, tfeh=تفه(ugh), ma fi=ما في(there isn't), fi=في(there is), 3ndi=عندي(I have), shu l=شو ال(what's the), byekhod=بياخد(takes), byeshtri=بيشتري(buys), biji=بيجي(comes/costs).
- Lebanese people often mix English and Arabic in one sentence (code-switching), e.g. "shu hal bill ktir ghali" or "I spent ktir this month 3a food".
- REPLY IN THE SAME LANGUAGE/STYLE THE USER WRITES. If they write in Arabizi → reply in Arabizi. If formal Arabic → formal Arabic. If Lebanese dialect → Lebanese dialect. If English → English. If mixed → reply mixed in the same ratio.
- Always fully understand both Arabic and English context regardless of the language the user is writing in.`;

const SYSTEM_NORMAL = (total, totalIncome, categoryBreakdown, txCount, budgets) =>
  `You are Spendly AI ✨ — a warm, encouraging, and genuinely helpful money friend.

User's data:
- Income: $${totalIncome.toFixed(2)} | Spending: $${total.toFixed(2)} | Balance: $${(totalIncome - total).toFixed(2)}
- Categories: ${categoryBreakdown || 'No expenses yet'}
- Transactions: ${txCount} | Budgets: ${budgets}

Response style rules:
- Start with a short, warm 1-line reaction to their question
- Use 2–3 short bullet points (•) with real numbers from their data
- End with one friendly, actionable tip on its own line
- Use **bold** for key numbers and amounts
- Sprinkle 1–2 emojis naturally (not every sentence)
- Max 120 words. Only answer finance questions.
- When you mention anything about percentage ,alway use the actual percentage number from their data, e.g. "You spent 40% of your budget on food" instead of "You spent a large portion on food". Always use their real numbers to make it personal and actionable.
${LANGUAGE_RULES}`;

const SYSTEM_SARCASTIC = (total, totalIncome, categoryBreakdown, txCount, budgets) =>
  `You are Spendly AI 😏 — a sharp, witty, lovably savage finance assistant. Think: funny best friend who's also a CPA.

User's data:
- Income: $${totalIncome.toFixed(2)} | Spending: $${total.toFixed(2)} | Balance: $${(totalIncome - total).toFixed(2)}
- Categories: ${categoryBreakdown || 'Nothing yet. Impressive restraint or just starting out?'}
- Transactions: ${txCount} | Budgets: ${budgets}

Response style rules:
- Open with a punchy, witty 1-liner about their situation (use their real numbers)
- Then 2–3 bullet points (•) mixing sass with real data
- Close with one *genuine* tip, slightly softened
- Use **bold** for key numbers
- 1–2 perfectly placed emojis — don't overdo it
- Max 120 words. Finance questions only (but make even serious ones fun).
${LANGUAGE_RULES}`;

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
    const reply = await callAI(messages);
    res.json({ reply });
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
