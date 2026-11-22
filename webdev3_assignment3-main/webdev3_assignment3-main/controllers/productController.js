const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

const DEFAULT_LIMIT = 10;
const IS_LOW_STOCK = { $lte: ['$quantity', '$reorderLevel'] };

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildFilter({ search, category, supplier, minPrice, maxPrice, stock }) {
  const filter = {};

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { sku: pattern }, { supplier: pattern }];
  }
  if (category) filter.category = category;
  if (supplier?.trim()) filter.supplier = new RegExp(escapeRegex(supplier.trim()), 'i');

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  if (stock === 'out') filter.quantity = 0;
  if (stock === 'low') filter.$expr = IS_LOW_STOCK;
  if (stock === 'in') filter.$expr = { $gt: ['$quantity', '$reorderLevel'] };

  return filter;
}

function buildSort(sort = '-createdAt') {
  const field = sort.replace(/^-/, '');
  // _id breaks ties so that pagination stays stable.
  return { [field]: sort.startsWith('-') ? -1 : 1, _id: 1 };
}

async function createProduct(req, res) {
  const product = await Product.create(req.productData);
  res.status(201).json(product);
}

async function getProducts(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || DEFAULT_LIMIT;
  const filter = buildFilter(req.query);

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(buildSort(req.query.sort)).skip((page - 1) * limit).limit(limit),
  ]);

  res.json({ total, page, totalPages: Math.ceil(total / limit), count: products.length, products });
}

async function getProductById(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
}

async function updateProduct(req, res) {
  const product = await Product.findByIdAndUpdate(req.params.id, req.productData, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
}

// The quantity check and $inc run as one atomic operation, so concurrent
// sales cannot push stock below zero.
async function adjustStock(req, res) {
  const { change } = req.body;
  const filter = { _id: req.params.id };
  if (change < 0) filter.quantity = { $gte: -change };

  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { quantity: change } },
    { returnDocument: 'after' }
  );

  if (!product) {
    const current = await Product.findById(req.params.id).select('quantity');
    if (!current) throw new ApiError(404, 'Product not found');
    throw new ApiError(400, `Insufficient stock. Only ${current.quantity} available`);
  }

  res.json({ message: 'Stock updated', product });
}

async function deleteProduct(req, res) {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ message: 'Product deleted', id: product.id });
}

async function getLowStock(req, res) {
  const lowStockItems = await Product.aggregate([
    { $match: { $expr: IS_LOW_STOCK } },
    {
      $addFields: {
        stockValue: { $multiply: ['$price', '$quantity'] },
        id: { $toString: '$_id' },
      },
    },
    { $sort: { quantity: 1, name: 1 } },
  ]);

  res.json({ count: lowStockItems.length, lowStockItems });
}

async function getCategorySummary(req, res) {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
      },
    },
    { $addFields: { avgPrice: { $round: ['$avgPrice', 2] } } },
    { $sort: { totalStockValue: -1, _id: 1 } },
  ]);

  res.json({ categories: summary.length, summary });
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  adjustStock,
  deleteProduct,
  getLowStock,
  getCategorySummary,
};
