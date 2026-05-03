const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM debts WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date } = req.body;
    if (!name || !total_amount) return res.status(400).json({ message: 'Name and total amount required' });
    const result = await pool.query(
      `INSERT INTO debts (user_id, name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.userId, name, total_amount, remaining_amount ?? total_amount, monthly_payment ?? 0, interest_rate ?? 0, category || 'Other', due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date } = req.body;
    const result = await pool.query(
      `UPDATE debts SET name=$1, total_amount=$2, remaining_amount=$3, monthly_payment=$4, interest_rate=$5, category=$6, due_date=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [name, total_amount, remaining_amount, monthly_payment, interest_rate, category, due_date || null, req.params.id, req.userId]
    );
    res.json(result.rows[0]);
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.patch('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const debtRes = await pool.query('SELECT * FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    if (!debtRes.rows[0]) return res.status(404).json({ message: 'Debt not found' });
    const debt = debtRes.rows[0];

    await pool.query('DELETE FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);

    // Remove any matching liability from net worth by name
    const nwRes = await pool.query(
      `DELETE FROM net_worth_items WHERE user_id=$1 AND type='liability' AND LOWER(name) LIKE LOWER($2) RETURNING id`,
      [req.userId, `%${debt.name}%`]
    );

    res.json({ message: 'Debt marked as paid', debtName: debt.name, totalAmount: debt.total_amount, removedFromNetWorth: nwRes.rows.length > 0 });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }) }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { remaining_amount } = req.body;
    const prev = await pool.query('SELECT * FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    const result = await pool.query(
      'UPDATE debts SET remaining_amount = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [remaining_amount, req.params.id, req.userId]
    );
    res.json(result.rows[0]);

    // Record payment as a cash deduction in net worth
    if (prev.rows[0]) {
      const payment = parseFloat(prev.rows[0].remaining_amount) - parseFloat(remaining_amount);
      if (payment > 0) {
        pool.query(
          `INSERT INTO net_worth_adjustments (user_id, amount, description, type) VALUES ($1,$2,$3,'debt_payment')`,
          [req.userId, -payment, `Debt payment: ${prev.rows[0].name}`]
        ).catch(() => {});
      }
    }
  } catch { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Debt deleted' });
  } catch { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;
