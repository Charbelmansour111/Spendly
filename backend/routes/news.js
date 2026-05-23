const express = require('express');
const router  = express.Router();
const authenticateToken = require('../middleware/auth');
const Parser  = require('rss-parser');
const pool    = require('../db');

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Fina/1.0)' },
  customFields: { item: ['media:thumbnail', 'media:content', 'enclosure'] }
});

// ── Global feeds (always included for the 30% worldwide mix) ──────────────
const GLOBAL_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',              source: 'BBC Business' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html',        source: 'CNBC Finance' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/',       source: 'MarketWatch' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',              source: 'WSJ Markets' },
  { url: 'https://feeds.reuters.com/reuters/businessNews',              source: 'Reuters Business' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',  source: 'NY Times Business' },
  { url: 'https://www.theguardian.com/business/rss',                    source: 'The Guardian' },
  { url: 'https://www.investing.com/rss/news.rss',                      source: 'Investing.com' },
];

// ── Country-specific feeds (70% of results when country is matched) ───────
const COUNTRY_FEEDS = {
  // Lebanon
  LB: [
    { url: 'https://www.dailystar.com.lb/RSS/Business.xml',  source: 'Daily Star Lebanon' },
    { url: 'https://thearabweekly.com/rss.xml',               source: 'Arab Weekly' },
    { url: 'https://www.arabianbusiness.com/rss',             source: 'Arabian Business' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  ],
  // United States
  US: [
    { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',            source: 'WSJ Markets' },
    { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html',     source: 'CNBC Finance' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/',    source: 'MarketWatch' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NY Times Business' },
    { url: 'https://feeds.reuters.com/reuters/businessNews',            source: 'Reuters Business' },
  ],
  // United Kingdom
  GB: [
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',   source: 'BBC Business' },
    { url: 'https://www.theguardian.com/uk/business/rss',       source: 'Guardian UK Business' },
    { url: 'https://feeds.reuters.com/reuters/UKbusiness',      source: 'Reuters UK Business' },
  ],
  // UAE
  AE: [
    { url: 'https://www.thenationalnews.com/rss/business.xml',  source: 'The National UAE' },
    { url: 'https://www.khaleejtimes.com/rss',                   source: 'Khaleej Times' },
    { url: 'https://www.arabianbusiness.com/rss',                source: 'Arabian Business' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  ],
  // Saudi Arabia
  SA: [
    { url: 'https://www.arabianbusiness.com/rss',                source: 'Arabian Business' },
    { url: 'https://www.thenationalnews.com/rss/business.xml',   source: 'The National' },
    { url: 'https://thearabweekly.com/rss.xml',                   source: 'Arab Weekly' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  ],
  // Kuwait
  KW: [
    { url: 'https://www.arabianbusiness.com/rss',                source: 'Arabian Business' },
    { url: 'https://www.thenationalnews.com/rss/business.xml',   source: 'The National' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  ],
  // Qatar
  QA: [
    { url: 'https://www.arabianbusiness.com/rss',                source: 'Arabian Business' },
    { url: 'https://www.thenationalnews.com/rss/business.xml',   source: 'The National' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  ],
  // Canada
  CA: [
    { url: 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/business/', source: 'Globe and Mail' },
    { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', source: 'CNBC Finance' },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',       source: 'BBC Business' },
  ],
  // Australia
  AU: [
    { url: 'https://www.theguardian.com/au/business/rss',   source: 'Guardian Australia' },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business' },
    { url: 'https://feeds.reuters.com/reuters/businessNews',  source: 'Reuters Business' },
  ],
  // France
  FR: [
    { url: 'https://www.lefigaro.fr/rss/figaro_economie.xml', source: 'Le Figaro Économie' },
    { url: 'https://www.theguardian.com/business/rss',         source: 'The Guardian' },
    { url: 'https://feeds.reuters.com/reuters/businessNews',   source: 'Reuters Business' },
  ],
  // Germany
  DE: [
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',  source: 'BBC Business' },
    { url: 'https://www.theguardian.com/business/rss',          source: 'The Guardian' },
    { url: 'https://feeds.reuters.com/reuters/businessNews',    source: 'Reuters Business' },
  ],
  // India
  IN: [
    { url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', source: 'Economic Times' },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',              source: 'BBC Business' },
    { url: 'https://feeds.reuters.com/reuters/businessNews',              source: 'Reuters Business' },
  ],
  // Egypt
  EG: [
    { url: 'https://thearabweekly.com/rss.xml',                           source: 'Arab Weekly' },
    { url: 'https://www.arabianbusiness.com/rss',                          source: 'Arabian Business' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',    source: 'BBC Middle East' },
  ],
  // Jordan
  JO: [
    { url: 'https://thearabweekly.com/rss.xml',                           source: 'Arab Weekly' },
    { url: 'https://www.arabianbusiness.com/rss',                          source: 'Arabian Business' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',    source: 'BBC Middle East' },
  ],
};

// ── Fuzzy country name → ISO code map ────────────────────────────────────
const COUNTRY_CODE_MAP = {
  'lebanon': 'LB', 'liban': 'LB', 'lebanese': 'LB',
  'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US', 'american': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'britain': 'GB', 'british': 'GB',
  'uae': 'AE', 'united arab emirates': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE', 'emirati': 'AE',
  'saudi arabia': 'SA', 'ksa': 'SA', 'saudi': 'SA',
  'kuwait': 'KW', 'kuwaiti': 'KW',
  'qatar': 'QA', 'qatari': 'QA',
  'canada': 'CA', 'canadian': 'CA',
  'australia': 'AU', 'australian': 'AU',
  'france': 'FR', 'french': 'FR',
  'germany': 'DE', 'german': 'DE', 'deutschland': 'DE',
  'india': 'IN', 'indian': 'IN',
  'egypt': 'EG', 'egyptian': 'EG',
  'jordan': 'JO', 'jordanian': 'JO',
};

function getCountryCode(country) {
  if (!country) return null;
  return COUNTRY_CODE_MAP[country.toLowerCase().trim()] || null;
}

function getImage(item) {
  return (
    item['media:content']?.$.url ||
    item['media:thumbnail']?.$.url ||
    item.enclosure?.url ||
    item['content:encoded']?.match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
    null
  );
}

async function fetchFeeds(feeds, maxPerFeed = 5) {
  const results = await Promise.allSettled(
    feeds.map(({ url, source }) =>
      parser.parseURL(url).then(feed =>
        feed.items.slice(0, maxPerFeed).map(item => ({
          title:       item.title?.trim(),
          url:         item.link || item.guid,
          urlToImage:  getImage(item),
          description: item.contentSnippet?.slice(0, 220) || item.summary?.slice(0, 220) || '',
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          source:      { name: source },
        }))
      )
    )
  );
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
}

// Per-country cache so users don't share the same articles
const cache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 min

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Look up user's country
    const row         = await pool.query('SELECT country FROM users WHERE id = $1', [req.userId]);
    const country     = row.rows[0]?.country;
    const countryCode = getCountryCode(country);
    const cacheKey    = countryCode || 'global';

    // Serve from cache if fresh
    if (Date.now() - (cache[cacheKey]?.ts || 0) < CACHE_TTL && cache[cacheKey]?.articles?.length > 0) {
      return res.json(cache[cacheKey].articles);
    }

    let articles = [];
    const seen   = new Set();
    const dedup  = a => a.title && a.url && !seen.has(a.url) && seen.add(a.url);

    if (countryCode && COUNTRY_FEEDS[countryCode]) {
      // 70% local, 30% global
      const localFeeds   = COUNTRY_FEEDS[countryCode];
      const globalFeeds  = GLOBAL_FEEDS.filter(f => !localFeeds.find(l => l.url === f.url));

      const [localRaw, globalRaw] = await Promise.all([
        fetchFeeds(localFeeds, 6),
        fetchFeeds(globalFeeds, 3),
      ]);

      const local  = localRaw.filter(dedup);
      const global = globalRaw.filter(dedup);

      const localCount  = Math.ceil(20 * 0.7);   // 14
      const globalCount = 20 - localCount;          // 6

      articles = [
        ...local.slice(0, localCount),
        ...global.slice(0, globalCount),
      ].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    } else {
      // No country set → pure global mix
      const all = await fetchFeeds(GLOBAL_FEEDS, 4);
      articles  = all
        .filter(dedup)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 20);
    }

    cache[cacheKey] = { articles, ts: Date.now() };
    res.json(articles);
  } catch (e) {
    console.error('[news] error:', e.message);
    const fallback = Object.values(cache).find(c => c.articles?.length);
    res.json(fallback?.articles || []);
  }
});

module.exports = router;
