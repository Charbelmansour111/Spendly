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
LANGUAGE & DIALECT (CRITICAL — always apply):
- You fully understand English, formal Arabic (الفصحى), Lebanese dialect (العامية اللبنانية), and Arabizi.
- Arabizi mapping: 2=ء/أ, 3=ع, 5=خ, 6=ط, 7=ح, 9=ق, ch/sh=ش, th=ث.
- Lebanese vocab: shu=what, kif=how, mni7=good, ktir=a lot, ya3ni=meaning, bas=but, w=and, 3am=currently, 7elo=nice, hayde=this, hek=like this, inno=that, la2=no, eh=yes, yalla=let's go, ma fi=there isn't, fi=there is, 3ndi=I have.
- Lebanese speakers freely mix Arabic, French, and English in one sentence.
- REPLY LANGUAGE RULES:
  • ENGLISH only → reply in English only.
  • ARABIC script OR Arabizi/Lebanese dialect (any word with 2/3/5/7 substitutes, or Lebanese vocab above, or obvious dialect mixed with French/English) → reply BILINGUALLY:
    First: full answer in Lebanese Arabizi WhatsApp style (casual, use 3/7/2/5, mix French/English naturally)
    Then on its own line: ---
    Then: exact same answer in Arabic script (Lebanese dialect)

TRANSACTION DETECTION (apply every message):
- When user mentions ANY spending, payment, or purchase (any amount, any language):
  • Summarize each transaction you understood (description, amount, category)
  • Ask "Ba3den fi shi tene? / هل في شي تاني؟" (or "Anything else?" in English)
  • At the VERY END of your reply, on its own line, output EXACTLY:
    TXNS:[{"amount":NUMBER,"category":"Food|Transport|Shopping|Subscriptions|Entertainment|Other","description":"what it was","date":"${today}"}]
  • One JSON object per transaction. Use ${today} unless user said otherwise.
  • If NO spending mentioned → do NOT include TXNS.`;
};

const SYSTEM_NORMAL = (total, totalIncome, categoryBreakdown, txCount, budgets) =>
  `You are Spendly AI ✨ — a warm, encouraging, and genuinely helpful money friend.

User's financial data:
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
- Always use actual percentage numbers from their data, not vague terms.
${SHARED_RULES()}`;

const SYSTEM_SARCASTIC = (total, totalIncome, categoryBreakdown, txCount, budgets) =>
  `You are Spendly AI 😏 — sharp, witty, lovably savage. Funny best friend who's also a CPA.

User's financial data:
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
${SHARED_RULES()}`;

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

    const expenseList = expenses.rows.slice(0, 30).map(e =>
      `[ID:${e.id}] ${e.date ? new Date(e.date).toISOString().split('T')[0] : ''} | ${e.category} | ${e.description || '—'} | $${parseFloat(e.amount).toFixed(2)}`
    ).join('\n');

    const actionInstructions = `

EXPENSE ACTIONS — you can delete or update expenses when asked:
Listed expenses (use ONLY these real IDs):
${expenseList}

