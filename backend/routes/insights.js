const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const callAI = async (messages, maxTokens = 300) => {
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
    const income   = await pool.query('SELECT * FROM income WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.userId]);
    const budgets  = await pool.query('SELECT * FROM budgets WHERE user_id = $1', [req.userId]);

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

    // Recent expenses with IDs for action capability
    const expenseList = expenses.rows.slice(0, 30).map(e =>
      `[ID:${e.id}] ${(e.date||'').split('T')[0]} | ${e.category} | ${e.description || '—'} | $${parseFloat(e.amount).toFixed(2)}`
    ).join('\n');

    const actionInstructions = `

EXPENSE ACTIONS — you can delete or update expenses when asked:
Listed expenses (use ONLY these real IDs):
${expenseList}

If the user asks to delete or update a specific expense:
1. Write your normal reply (confirm what you found, be funny as usual)
2. Append EXACTLY ONE tag on its own line at the very end:
   Delete:  ##ACTION:DELETE:ID##
   Update:  ##ACTION:UPDATE:ID:amount=X## or ##ACTION:UPDATE:ID:amount=X,description=Y,category=Z##
Only tag a single expense. If multiple match, ask the user to clarify (no tag).
Never invent IDs — only use IDs from the list above.`;

    const systemFn = mode === 'sarcastic' ? SYSTEM_SARCASTIC : SYSTEM_NORMAL;
    const systemMessage = {
      role: 'system',
      content: systemFn(total, totalIncome, categoryBreakdown, expenses.rows.length, budgetSummary) + actionInstructions,
    };

    const messages = [
      systemMessage,
      ...(history || []).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : '',
      })),
      { role: 'user', content: message },
    ];

    const raw = await callAI(messages, 400);

    // Parse optional action tag
    const actionMatch = raw.match(/##ACTION:(DELETE|UPDATE):(\d+)(?::([^#\n]+))?##/);
    let action = null;
    const reply = raw.replace(/##ACTION:[^#]+##/g, '').trim();

    if (actionMatch) {
      const [, type, idStr, params] = actionMatch;
      const expId = parseInt(idStr);
      const expense = expenses.rows.find(e => e.id === expId);
      if (expense) {
        action = { type: type.toLowerCase(), expense };
        if (type === 'UPDATE' && params) {
          action.updates = {};
          params.split(',').forEach(p => {
            const eq = p.indexOf('=');
            if (eq > -1) action.updates[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
          });
        }
      }
    }

    res.json({ reply, action });
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

router.post('/monthly-wrap', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.body;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();

    const expenses = await pool.query(
      `SELECT * FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3 ORDER BY amount DESC`,
      [req.userId, m, y]
    );
    const income = await pool.query(
      `SELECT * FROM income WHERE user_id=$1 AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3`,
      [req.userId, m, y]
    );

    if (expenses.rows.length === 0) return res.json({ slides: null });

    const total     = expenses.rows.reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalInc  = income.rows.reduce((s, i) => s + parseFloat(i.amount), 0);
    const saved     = totalInc - total;
    const txCount   = expenses.rows.length;
    const biggest   = expenses.rows[0];
    const catTotals = expenses.rows.reduce((acc, e) => { acc[e.category] = (acc[e.category]||0) + parseFloat(e.amount); return acc }, {});
    const topCat    = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    const monthName = new Date(y, m-1, 1).toLocaleString('en-US', { month: 'long' });
    const catList   = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`${c}: $${a.toFixed(0)}`).join(', ');

    const prompt = `You are writing a funny, warm, Spotify-Wrapped-style monthly financial summary for a personal finance app.
Be playful, use light humor, never harsh. Mix relatable finance jokes with genuine encouragement.

User's ${monthName} ${y} data:
- Total spent: $${total.toFixed(2)} | Income: $${totalInc.toFixed(2)} | ${saved >= 0 ? 'Saved' : 'Overspent'}: $${Math.abs(saved).toFixed(2)}
- Transactions: ${txCount} | Top category: ${topCat?.[0]} ($${topCat?.[1]?.toFixed(2)})
- Biggest single expense: "${biggest?.description || biggest?.category}" — $${parseFloat(biggest?.amount).toFixed(2)}
- Category breakdown: ${catList}

Write EXACTLY 6 short funny/cute lines, one per slide. Return ONLY a JSON array of 6 strings, no extra text:
["slide1 text", "slide2 text", "slide3 text", "slide4 text", "slide5 text", "slide6 text"]

Slide topics (in order):
1. Warm funny opener about their total spending this month (use the real number)
2. Roast/celebrate their top spending category with a witty take
3. React to their biggest purchase with mock drama
4. Comment on their ${txCount} transactions — compare to something funny
5. ${saved >= 0 ? `Celebrate their $${saved.toFixed(2)} savings — be encouraging and playful` : `Console them about overspending $${Math.abs(saved).toFixed(2)} — be funny not harsh, give one tiny tip`}
6. A funny, punchy, actionable financial tip for next month (make it feel personal, not generic)`;

    const aiReply = await callAI([{ role: 'user', content: prompt }]);
    const lines   = JSON.parse(aiReply.trim().replace(/```json|```/g,'').trim());

    res.json({
      slides: lines,
      stats: {
        month: monthName, year: y, total, totalInc, saved, txCount,
        topCat: topCat?.[0], topCatAmt: topCat?.[1],
        biggestDesc: biggest?.description || biggest?.category,
        biggestAmt: parseFloat(biggest?.amount),
        catTotals,
      }
    });
  } catch (e) {
    console.error('Monthly wrap error:', e);
    res.status(500).json({ message: 'Error generating wrap' });
  }
});

