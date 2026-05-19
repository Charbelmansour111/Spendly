const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function dayOfWeek(dateStr) {
  return new Date(dateStr).getDay(); // 0=Sun, 6=Sat
}

function isWeekend(dateStr) {
  const d = dayOfWeek(dateStr);
  return d === 0 || d === 6;
}

function daysLeftInMonth() {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate();
}

function currentMonthBounds() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const lastStr = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { first, last: lastStr, month: m, year: y };
}

// ── Groq commentary ───────────────────────────────────────────────────────────

async function getAiCommentary(insightType, data) {
  try {
    const prompts = {
      category_milestone: `User hit ${data.milestone_pct}% of their ${data.category} budget with $${data.spent} of $${data.limit}. Write ONE punchy sentence (max 18 words) that's witty but not condescending. No emojis.`,
      budget_countdown: `User has ${data.days_remaining} days left in the month with $${data.total_remaining} left across all budgets. ${data.tightest_budget} is ${data.tightest_percent}% used. ONE sentence max 18 words.`,
      spending_spike: `User spent $${data.spike_amount} yesterday — ${data.spike_multiplier}x their daily average of $${data.daily_avg}. Most went to ${data.top_category}. ONE punchy sentence, max 18 words.`,
      weekend_warrior: `User spends ${data.weekend_premium}% more on weekends ($${data.weekend_avg}/day) vs weekdays ($${data.weekday_avg}/day). ONE sentence max 18 words.`,
      monthly_wrap: `User spent $${data.total_spent} this month, ${data.vs_last_month}% ${data.direction} than last month. Savings: $${data.savings} (${data.savings_rate}%). ONE sentence max 18 words.`,
      payday_awareness: `User has $${data.remaining_budget} left to last ${data.days_to_payday} days until payday — $${data.daily_budget}/day. ONE sentence max 18 words.`,
      streak: `User has been under budget for ${data.streak_days} consecutive days. On pace to save $${data.projected_extra} extra. ONE sentence max 18 words.`,
      savings_rate: `User is saving ${data.rate}% this month ($${data.saved_amount}). Target is 20%. ONE sentence max 18 words, focus on encouragement or gentle nudge.`,
    };
    const prompt = prompts[insightType] || 'Write ONE punchy financial tip sentence, max 18 words.';

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 60,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'You are a witty personal finance coach. Respond with exactly ONE sentence. No emojis. Max 20 words.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// ── Insight calculators (priority order) ─────────────────────────────────────

async function calcCategoryMilestone(userId) {
  const { first, last } = currentMonthBounds();

  const budgets = await pool.query(
    `SELECT category, amount FROM budgets WHERE user_id = $1`,
    [userId]
  );
  if (!budgets.rows.length) return null;

  const spent = await pool.query(
    `SELECT category, SUM(amount) as total
     FROM expenses
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     GROUP BY category`,
    [userId, first, last]
  );

  const spentMap = {};
  spent.rows.forEach(r => { spentMap[r.category] = parseFloat(r.total); });

  let best = null;
  let bestPriority = 0;

  for (const b of budgets.rows) {
    const s = spentMap[b.category] || 0;
    const limit = parseFloat(b.amount);
    if (limit <= 0) continue;
    const pct = Math.round((s / limit) * 100);

    let milestone = null;
    let priority = 0;
    if (pct >= 100) { milestone = 100; priority = 4; }
    else if (pct >= 90) { milestone = 90; priority = 3; }
    else if (pct >= 75) { milestone = 75; priority = 2; }
    else if (pct >= 50) { milestone = 50; priority = 1; }

    if (milestone && priority > bestPriority) {
      bestPriority = priority;
      best = { category: b.category, spent: Math.round(s), limit: Math.round(limit), pct, milestone_pct: milestone };
    }
  }

  if (!best) return null;

  const theme = best.milestone_pct >= 90 ? 'red' : best.milestone_pct >= 75 ? 'amber' : 'blue';
  const daysLeft = daysLeftInMonth();
  const data = { ...best, days_remaining: daysLeft };
  const commentary = await getAiCommentary('category_milestone', data);

  return {
    type: 'category_milestone',
    headline: `${best.pct}% of ${best.category} budget used`,
    subtext: `You've spent $${best.spent} of your $${best.limit} ${best.category} budget. ${daysLeft} days left this month.`,
    color_theme: theme,
    icon: '🎯',
    data,
    ai_commentary: commentary || `Your ${best.category} budget is ${best.pct >= 90 ? 'nearly gone' : 'getting tight'} — stay aware.`,
  };
}

async function calcBudgetCountdown(userId) {
  const daysLeft = daysLeftInMonth();
  if (daysLeft > 7) return null;

  const { first, last, month, year } = currentMonthBounds();
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

  const budgets = await pool.query(
    `SELECT category, amount FROM budgets WHERE user_id = $1`,
    [userId]
  );
  if (!budgets.rows.length) return null;

  const spent = await pool.query(
    `SELECT category, SUM(amount) as total
     FROM expenses
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     GROUP BY category`,
    [userId, first, last]
  );

  const spentMap = {};
  spent.rows.forEach(r => { spentMap[r.category] = parseFloat(r.total); });

  let totalRemaining = 0;
  let tightestPct = 0;
  let tightestCat = null;
  let anyAbove70 = false;

  for (const b of budgets.rows) {
    const s = spentMap[b.category] || 0;
    const limit = parseFloat(b.amount);
    const pct = Math.round((s / limit) * 100);
    const remaining = Math.max(0, limit - s);
    totalRemaining += remaining;
    if (pct >= 70) anyAbove70 = true;
    if (pct > tightestPct) { tightestPct = pct; tightestCat = b.category; }
  }

  if (!anyAbove70) return null;

  const theme = tightestPct >= 90 ? 'red' : daysLeft <= 3 ? 'orange' : 'amber';
  const data = {
    days_remaining: daysLeft,
    tightest_budget: tightestCat,
    tightest_percent: tightestPct,
    total_remaining: Math.round(totalRemaining),
  };
  const commentary = await getAiCommentary('budget_countdown', data);

  return {
    type: 'budget_countdown',
    headline: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in ${monthName}`,
    subtext: `You have $${Math.round(totalRemaining)} left across all budgets. ${tightestCat} is your tightest at ${tightestPct}% used.`,
    color_theme: theme,
    icon: '⏳',
    data,
    ai_commentary: commentary || `${daysLeft} days, $${Math.round(totalRemaining)} left. Make it count.`,
  };
}

async function calcSpendingSpike(userId) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 30-day average daily spend
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyStr = thirtyDaysAgo.toISOString().split('T')[0];

  const avgResult = await pool.query(
    `SELECT SUM(amount) / 30.0 as daily_avg
     FROM expenses
     WHERE user_id = $1 AND date >= $2 AND date < $3`,
    [userId, thirtyStr, yesterdayStr]
  );
  const dailyAvg = parseFloat(avgResult.rows[0]?.daily_avg) || 0;
  if (dailyAvg < 1) return null;

  const ydayResult = await pool.query(
    `SELECT SUM(amount) as total, category
     FROM expenses
     WHERE user_id = $1 AND date = $2
     GROUP BY category ORDER BY SUM(amount) DESC`,
    [userId, yesterdayStr]
  );

  const ydayTotal = ydayResult.rows.reduce((s, r) => s + parseFloat(r.total), 0);
  if (ydayTotal < dailyAvg * 2) return null;

  const topCat = ydayResult.rows[0]?.category || 'Other';
  const multiplier = Math.round((ydayTotal / dailyAvg) * 10) / 10;
  const data = {
    spike_amount: Math.round(ydayTotal),
    daily_avg: Math.round(dailyAvg),
    spike_multiplier: multiplier,
    top_category: topCat,
  };
  const commentary = await getAiCommentary('spending_spike', data);

  return {
    type: 'spending_spike',
    headline: `Yesterday was ${multiplier}× your average`,
    subtext: `You spent $${Math.round(ydayTotal)} — ${multiplier}x your daily average of $${Math.round(dailyAvg)}. Most of it went to ${topCat}.`,
    color_theme: 'orange',
    icon: '📈',
    data,
    ai_commentary: commentary || `A big day for ${topCat} spending — one outlier won't sink you, but watch today.`,
  };
}

async function calcWeekendWarrior(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyStr = thirtyDaysAgo.toISOString().split('T')[0];

  const result = await pool.query(
    `SELECT date, SUM(amount) as total
     FROM expenses
     WHERE user_id = $1 AND date >= $2
     GROUP BY date ORDER BY date`,
    [userId, thirtyStr]
  );

  if (result.rows.length < 10) return null;

  let weekdayTotal = 0; let weekdayDays = 0;
  let weekendTotal = 0; let weekendDays = 0;

  for (const r of result.rows) {
    const amt = parseFloat(r.total);
    if (isWeekend(r.date)) { weekendTotal += amt; weekendDays++; }
    else { weekdayTotal += amt; weekdayDays++; }
  }

  if (weekdayDays < 5 || weekendDays < 4) return null;
  const weekdayAvg = weekdayTotal / weekdayDays;
  const weekendAvg = weekendTotal / weekendDays;
  if (weekendAvg < weekdayAvg * 1.25) return null; // only trigger if 25%+ more

  const premium = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
  const data = {
    weekend_avg: Math.round(weekendAvg),
    weekday_avg: Math.round(weekdayAvg),
    weekend_premium: premium,
  };
  const commentary = await getAiCommentary('weekend_warrior', data);

  return {
    type: 'weekend_warrior',
    headline: `You spend ${premium}% more on weekends`,
    subtext: `Weekend average: $${Math.round(weekendAvg)}/day vs your weekday average of $${Math.round(weekdayAvg)}/day over the last 30 days.`,
    color_theme: 'amber',
    icon: '📅',
    data,
    ai_commentary: commentary || `Weekends are costing you — a little planning goes a long way.`,
  };
}

async function calcMonthlyWrap(userId) {
  if (daysLeftInMonth() > 3) return null;

  const { first, last, month, year } = currentMonthBounds();
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

  const thisMonth = await pool.query(
    `SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, first, last]
  );
  const totalSpent = parseFloat(thisMonth.rows[0]?.total) || 0;

  // Last month
  const prevFirst = new Date(year, month - 2, 1).toISOString().split('T')[0];
  const prevLast = new Date(year, month - 1, 0).toISOString().split('T')[0];
  const lastMonth = await pool.query(
    `SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, prevFirst, prevLast]
  );
  const lastTotal = parseFloat(lastMonth.rows[0]?.total) || 0;

  const incomeResult = await pool.query(
    `SELECT SUM(amount) as total FROM income WHERE user_id = $1 AND month = $2 AND year = $3`,
    [userId, month, year]
  );
  const income = parseFloat(incomeResult.rows[0]?.total) || 0;
  const savings = Math.max(0, income - totalSpent);
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  let vsPct = 0; let direction = 'same as';
  if (lastTotal > 0) {
    vsPct = Math.abs(Math.round(((totalSpent - lastTotal) / lastTotal) * 100));
    direction = totalSpent > lastTotal ? 'more than' : 'less than';
  }

  const data = {
    total_spent: Math.round(totalSpent),
    vs_last_month: vsPct,
    direction,
    savings: Math.round(savings),
    savings_rate: savingsRate,
  };
  const commentary = await getAiCommentary('monthly_wrap', data);

  return {
    type: 'monthly_wrap',
    headline: `${monthName} is almost over`,
    subtext: `You've spent $${Math.round(totalSpent)} this month — ${vsPct}% ${direction} last month. Final savings: $${Math.round(savings)} (${savingsRate}%).`,
    color_theme: savingsRate >= 15 ? 'indigo' : savingsRate >= 5 ? 'blue' : 'orange',
    icon: '📊',
    data,
    ai_commentary: commentary || `${monthName} wrapping up — ${savingsRate >= 10 ? 'solid finish' : 'room to grow next month'}.`,
  };
}

async function calcPayday(userId) {
  const now = new Date();
  const currentDay = now.getDate();

  // Detect typical payday from income history (look for day pattern in past 3 months)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
  const incomeHistory = await pool.query(
    `SELECT EXTRACT(DAY FROM date) as pay_day, COUNT(*) as freq
     FROM income WHERE user_id = $1 AND date >= $2 AND is_recurring = true
     GROUP BY pay_day ORDER BY freq DESC LIMIT 1`,
    [userId, threeMonthsAgo]
  );

  let payday = incomeHistory.rows[0] ? parseInt(incomeHistory.rows[0].pay_day) : 1;
  const daysToPayday = payday > currentDay ? payday - currentDay : (new Date(now.getFullYear(), now.getMonth() + 1, payday) - now) / 86400000;
  const daysLeft = Math.round(daysToPayday);
  if (daysLeft < 1 || daysLeft > 5) return null;

  // Remaining budget
  const { first, last } = currentMonthBounds();
  const budgetResult = await pool.query(`SELECT SUM(amount) as total FROM budgets WHERE user_id = $1`, [userId]);
  const spentResult = await pool.query(
    `SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, first, last]
  );
  const totalBudget = parseFloat(budgetResult.rows[0]?.total) || 0;
  const totalSpent = parseFloat(spentResult.rows[0]?.total) || 0;
  const remaining = Math.max(0, totalBudget - totalSpent);
  const dailyBudget = daysLeft > 0 ? Math.round(remaining / daysLeft) : remaining;
  const isTight = dailyBudget < 20;

  const data = { days_to_payday: daysLeft, remaining_budget: Math.round(remaining), daily_budget: dailyBudget };
  const commentary = await getAiCommentary('payday_awareness', data);

  return {
    type: 'payday_awareness',
    headline: `Payday in ~${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    subtext: `You have $${Math.round(remaining)} left to last you. That's $${dailyBudget}/day — ${isTight ? 'keep it tight' : 'you have some breathing room'}.`,
    color_theme: isTight ? 'orange' : 'blue',
    icon: '💳',
    data,
    ai_commentary: commentary || `${daysLeft} days until payday — $${dailyBudget}/day is ${isTight ? 'tight but doable' : 'comfortable'}.`,
  };
}

async function calcStreak(userId) {
  const { first } = currentMonthBounds();
  const budgets = await pool.query(`SELECT category, amount FROM budgets WHERE user_id = $1`, [userId]);
  if (!budgets.rows.length) return null;

  const budgetMap = {};
  budgets.rows.forEach(b => { budgetMap[b.category] = parseFloat(b.amount); });

  // Get daily totals for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyStr = thirtyDaysAgo.toISOString().split('T')[0];

  const totalBudgetPerDay = Object.values(budgetMap).reduce((s, v) => s + v, 0) / 30;
  if (totalBudgetPerDay <= 0) return null;

  const dailySpend = await pool.query(
    `SELECT date::text, SUM(amount) as total FROM expenses
     WHERE user_id = $1 AND date >= $2
     GROUP BY date ORDER BY date DESC`,
    [userId, thirtyStr]
  );

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const row of dailySpend.rows) {
    if (row.date === today) continue; // don't count today (might still be spending)
    if (parseFloat(row.total) <= totalBudgetPerDay) streak++;
    else break;
  }

  if (streak < 5) return null;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - streak);
  const startLabel = startDate.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  const projectedExtra = Math.round(totalBudgetPerDay * streak * 0.15);

  const data = { streak_days: streak, projected_extra: projectedExtra, since_date: startLabel };
  const commentary = await getAiCommentary('streak', data);

  return {
    type: 'streak',
    headline: `${streak} days under budget`,
    subtext: `You've kept spending in check since ${startLabel}. At this pace you'll save an extra $${projectedExtra} this month.`,
    color_theme: 'green',
    icon: '🔥',
    data,
    ai_commentary: commentary || `${streak} days strong — consistency is your superpower right now.`,
  };
}

