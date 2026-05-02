const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ message: 'No image provided' });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
            { text: `Analyze this receipt image carefully. Extract every line item you can read.
Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation:
{
  "merchant": "store or restaurant name",
  "items": [
    {"name": "Item name", "price": 4.99, "qty": 1},
    {"name": "Another item", "price": 2.50, "qty": 2}
  ],
  "total": 12.99,
  "category": "one of: Food, Coffee, Transport, Shopping, Entertainment, Health, Fitness, Education, Bills, Travel, Gifts, Subscriptions, Other",
  "date": "YYYY-MM-DD or null if not found"
}
Rules:
- items array must have at least 1 entry — use merchant name as item if individual items not visible
- price is a number (not a string)
- total is a number
- If total is not on receipt, sum the items
- date: use today if not found on receipt` }
          ]}]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return res.status(500).json({ message: 'Could not read receipt' });

    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    parsed.total = parseFloat(parsed.total) || 0;
    parsed.items = (parsed.items || []).map(item => ({
      name: item.name || 'Item',
      price: parseFloat(item.price) || 0,
      qty: parseInt(item.qty) || 1,
    }));
    parsed.date = parsed.date || new Date().toISOString().split('T')[0];

    res.json(parsed);
  } catch (error) {
    console.error('Receipt scan error:', error.message);
    res.status(500).json({ message: error.message || 'Error scanning receipt' });
  }
});

module.exports = router;
