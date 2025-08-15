// File: server.js
// This is the main entry point. It's now much cleaner and only handles setup and middleware.

// --- 1. SETUP & IMPORTS ---
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. MIDDLEWARE ---
app.use(cors({
    origin: '[http://127.0.0.1:5500](http://127.0.0.1:5500)',
    credentials: true
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        secure: false, // Set to true if using HTTPS in production
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));

// --- 3. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully.'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- 4. IMPORT & USE ROUTES ---
// Import the router files
const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe'); // <-- ADD THIS LINE

// Tell the app to use the router files for specific paths
app.use('/api/auth', authRoutes.authRouter);
app.use('/api/users', authRoutes.usersRouter);
app.use('/api/stripe', stripeRoutes); // <-- AND ADD THIS LINE

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Users Service listening on http://localhost:${PORT}`);
});