const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Fail fast if critical env vars are missing
const REQUIRED_ENV = ['JWT_SECRET', 'DB_USER', 'DB_HOST', 'DB_NAME', 'GROQ_API_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const migrate = require('./db/migrate');

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const insightRoutes = require('./routes/insights');
const budgetRoutes = require('./routes/budgets');
const savingsRoutes = require('./routes/savings');
const incomeRoutes = require('./routes/income');
const alertsRouter = require('./routes/alerts');
const receiptsRouter = require('./routes/receipts');
const wellnessRoutes = require('./routes/wellness');
const notificationsRouter = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const businessRoutes = require('./routes/business');
const newsRoutes = require('./routes/news');
const debtsRoutes = require('./routes/debts');
const subscriptionsRoutes = require('./routes/subscriptions');
const aiRoutes = require('./routes/ai');
const networthRoutes = require('./routes/networth');
const pushRoutes = require('./routes/push');
const { startScheduler } = require('./services/scheduler');
const walletRoutes = require('./routes/wallets');
const walletExpensesRoutes = require('./routes/walletExpenses');
const walletIncomeRoutes = require('./routes/walletIncome');
const walletBudgetsRoutes = require('./routes/walletBudgets');
const walletSavingsRoutes = require('./routes/walletSavings');
const walletDebtsRoutes = require('./routes/walletDebts');
const walletSubscriptionsRoutes = require('./routes/walletSubscriptions');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/alerts', alertsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/profile', profileRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/debts', debtsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/networth', networthRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/wallets/:walletId/expenses', walletExpensesRoutes);
app.use('/api/wallets/:walletId/income', walletIncomeRoutes);
app.use('/api/wallets/:walletId/budgets', walletBudgetsRoutes);
app.use('/api/wallets/:walletId/savings', walletSavingsRoutes);
app.use('/api/wallets/:walletId/debts', walletDebtsRoutes);
app.use('/api/wallets/:walletId/subscriptions', walletSubscriptionsRoutes);
app.use('/api/advisor', require('./routes/advisor'));
app.use('/api/support', require('./routes/support'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/splits', require('./routes/splits'));
app.use('/api/currency', require('./routes/currency'));

app.get('/', (req, res) => {
  res.json({ message: 'Spendly API is running' });
});

app.get('/api/health/ai', async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.json({ ok: false, error: 'GROQ_API_KEY not set' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] })
    });
    const d = await r.json();
    if (!r.ok) return res.json({ ok: false, error: d.error?.message || 'Groq error', status: r.status });
    res.json({ ok: true, key_prefix: key.slice(0, 8) });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await migrate();
  startScheduler();
  console.log(`Server running on port ${PORT}`);
});
