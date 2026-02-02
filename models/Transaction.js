const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: [true, 'Please add some text']
    },
    amount: {
        type: Number,
        required: [true, 'Please add a positive or negative number']
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    category: {
        type: String,
        default: 'General'
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        required: true
    },

    month: {
        type: Number // 0-11
    },
    year: {
        type: Number
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
