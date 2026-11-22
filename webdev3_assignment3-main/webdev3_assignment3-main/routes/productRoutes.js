const express = require('express');
const products = require('../controllers/productController');
const {
  validateId,
  validateProductBody,
  validateStockChange,
  validateProductQuery,
} = require('../middleware/validate');

const router = express.Router();

// Report routes must come before /:id.
router.get('/low-stock', products.getLowStock);
router.get('/summary', products.getCategorySummary);

router
  .route('/')
  .get(validateProductQuery, products.getProducts)
  .post(validateProductBody, products.createProduct);

router.patch('/:id/stock', validateId, validateStockChange, products.adjustStock);

router
  .route('/:id')
  .get(validateId, products.getProductById)
  .put(validateId, validateProductBody, products.updateProduct)
  .delete(validateId, products.deleteProduct);

module.exports = router;
