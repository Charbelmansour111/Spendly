const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_revenue WHERE user_id = $1 ORDER BY date DESC LIMIT 90', [req.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/revenue', authenticateToken, async (req, res) => {
  try {
    const { date, total_revenue, notes, scan_raw } = req.body;
    if (!date || total_revenue === undefined) return res.status(400).json({ message: 'Date and revenue are required' });
    const result = await pool.query(
      'INSERT INTO daily_revenue (user_id, date, total_revenue, notes, scan_raw) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, date, total_revenue, notes || null, scan_raw || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/revenue/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM daily_revenue WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const BIZ_CATS = ['Ingredients', 'Staff', 'Rent', 'Utilities', 'Marketing', 'Equipment', 'Packaging', 'Other'];
    const result = await pool.query('SELECT * FROM expenses WHERE user_id = $1 AND category = ANY($2) ORDER BY date DESC', [req.userId, BIZ_CATS]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/employees', authenticateToken, async (req, res) => {
  try {
    const { name, role, salary, salary_type, phone } = req.body;
    if (!name || !salary) return res.status(400).json({ message: 'Name and salary are required' });
    const result = await pool.query(
      'INSERT INTO employees (user_id, name, role, salary, salary_type, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, name.trim(), role || 'Staff', salary, salary_type || 'monthly', phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.put('/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { name, role, salary, salary_type, phone, is_active } = req.body;
    const result = await pool.query(
      'UPDATE employees SET name=$1, role=$2, salary=$3, salary_type=$4, phone=$5, is_active=$6 WHERE id=$7 AND user_id=$8 RETURNING *',
      [name, role, salary, salary_type, phone, is_active !== undefined ? is_active : true, req.params.id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/employees/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE employees SET is_active = FALSE WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Employee removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.get('/payroll', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query(
      'SELECT p.*, e.name as employee_name, e.role FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE p.user_id = $1 AND p.month = $2 AND p.year = $3 ORDER BY e.name',
      [req.userId, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/payroll', authenticateToken, async (req, res) => {
  try {
    const { employee_id, month, year, amount, is_paid, notes } = req.body;
    if (!employee_id || !month || !year || !amount) return res.status(400).json({ message: 'Missing required fields' });
    const existing = await pool.query('SELECT id FROM payroll WHERE user_id=$1 AND employee_id=$2 AND month=$3 AND year=$4', [req.userId, employee_id, month, year]);
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE payroll SET amount=$1, is_paid=$2, paid_at=$3, notes=$4 WHERE user_id=$5 AND employee_id=$6 AND month=$7 AND year=$8 RETURNING *',
        [amount, is_paid || false, is_paid ? new Date() : null, notes || null, req.userId, employee_id, month, year]
      );
    } else {
      result = await pool.query(
        'INSERT INTO payroll (user_id, employee_id, month, year, amount, is_paid, paid_at, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [req.userId, employee_id, month, year, amount, is_paid || false, is_paid ? new Date() : null, notes || null]
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.get('/menu', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items WHERE user_id = $1 AND is_active = TRUE ORDER BY category, name', [req.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/menu', authenticateToken, async (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !price) return res.status(400).json({ message: 'Name and price are required' });
    const result = await pool.query('INSERT INTO menu_items (user_id, name, category, price) VALUES ($1, $2, $3, $4) RETURNING *', [req.userId, name.trim(), category || 'Main', price]);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/menu/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE menu_items SET is_active=FALSE WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Item removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.get('/stock', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients WHERE user_id = $1 ORDER BY name', [req.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/stock', authenticateToken, async (req, res) => {
  try {
    const { name, unit, cost_per_unit, stock_quantity, low_stock_alert } = req.body;
    if (!name || !unit || !cost_per_unit) return res.status(400).json({ message: 'Name, unit and cost are required' });
    const result = await pool.query(
      'INSERT INTO ingredients (user_id, name, unit, cost_per_unit, stock_quantity, low_stock_alert) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, name.trim(), unit, cost_per_unit, stock_quantity || 0, low_stock_alert || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.put('/stock/:id', authenticateToken, async (req, res) => {
  try {
    const { stock_quantity, cost_per_unit, low_stock_alert } = req.body;
    const result = await pool.query(
      'UPDATE ingredients SET stock_quantity=$1, cost_per_unit=$2, low_stock_alert=$3 WHERE id=$4 AND user_id=$5 RETURNING *',
      [stock_quantity, cost_per_unit, low_stock_alert, req.params.id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

module.exports = router;