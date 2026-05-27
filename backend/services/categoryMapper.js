/**
 * categoryMapper.js
 * Maps any user-defined expense category name to one of the 7 fixed budget buckets.
 * Case-insensitive, handles partial matches.
 */

const CATEGORY_MAP = {
  food: [
    'food', 'dining', 'restaurant', 'cafe', 'coffee', 'delivery',
    'groceries', 'grocery', 'supermarket', 'lunch', 'dinner',
    'breakfast', 'snack', 'takeaway', 'takeout', 'mcdonald',
    'burger', 'pizza', 'sushi', 'bakery', 'market',
  ],
  transport: [
    'transport', 'transportation', 'fuel', 'petrol', 'gas',
    'uber', 'lyft', 'careem', 'taxi', 'parking', 'bus', 'metro',
    'train', 'subway', 'fare', 'toll', 'car', 'auto', 'vehicle',
  ],
  shopping: [
    'shopping', 'clothes', 'clothing', 'shoes', 'fashion',
    'amazon', 'online', 'mall', 'store', 'retail', 'accessories',
    'household', 'furniture', 'electronics', 'appliance',
  ],
  subscriptions: [
    'subscription', 'netflix', 'spotify', 'apple', 'youtube',
    'gym', 'fitness', 'membership', 'hbo', 'disney', 'office',
    'software', 'app', 'annual', 'monthly plan', 'streaming',
    'internet', 'phone plan', 'mobile',
  ],
  entertainment: [
    'entertainment', 'cinema', 'movie', 'theatre', 'bar',
    'nightclub', 'outing', 'event', 'concert', 'festival',
    'games', 'gaming', 'sport', 'ticket', 'hobby', 'music',
    'night out', 'drinks', 'social',
  ],
  health: [
    'health', 'medical', 'doctor', 'pharmacy', 'medicine',
    'hospital', 'clinic', 'dentist', 'supplement', 'vitamin',
    'wellness', 'therapy', 'insurance', 'lab', 'test',
  ],
};

const mapCategory = (categoryName) => {
  if (!categoryName) return 'other';
  const lower = categoryName.toLowerCase().trim();
  for (const [bucket, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => lower.includes(k) || k.includes(lower))) {
      return bucket;
    }
  }
  return 'other';
};

/**
 * Group a list of { category, amount } rows into the 7 fixed buckets.
 * Returns { food: number, transport: number, ... }
 */
const groupByBucket = (categoryRows) => {
  const totals = { food: 0, transport: 0, shopping: 0, subscriptions: 0, entertainment: 0, health: 0, other: 0 };
  for (const row of categoryRows) {
    const bucket = mapCategory(row.category);
    totals[bucket] = (totals[bucket] || 0) + parseFloat(row.spent || row.amount || 0);
  }
  return totals;
};

module.exports = { mapCategory, groupByBucket, CATEGORY_MAP };
