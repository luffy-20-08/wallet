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
const subscriptions = require('./routes/subscriptions');

const path = require('path');

const app = express();

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// CORS configuration supporting mobile Capacitor clients & web
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.options('*', cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// DB Config
// MONGO_URI must be provided via environment variables (.env locally, Vercel Dashboard in production)
const rawMongoUri = process.env.MONGO_URI;
const dbUri = (rawMongoUri || '').trim();

if (!dbUri) {
    console.error('[Configuration Error] FATAL: MONGO_URI environment variable is missing or empty.');
}

// Connect to Mongo (cached for serverless)
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    if (!dbUri) {
        throw new Error('MONGO_URI environment variable is missing. Configure MONGO_URI in your environment or .env file.');
    }
    await mongoose.connect(dbUri);
    const dbName = mongoose.connection.name;
    if (dbName === 'wallet-dev') {
        console.log(`[Database] Connected to DEVELOPMENT database: "${dbName}" (Production "wallet" database is protected)`);
    } else {
        console.log(`[Database] Connected to database: "${dbName}"`);
    }
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
app.use('/api/subscriptions', subscriptions);

const port = process.env.PORT || 8000;
const host = process.env.HOST || '0.0.0.0';

if (require.main === module) {
    app.listen(port, host, () => {
        console.log(`Server started on port ${port} (listening on ${host})`);
        console.log(`Local Access: http://localhost:${port}`);
        console.log(`LAN/Mobile Access: http://10.246.23.55:${port}`);
    });
}

module.exports = app;
