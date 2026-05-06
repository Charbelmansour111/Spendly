const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// GET / — list user's wallets
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM wallets WHERE user_id=$1 ORDER BY created_at ASC',
    [req.userId]
  );
  res.json(result.rows);
}));

// POST / — create wallet
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { name, type, balance, currency, color, emoji } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const result = await pool.query(
    `INSERT INTO wallets (user_id, name, type, balance, currency, color, emoji)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      req.userId,
      name,
      type || 'checking',
      parseFloat(balance) || 0,
      currency || 'USD',
      color || '#6B7280',
      emoji || '🏦',
    ]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /:id — update wallet
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { name, type, balance, currency, color, emoji } = req.body;
  const result = await pool.query(
    `UPDATE wallets SET name=$1, type=$2, balance=$3, currency=$4, color=$5, emoji=$6
     WHERE id=$7 AND user_id=$8 RETURNING *`,
    [name, type, parseFloat(balance) || 0, currency, color, emoji, req.params.id, req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ message: 'Wallet not found' });
  res.json(result.rows[0]);
}));

// DELETE /:id — delete wallet
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM wallets WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ message: 'Wallet deleted' });
}));

// GET /:id/stats — spending stats for this wallet
router.get('/:id/stats', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount),0) as total_spent, COUNT(*) as transaction_count
     FROM expenses WHERE wallet_id=$1 AND user_id=$2`,
    [req.params.id, req.userId]
  );
  res.json(result.rows[0]);
}));

module.exports = router;
