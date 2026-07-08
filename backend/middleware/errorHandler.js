function errorHandler(err, req, res, next) {
  console.error("[error]", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: { message: err.message || "Internal server error" },
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFound };