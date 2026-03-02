const express = require('express');
const router = express.Router();
const pool = require('../db');
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

router.get('/', verifyToken, async (req, res) => {
  try {
    const expenses = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC',
      [req.userId]
    );

    if (expenses.rows.length === 0) {
      return res.json({ insight: 'Add some expenses first to get AI insights!' });
    }

    const total = expenses.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const categoryTotals = expenses.rows.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
      return acc;
    }, {});

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topCategory = sorted[0]
    const topPercent = ((topCategory[1] / total) * 100).toFixed(0)

    let insights = []

    // Insight 1 - biggest category
    insights.push(`💸 Your biggest expense is **${topCategory[0]}** at $${topCategory[1].toFixed(2)}, which is ${topPercent}% of your total spending. Consider setting a budget limit for this category.`)

    // Insight 2 - total spending
    const dailyAvg = (total / 30).toFixed(2)
    insights.push(`📊 You're spending an average of **$${dailyAvg}/day** this month. That adds up to **$${(dailyAvg * 365).toFixed(0)}/year** if you keep this pace.`)

    // Insight 3 - specific advice based on top category
    const advice = {
      Food: `🍔 Food is your top expense. Try meal prepping on Sundays — most people cut food costs by 30% this way. That could save you $${(topCategory[1] * 0.3).toFixed(0)} this month.`,
      Transport: `🚗 Transport is eating your budget. Consider carpooling or public transit a few days a week to cut this by 20% — saving $${(topCategory[1] * 0.2).toFixed(0)}.`,
      Shopping: `🛍️ Shopping is your biggest expense. Try a 24-hour rule — wait a day before buying anything over $20. This alone could reduce impulse purchases by 40%.`,
      Subscriptions: `📱 You're spending $${topCategory[1].toFixed(2)} on subscriptions. List every subscription you have and cancel any you haven't used in the last 30 days.`,
      Entertainment: `🎬 Entertainment costs are high. Look for free events, student discounts, or rotating streaming services instead of keeping all of them at once.`,
      Other: `📦 You have $${topCategory[1].toFixed(2)} in uncategorized expenses. Try to categorize these properly so you can track where your money really goes.`
    }

    insights.push(advice[topCategory[0]] || `💡 Review your ${topCategory[0]} expenses and see if there are areas where you can cut back.`)

    // Insight 4 - savings potential
    const savingsPotential = (total * 0.15).toFixed(2)
    insights.push(`🎯 If you cut just 15% of your spending, you could save **$${savingsPotential} this month** — that's **$${(savingsPotential * 12).toFixed(0)} per year**.`)

    res.json({ insight: insights.join('\n\n') })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error generating insights' })
  }
});

module.exports = router;