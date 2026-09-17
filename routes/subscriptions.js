const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

// Helper to compute next billing date given billingDay and current nextBillingDate
function calculateNextBillingDate(currentDate, billingDay) {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(billingDay, maxDays));
    return next;
}

// Process any active subscriptions that are due for automatic deduction
async function processDueSubscriptions(userId) {
    const now = new Date();
    const dueSubs = await Subscription.find({
        user: userId,
        status: 'active',
        autoDeduct: true,
        nextBillingDate: { $lte: now }
    });

    const generatedTransactions = [];
    const notifications = [];

    for (const sub of dueSubs) {
        while (sub.nextBillingDate <= now && sub.monthsPaid < sub.durationMonths) {
            const deductionDate = new Date(sub.nextBillingDate);

            // Automatically create expense transaction
            const transaction = await Transaction.create({
                user: userId,
                text: `[Subscription] ${sub.name} (${sub.plan || 'Plan'})`,
                amount: -Math.abs(sub.amount),
                type: 'expense',
                category: sub.category || 'Entertainment',
                date: deductionDate,
                month: deductionDate.getMonth(),
                year: deductionDate.getFullYear()
            });

            generatedTransactions.push(transaction);
            sub.monthsPaid += 1;
            sub.lastDeductedDate = now;

            notifications.push({
                id: transaction._id,
                type: 'deduction',
                title: 'Subscription Auto-Deducted',
                subName: sub.name,
                plan: sub.plan,
                amount: sub.amount,
                monthsPaid: sub.monthsPaid,
                durationMonths: sub.durationMonths,
                icon: sub.icon || 'fa-solid fa-credit-card',
                color: sub.color || '#A970FF',
                message: `₹${sub.amount} was auto-deducted for ${sub.name} (${sub.plan || 'Plan'}). Month ${sub.monthsPaid} of ${sub.durationMonths} paid.`,
                timestamp: deductionDate
            });

            if (sub.monthsPaid >= sub.durationMonths) {
                sub.status = 'completed';
                break;
            } else {
                sub.nextBillingDate = calculateNextBillingDate(sub.nextBillingDate, sub.billingDay);
            }
        }
        await sub.save();
    }

    return { generatedTransactions, notifications };
}

// @desc    Get all subscriptions for user (and auto-process due subscriptions)
// @route   GET /api/subscriptions
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // Run auto-deduction check for any overdue subscriptions
        const { generatedTransactions, notifications } = await processDueSubscriptions(req.user._id);

        const subscriptions = await Subscription.find({ user: req.user._id })
            .sort({ status: 1, nextBillingDate: 1 });

        const activeSubs = subscriptions.filter(s => s.status === 'active');
        const monthlyTotal = activeSubs.reduce((sum, s) => sum + s.amount, 0);

        // Find nearest upcoming renewal
        let nextRenewal = null;
        if (activeSubs.length > 0) {
            const sortedByDate = [...activeSubs].sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));
            nextRenewal = sortedByDate[0];
        }

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            activeCount: activeSubs.length,
            monthlyTotal,
            nextRenewal,
            autoDeductedCount: generatedTransactions.length,
            notifications,
            data: subscriptions
        });
    } catch (err) {
        console.error('Error fetching subscriptions:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// @desc    Create a new subscription
// @route   POST /api/subscriptions
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const {
            name,
            appId,
            icon,
            color,
            plan,
            amount,
            category,
            durationMonths,
            billingDay,
            autoDeduct,
            deductImmediately
        } = req.body;

        if (!name || !amount) {
            return res.status(400).json({ success: false, error: 'Please provide app name and amount' });
        }

        const parsedAmount = Math.abs(Number(amount));
        const parsedDuration = Math.max(1, parseInt(durationMonths) || 1);
        const parsedDay = Math.min(31, Math.max(1, parseInt(billingDay) || new Date().getDate()));

        const now = new Date();
        let monthsPaid = 0;
        let lastDeductedDate = null;
        let nextBillingDate;
        let firstTransaction = null;
        let status = 'active';

        if (deductImmediately !== false) {
            // Deduct first month right now
            firstTransaction = await Transaction.create({
                user: req.user._id,
                text: `[Subscription] ${name} (${plan || 'Plan'})`,
                amount: -parsedAmount,
                type: 'expense',
                category: category || 'Entertainment',
                date: now,
                month: now.getMonth(),
                year: now.getFullYear()
            });

            monthsPaid = 1;
            lastDeductedDate = now;

            if (parsedDuration === 1) {
                status = 'completed';
                nextBillingDate = now;
            } else {
                nextBillingDate = calculateNextBillingDate(now, parsedDay);
            }
        } else {
            // First deduction will be on the upcoming billing day
            const targetDate = new Date(now.getFullYear(), now.getMonth(), parsedDay);
            if (targetDate <= now) {
                targetDate.setMonth(targetDate.getMonth() + 1);
            }
            nextBillingDate = targetDate;
        }

        const subscription = await Subscription.create({
            user: req.user._id,
            name,
            appId: appId || 'custom',
            icon: icon || 'fa-solid fa-credit-card',
            color: color || '#A970FF',
            plan: plan || 'Standard',
            amount: parsedAmount,
            category: category || 'Entertainment',
            durationMonths: parsedDuration,
            monthsPaid,
            billingDay: parsedDay,
            startDate: now,
            nextBillingDate,
            lastDeductedDate,
            autoDeduct: autoDeduct !== false,
            status
        });

        let notification = null;
        if (firstTransaction) {
            notification = {
                id: firstTransaction._id,
                type: 'deduction',
                title: 'Subscription Payment Deducted',
                subName: name,
                plan: plan || 'Standard',
                amount: parsedAmount,
                monthsPaid: 1,
                durationMonths: parsedDuration,
                icon: icon || 'fa-solid fa-credit-card',
                color: color || '#A970FF',
                message: `₹${parsedAmount} deducted for ${name} (${plan || 'Standard'}). Month 1 of ${parsedDuration} paid.`,
                timestamp: now
            };
        }

        res.status(201).json({
            success: true,
            data: subscription,
            firstTransaction,
            notification
        });
    } catch (err) {
        console.error('Error creating subscription:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// @desc    Update subscription status (pause, resume, cancel)
// @route   PUT /api/subscriptions/:id/status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'paused', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const subscription = await Subscription.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!subscription) {
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }

        subscription.status = status;
        await subscription.save();

        res.status(200).json({
            success: true,
            data: subscription
        });
    } catch (err) {
        console.error('Error updating subscription status:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// @desc    Delete a subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!subscription) {
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }

        await subscription.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Subscription removed successfully'
        });
    } catch (err) {
        console.error('Error deleting subscription:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// @desc    Trigger auto-deduction check for due subscriptions
// @route   POST /api/subscriptions/process-due
// @access  Private
router.post('/process-due', protect, async (req, res) => {
    try {
        const { generatedTransactions, notifications } = await processDueSubscriptions(req.user._id);
        res.status(200).json({
            success: true,
            deductionsProcessed: generatedTransactions.length,
            transactions: generatedTransactions,
            notifications
        });
    } catch (err) {
        console.error('Error processing due subscriptions:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

module.exports = router;
