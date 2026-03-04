const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const insightRoutes = require('./routes/insights');
const budgetRoutes = require('./routes/budgets');
const savingsRoutes = require('./routes/savings');
const incomeRoutes = require('./routes/income'); 

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/income', incomeRoutes); 

app.get('/', (req, res) => {
  res.json({ message: 'Spendly API is running' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'test works' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);