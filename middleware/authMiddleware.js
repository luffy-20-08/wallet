const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const JWT_SECRET = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, JWT_SECRET);

            // Get user from the token
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ success: false, error: 'User account not found' });
            }

            // Verify active session if token contains sessionId
            if (decoded.sessionId) {
                const session = await Session.findOne({
                    _id: decoded.sessionId,
                    userId: decoded.id,
                    isActive: true,
                    expiresAt: { $gt: new Date() }
                });

                if (!session) {
                    return res.status(401).json({
                        success: false,
                        error: 'Session has been invalidated or expired. Please log in again.'
                    });
                }

                // Throttle lastActiveAt updates to at most once every 60 seconds
                const now = Date.now();
                if (!session.lastActiveAt || now - new Date(session.lastActiveAt).getTime() > 60000) {
                    session.lastActiveAt = new Date();
                    session.save().catch(err => console.error('Failed updating session lastActiveAt:', err));
                }

                req.session = session;
                req.sessionId = session._id.toString();
            }

            req.user = user;
            return next();
        } catch (error) {
            console.error('Auth middleware error:', error.message);
            return res.status(401).json({ success: false, error: 'Not authorized, invalid or expired token' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };
