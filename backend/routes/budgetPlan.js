const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const auth     = require('../middleware/auth');
const { getMasterContext } = require('../services/masterContext');
const { groupByBucket }    = require('../services/categoryMapper');

// ── Profile-type percentage tables ────────────────────────────────────────────
// Keys must sum to 100.  savings = 100 - sum(spending buckets).
const PROFILE_BUDGETS = {
  student_family_pays:          { food:18, transport:10, shopping:8,  subscriptions:8, entertainment:8, health:5, other:8,  savings:35 },
  student_pays_tuition:         { food:16, transport:10, shopping:6,  subscriptions:6, entertainment:5, health:5, other:22, savings:30 },
  works_with_family:            { food:16, transport:12, shopping:10, subscriptions:8, entertainment:9, health:5, other:15, savings:25 },
  supports_parents_rents_debt:  { food:15, transport:12, shopping:7,  subscriptions:6, entertainment:5, health:5, other:35, savings:15 },
  supports_parents_mortgage_debt:{ food:14, transport:10, shopping:6, subscriptions:5, entertainment:4, health:5, other:38, savings:18 },
  supports_parents_family_home: { food:17, transport:12, shopping:9,  subscriptions:8, entertainment:8, health:6, other:15, savings:25 },
  single_independent:           { food:14, transport:12, shopping:8,  subscriptions:7, entertainment:8, health:5, other:21, savings:25 },
  married_1_2_kids:             { food:18, transport:10, shopping:8,  subscriptions:6, entertainment:5, health:6, other:27, savings:20 },
  married_3plus_kids:           { food:22, transport:10, shopping:7,  subscriptions:5, entertainment:4, health:7, other:31, savings:14 },
  married_no_kids:              { food:15, transport:11, shopping:9,  subscriptions:7, entertainment:8, health:5, other:20, savings:25 },
  default:                      { food:20, transport:12, shopping:10, subscriptions:8, entertainment:8, health:7, other:15, savings:20 },
};

const CATEGORY_META = {
  food:          { label: 'Food & Dining',    emoji: '🍔' },
  transport:     { label: 'Transport',         emoji: '🚗' },
  shopping:      { label: 'Shopping',          emoji: '🛍️' },
  subscriptions: { label: 'Subscriptions',     emoji: '📱' },
  entertainment: { label: 'Entertainment',     emoji: '🎬' },
  health:        { label: 'Health & Wellness', emoji: '🏥' },
  other:         { label: 'Other & Bills',     emoji: '📦' },
};

// ── Determine profile type from user's answers ────────────────────────────────
function getProfileKey(profile, hasDebt) {
  const { life_situation, housing, is_student, pays_tuition, is_married, children_count } = profile;

  if (!life_situation) return 'default';

  if (life_situation === 'with_family') {
    if (is_student && pays_tuition) return 'student_pays_tuition';
    if (is_student)                  return 'student_family_pays';
    return 'works_with_family';
  }

  if (life_situation === 'supporting_parents') {
    if (housing === 'family_home') return 'supports_parents_family_home';
    if (hasDebt && housing === 'mortgage') return 'supports_parents_mortgage_debt';
    if (hasDebt)                           return 'supports_parents_rents_debt';
    return 'supports_parents_family_home';  // no debt — most lenient
  }

  if (life_situation === 'independent') {
    if (!is_married) return 'single_independent';
    const kids = parseInt(children_count) || 0;
    if (kids >= 3)   return 'married_3plus_kids';
    if (kids >= 1)   return 'married_1_2_kids';
    return 'married_no_kids';
  }

  return 'default';
}

// ── Round to nearest $5 for clean display ─────────────────────────────────────
const round5 = n => Math.round(n / 5) * 5;

// ── Build category from percentages + actual spending ─────────────────────────
function buildCategory(key, pct, income, actualSpent) {
  const suggested = income * (pct / 100);

  // BASELINE RULE: adjust suggestion based on real spending
  let limit;
  if (actualSpent > suggested * 1.5) {
    limit = round5(actualSpent * 0.85);           // over — reduce 15%
  } else if (actualSpent > 0 && actualSpent < suggested * 0.5) {
    limit = round5(suggested * 0.7);              // well under — don't over-allocate
  } else {
    limit = round5(suggested);                    // on track — use formula
  }

  const status = actualSpent > limit * 1.2 ? 'over'
    : actualSpent > limit * 0.8 ? 'on_track'
    : 'under';

  const meta = CATEGORY_META[key];
  return {
    key,
    label:           meta.label,
    emoji:           meta.emoji,
    percentage:      pct,
    limit_dollars:   limit,
    current_spending: Math.round(actualSpent),
    status,
    reasoning:       null,   // filled in by AI if context exists
  };
}