router.post('/time-machine', authenticateToken, async (req, res) => {
  try {
    const { year, amount = 100, currency = 'USD' } = req.body;
    const y = parseInt(year);
    const a = parseFloat(amount);
    const currentYear = new Date().getFullYear();

    if (!y || y < 1900 || y > 2100) return res.status(400).json({ error: 'Invalid year' });

    // US CPI historical + projections
    const CPI = {
      1900:8.3, 1905:9.1, 1910:9.9, 1915:10.1, 1920:20.0,
      1925:17.5,1930:16.7,1935:13.7,1940:14.0, 1945:18.0,
      1950:24.1,1955:26.8,1960:29.6,1965:31.5, 1970:38.8,
      1975:53.8,1980:82.4,1985:107.6,1990:130.7,1995:152.4,
      2000:172.2,2005:195.3,2010:218.1,2015:237.0,2020:258.8,
      2021:270.9,2022:292.7,2023:304.7,2024:314.5,2025:321.0,
      2026:328.0,2027:334.6,2028:341.3,2030:355.1,2035:392.0,
      2040:433.0,2050:527.0,2060:642.0,2100:1590.0,
    };
    const getCPI = (yr) => {
      if (CPI[yr]) return CPI[yr];
      const keys = Object.keys(CPI).map(Number).sort((a,b)=>a-b);
      const before = [...keys].filter(k=>k<=yr).pop();
      const after  = keys.find(k=>k>=yr);
      if (!before) return CPI[keys[0]];
      if (!after)  return CPI[keys[keys.length-1]];
      const t = (yr-before)/(after-before);
      return CPI[before] + t*(CPI[after]-CPI[before]);
    };
    const adjustedAmount = (a * getCPI(y) / getCPI(currentYear)).toFixed(2);
    const isPast   = y < currentYear;
    const isFuture = y > currentYear;

    const prompt = `You are "Spendly" — a hilariously sarcastic AI financial mascot doing a 30-second comedy sketch.

User in ${currentYear} has ${currency} ${a.toFixed(2)}.
They're time-traveling to: ${y}${isPast ? ` (${currentYear-y} years in the past)` : isFuture ? ` (${y-currentYear} years in the future)` : ' (the present)'}
${isPast ? `Their money then: ${currency} ${adjustedAmount} (inflation-adjusted)` : `Their money then: ${currency} ${adjustedAmount} (projected)`}

Return ONLY this exact JSON — no markdown, no extra text. Keep each string under 140 characters:
{
  "eraName": "funny 4-word nickname for this era",
  "greeting": "1 punchy sentence reacting to ${y} — mention ONE real historical fact or event from that exact year",
  "context": "1 ACCURATE sentence about what things cost or what was economically notable in ${y}",
  "roast": "1 savage sarcastic line: mock what they could have done with ${currency} ${a.toFixed(2)} in ${y}, or mock the future",
  "funFact": "1 wild price comparison — what could ${currency} ${a.toFixed(2)} literally buy in ${y}?",
  "mood": "shocked",
  "planetColors": ["#hex1","#hex2"],
  "recommendations": [
    {"year":number,"label":"why it is historically wild"},
    {"year":number,"label":"..."},
    {"year":number,"label":"..."}
  ]
}`;

    const aiReply = await callAI([{ role: 'user', content: prompt }], 560);
    const json = JSON.parse(aiReply.trim().replace(/```json|```/g,'').trim());

    res.json({ ...json, adjustedAmount, originalAmount: a, currency, year: y, currentYear });
  } catch(e) {
    console.error('Time machine error:', e.message);
    res.status(500).json({ error: 'Time machine broke' });
  }
});

module.exports = router;
