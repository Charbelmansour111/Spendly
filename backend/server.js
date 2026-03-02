const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const insightRoutes = require('./routes/insights');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/insights', insightRoutes);

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