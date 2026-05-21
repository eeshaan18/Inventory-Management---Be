const Product = require('../models/mongo/Product');
const crypto = require('crypto');

// @desc    Create a new product & generate SKU/Barcode
// @route   POST /api/products
const createProduct = async (req, res) => {
    try {
        const { name, description, category, attributes } = req.body;

        // Generate a unique SKU (Barcode number) 
        // Using 'SKDS' as a sleek prefix for your agency's inventory labels
        const uniqueString = crypto.randomBytes(3).toString('hex').toUpperCase();
        const sku = req.body.sku || `SKDS-${uniqueString}`;

        const product = new Product({
            sku,
            name,
            description,
            category,
            attributes
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: 'Product cataloged successfully',
            product
        });
    } catch (error) {
        // Handle MongoDB duplicate SKU errors gracefully
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'A product with this barcode already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get all products in the catalog
// @route   GET /api/products
const getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: products.length, products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single product by SKU
// @route   GET /api/products/:sku
const getProductBySku = async (req, res) => {
    try {
        const product = await Product.findOne({ sku: req.params.sku.toUpperCase() });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found in catalog.' });
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = { createProduct, getProducts, getProductBySku };