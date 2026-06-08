function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
}

function errorHandler(err, _req, res, _next) {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
}

module.exports = { notFound, errorHandler };
