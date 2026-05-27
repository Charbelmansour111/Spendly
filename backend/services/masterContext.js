/**
 * getMasterContext — the single source of truth for all AI calls.
 * Every AI route calls this first. It queries wallet-scoped tables
 * when walletId is provided, giving AI a complete picture of the user.
 */
const pool = require('../db');

const getMasterContext = async (userId, walletId) => {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear  = now.getFullYear();
  const daysInMonth   = new Date(curYear, curMonth, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();

  // ── User-level financial profile (not wallet-scoped) ──────────────────
  const profileQ = pool.query(
    'SELECT * FROM user_financial_profile WHERE user_id = $1',
    [userId]
  );

  if (!walletId) {
    const [profileR] = await Promise.all([profileQ]);
    const p = profileR.rows[0] || {};
    return buildResult(p, [], 0, [], [], [], [], [], daysRemaining, daysInMonth);
  }

  // ── Wallet-scoped queries ──────────────────────────────────────────────
  const [profileR, expR, incR, budR, debtR, goalR, subR] = await Promise.all([
    profileQ,

    pool.query(`
      SELECT category, SUM(amount) AS spent, COUNT(*) AS count
      FROM wallet_expenses
      WHERE wallet_id = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND EXTRACT(YEAR  FROM date) = $3
      GROUP BY category
      ORDER BY spent DESC`,
      [walletId, curMonth, curYear]
    ),

    pool.query(`
      SELECT SUM(amount) AS total
      FROM wallet_income
      WHERE wallet_id = $1 AND month = $2 AND year = $3`,
      [walletId, curMonth, curYear]
    ),

    pool.query(
      'SELECT * FROM wallet_budgets WHERE wallet_id = $1',
      [walletId]
    ),

    pool.query(`
      SELECT name, remaining_amount, monthly_payment, category
      FROM wallet_debts
      WHERE wallet_id = $1 AND remaining_amount > 0
      ORDER BY remaining_amount DESC`,
      [walletId]
    ),

    pool.query(`
      SELECT name, target_amount, saved_amount AS current_amount,
             goal_type, deadline,
             ROUND((saved_amount / NULLIF(target_amount,0)) * 100, 1) AS pct
      FROM wallet_savings
      WHERE wallet_id = $1`,
      [walletId]
    ),

    pool.query(`
      SELECT name, amount, billing_cycle,
        CASE billing_cycle
          WHEN 'yearly' THEN ROUND(amount / 12, 2)
          WHEN 'weekly' THEN ROUND(amount * 4.33, 2)
          ELSE amount
        END AS monthly_cost
      FROM wallet_subscriptions
      WHERE wallet_id = $1`,
      [walletId]
    ),
  ]);

  const monthlyIncome = parseFloat(incR.rows[0]?.total || 0);
  const p = profileR.rows[0] || {};

  return buildResult(
    p,
    expR.rows,
    monthlyIncome,
    budR.rows,
    debtR.rows,
    goalR.rows,
    subR.rows,
    [],          // recurring_bills (legacy — kept for compatibility)
    daysRemaining,
    daysInMonth
  );
};

function buildResult(p, expRows, monthlyIncome, budRows, debtRows, goalRows, subRows, billRows, daysRemaining, daysInMonth) {
  const totalSpent = expRows.reduce((s, e) => s + parseFloat(e.spent), 0);
  const savingsRate = monthlyIncome > 0
    ? ((monthlyIncome - totalSpent) / monthlyIncome * 100).toFixed(1)
    : 0;
  const totalDebtMonthly = debtRows.reduce((s, d) => s + parseFloat(d.monthly_payment || 0), 0);
  const totalSubs = subRows.reduce((s, s2) => s + parseFloat(s2.monthly_cost || 0), 0);

  return {
    profile: {
      life_situation:  p.life_situation  || null,
      housing:         p.housing         || null,
      is_student:      p.is_student      || false,
      pays_tuition:    p.pays_tuition    || false,
      is_married:      p.is_married      || false,
      children_count:  p.children_count  || 0,
      income_type:     p.income_type     || null,
      savings_target:  parseFloat(p.savings_target || 20),
      monthly_context: p.monthly_context || null,
      has_debt:        debtRows.length > 0,
    },
    this_month: {
      income:         monthlyIncome,
      total_spent:    totalSpent,
      savings_rate:   parseFloat(savingsRate),
      days_remaining: daysRemaining,
      days_in_month:  daysInMonth,
      by_category:    expRows,
    },
    budgets:       budRows,
    debts: {
      list:                  debtRows,
      total_monthly_payment: totalDebtMonthly,
    },
    goals:         goalRows,
    subscriptions: {
      list:          subRows,
      monthly_total: parseFloat(totalSubs.toFixed(2)),
    },
    recurring_bills: billRows,
  };
}

/**
 * buildMasterSystemPrompt — turn a masterContext into an AI system prompt string.
 * Used in every AI route that has personality/chat behaviour.
 */
const buildMasterSystemPrompt = (context, mode, extraInstruction) => {
  const p = context.profile;
  const m = context.this_month;

  const profileDesc = p.life_situation ? `
USER PROFILE:
Life situation: ${p.life_situation}
Housing: ${p.housing || 'unknown'}
Student: ${p.is_student ? 'Yes' + (p.pays_tuition ? ' (pays own tuition)' : ' (family pays)') : 'No'}
Married: ${p.is_married ? 'Yes' : 'No'}
Children: ${p.children_count || 'None'}
Income type: ${p.income_type || 'unknown'}
Savings target: ${p.savings_target}%
Has active debt: ${p.has_debt ? 'Yes — $' + context.debts.total_monthly_payment.toFixed(0) + '/month payments' : 'No'}
Monthly note: ${p.monthly_context || 'Nothing special'}
` : 'No financial profile set yet.';

  return `You are Fina AI — the AI advisor for this personal finance app.
You have FULL visibility into this user's financial life.

${profileDesc}

THIS MONTH:
Income: $${m.income.toFixed(2)}
Total spent: $${m.total_spent.toFixed(2)}
Savings rate: ${m.savings_rate}%
Days remaining: ${m.days_remaining}

SPENDING BY CATEGORY:
${context.this_month.by_category.map(c => `${c.category}: $${parseFloat(c.spent).toFixed(2)}`).join('\n') || 'No expenses yet'}

ACTIVE BUDGETS:
${context.budgets.map(b => `${b.category}: limit $${b.amount}`).join('\n') || 'None set'}

ACTIVE DEBTS:
${context.debts.list.map(d => `${d.name}: $${d.remaining_amount} remaining, $${d.monthly_payment}/month`).join('\n') || 'None'}

SAVINGS GOALS:
${context.goals.map(g => `${g.name}: $${g.current_amount} of $${g.target_amount} (${g.pct}%)`).join('\n') || 'None'}

SUBSCRIPTIONS: $${context.subscriptions.monthly_total}/month total

${extraInstruction || ''}

${mode === 'sarcastic' ? `
Be sharp, direct, and witty. Call out problems with humor but always give actionable advice with exact numbers.
` : `
Be warm, encouraging, and specific. Use their actual numbers.
Give numbered steps when making recommendations.
`}

Always reference their actual data — never give generic advice.
If they have a monthly context (trip, debt, etc) acknowledge it first.`;
};

module.exports = { getMasterContext, buildMasterSystemPrompt };
