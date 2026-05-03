const pool = require('../db');

module.exports = (req, res, next) => {
  if (req.userId) {
    const today = new Date().toISOString().split('T')[0];
    pool.query(
      `INSERT INTO user_activity (user_id, last_seen) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET last_seen=$2`,
      [req.userId, today]
    ).catch(() => {});
  }
  next();
};
