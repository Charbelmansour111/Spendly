const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Fina/1.0)' },
  customFields: { item: ['media:thumbnail', 'media:content', 'enclosure'] }
});

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',           source: 'BBC Business' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html',     source: 'CNBC Finance' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/',    source: 'MarketWatch' },
  { url: 'https://www.investing.com/rss/news.rss',                   source: 'Investing.com' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',           source: 'WSJ Markets' },
];

function getImage(item) {
  return (
    item['media:content']?.$.url ||
    item['media:thumbnail']?.$.url ||
    item.enclosure?.url ||
    item['content:encoded']?.match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
    null
  )
}

let cache = { articles: [], ts: 0 }
const CACHE_TTL = 15 * 60 * 1000 // 15 min

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (Date.now() - cache.ts < CACHE_TTL && cache.articles.length > 0) {
      return res.json(cache.articles)
    }

    const results = await Promise.allSettled(
      FEEDS.map(({ url, source }) =>
        parser.parseURL(url).then(feed =>
          feed.items.slice(0, 5).map(item => ({
            title:       item.title?.trim(),
            url:         item.link || item.guid,
            urlToImage:  getImage(item),
            description: item.contentSnippet?.slice(0, 200) || item.summary?.slice(0, 200) || '',
            publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
            source:      { name: source },
          }))
        )
      )
    )

    const seen = new Set()
    const articles = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(a => {
        if (!a.title || !a.url || seen.has(a.url)) return false
        seen.add(a.url)
        return true
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 20)

    cache = { articles, ts: Date.now() }
    res.json(articles)
  } catch (e) {
    console.error('News error:', e.message)
    res.json(cache.articles.length ? cache.articles : [])
  }
});

module.exports = router;