// ── Groq AI call ──────────────────────────────────────────────────────────────
const callAI = async (messages, maxTokens = 600) => {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || 'AI error');
  return data.choices[0].message.content;
};

// ── POST /api/budget-plan/generate ───────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { walletId } = req.body;
    const ctx = await getMasterContext(req.userId, walletId || null);

    const profile    = ctx.profile;
    const income     = ctx.this_month.income;
    const hasDebt    = ctx.debts.list.length > 0;
    const debtMonthly = ctx.debts.total_monthly_payment;

    if (!income || income <= 0) {
      return res.json({ error: 'no_income', message: 'No income found for this wallet' });
    }

    // ── Step 1: Determine profile type ────────────────────────────────────
    const profileKey = getProfileKey(profile, hasDebt);
    let pcts = { ...PROFILE_BUDGETS[profileKey] || PROFILE_BUDGETS.default };

    // ── Step 2: Override savings target from profile if set ───────────────
    const savedTarget = parseFloat(profile.savings_target || 20);
    if (savedTarget !== pcts.savings) {
      const diff = savedTarget - pcts.savings;
      pcts.savings = savedTarget;
      // Absorb diff proportionally from spending buckets
      const spendKeys = ['food','transport','shopping','subscriptions','entertainment','health','other'];
      const totalSpend = spendKeys.reduce((s,k) => s + pcts[k], 0);
      spendKeys.forEach(k => {
        pcts[k] = Math.max(2, Math.round(pcts[k] - diff * (pcts[k] / totalSpend)));
      });
    }

    // ── Step 3: Variable income adjustment ───────────────────────────────
    if (profile.income_type === 'variable') {
      pcts.savings      = Math.min(80, pcts.savings + 3);
      pcts.entertainment = Math.max(2, pcts.entertainment - 2);
      pcts.shopping      = Math.max(2, pcts.shopping - 1);
    }
    if (profile.income_type === 'no_income') {
      pcts = { food:25, transport:10, shopping:3, subscriptions:5, entertainment:3, health:5, other:44, savings:5 };
    }

    // ── Step 4: Debt detection & adjustment ──────────────────────────────
    let debtPct = 0;
    if (hasDebt && income > 0) {
      debtPct = Math.min(15, Math.round((debtMonthly / income) * 100));
      pcts.savings = Math.max(10, pcts.savings - 8);
      pcts.other   = (pcts.other || 0) + debtPct;
    }

    // ── Step 5: Map actual wallet spending to buckets ─────────────────────
    const actual = groupByBucket(ctx.this_month.by_category);

    // ── Step 6: Build category objects ───────────────────────────────────
    const categories = Object.keys(CATEGORY_META).map(key =>
      buildCategory(key, pcts[key] || 5, income, actual[key] || 0)
    );

    const totalBudgeted = categories.reduce((s, c) => s + c.limit_dollars, 0);
    const totalSaved    = Math.round(income - totalBudgeted);

    // ── Step 7: AI-generated reasoning (if context or always for summary) ─
    let aiSummary    = null;
    let aiAdjustments = null;

    try {
      const catList = categories.map(c =>
        `${c.label}: $${c.limit_dollars} (${c.percentage}%), actual: $${c.current_spending}`
      ).join('\n');

      const contextNote = profile.monthly_context
        ? `\n\nUser's special note this month: "${profile.monthly_context}"\nIf this note affects spending, return ai_adjustments.`
        : '';

      const prompt = `User profile: ${profileKey}. Income: $${income}/month. Savings target: ${pcts.savings}%.
Has debt: ${hasDebt ? `Yes — $${debtMonthly}/month` : 'No'}.

Budget categories:
${catList}
${contextNote}

Write a 2-sentence ai_summary explaining this budget plan in a warm, encouraging tone.
${profile.monthly_context ? `Also, if any categories should change based on "${profile.monthly_context}", return ai_adjustments as an object like { "entertainment": { "new_pct": 3, "reason": "..." } }.` : ''}

Return ONLY valid JSON:
{
  "ai_summary": "...",
  "reasoning": { ${Object.keys(CATEGORY_META).map(k => `"${k}": "one sentence"`).join(', ')} },
  "ai_adjustments": null
}`;

      const raw = await callAI([{ role: 'user', content: prompt }], 700);
      const j0 = raw.indexOf('{'), j1 = raw.lastIndexOf('}');
      if (j0 !== -1 && j1 !== -1) {
        const parsed = JSON.parse(raw.slice(j0, j1 + 1));
        aiSummary = parsed.ai_summary || null;
        aiAdjustments = parsed.ai_adjustments || null;

        // Inject reasoning into categories
        if (parsed.reasoning) {
          categories.forEach(c => {
            c.reasoning = parsed.reasoning[c.key] || c.reasoning;
          });
        }

        // Apply AI adjustments if any
        if (aiAdjustments && typeof aiAdjustments === 'object') {
          categories.forEach(c => {
            const adj = aiAdjustments[c.key];
            if (adj && typeof adj.new_pct === 'number') {
              c.percentage   = adj.new_pct;
              c.limit_dollars = round5(income * adj.new_pct / 100);
              c.ai_adjusted   = true;
            }
          });
        }
      }
    } catch (aiErr) {
      console.warn('[budgetPlan] AI call failed, using pure-math result:', aiErr.message);
    }

    return res.json({
      profile_used:       profileKey,
      savings_target:     pcts.savings,
      has_debt_detected:  hasDebt,
      monthly_income:     income,
      categories,
      total_budgeted:     totalBudgeted,
      total_saved:        totalSaved,
      ai_summary:         aiSummary || `Based on your profile, this plan keeps spending at ${Math.round(totalBudgeted / income * 100)}% and saves $${totalSaved}/month.`,
      ai_adjustments:     aiAdjustments,
    });
  } catch (e) {
    console.error('[budgetPlan generate]', e.message);
    res.status(500).json({ message: 'Failed to generate budget plan' });
  }
});