async function calcSavingsRate(userId) {
  const { first, last, month, year } = currentMonthBounds();

  const incomeResult = await pool.query(
    `SELECT SUM(amount) as total FROM income WHERE user_id = $1 AND month = $2 AND year = $3`,
    [userId, month, year]
  );
  const income = parseFloat(incomeResult.rows[0]?.total) || 0;

  const spentResult = await pool.query(
    `SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, first, last]
  );
  const spent = parseFloat(spentResult.rows[0]?.total) || 0;

  const saved = Math.max(0, income - spent);
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const theme = rate >= 15 ? 'green' : rate >= 10 ? 'amber' : 'red';
  const diff = Math.abs(rate - 20);
  const aboveOrBelow = rate >= 20 ? 'above' : 'below';

  const data = { rate, saved_amount: Math.round(saved), income: Math.round(income) };
  const commentary = await getAiCommentary('savings_rate', data);

  return {
    type: 'savings_rate',
    headline: `Saving ${rate}% this month`,
    subtext: `That's $${Math.round(saved)} saved so far. The healthy target is 20% — you're ${diff}% ${aboveOrBelow} target.`,
    color_theme: theme,
    icon: '💰',
    data,
    ai_commentary: commentary || (rate >= 20 ? 'Excellent discipline — you\'re well ahead of the 20% target.' : `${diff}% away from 20% — small cuts add up fast.`),
  };
}

// ── Main calculation pipeline ─────────────────────────────────────────────────

async function calculateInsight(userId) {
  const today = todayStr();

  // Priority order: high → low
  const runners = [
    calcCategoryMilestone,
    calcBudgetCountdown,
    calcSpendingSpike,
    calcWeekendWarrior,
    calcMonthlyWrap,
    calcPayday,
    calcStreak,
    calcSavingsRate,
  ];

  for (const fn of runners) {
    try {
      const result = await fn(userId);
      if (result) {
        return { ...result, generated_at: today };
      }
    } catch {
      // skip failed insight type
    }
  }

  // Ultimate fallback — should rarely happen
  return {
    type: 'savings_rate',
    headline: 'Keep tracking your finances',
    subtext: 'Log your expenses regularly to unlock personalized daily insights about your spending patterns.',
    color_theme: 'indigo',
    icon: '💡',
    data: {},
    ai_commentary: 'Every expense logged is a step toward financial clarity.',
    generated_at: today,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/daily-insight
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const today = todayStr();
    const force = req.query.force === 'true';

    if (!force) {
      const cached = await pool.query(
        `SELECT insight_data FROM daily_insights WHERE user_id = $1 AND date = $2`,
        [userId, today]
      );
      if (cached.rows.length > 0) {
        return res.json(cached.rows[0].insight_data);
      }
    }

    const insight = await calculateInsight(userId);

    await pool.query(
      `INSERT INTO daily_insights (user_id, date, insight_data)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET insight_data = EXCLUDED.insight_data`,
      [userId, today, JSON.stringify(insight)]
    );

    res.json(insight);
  } catch (err) {
    console.error('Daily insight error:', err);
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

module.exports = router;
