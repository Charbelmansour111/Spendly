const jwt = require('jsonwebtoken')
const pool = require('../db')

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' })
    req.userId = decoded.id || decoded.userId
    req.user = decoded
    // Track last active date for inactivity notifications
    const today = new Date().toISOString().split('T')[0]
    pool.query(
      `INSERT INTO user_activity (user_id, last_seen) VALUES ($1,$2)
       ON CONFLICT (user_id) DO UPDATE SET last_seen=$2 WHERE user_activity.last_seen < $2`,
      [req.userId, today]
    ).catch(() => {})
    next()
  })
}

module.exports = authenticateToken