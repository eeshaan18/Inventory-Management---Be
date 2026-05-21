require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectMongo = require('./config/mongo');
require('./config/sql'); // This triggers the MySQL connection test

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        callback(null, true); // Safely allows your Vercel frontend to connect
    },
    credentials: true
}));
app.use(express.json()); // Allows us to parse JSON payloads from Next.js

// Initialize MongoDB
connectMongo();

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));

// Basic Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'API is running beautifully' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
