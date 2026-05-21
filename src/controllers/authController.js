const pool = require('../config/sql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user (Admin or Warehouse staff)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { username, password, role, warehouse_id } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role, warehouse_id) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
            [username, hashedPassword, role, warehouse_id || null]
        );

        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Postgres unique violation code
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && (await bcrypt.compare(password, user.password_hash))) {
            // Generate the JWT Token (The digital ID badge)
            const token = jwt.sign(
                { id: user.id, role: user.role, warehouse_id: user.warehouse_id },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.json({
                success: true,
                token,
                user: { id: user.id, username: user.username, role: user.role }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = { registerUser, loginUser };