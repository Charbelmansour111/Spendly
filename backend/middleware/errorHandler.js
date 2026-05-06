const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500
  const message = status < 500 ? err.message : 'Internal server error'
  if (status >= 500) console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err)
  res.status(status).json({ message })
}

module.exports = errorHandler
