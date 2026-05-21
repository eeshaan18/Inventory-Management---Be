const express = require('express');
const router = express.Router();
const { createProduct, getProducts, getProductBySku } = require('../controllers/productController');

// Standard route mapping
router.post('/', createProduct);
router.get('/', getProducts);
router.get('/:sku', getProductBySku); 

module.exports = router;