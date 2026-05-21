const pool = require('../config/sql');

// @desc    Scan an item IN or OUT of a warehouse
// @route   POST /api/inventory/scan
const scanItem = async (req, res) => {
    const { sku, warehouse_id, user_id, action, quantity } = req.body;

    // 1. Basic validation
    if (!sku || !warehouse_id || !action || !quantity) {
        return res.status(400).json({ success: false, message: 'Missing required scan fields.' });
    }

    const client = await pool.connect();

    try {
        // Start SQL Transaction
        await client.query('BEGIN');

        // 2. Log the transaction for the audit trail
        const transQuery = `
            INSERT INTO inventory_transactions (product_sku, warehouse_id, user_id, action, quantity)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;
        `;
        await client.query(transQuery, [sku, warehouse_id, user_id || null, action, quantity]);

        // 3. Update the actual stock levels based on action
        if (action === 'IN') {
            // UPSERT: Insert new row, or if it exists, add to the existing quantity
            const updateStock = `
                INSERT INTO stock_levels (product_sku, warehouse_id, quantity)
                VALUES ($1, $2, $3)
                ON CONFLICT (product_sku, warehouse_id)
                DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity, last_updated = CURRENT_TIMESTAMP;
            `;
            await client.query(updateStock, [sku, warehouse_id, quantity]);

        } else if (action === 'OUT') {
            // Check if we actually have enough stock before allowing an OUT scan
            const checkStock = await client.query(
                'SELECT quantity FROM stock_levels WHERE product_sku = $1 AND warehouse_id = $2',
                [sku, warehouse_id]
            );

            if (checkStock.rows.length === 0 || checkStock.rows[0].quantity < quantity) {
                throw new Error('Insufficient stock! Cannot complete OUT scan.');
            }

            // Subtract the stock
            const updateStock = `
                UPDATE stock_levels 
                SET quantity = quantity - $3, last_updated = CURRENT_TIMESTAMP
                WHERE product_sku = $1 AND warehouse_id = $2;
            `;
            await client.query(updateStock, [sku, warehouse_id, quantity]);

        } else {
            throw new Error('Invalid action. Must be IN or OUT.');
        }

        // Commit the changes to the database
        await client.query('COMMIT');
        res.status(200).json({
            success: true,
            message: `Successfully scanned ${action}: ${quantity}x [${sku}]`
        });

    } catch (error) {
        // If anything fails, revert all changes
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Get current stock level for a specific product
// @route   GET /api/inventory/stock/:sku
const getStock = async (req, res) => {
    try {
        const { sku } = req.params;
        const result = await pool.query(
            'SELECT warehouse_id, quantity, last_updated FROM stock_levels WHERE product_sku = $1',
            [sku]
        );

        res.status(200).json({ success: true, stock: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get all stock levels across all warehouses
// @route   GET /api/inventory/all-stock
const getAllStock = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.product_sku, s.warehouse_id, s.quantity, s.last_updated, COALESCE(w.name, 'Warehouse ' || s.warehouse_id) as warehouse_name
            FROM stock_levels s
            LEFT JOIN warehouses w ON s.warehouse_id = w.id
            ORDER BY s.quantity DESC
        `);
        res.status(200).json({ success: true, stock: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get the latest inventory transactions (Audit Trail)
// @route   GET /api/inventory/audit
const getAuditLogs = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.id, t.product_sku, t.action, t.quantity, t.created_at, 
                   COALESCE(w.name, 'Warehouse ' || t.warehouse_id) as warehouse_name
            FROM inventory_transactions t
            LEFT JOIN warehouses w ON t.warehouse_id = w.id
            ORDER BY t.created_at DESC
            LIMIT 100
        `);
        res.status(200).json({ success: true, logs: result.rows });
    } catch (error) {
        // Fallback if your table uses 'timestamp' instead of 'created_at'
        try {
            const fallbackResult = await pool.query(`
                SELECT t.id, t.product_sku, t.action, t.quantity, t.timestamp as created_at, 
                       COALESCE(w.name, 'Warehouse ' || t.warehouse_id) as warehouse_name
                FROM inventory_transactions t
                LEFT JOIN warehouses w ON t.warehouse_id = w.id
                ORDER BY t.timestamp DESC
                LIMIT 100
            `);
            res.status(200).json({ success: true, logs: fallbackResult.rows });
        } catch (fallbackError) {
            res.status(500).json({ success: false, message: 'Server Error', error: fallbackError.message });
        }
    }
};

module.exports = { scanItem, getStock, getAllStock, getAuditLogs };