// ── POST /api/budget-plan/apply ───────────────────────────────────────────────
router.post('/apply', auth, async (req, res) => {
  try {
    const { categories, walletId } = req.body;
    if (!walletId) return res.status(400).json({ message: 'walletId required' });
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: 'categories required' });
    }

    // Verify wallet ownership
    const walletCheck = await pool.query(
      'SELECT id FROM wallets WHERE id=$1 AND user_id=$2 AND is_active=TRUE',
      [walletId, req.userId]
    );
    if (!walletCheck.rows.length) return res.status(403).json({ message: 'Not your wallet' });

    let applied = 0;
    for (const cat of categories) {
      const { key, label, limit_dollars } = cat;
      const categoryName = label || key;
      const amount = parseFloat(limit_dollars);
      if (!amount || amount <= 0) continue;

      // Check if budget for this category already exists
      const existing = await pool.query(
        `SELECT id FROM wallet_budgets WHERE wallet_id=$1 AND user_id=$2 AND LOWER(category)=LOWER($3) AND period='monthly'`,
        [walletId, req.userId, categoryName]
      );

      if (existing.rows.length) {
        await pool.query(
          `UPDATE wallet_budgets SET amount=$1 WHERE id=$2`,
          [amount, existing.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO wallet_budgets (wallet_id, user_id, category, amount, period)
           VALUES ($1,$2,$3,$4,'monthly')`,
          [walletId, req.userId, categoryName, amount]
        );
      }
      applied++;
    }

    res.json({ applied, message: `${applied} budget${applied !== 1 ? 's' : ''} applied` });
  } catch (e) {
    console.error('[budgetPlan apply]', e.message);
    res.status(500).json({ message: 'Failed to apply budget plan' });
  }
});

// ── POST /api/budget-plan/save-context ───────────────────────────────────────
router.post('/save-context', auth, async (req, res) => {
  try {
    const { context } = req.body;
    if (typeof context !== 'string') return res.status(400).json({ message: 'context required' });

    await pool.query(`
      INSERT INTO user_financial_profile (user_id, monthly_context, context_month, updated_at)
      VALUES ($1, $2, CURRENT_DATE, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        monthly_context = EXCLUDED.monthly_context,
        context_month   = CURRENT_DATE,
        updated_at      = NOW()`,
      [req.userId, context]
    );
    res.json({ saved: true });
  } catch (e) {
    console.error('[budgetPlan save-context]', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
