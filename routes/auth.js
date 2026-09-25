const express = require('express');
const router = express.Router();
let bcrypt;
try {
    bcrypt = require('bcrypt');
} catch (e) {
    bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const { protect } = require('../middleware/authMiddleware');
const { parseUserAgent, getClientIp, formatRelativeTime } = require('../utils/sessionHelper');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to create a new session and corresponding JWT token
const createSessionAndToken = async (userId, req) => {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = getClientIp(req);
    const { os, browser, deviceType } = parseUserAgent(userAgent);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = await Session.create({
        userId,
        deviceType,
        os,
        browser,
        ipAddress,
        userAgent,
        isActive: true,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        expiresAt
    });

    const token = jwt.sign(
        { id: userId, sessionId: session._id },
        JWT_SECRET,
        { expiresIn: '30d' }
    );

    return { session, token };
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide all fields' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
        }

        // Check user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        // Create user (password automatically hashed with bcrypt by pre('save') hook)
        const user = await User.create({
            username,
            email,
            password
        });

        if (user) {
            const { token } = await createSessionAndToken(user._id, req);

            res.status(201).json({
                success: true,
                _id: user.id,
                username: user.username,
                email: user.email,
                token
            });
        } else {
            res.status(400).json({ success: false, error: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
});

// @desc    Authenticate a user & create active session
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide both username/email and password' });
        }

        const rawIdentifier = (email || '').trim();
        const connectedDb = mongoose.connection ? mongoose.connection.name : 'unknown';

        // Check for user by email OR username (case-insensitive regex and exact match)
        const escaped = rawIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const user = await User.findOne({
            $or: [
                { email: rawIdentifier },
                { username: rawIdentifier },
                { email: new RegExp('^' + escaped + '$', 'i') },
                { username: new RegExp('^' + escaped + '$', 'i') }
            ]
        }).select('+password');

        const userFound = !!user;
        const passwordExists = !!(user && user.password);
        let bcryptMatched = false;
        let plainMatched = false;

        if (user && user.password) {
            try {
                // Support bcrypt compare on any standard hash ($2a$, $2b$, $2y$, etc.)
                bcryptMatched = await bcrypt.compare(password, user.password);
            } catch (cmpErr) {
                console.warn('[Auth Diagnostic] bcrypt.compare error:', cmpErr.message);
            }

            if (!bcryptMatched && user.password === password) {
                plainMatched = true;
                user.markModified('password');
                await user.save();
            }
        }

        const isMatch = bcryptMatched || plainMatched;

        // SAFE Diagnostic Logging: NEVER prints password or hash
        console.log(`[Auth Diagnostic] Connected DB: "${connectedDb}" | User Found: ${userFound} | Password Field Exists: ${passwordExists} | Bcrypt Match: ${bcryptMatched} | Auth Match: ${isMatch}`);

        if (!user || !isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Invalid credentials',
                _diagnostic: {
                    db: connectedDb,
                    userFound,
                    passwordExists,
                    bcryptMatched
                }
            });
        }

        const { token } = await createSessionAndToken(user._id, req);

        res.json({
            success: true,
            _id: user.id,
            username: user.username,
            email: user.email,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
});

// @desc    Change current user password & invalidate other sessions
// @route   POST /api/auth/change-password (and PUT /api/auth/change-password)
// @access  Private
const changePasswordHandler = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Please provide both current and new password' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
        }

        // Find user with password field included
        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify current password
        let isMatch = false;
        const isBcryptHash = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));
        if (isBcryptHash) {
            isMatch = await user.matchPassword(currentPassword);
        } else {
            isMatch = (user.password === currentPassword);
        }

        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, error: 'New password cannot be the same as current password' });
        }

        // Update password and save (triggers pre-save bcrypt hashing hook)
        user.password = newPassword;
        await user.save();

        // Invalidate all OTHER active sessions for security (keep current session active)
        if (req.sessionId) {
            await Session.deleteMany({
                userId: req.user._id,
                _id: { $ne: req.sessionId }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Password changed successfully. Other devices have been signed out.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
};

router.post('/change-password', protect, changePasswordHandler);
router.put('/change-password', protect, changePasswordHandler);
router.put('/updatepassword', protect, changePasswordHandler);

// @desc    Get all active sessions/devices for the authenticated user
// @route   GET /api/auth/sessions
// @access  Private
router.get('/sessions', protect, async (req, res) => {
    try {
        const activeSessions = await Session.find({
            userId: req.user._id,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).sort({ lastActiveAt: -1 });

        const sessions = activeSessions.map(s => {
            const isCurrent = req.sessionId ? s._id.toString() === req.sessionId : false;
            return {
                id: s._id.toString(),
                deviceType: s.deviceType || 'Desktop',
                os: s.os || 'Unknown',
                browser: s.browser || 'Unknown',
                ipAddress: s.ipAddress || '',
                isCurrent,
                createdAt: s.createdAt,
                lastActiveAt: s.lastActiveAt,
                lastActiveText: isCurrent ? 'Just now' : formatRelativeTime(s.lastActiveAt)
            };
        });

        res.status(200).json({
            success: true,
            deviceCount: sessions.length,
            sessions
        });
    } catch (error) {
        console.error('Fetch sessions error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
});

// @desc    Log out a specific device/session
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
router.delete('/sessions/:sessionId', protect, async (req, res) => {
    try {
        const session = await Session.findOne({
            _id: req.params.sessionId,
            userId: req.user._id
        });

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found or already logged out' });
        }

        await Session.deleteOne({ _id: req.params.sessionId });

        res.status(200).json({
            success: true,
            message: 'Device logged out successfully'
        });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
});

// @desc    Log out all other devices except the current device
// @route   POST /api/auth/sessions/logout-all-other
// @access  Private
router.post('/sessions/logout-all-other', protect, async (req, res) => {
    try {
        if (!req.sessionId) {
            return res.status(400).json({ success: false, error: 'Current session not identified' });
        }

        const result = await Session.deleteMany({
            userId: req.user._id,
            _id: { $ne: req.sessionId }
        });

        res.status(200).json({
            success: true,
            message: 'All other devices have been signed out',
            revokedCount: result.deletedCount || 0
        });
    } catch (error) {
        console.error('Logout all other devices error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
});

// @desc    Log out current session
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
    try {
        if (req.sessionId) {
            await Session.deleteOne({ _id: req.sessionId, userId: req.user._id });
        }
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
});

// @desc    Get current user data
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    res.status(200).json(req.user);
});

module.exports = router;
