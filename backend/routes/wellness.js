const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');


// GET all wellness data
router.get('/', uthenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const [expenses, income, budgets, savings, notes, mood, vision, goal] = await Promise.all([
      pool.query('SELECT * FROM expenses WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM income WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM budgets WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM savings_goals WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM wellness_notes WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1', [req.userId]),
      pool.query('SELECT * FROM wellness_mood WHERE user_id = $1 AND date = CURRENT_DATE', [req.userId]),
      pool.query('SELECT * FROM wellness_vision WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.userId]),
      pool.query('SELECT * FROM monthly_goals WHERE user_id = $1 AND month = $2 AND year = $3', [req.userId, month, year])
    ]);

    // Calculate health score
    let score = 0;
    const breakdown = [];

    // 1. Has income tracked? +20
    const monthIncome = income.rows.filter(i => i.month === month && i.year === year);
    const totalIncome = monthIncome.reduce((s, i) => s + parseFloat(i.amount), 0);
    if (totalIncome > 0) {
      score += 20;
      breakdown.push({ label: 'Income Tracked', points: 20, max: 20, achieved: true });
    } else {
      breakdown.push({ label: 'Income Tracked', points: 0, max: 20, achieved: false, tip: 'Add your income to track your savings rate' });
    }

    // 2. Staying under budget? +25
    const monthExpenses = expenses.rows.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const totalSpent = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const categoryTotals = monthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
      return acc;
    }, {});
    const overBudgetCount = budgets.rows.filter(b => {
      const spent = categoryTotals[b.category] || 0;
      return spent > parseFloat(b.amount);
    }).length;

    if (budgets.rows.length > 0 && overBudgetCount === 0) {
      score += 25;
      breakdown.push({ label: 'Under Budget', points: 25, max: 25, achieved: true });
    } else if (budgets.rows.length === 0) {
      breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: 'Set budget goals to track your spending limits' });
    } else {
      breakdown.push({ label: 'Under Budget', points: 0, max: 25, achieved: false, tip: `You exceeded budget in ${overBudgetCount} categor${overBudgetCount > 1 ? 'ies' : 'y'}` });
    }

    // 3. Positive balance? +25
    const balance = totalIncome - totalSpent;
    if (totalIncome > 0 && balance > 0) {
      const savingsRate = (balance / totalIncome) * 100;
      const pts = savingsRate >= 20 ? 25 : savingsRate >= 10 ? 15 : 10;
      score += pts;
      breakdown.push({ label: 'Positive Balance', points: pts, max: 25, achieved: true });
    } else {
      breakdown.push({ label: 'Positive Balance', points: 0, max: 25, achieved: false, tip: 'Try to spend less than you earn this month' });
    }

    // 4. Has savings goals? +15
    if (savings.rows.length > 0) {
      score += 15;
      breakdown.push({ label: 'Savings Goals Set', points: 15, max: 15, achieved: true });
    } else {
      breakdown.push({ label: 'Savings Goals Set', points: 0, max: 15, achieved: false, tip: 'Create a savings goal to start building wealth' });
    }

    // 5. Consistent tracking? +15
    if (monthExpenses.length >= 10) {
      score += 15;
      breakdown.push({ label: 'Consistent Tracking', points: 15, max: 15, achieved: true });
    } else {
      const pts = Math.floor((monthExpenses.length / 10) * 15);
      score += pts;
      breakdown.push({ label: 'Consistent Tracking', points: pts, max: 15, achieved: false, tip: `Add ${10 - monthExpenses.length} more transactions to max this out` });
    }

    // Calculate streak
    const sortedDates = [...new Set(expenses.rows.map(e => e.date?.split('T')[0]))].sort().reverse();
    let streak = 0;
    let checkDate = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (i > 0) break;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Achievements
    const achievements = [];
    if (expenses.rows.length >= 1) achievements.push({ icon: '🎯', title: 'First Step', desc: 'Added your first expense' });
    if (expenses.rows.length >= 50) achievements.push({ icon: '📊', title: 'Data Master', desc: '50+ expenses tracked' });
    if (budgets.rows.length >= 1) achievements.push({ icon: '⚡', title: 'Budget Setter', desc: 'Created your first budget' });
    if (savings.rows.length >= 1) achievements.push({ icon: '🏦', title: 'Saver', desc: 'Created a savings goal' });
    if (totalIncome > 0) achievements.push({ icon: '💰', title: 'Income Tracker', desc: 'Tracking your income' });
    if (score >= 80) achievements.push({ icon: '🏆', title: 'Finance Pro', desc: 'Health score above 80!' });
    if (score === 100) achievements.push({ icon: '💎', title: 'Perfect Score', desc: 'Achieved 100/100!' });
    if (streak >= 7) achievements.push({ icon: '🔥', title: 'On Fire', desc: '7 day tracking streak!' });
    if (balance > 0 && totalIncome > 0 && (balance / totalIncome) >= 0.2) achievements.push({ icon: '🌟', title: 'Smart Saver', desc: 'Saving 20%+ of income!' });

    res.json({
      score,
      breakdown,
      streak,
      achievements,
      totalIncome,
      totalSpent,
      balance,
      note: notes.rows[0] || null,
      mood: mood.rows[0] || null,
      vision: vision.rows[0] || null,
      monthlyGoal: goal.rows[0] || null,
      month,
      year
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching wellness data' });
  }
});

