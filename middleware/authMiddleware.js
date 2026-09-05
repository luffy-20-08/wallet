const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            const JWT_SECRET = process.env.JWT_SECRET || 'wallet_app_jwt_secret_key_super_secure_2026';
            const decoded = jwt.verify(token, JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id);

            next();
        } catch (error) {
            console.log(error);
            res.status(401).json({ success: false, error: 'Not authorized' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }
};

module.exports = { protect };
