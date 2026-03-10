const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/scan', verifyToken, async (req, res) => {
  console.log('Receipt scan called, imageBase64 length:', req.body?.imageBase64?.length, 'mimeType:', req.body?.mimeType)
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ message: 'No image provided' });

    console.log('Calling Gemini API...')
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                text: `Analyze this receipt image and extract information. Respond ONLY with a valid JSON object, no markdown, no explanation, no backticks:
{
  "amount": "total amount as number string e.g. 25.50",
  "description": "merchant name or short description",
  "category": "one of: Food, Transport, Shopping, Subscriptions, Entertainment, Other",
  "date": "date in YYYY-MM-DD format, use today if not found"
}
If you cannot read the image, still return your best guess.`
              }
            ]
          }]
        })
      }
    );

    console.log('Gemini response status:', response.status)
    const data = await response.json();
    console.log('Gemini response data:', JSON.stringify(data).substring(0, 500))

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      console.log('No text in response, full data:', JSON.stringify(data))
      return res.status(500).json({ message: 'Could not read receipt' });
    }

    const clean = text.replace(/```json|```/g, '').trim();
    console.log('Cleaned text:', clean)
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (error) {
    console.error('Receipt scan error message:', error.message)
    console.error('Receipt scan error stack:', error.stack)
    res.status(500).json({ message: error.message || 'Error scanning receipt' });
  }
});

module.exports = router;