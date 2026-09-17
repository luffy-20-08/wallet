const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Please provide an application or service name'],
        trim: true
    },
    appId: {
        type: String,
        default: 'custom'
    },
    icon: {
        type: String,
        default: 'fa-solid fa-credit-card'
    },
    color: {
        type: String,
        default: '#A970FF'
    },
    plan: {
        type: String,
        default: 'Standard',
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Please specify the subscription monthly amount'],
        min: [1, 'Amount must be greater than zero']
    },
    category: {
        type: String,
        default: 'Entertainment'
    },
    durationMonths: {
        type: Number,
        required: [true, 'Please specify the duration in months'],
        min: [1, 'Duration must be at least 1 month'],
        default: 12
    },
    monthsPaid: {
        type: Number,
        default: 0
    },
    billingDay: {
        type: Number,
        min: 1,
        max: 31,
        default: () => new Date().getDate()
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    nextBillingDate: {
        type: Date,
        required: true,
        index: true
    },
    lastDeductedDate: {
        type: Date
    },
    autoDeduct: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'paused', 'cancelled'],
        default: 'active',
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Composite index for querying active subscriptions that are due
SubscriptionSchema.index({ user: 1, status: 1, nextBillingDate: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
