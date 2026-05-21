const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // This is required by Railway for outside connections
    }
});

// Test the connection immediately
pool.connect()
    .then(client => {
        console.log('🟢 PostgreSQL Connected Successfully');
        client.release();
    })
    .catch(err => {
        console.error('🔴 PostgreSQL Connection Error:', err.stack);
    });

module.exports = pool;