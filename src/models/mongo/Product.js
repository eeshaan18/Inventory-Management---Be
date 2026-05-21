const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    totalParts: { type: Number, default: 1 }, // <-- Add this line
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);