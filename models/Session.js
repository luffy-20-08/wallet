const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        index: true
    },
    deviceType: {
        type: String,
        default: 'Desktop'
    },
    os: {
        type: String,
        default: 'Unknown'
    },
    browser: {
        type: String,
        default: 'Unknown'
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastActiveAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index automatically deletes expired documents
    }
});

// Composite index for fast active session lookups per user
SessionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('Session', SessionSchema);
