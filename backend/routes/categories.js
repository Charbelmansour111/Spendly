const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const DEFAULTS = [
  { name:'Food',emoji:'🍔',color:'#F97316',isDefault:true },
  { name:'Coffee',emoji:'☕',color:'#92400E',isDefault:true },
  { name:'Transport',emoji:'🚗',color:'#3B82F6',isDefault:true },
  { name:'Shopping',emoji:'🛍️',color:'#EC4899',isDefault:true },
  { name:'Subscriptions',emoji:'📱',color:'#8B5CF6',isDefault:true },
  { name:'Entertainment',emoji:'🎬',color:'#10B981',isDefault:true },
  { name:'Health',emoji:'🏥',color:'#EF4444',isDefault:true },
  { name:'Fitness',emoji:'🏋️',color:'#F59E0B',isDefault:true },
  { name:'Education',emoji:'🎓',color:'#6366F1',isDefault:true },
  { name:'Bills',emoji:'💡',color:'#0EA5E9',isDefault:true },
  { name:'Travel',emoji:'✈️',color:'#14B8A6',isDefault:true },
  { name:'Gifts',emoji:'🎁',color:'#E879F9',isDefault:true },
  { name:'Other',emoji:'📦',color:'#6B7280',isDefault:true },
];

router.get('/', auth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, emoji, color FROM custom_categories WHERE user_id=$1 ORDER BY name',
    [req.userId]
  );
  res.json([...DEFAULTS, ...rows.map(r => ({ ...r, isDefault: false }))]);
}));

router.post('/', auth, asyncHandler(async (req, res) => {
  const { name, emoji, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'name required' });
  const { rows } = await pool.query(
    `INSERT INTO custom_categories (user_id, name, emoji, color)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, name) DO NOTHING RETURNING *`,
    [req.userId, name.trim(), emoji || '📦', color || '#6B7280']
  );
  if (!rows.length) return res.status(409).json({ message: 'Category already exists' });
  res.status(201).json({ ...rows[0], isDefault: false });
}));

router.delete('/:id', auth, asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM custom_categories WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ message: 'deleted' });
}));

module.exports = router;
