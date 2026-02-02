require('dotenv').config();
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
const db = process.env.MONGO_URI || 'mongodb://localhost:27017/luffy';

// Connect to Mongo
mongoose
    .connect(db)
    .then(() => console.log(`MongoDB Connected to ${db.split('@')[1] || 'Localhost'}...`))
    .catch(err => console.log(err));

// Use Routes
app.use('/api/transactions', transactions);
app.use('/api/auth', auth);

const port = process.env.PORT || 8000;

app.listen(port, () => console.log(`Server started on port ${port}`));
