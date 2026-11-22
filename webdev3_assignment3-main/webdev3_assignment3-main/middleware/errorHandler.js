const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, detail]) => [
        field,
        detail.name === 'CastError' ? `${field} has an invalid value` : detail.message,
      ])
    );
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      message: `${field.toUpperCase()} already exists`,
      errors: { [field]: `This ${field} is already in use` },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON in request body' });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, ...(err.errors && { errors: err.errors }) });
  }

  console.error(err);
  res.status(err.status || 500).json({ message: 'Something went wrong on the server' });
}

module.exports = { notFound, errorHandler };
