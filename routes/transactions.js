const express = require('express');
const router = express.Router();

const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');


// @desc    Get all transactions (active)
// @route   GET /api/transactions
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let query = { user: req.user.id, isDeleted: false };

        // Date Filter (YYYY-MM-DD from query)
        if (req.query.date) {
            const parts = req.query.date.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0]);
                const m = parseInt(parts[1]) - 1;
                const d = parseInt(parts[2]);

                // Create range for that day (Local or UTC? Ideally we store ISO so we should query range that covers "that day")
                // Assuming client sends YYYY-MM-DD representing their local day.
                // But DB has ISOs. 
                // Simple approach: Match the 'date' field range.
                // However, timezone issues are tricky here.
                // If we rely on the `month` and `year` fields stored, we can also add a `day` field?
                // Or just use the frontend filtering which we already did?

                // User requirement: "Ensure transactions are filtered per user and per selected date." in Backend.
                // Let's implement a range query for 00:00 to 23:59:59 of that date in UTC?
                // The safest is often to interpret the input date as the start of the day.

                const start = new Date(y, m, d);
                const end = new Date(y, m, d, 23, 59, 59, 999);

                query.date = {
                    $gte: start,
                    $lte: end
                };
            }
        }

        const transactions = await Transaction.find(query);
        return res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @desc    Get deleted transactions
// @route   GET /api/transactions/bin
// @access  Private
router.get('/bin', protect, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id, isDeleted: true });
        return res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @desc    Add transaction
// @route   POST /api/transactions
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { text, amount, type, category, date, month, year } = req.body;

        console.log("Incoming POST /transactions:");
        console.log("Req Body Date:", date);
        console.log("Req Body Month:", month, "Year:", year);

        // Validating and Parsing Date
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: ['Invalid Date']
            });
        }

        const transaction = await Transaction.create({
            text,
            amount,
            type,
            category,
            date: parsedDate,
            month: month !== undefined ? month : parsedDate.getMonth(),
            year: year !== undefined ? year : parsedDate.getFullYear(),
            user: req.user.id
        });

        return res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);

            return res.status(400).json({
                success: false,
                error: messages
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Server Error'
            });
        }
    }
});

// @desc    Soft Delete ALL transactions (Move all active to bin)
// @route   DELETE /api/transactions/all
// @access  Private
router.delete('/all', protect, async (req, res) => {
    try {
        const result = await Transaction.updateMany({ user: req.user.id, isDeleted: false }, { isDeleted: true });

        return res.status(200).json({
            success: true,
            data: {
                count: result.modifiedCount
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @desc    Soft Delete transaction (Move to bin)
// @route   DELETE /api/transactions/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'No transaction found'
            });
        }

        transaction.isDeleted = true;
        await transaction.save();

        return res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @desc    Restore transaction
// @route   PUT /api/transactions/restore/:id
// @access  Private
router.put('/restore/:id', protect, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'No transaction found'
            });
        }

        transaction.isDeleted = false;
        await transaction.save();

        return res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});



// @desc    Hard Delete (Permanent)
// @route   DELETE /api/transactions/permanent/:id
// @access  Private
router.delete('/permanent/:id', protect, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'No transaction found'
            });
        }

        await transaction.deleteOne();

        return res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

module.exports = router;
