const express = require('express');
const router = express.Router();
const { scanItem, getStock, getAllStock, getAuditLogs} = require('../controllers/inventoryController');

// Route mapping
router.post('/scan', scanItem);           // Handles barcode scans
router.get('/stock/:sku', getStock); 
router.get('/all-stock', getAllStock);
router.get('/audit', getAuditLogs);     // Checks stock for a specific SKU

module.exports = router;