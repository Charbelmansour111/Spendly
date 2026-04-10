const express = require('express');
const cors = require('cors');
require('dotenv').config();

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

app.get('/', (req, res) => {
  res.json({ message: 'Spendly API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});