If the user asks to delete or update a specific expense:
1. Write your normal reply (confirm what you found)
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

    const raw = await callAI(messages, 700);

    // Parse ##ACTION:...## tag
    const actionMatch = raw.match(/##ACTION:(DELETE|UPDATE):(\d+)(?::([^#\n]+))?##/);
    let action = null;
    let cleaned = raw.replace(/##ACTION:[^#]+##/g, '').trim();

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

    // Parse TXNS marker
    const txnMarker = 'TXNS:';
    const txnIndex = cleaned.lastIndexOf(txnMarker);
    let pendingTransactions = [];
    let reply = cleaned;
    if (txnIndex !== -1) {
      try {
        const jsonStr = cleaned.slice(txnIndex + txnMarker.length).trim();
        const bracketEnd = jsonStr.lastIndexOf(']');
        pendingTransactions = JSON.parse(jsonStr.slice(0, bracketEnd + 1));
        reply = cleaned.slice(0, txnIndex).trim();
      } catch { /* keep cleaned reply if parse fails */ }
    }

    res.json({ reply, action, pendingTransactions });
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

    if (isNaN(y) || y < -2000 || y > 2100) return res.status(400).json({ error: 'Invalid year' });

    const displayYear = y < 0 ? `${Math.abs(y)} BC` : String(y);

    // CPI for modern era; ancient/medieval eras use narrative equivalents
    const CPI = {
      1800:13.0,1850:10.6,1900:8.3, 1905:9.1, 1910:9.9, 1915:10.1,1920:20.0,
      1925:17.5,1930:16.7,1935:13.7,1940:14.0, 1945:18.0,
      1950:24.1,1955:26.8,1960:29.6,1965:31.5, 1970:38.8,
      1975:53.8,1980:82.4,1985:107.6,1990:130.7,1995:152.4,
      2000:172.2,2005:195.3,2010:218.1,2015:237.0,2020:258.8,
      2021:270.9,2022:292.7,2023:304.7,2024:314.5,2025:321.0,
      2026:328.0,2027:334.6,2028:341.3,2030:355.1,2035:392.0,
      2040:433.0,2050:527.0,2060:642.0,2100:1590.0,
    };
    const getCPI = (yr) => {
      if (yr < 1800) return 2.0; // ancient/medieval era — money was worth vastly more
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
    const timeDesc = y < 0
      ? `${Math.abs(y)} years before the Common Era (ancient world)`
      : isPast ? `${currentYear - y} years in the past` : `${y - currentYear} years in the future`;

    const prompt = `You are "Spendly" — a wildly entertaining AI narrator doing a fun 45-second time travel story.

User in ${currentYear} has ${currency} ${a.toFixed(2)}.
Destination: ${displayYear} (${timeDesc})
Buying power then: ${y >= 1800 ? `${currency} ${adjustedAmount} inflation-adjusted` : `ancient times — gold & barter era, equivalent to several months of a craftsman's wages`}

Write SIX short punchy lines (each under 120 chars). Be funny, accurate, dramatic, exciting. Use real historical facts.
Return ONLY this exact JSON — no markdown, no extra text:
{
  "eraName": "catchy 3-4 word era nickname",
  "line1": "SHOCK: react to arriving in ${displayYear} — one jaw-dropping real fact from this era",
  "line2": "LIFE: describe daily life vividly — what people ate, wore, feared, or celebrated in ${displayYear}",
  "line3": "MONEY BOMBSHELL: with ${currency} ${a.toFixed(2)} in ${displayYear} you could buy [hilarious specific thing] — be exact and funny",
  "line4": "ROAST: savage sarcastic comparison between ${displayYear} and modern life — mock one specific thing",
  "line5": "WILD TWIST: one mind-blowing thing that happened/will happen near ${displayYear} that changes everything",
  "line6": "CLOSING: funny summary — could they buy a house? a goat? a spaceship? wrap it up with energy!",
  "mood": "shocked",
  "sceneEmoji": ["era-fitting emoji 1","emoji 2","emoji 3","emoji 4","emoji 5"],
  "planetColors": ["#hex1","#hex2"],
  "recommendations": [
    {"year": number, "label": "why visit (under 30 chars)"},
    {"year": number, "label": "why visit"},
    {"year": number, "label": "why visit"}
  ]
}`;

    const aiReply = await callAI([{ role: 'user', content: prompt }], 900);
    const json = JSON.parse(aiReply.trim().replace(/```json|```/g,'').trim());

    res.json({ ...json, adjustedAmount, originalAmount: a, currency, year: y, currentYear, displayYear });
  } catch(e) {
    console.error('Time machine error:', e.message);
    res.status(500).json({ error: 'Time machine broke' });
  }
});

router.post('/quick-parse', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text' });

    const today = new Date().toISOString().split('T')[0];
    const messages = [
      {
        role: 'system',
        content: `Extract expense details from natural language. Today is ${today}.
Return ONLY this exact JSON — no markdown, no extra text:
{"description":"short expense description","amount":number or null,"category":"one of: Food & Dining|Transport|Entertainment|Shopping|Health|Bills & Utilities|Education|Travel|Personal Care|Other","date":"YYYY-MM-DD","needsAmount":true if amount not mentioned}
Rules:
- amount: extract the number only (e.g. "$15" → 15, "fifteen dollars" → 15). null if not mentioned.
- needsAmount: true when amount is null.
- date: today (${today}) unless user says yesterday/specific date.
- Understand English, Arabic, Lebanese dialect, Arabizi.`
      },
      { role: 'user', content: text }
    ];

    const aiReply = await callAI(messages, 150);
    const json = JSON.parse(aiReply.trim().replace(/```json|```/g, '').trim());
    res.json(json);
  } catch(e) {
    console.error('Quick parse error:', e.message);
    res.status(500).json({ error: 'Parse failed' });
  }
});

module.exports = router;
