const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return res.json([]);

  try {
    const [bizResponse, worldResponse] = await Promise.allSettled([
      fetch(`https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=12&apiKey=${apiKey}`).then(r => r.json()),
      fetch(`https://newsapi.org/v2/top-headlines?category=general&language=en&pageSize=6&apiKey=${apiKey}`).then(r => r.json()),
    ]);

    const seen = new Set();
    const clean = (articles) => (articles || []).filter(a => {
      if (!a.urlToImage || !a.url || a.title === '[Removed]' || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // 75% financial: take up to 11 business + 4 general = 15 total
    const biz   = bizResponse.status   === 'fulfilled' ? clean(bizResponse.value.articles).slice(0, 11)   : [];
    const world = worldResponse.status === 'fulfilled' ? clean(worldResponse.value.articles).slice(0, 4) : [];
    const filtered = [...biz, ...world].slice(0, 15);

    res.json(filtered);
  } catch {
    res.json([]);
  }
});

module.exports = router;
