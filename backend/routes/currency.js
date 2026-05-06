const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/currency/rate?from=AED&to=USD
router.get('/rate', auth, asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ message: 'from and to required' });
  if (from.toUpperCase() === to.toUpperCase()) return res.json({ rate: 1, from, to });

  const r = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`);
  const data = await r.json();
  if (!r.ok || data.result !== 'success') throw new Error('Exchange rate service unavailable');

  const rate = data.rates[to.toUpperCase()];
  if (!rate) return res.status(422).json({ message: `No rate found for ${to}` });
  res.json({ rate, from: from.toUpperCase(), to: to.toUpperCase() });
}));

module.exports = router;
