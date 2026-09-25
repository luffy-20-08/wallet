const express = require('express');
const router = express.Router();

const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');
const {
    generateCSV,
    generateExcel,
    generatePDF,
    getExportFileName,
    buildExportQuery
} = require('../utils/exportService');

/**
 * Common Export Handler for CSV, Excel, and PDF
 * Enforces authenticated user data isolation and query filtering
 */
async function handleExport(format, req, res) {
    try {
        const { query, sort } = buildExportQuery(req.user.id, req.query);
        const transactions = await Transaction.find(query).sort(sort);

        // Requirement 10: If no transactions matching filters, show user-friendly message
        if (!transactions || transactions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No transactions found for the selected filters.',
                count: 0
            });
        }

        const fileName = getExportFileName(format, req.query);

        if (format === 'csv') {
            const csvData = generateCSV(transactions);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            return res.status(200).send(csvData);
        } else if (format === 'excel' || format === 'xlsx') {
            const xlsxBuffer = await generateExcel(transactions, req.query);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            return res.status(200).send(xlsxBuffer);
        } else if (format === 'pdf') {
            const pdfBuffer = await generatePDF(transactions, req.query);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            return res.status(200).send(pdfBuffer);
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid export format. Supported formats: csv, excel, pdf.'
            });
        }
    } catch (err) {
        console.error(`Export ${format} error:`, err);
        return res.status(500).json({
            success: false,
            error: 'Unable to export transactions. Please try again.'
        });
    }
}

// @desc    Export transactions as CSV
// @route   GET /api/transactions/export/csv
// @access  Private
router.get('/export/csv', protect, (req, res) => handleExport('csv', req, res));

// @desc    Export transactions as Excel (.xlsx)
// @route   GET /api/transactions/export/excel
// @access  Private
router.get('/export/excel', protect, (req, res) => handleExport('excel', req, res));

// @desc    Export transactions as PDF
// @route   GET /api/transactions/export/pdf
// @access  Private
router.get('/export/pdf', protect, (req, res) => handleExport('pdf', req, res));

// @desc    Export transactions (generic endpoint with ?format=csv|excel|pdf)
// @route   GET /api/transactions/export
// @access  Private
router.get('/export', protect, (req, res) => {
    const fmt = (req.query.format || 'csv').toLowerCase();
    return handleExport(fmt, req, res);
});


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

// @desc    Check potential duplicate transaction
// @route   GET /api/transactions/check-duplicate
// @access  Private
router.get('/check-duplicate', protect, async (req, res) => {
    try {
        const { referenceId, amount, date, text } = req.query;
        let duplicate = null;

        // 1. Check exact referenceId / UTR if provided
        if (referenceId && referenceId.trim()) {
            duplicate = await Transaction.findOne({
                user: req.user.id,
                isDeleted: false,
                referenceId: referenceId.trim()
            });
        }

        // 2. Check same amount and matching date & similar description
        if (!duplicate && amount && date) {
            const numAmount = parseFloat(amount);
            const targetDate = new Date(date);
            if (!isNaN(numAmount) && !isNaN(targetDate.getTime())) {
                const startOfDay = new Date(targetDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(targetDate);
                endOfDay.setHours(23, 59, 59, 999);

                const candidates = await Transaction.find({
                    user: req.user.id,
                    isDeleted: false,
                    amount: { $in: [numAmount, -Math.abs(numAmount), Math.abs(numAmount)] },
                    date: { $gte: startOfDay, $lte: endOfDay }
                });

                if (candidates && candidates.length > 0) {
                    if (text && text.trim()) {
                        const cleanT = text.toLowerCase().trim();
                        duplicate = candidates.find(c => c.text && c.text.toLowerCase().includes(cleanT.substring(0, 10))) || candidates[0];
                    } else {
                        duplicate = candidates[0];
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            isDuplicate: !!duplicate,
            transaction: duplicate || null
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
        const {
            text,
            amount,
            type,
            category,
            date,
            month,
            year,
            referenceId,
            paymentScreenshot,
            paymentMethod
        } = req.body;

        console.log("Incoming POST /transactions:");
        console.log("Req Body Text:", text, "Amount:", amount, "Ref:", referenceId);
        console.log("Req Body Date:", date, "Month:", month, "Year:", year);

        // Check for duplicate UTR / Reference ID if provided
        if (referenceId && typeof referenceId === 'string' && referenceId.trim()) {
            const existing = await Transaction.findOne({
                user: req.user.id,
                isDeleted: false,
                referenceId: referenceId.trim()
            });
            if (existing) {
                console.log(`[Duplicate Prevention] UTR ${referenceId.trim()} already exists for user ${req.user.id}`);
                return res.status(409).json({
                    success: false,
                    isDuplicate: true,
                    error: `This payment (UTR: ${referenceId.trim()}) is already recorded in your Wallet.`
                });
            }
        }

        // Validating and Parsing Date
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Date'
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
            referenceId: referenceId || null,
            paymentScreenshot: paymentScreenshot || null,
            paymentMethod: paymentMethod || 'UPI',
            user: req.user.id
        });

        return res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (err) {
        console.error("Error in POST /api/transactions:", err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);

            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        } else {
            return res.status(500).json({
                success: false,
                error: err.message || 'Server Error'
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
