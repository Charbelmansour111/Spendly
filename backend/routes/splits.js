const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/', auth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM splits WHERE user_id=$1 ORDER BY created_at DESC',
    [req.userId]
  );
  const result = await Promise.all(rows.map(async (split) => {
    const { rows: parts } = await pool.query(
      'SELECT * FROM split_participants WHERE split_id=$1 ORDER BY name',
      [split.id]
    );
    return { ...split, participants: parts };
  }));
  res.json(result);
}));

router.post('/', auth, asyncHandler(async (req, res) => {
  const { title, total_amount, category, date, notes, participants } = req.body;
  if (!title || !total_amount || !participants?.length)
    return res.status(400).json({ message: 'title, total_amount, and participants required' });

  const d = date || new Date().toISOString().split('T')[0];
  const { rows: [split] } = await pool.query(
    'INSERT INTO splits (user_id, title, total_amount, category, date, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.userId, title, total_amount, category || 'Other', d, notes || null]
  );

  const parts = [];
  for (const p of participants) {
    const { rows: [part] } = await pool.query(
      'INSERT INTO split_participants (split_id, name, amount) VALUES ($1,$2,$3) RETURNING *',
      [split.id, p.name, p.amount]
    );
    parts.push(part);
  }

  // Also log as an expense for the user
  await pool.query(
    'INSERT INTO expenses (user_id, amount, category, description, date, payment_method) VALUES ($1,$2,$3,$4,$5,$6)',
    [req.userId, total_amount, category || 'Other', title, d, 'Card']
  );

  res.status(201).json({ ...split, participants: parts });
}));

router.put('/:id/participants/:pid', auth, asyncHandler(async (req, res) => {
  const { paid } = req.body;
  const { rows: owns } = await pool.query(
    'SELECT id FROM splits WHERE id=$1 AND user_id=$2',
    [req.params.id, req.userId]
  );
  if (!owns.length) return res.status(404).json({ message: 'Not found' });
  const { rows: [part] } = await pool.query(
    'UPDATE split_participants SET paid=$1, paid_at=$2 WHERE id=$3 AND split_id=$4 RETURNING *',
    [paid, paid ? new Date() : null, req.params.pid, req.params.id]
  );
  res.json(part);
}));

router.delete('/:id', auth, asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM splits WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ message: 'deleted' });
}));

module.exports = router;
