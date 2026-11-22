const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { CATEGORIES } = require('../models/Product');

const STRING_FIELDS = ['name', 'sku', 'category', 'supplier'];
const NUMBER_FIELDS = ['price', 'quantity', 'reorderLevel'];
const SORT_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'createdAt'];
const STOCK_STATES = ['in', 'low', 'out'];
const MAX_LIMIT = 100;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isPositiveInt = (value) => /^\d+$/.test(value) && Number(value) >= 1;
const isNonNegativeNumber = (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

function validateId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return next(new ApiError(400, 'Invalid product ID'));
  }
  next();
}

// Keeps only known fields and checks their types. Mongoose validates the values.
function validateProductBody(req, res, next) {
  if (!isPlainObject(req.body)) return next(new ApiError(400, 'Request body must be a JSON object'));

  const data = {};
  const errors = {};

  for (const field of STRING_FIELDS) {
    if (req.body[field] === undefined) continue;
    if (typeof req.body[field] === 'string') data[field] = req.body[field];
    else errors[field] = `${field} must be a string`;
  }
  for (const field of NUMBER_FIELDS) {
    if (req.body[field] === undefined) continue;
    if (typeof req.body[field] === 'number' && Number.isFinite(req.body[field])) data[field] = req.body[field];
    else errors[field] = `${field} must be a number`;
  }

  if (Object.keys(errors).length) return next(new ApiError(400, 'Validation failed', errors));
  if (!Object.keys(data).length) return next(new ApiError(400, 'No valid product fields provided'));

  req.productData = data;
  next();
}

function validateStockChange(req, res, next) {
  const change = req.body?.change;
  if (!Number.isSafeInteger(change) || change === 0) {
    return next(new ApiError(400, 'change must be a non-zero whole number'));
  }
  next();
}

function validateProductQuery(req, res, next) {
  const { page, limit, minPrice, maxPrice, category, stock, sort } = req.query;
  const errors = {};

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value !== 'string') errors[key] = `${key} must be a single value`;
  }
  if (Object.keys(errors).length) return next(new ApiError(400, 'Invalid query parameters', errors));

  if (page !== undefined && !isPositiveInt(page)) errors.page = 'page must be a positive whole number';
  if (limit !== undefined && (!isPositiveInt(limit) || Number(limit) > MAX_LIMIT)) {
    errors.limit = `limit must be between 1 and ${MAX_LIMIT}`;
  }
  if (minPrice !== undefined && !isNonNegativeNumber(minPrice)) errors.minPrice = 'minPrice must be 0 or more';
  if (maxPrice !== undefined && !isNonNegativeNumber(maxPrice)) errors.maxPrice = 'maxPrice must be 0 or more';
  if (!errors.minPrice && !errors.maxPrice && minPrice !== undefined && maxPrice !== undefined
    && Number(minPrice) > Number(maxPrice)) {
    errors.minPrice = 'minPrice cannot be greater than maxPrice';
  }
  if (category !== undefined && !CATEGORIES.includes(category)) errors.category = 'Unknown category';
  if (stock !== undefined && !STOCK_STATES.includes(stock)) errors.stock = 'stock must be in, low or out';
  if (sort !== undefined && !SORT_FIELDS.includes(sort.replace(/^-/, ''))) {
    errors.sort = `sort must be one of: ${SORT_FIELDS.join(', ')}`;
  }

  if (Object.keys(errors).length) return next(new ApiError(400, 'Invalid query parameters', errors));
  next();
}

module.exports = { validateId, validateProductBody, validateStockChange, validateProductQuery };
