const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// GET /api/profile/financial
router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM user_financial_profile WHERE user_id = $1',
      [req.userId]
    );
    if (!r.rows[0]) return res.json({ exists: false });
    res.json({ exists: true, ...r.rows[0] });
  } catch (e) {
    console.error('[financialProfile GET]', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/profile/financial — upsert all profile fields
router.post('/', auth, async (req, res) => {
  try {
    const {
      life_situation, housing, is_student, pays_tuition,
      is_married, children_count, income_type, savings_target,
      budget_food, budget_transport, budget_shopping, budget_subs,
      budget_entertain, budget_health, budget_other,
      monthly_context, extra_data,
    } = req.body;

    const r = await pool.query(`
      INSERT INTO user_financial_profile
        (user_id, life_situation, housing, is_student, pays_tuition,
         is_married, children_count, income_type, savings_target,
         budget_food, budget_transport, budget_shopping, budget_subs,
         budget_entertain, budget_health, budget_other,
         monthly_context, context_month, extra_data, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,CURRENT_DATE,$18,NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        life_situation  = EXCLUDED.life_situation,
        housing         = EXCLUDED.housing,
        is_student      = EXCLUDED.is_student,
        pays_tuition    = EXCLUDED.pays_tuition,
        is_married      = EXCLUDED.is_married,
        children_count  = EXCLUDED.children_count,
        income_type     = EXCLUDED.income_type,
        savings_target  = COALESCE(EXCLUDED.savings_target, user_financial_profile.savings_target),
        budget_food     = EXCLUDED.budget_food,
        budget_transport= EXCLUDED.budget_transport,
        budget_shopping = EXCLUDED.budget_shopping,
        budget_subs     = EXCLUDED.budget_subs,
        budget_entertain= EXCLUDED.budget_entertain,
        budget_health   = EXCLUDED.budget_health,
        budget_other    = EXCLUDED.budget_other,
        monthly_context = COALESCE(EXCLUDED.monthly_context, user_financial_profile.monthly_context),
        context_month   = CURRENT_DATE,
        extra_data      = COALESCE(EXCLUDED.extra_data, user_financial_profile.extra_data),
        updated_at      = NOW()
      RETURNING *`,
      [
        req.userId,
        life_situation || null, housing || null,
        is_student ?? false, pays_tuition ?? false,
        is_married ?? false, children_count ?? 0,
        income_type || null,
        savings_target ?? 20,
        budget_food || null, budget_transport || null,
        budget_shopping || null, budget_subs || null,
        budget_entertain || null, budget_health || null, budget_other || null,
        monthly_context || null,
        extra_data ? JSON.stringify(extra_data) : '{}',
      ]
    );
    res.json({ exists: true, ...r.rows[0] });
  } catch (e) {
    console.error('[financialProfile POST]', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/profile/financial/context — update only the monthly context text
router.put('/context', auth, async (req, res) => {
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
    console.error('[financialProfile PUT context]', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