// Save/update note
router.post('/note', uthenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const existing = await pool.query('SELECT * FROM wellness_notes WHERE user_id = $1', [req.userId]);
    if (existing.rows.length > 0) {
      await pool.query('UPDATE wellness_notes SET content = $1, updated_at = NOW() WHERE user_id = $2', [content, req.userId]);
    } else {
      await pool.query('INSERT INTO wellness_notes (user_id, content) VALUES ($1, $2)', [req.userId, content]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving note' });
  }
});

// Save mood
router.post('/mood', uthenticateToken, async (req, res) => {
  try {
    const { mood } = req.body;
    await pool.query(
      'INSERT INTO wellness_mood (user_id, mood, date) VALUES ($1, $2, CURRENT_DATE) ON CONFLICT (user_id, date) DO UPDATE SET mood = $2',
      [req.userId, mood]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving mood' });
  }
});

// Save monthly goal
router.post('/goal', uthenticateToken, async (req, res) => {
  try {
    const { goal } = req.body;
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    await pool.query(
      'INSERT INTO monthly_goals (user_id, goal, month, year) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, month, year) DO UPDATE SET goal = $2',
      [req.userId, goal, month, year]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving goal' });
  }
});

// Save vision board image (base64)
router.post('/vision', uthenticateToken, async (req, res) => {
  try {
    const { title, image_url } = req.body;
    const existing = await pool.query('SELECT * FROM wellness_vision WHERE user_id = $1', [req.userId]);
    if (existing.rows.length > 0) {
      await pool.query('UPDATE wellness_vision SET title = $1, image_url = $2 WHERE user_id = $3', [title, image_url, req.userId]);
    } else {
      await pool.query('INSERT INTO wellness_vision (user_id, title, image_url) VALUES ($1, $2, $3)', [req.userId, title, image_url]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving vision' });
  }
});

// Get AI joke
router.get('/joke', uthenticateToken, async (req, res) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 100,
        messages: [
          {
            role: 'system',
            content: 'You are a comedian who specializes in finance and money jokes. Return ONLY the joke itself, no introduction, no explanation, no quotation marks. Just the joke in one or two sentences.'
          },
          {
            role: 'user',
            content: 'Tell me a funny, clever, and original joke about money, finance, budgeting, investing, or economics. Make it different every time.'
          }
        ]
      })
    });
    const data = await response.json();
    const joke = data.choices[0].message.content.trim();
    res.json({ joke });
  } catch (error) {
    console.error(error);
    res.json({ joke: "Why did the banker switch careers? He lost interest! 😂" });
  }
});

// Get AI quote
router.get('/quote', uthenticateToken, async (req, res) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 100,
        messages: [
          {
            role: 'system',
            content: 'You are a curator of famous financial wisdom quotes. Return ONLY a JSON object with two fields: "text" (the quote) and "author" (who said it). No markdown, no explanation, just the raw JSON.'
          },
          {
            role: 'user',
            content: 'Give me a real, famous, inspiring quote about money, finance, wealth, saving, or investing from a well-known person. Make it different every time.'
          }
        ]
      })
    });
    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.json({ text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" });
  }
});

router.post('/mood-response', uthenticateToken, async (req, res) => {
  try {
    const { mood } = req.body

    const expenses = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 20',
      [req.userId]
    )
    const income = await pool.query(
      'SELECT * FROM income WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [req.userId]
    )

    const total = expenses.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0)
    const totalIncome = income.rows.reduce((sum, i) => sum + parseFloat(i.amount), 0)
    const balance = totalIncome - total

    const moodMessages = {
      great: 'The user feels GREAT about their finances today.',
      good: 'The user feels GOOD about their finances today.',
      okay: 'The user feels OKAY about their finances today.',
      worried: 'The user feels WORRIED about their finances today.',
      stressed: 'The user feels STRESSED about their finances today.',
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 80,
        messages: [
          {
            role: 'system',
            content: `You are a friendly and empathetic financial wellness coach. 
Respond in 1-2 short sentences only.
Be warm, personal, and reference their actual financial situation.
Use one emoji at the start.
Never use bullet points.`
          },
          {
            role: 'user',
            content: `${moodMessages[mood]}
Their financial data: Total spent: $${total.toFixed(2)}, Total income: $${totalIncome.toFixed(2)}, Balance: $${balance.toFixed(2)}.
Give them a short warm personalized response based on their mood and finances.`
          }
        ]
      })
    })

    const data = await response.json()
    const message = data.choices[0].message.content.trim()
    res.json({ message })

  } catch (error) {
    console.error(error)
    const fallbacks = {
      great: "🌟 That's amazing! Keep up the great financial habits!",
      good: "😊 Great to hear! You're doing well, keep tracking!",
      okay: "💪 That's okay! Small steps lead to big improvements.",
      worried: "🤗 Don't worry! You're already ahead by tracking your finances.",
      stressed: "💚 Take a breath! Awareness is the first step to financial freedom.",
    }
    res.json({ message: fallbacks[mood] || "💚 Keep going, you're doing great!" })
  }
})

module.exports = router;