require('dotenv').config();
const dns = require('dns');
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    // Ignore if custom DNS not supported
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const transactions = require('./routes/transactions');
const auth = require('./routes/auth');

const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// DB Config
const db = process.env.MONGO_URI || 'mongodb+srv://luffywallet:luffyandhimanshu@wallet.nuv4bmz.mongodb.net/wallet?appName=wallet';

// Connect to Mongo (cached for serverless)
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(db);
};

// Ensure DB is connected before handling requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        res.status(500).json({
            success: false,
            error: 'Database connection failed: ' + (err.message || 'Check Atlas IP whitelist')
        });
    }
});

// Use Routes
app.use('/api/transactions', transactions);
app.use('/api/auth', auth);

const port = process.env.PORT || 8000;

if (require.main === module) {
    app.listen(port, () => console.log(`Server started on port ${port}`));
}

module.exports = app;
