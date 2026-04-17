const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return res.json([]);

  try {
    const [bizResponse, worldResponse] = await Promise.allSettled([
      fetch(`https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=8&apiKey=${apiKey}`).then(r => r.json()),
      fetch(`https://newsapi.org/v2/top-headlines?category=general&language=en&pageSize=8&apiKey=${apiKey}`).then(r => r.json()),
    ]);

    const all = [];
    if (bizResponse.status === 'fulfilled') all.push(...(bizResponse.value.articles || []));
    if (worldResponse.status === 'fulfilled') all.push(...(worldResponse.value.articles || []));

    const seen = new Set();
    const filtered = all.filter(a => {
      if (!a.urlToImage || !a.url || a.title === '[Removed]' || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    }).slice(0, 12);

    res.json(filtered);
  } catch {
    res.json([]);
  }
});

module.exports = router;
